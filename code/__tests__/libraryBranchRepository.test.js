/**
 * libraryBranchRepository.test.js
 * Tests for library_branch_state scoping and self-heal on the location id.
 */

import {
     saveLocation, loadLocation,
     saveScope, loadScope,
     saveSelfCheckEnabled, loadSelfCheckEnabled,
     saveSelfCheckSettings, loadSelfCheckSettings,
     saveLocations, loadLocations,
     saveAllLibraryBranchData, loadAllLibraryBranchData,
     resetAllLibraryBranchData,
} from '../src/util/db/repositories/libraryBranchRepository';
import { setCurrentLocationId, getCurrentLocationId, clearSessionContext } from '../src/util/db/sessionContext';

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

function findUpdateCall(mockDb, table) {
     return mockDb.runAsync.mock.calls.find(([sql]) => sql.includes(`UPDATE ${table}`));
}

describe('libraryBranchRepository', () => {
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

     describe('saveLocation - self-heal', () => {
          it('self-heals the current location id from location.locationId', async () => {
               await saveLocation({ locationId: 10, displayName: 'Main Branch' });

               expect(getCurrentLocationId()).toBe(10);
               const [sql, params] = findUpdateCall(mockDb, 'library_branch_state');
               expect(sql).toContain('WHERE location_id = ?');
               expect(params[params.length - 1]).toBe(10);
          });

          it('falls back to the already-tracked current location id when location.locationId is absent', async () => {
               setCurrentLocationId(15);
               await saveLocation({ displayName: 'No id in payload' });

               const [, params] = findUpdateCall(mockDb, 'library_branch_state');
               expect(params[params.length - 1]).toBe(15);
          });

          it('skips the save entirely when no location id is known from any source', async () => {
               await saveLocation({ displayName: 'Nowhere' });
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });
     });

     describe('non-self-healing saves - guard clauses when no current location id', () => {
          const cases = [
               ['saveScope', () => saveScope('scope-value')],
               ['saveSelfCheckEnabled', () => saveSelfCheckEnabled(true)],
               ['saveSelfCheckSettings', () => saveSelfCheckSettings({ a: 1 })],
               ['saveLocations', () => saveLocations([{ id: 1 }])],
          ];

          it.each(cases)('%s is a no-op with no current location id', async (_name, fn) => {
               expect(getCurrentLocationId()).toBeNull();
               await fn();
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });
     });

     describe('non-self-healing loads - safe defaults with no current location id', () => {
          it('loadLocation returns null', async () => {
               expect(await loadLocation()).toBeNull();
          });
          it('loadScope returns empty string', async () => {
               expect(await loadScope()).toBe('');
          });
          it('loadSelfCheckEnabled returns null', async () => {
               expect(await loadSelfCheckEnabled()).toBeNull();
          });
          it('loadSelfCheckSettings returns an empty object', async () => {
               expect(await loadSelfCheckSettings()).toEqual({});
          });
          it('loadLocations returns an empty array', async () => {
               expect(await loadLocations()).toEqual([]);
          });
          it('loadAllLibraryBranchData returns null', async () => {
               expect(await loadAllLibraryBranchData()).toBeNull();
          });
          it('none of the loads touch the database at all', async () => {
               await Promise.all([
                    loadLocation(), loadScope(), loadSelfCheckEnabled(),
                    loadSelfCheckSettings(), loadLocations(), loadAllLibraryBranchData(),
               ]);
               expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
          });
     });

     describe('reads scope by location_id when a current location is set', () => {
          it('loadScope queries WHERE location_id = ? with the current id', async () => {
               setCurrentLocationId(20);
               mockDb.getFirstAsync.mockResolvedValueOnce({ scope: 'my-scope' });

               const result = await loadScope();

               expect(result).toBe('my-scope');
               const [sql, params] = mockDb.getFirstAsync.mock.calls[0];
               expect(sql).toContain('WHERE location_id = ?');
               expect(params).toEqual([20]);
          });
     });

     describe('saveAllLibraryBranchData', () => {
          it('self-heals the current location id from state.location.locationId', async () => {
               await saveAllLibraryBranchData({ location: { locationId: 12 }, scope: 'x' });

               expect(getCurrentLocationId()).toBe(12);
               const scopedCalls = mockDb.runAsync.mock.calls.filter(([sql]) => sql.includes('WHERE location_id = ?'));
               expect(scopedCalls.length).toBeGreaterThan(0);
               scopedCalls.forEach(([, params]) => {
                    expect(params[params.length - 1]).toBe(12);
               });
          });

          it('completes without throwing (regression guard: no withTransactionAsync usage)', async () => {
               await expect(saveAllLibraryBranchData({ location: { locationId: 12 } })).resolves.toBeUndefined();
          });

          it('skips entirely with no location id from any source', async () => {
               await saveAllLibraryBranchData({});
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });
     });

     describe('resetAllLibraryBranchData', () => {
          it('is a no-op with no current location id', async () => {
               await resetAllLibraryBranchData();
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });

          it('nulls out data columns but never nulls location_id itself', async () => {
               setCurrentLocationId(20);
               await resetAllLibraryBranchData();

               const [sql, params] = mockDb.runAsync.mock.calls[0];
               expect(sql).not.toMatch(/\blocation_id\s*=\s*NULL/);
               expect(sql).toContain('WHERE location_id = ?');
               expect(params[params.length - 1]).toBe(20);
          });
     });
});
