/**
 * librarySystemRepository.test.js
 * Tests for library_system_state scoping, self-heal priority, and the field-mapping fixes.
 */

import {
     saveLibrary,
     saveLibraryMetadata,
     saveAllLibrarySystemData,
     saveLibraryUrl, loadLibraryUrl,
     saveLibraryVersion, loadLibraryVersion,
     saveLibraryLanguages, loadLibraryLanguages,
     loadLibraryMetadata,
     loadLibrary,
     saveMenu, loadMenu,
     saveCatalogStatus, loadCatalogStatus,
     saveHomeScreenLinks, loadHomeScreenLinks,
     saveAppSettings, loadAppSettings,
     loadAllLibrarySystemData,
     resetAllLibrarySystemData,
} from '../src/util/db/repositories/librarySystemRepository';
import { setCurrentLibraryId, getCurrentLibraryId, clearSessionContext } from '../src/util/db/sessionContext';

jest.mock('../src/util/db/sqlite', () => ({
     getDb: jest.fn(),
}));

jest.mock('../src/util/logging', () => ({
     logDebugMessage: jest.fn(),
     logErrorMessage: jest.fn(),
     logWarnMessage: jest.fn(),
     logInfoMessage: jest.fn(),
}));

import { getDb } from '../src/util/db/sqlite';

function findUpdateCall(mockDb) {
     return mockDb.runAsync.mock.calls.find(([sql]) => sql.includes('UPDATE library_system_state'));
}

describe('librarySystemRepository', () => {
     let mockDb;

     beforeEach(() => {
          jest.clearAllMocks();
          clearSessionContext();
          mockDb = {
               runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
               getFirstAsync: jest.fn().mockResolvedValue(null),
               getAllAsync: jest.fn().mockResolvedValue([]),
          };
          getDb.mockResolvedValue(mockDb);
     });

     describe('saveLibrary - self-heal priority regression', () => {
          it('writes under the already-tracked current library id, not the response\'s own id', async () => {
               // Regression test: getLibraryInfo (util/api/system.js) can silently retry
               // with GLOBALS.libraryId and return a DIFFERENT library's data when the
               // originally requested id comes back "Library not found". Trusting the
               // response's own libraryId in that case fragmented library_system_state
               // into two incomplete rows.
               setCurrentLibraryId(5);

               await saveLibrary({ libraryId: 1, displayName: 'Substituted Library' });

               const call = findUpdateCall(mockDb);
               expect(call).toBeDefined();
               const [sql, params] = call;
               expect(sql).toContain('WHERE library_id = ?');
               expect(params[params.length - 1]).toBe(5);
               expect(getCurrentLibraryId()).toBe(5);
          });

          it('falls back to the response\'s own id when no current library id is tracked yet', async () => {
               expect(getCurrentLibraryId()).toBeNull();

               await saveLibrary({ libraryId: 7, displayName: 'First Library' });

               const [, params] = findUpdateCall(mockDb);
               expect(params[params.length - 1]).toBe(7);
               expect(getCurrentLibraryId()).toBe(7);
          });

          it('skips the save entirely when neither a current id nor a response id is known', async () => {
               await saveLibrary({ displayName: 'No id anywhere' });
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });
     });

     describe('saveLibrary - name/favicon field mapping', () => {
          it('sources the name column from displayName (not a "name" field)', async () => {
               setCurrentLibraryId(5);
               await saveLibrary({ libraryId: 5, displayName: 'The Real Name', name: 'wrong-field', favicon: 'icon.png' });

               const [, params] = findUpdateCall(mockDb);
               expect(params).toContain('The Real Name');
               expect(params).toContain('icon.png');
               expect(params).not.toContain('wrong-field');
          });

          it('stores null for name/favicon when displayName/favicon are absent', async () => {
               setCurrentLibraryId(5);
               await saveLibrary({ libraryId: 5 });

               const [, params] = findUpdateCall(mockDb);
               // now, name, favicon, library_json, libraryId(where) - name/favicon are params[1]/[2]
               expect(params[1]).toBeNull();
               expect(params[2]).toBeNull();
          });
     });

     describe('saveLibraryMetadata - self-heal priority + field mapping', () => {
          it('prefers the tracked current library id over metadata.libraryId', async () => {
               setCurrentLibraryId(5);
               await saveLibraryMetadata({ libraryId: 1, displayName: 'Wrong Library' });

               const [, params] = findUpdateCall(mockDb);
               expect(params[params.length - 1]).toBe(5);
          });

          it('sources name from displayName, falling back to a legacy name field', async () => {
               setCurrentLibraryId(5);
               await saveLibraryMetadata({ displayName: 'Display Name Wins' });
               let [, params] = findUpdateCall(mockDb);
               expect(params).toContain('Display Name Wins');

               jest.clearAllMocks();
               await saveLibraryMetadata({ name: 'Legacy Name Field' });
               [, params] = findUpdateCall(mockDb);
               expect(params).toContain('Legacy Name Field');
          });
     });

     describe('saveAllLibrarySystemData - self-heal priority', () => {
          it('prefers the tracked current library id over state.library.libraryId for every write', async () => {
               setCurrentLibraryId(5);
               await saveAllLibrarySystemData({ library: { libraryId: 1 }, url: 'https://example.com' });

               const scopedCalls = mockDb.runAsync.mock.calls.filter(([sql]) => sql.includes('WHERE library_id = ?'));
               expect(scopedCalls.length).toBeGreaterThan(0);
               scopedCalls.forEach(([, params]) => {
                    expect(params[params.length - 1]).toBe(5);
               });
          });

          it('completes without throwing (regression guard: no withTransactionAsync usage)', async () => {
               setCurrentLibraryId(5);
               await expect(saveAllLibrarySystemData({ library: { libraryId: 5 }, url: 'https://example.com' })).resolves.toBeUndefined();
          });

          it('skips entirely when no library id can be resolved from any source', async () => {
               await saveAllLibrarySystemData({});
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });
     });

     describe('non-self-healing saves - guard clauses when no current library id', () => {
          const cases = [
               ['saveLibraryUrl', () => saveLibraryUrl('https://x.com')],
               ['saveLibraryVersion', () => saveLibraryVersion('1.2.3')],
               ['saveLibraryLanguages', () => saveLibraryLanguages(['en'])],
               ['saveMenu', () => saveMenu([{ id: 1 }])],
               ['saveCatalogStatus', () => saveCatalogStatus(1, 'offline')],
               ['saveHomeScreenLinks', () => saveHomeScreenLinks([{}])],
               ['saveAppSettings', () => saveAppSettings({ a: 1 }, 'url', 'slug')],
          ];

          it.each(cases)('%s is a no-op with no current library id', async (_name, fn) => {
               expect(getCurrentLibraryId()).toBeNull();
               await fn();
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });
     });

     describe('non-self-healing loads - safe defaults with no current library id', () => {
          it('loadLibraryUrl returns empty string', async () => {
               expect(await loadLibraryUrl()).toBe('');
          });
          it('loadLibraryVersion returns empty string', async () => {
               expect(await loadLibraryVersion()).toBe('');
          });
          it('loadLibraryLanguages returns empty array', async () => {
               expect(await loadLibraryLanguages()).toEqual([]);
          });
          it('loadLibraryMetadata returns null', async () => {
               expect(await loadLibraryMetadata()).toBeNull();
          });
          it('loadLibrary returns empty object', async () => {
               expect(await loadLibrary()).toEqual({});
          });
          it('loadMenu returns empty array', async () => {
               expect(await loadMenu()).toEqual([]);
          });
          it('loadCatalogStatus returns a default status object', async () => {
               expect(await loadCatalogStatus()).toEqual({ status: 0, message: '' });
          });
          it('loadHomeScreenLinks returns empty array', async () => {
               expect(await loadHomeScreenLinks()).toEqual([]);
          });
          it('loadAppSettings returns null', async () => {
               expect(await loadAppSettings()).toBeNull();
          });
          it('loadAllLibrarySystemData returns null', async () => {
               expect(await loadAllLibrarySystemData()).toBeNull();
          });
          it('none of the loads touch the database at all', async () => {
               await Promise.all([
                    loadLibraryUrl(), loadLibraryVersion(), loadLibraryLanguages(),
                    loadLibraryMetadata(), loadLibrary(), loadMenu(), loadCatalogStatus(),
                    loadHomeScreenLinks(), loadAppSettings(), loadAllLibrarySystemData(),
               ]);
               expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
          });
     });

     describe('reads scope by library_id when a current library is set', () => {
          it('loadLibraryUrl queries WHERE library_id = ? with the current id', async () => {
               setCurrentLibraryId(9);
               mockDb.getFirstAsync.mockResolvedValueOnce({ url: 'https://example.com' });

               const result = await loadLibraryUrl();

               expect(result).toBe('https://example.com');
               const [sql, params] = mockDb.getFirstAsync.mock.calls[0];
               expect(sql).toContain('WHERE library_id = ?');
               expect(params).toEqual([9]);
          });

          it('a different current library id queries a different row', async () => {
               setCurrentLibraryId(3);
               await loadLibraryUrl();
               expect(mockDb.getFirstAsync.mock.calls[0][1]).toEqual([3]);
          });
     });

     describe('resetAllLibrarySystemData', () => {
          it('is a no-op when there is no current library id', async () => {
               await resetAllLibrarySystemData();
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });

          it('nulls out data columns but never nulls library_id itself', async () => {
               setCurrentLibraryId(5);
               await resetAllLibrarySystemData();

               const [sql, params] = mockDb.runAsync.mock.calls[0];
               expect(sql).not.toMatch(/\blibrary_id\s*=\s*NULL/);
               expect(sql).toContain('WHERE library_id = ?');
               expect(params[params.length - 1]).toBe(5);
          });
     });
});
