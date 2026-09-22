/**
 * languageRepository.test.js
 * Regression tests for saveDictionary's switch from "delete everything, reinsert
 * everything" (which raced under concurrent calls - either a transaction collision, or a
 * UNIQUE constraint violation when unwrapped) to per-row upserts.
 */

import { saveDictionary, loadDictionary, loadDictionaryForLanguage } from '../src/util/db/repositories/languageRepository';

jest.mock('../src/util/db/sqlite', () => ({
     getDb: jest.fn(),
}));

// languageRepository re-exports saveAvailableLanguages via librarySystemRepository - stub
// that module out so these tests only exercise the dictionary functions under test.
jest.mock('../src/util/db/repositories/librarySystemRepository', () => ({
     loadLibraryLanguages: jest.fn().mockResolvedValue([]),
     saveLibraryLanguages: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/util/logging', () => ({
     logDebugMessage: jest.fn(),
     logErrorMessage: jest.fn(),
     logWarnMessage: jest.fn(),
     logInfoMessage: jest.fn(),
}));

import { getDb } from '../src/util/db/sqlite';

describe('languageRepository', () => {
     let mockDb;

     beforeEach(() => {
          jest.clearAllMocks();
          mockDb = {
               runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
               getFirstAsync: jest.fn().mockResolvedValue(null),
               getAllAsync: jest.fn().mockResolvedValue([]),
          };
          getDb.mockResolvedValue(mockDb);
     });

     describe('saveDictionary', () => {
          it('never issues a DELETE (regression: the old wipe-then-reinsert pattern raced under concurrent calls)', async () => {
               await saveDictionary({ en: { hello: 'Hello' }, es: { hello: 'Hola' } });

               const deleteCalls = mockDb.runAsync.mock.calls.filter(([sql]) => sql.trim().toUpperCase().startsWith('DELETE'));
               expect(deleteCalls).toHaveLength(0);
          });

          it('upserts one row per language via INSERT ... ON CONFLICT(language_code)', async () => {
               await saveDictionary({ en: { hello: 'Hello' }, es: { hello: 'Hola' } });

               expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
               mockDb.runAsync.mock.calls.forEach(([sql]) => {
                    expect(sql).toContain('INSERT INTO language_state');
                    expect(sql).toContain('ON CONFLICT(language_code) DO UPDATE');
               });
               const codes = mockDb.runAsync.mock.calls.map(([, params]) => params[0]).sort();
               expect(codes).toEqual(['en', 'es']);
          });

          it('normalizes language codes to lowercase', async () => {
               await saveDictionary({ EN: { hello: 'Hello' } });

               const [, params] = mockDb.runAsync.mock.calls[0];
               expect(params[0]).toBe('en');
          });

          it('skips non-object dictionary entries', async () => {
               await saveDictionary({ en: { hello: 'Hello' }, lastUpdated: 'not-a-dictionary-object' });

               expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
               expect(mockDb.runAsync.mock.calls[0][1][0]).toBe('en');
          });

          it('completes without throwing (regression guard: no withTransactionAsync usage)', async () => {
               await expect(saveDictionary({ en: { hello: 'Hello' } })).resolves.toBeUndefined();
          });

          it('handles an empty dictionary without issuing any writes', async () => {
               await saveDictionary({});
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });
     });

     describe('loadDictionary / loadDictionaryForLanguage', () => {
          it('loadDictionary keys the result by normalized language code', async () => {
               mockDb.getAllAsync.mockResolvedValueOnce([
                    { language_code: 'EN', dictionary_json: JSON.stringify({ hello: 'Hello' }) },
               ]);

               const result = await loadDictionary();
               expect(result).toEqual({ en: { hello: 'Hello' } });
          });

          it('loadDictionaryForLanguage scopes the query to a single language code', async () => {
               mockDb.getFirstAsync.mockResolvedValueOnce({ dictionary_json: JSON.stringify({ hello: 'Hola' }) });

               const result = await loadDictionaryForLanguage('ES');

               expect(result).toEqual({ hello: 'Hola' });
               const [sql, params] = mockDb.getFirstAsync.mock.calls[0];
               expect(sql).toContain('WHERE language_code = ?');
               expect(params).toEqual(['es']);
          });

          it('loadDictionaryForLanguage returns an empty object for a blank language code', async () => {
               expect(await loadDictionaryForLanguage('')).toEqual({});
               expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
          });
     });
});
