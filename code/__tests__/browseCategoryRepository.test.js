/**
 * browseCategoryRepository.test.js
 * Tests for browse_category_state / browse_category_list, scoped by the (user_id,
 * location_id) pair.
 */

import {
     saveBrowseCategories, loadBrowseCategories,
     saveMaxCategories, loadMaxCategories,
     saveBrowseCategoryList, loadBrowseCategoryList,
     saveAllBrowseCategoryData, loadAllBrowseCategoryData,
     resetAllBrowseCategoryData,
     backfillLegacyScope,
} from '../src/util/db/repositories/browseCategoryRepository';
import {
     setCurrentUserId, setCurrentLocationId, clearSessionContext,
} from '../src/util/db/sessionContext';

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

describe('browseCategoryRepository', () => {
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

     describe('guard clauses - either identity missing', () => {
          const scenarios = [
               ['neither user nor location set', () => {}],
               ['only user set', () => setCurrentUserId(5)],
               ['only location set', () => setCurrentLocationId(10)],
          ];

          it.each(scenarios)('saveBrowseCategories is a no-op when %s', async (_label, setup) => {
               setup();
               const result = await saveBrowseCategories([{ id: 1 }]);
               expect(result).toBe(false);
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });

          it.each(scenarios)('saveBrowseCategoryList is a no-op when %s', async (_label, setup) => {
               setup();
               const result = await saveBrowseCategoryList([{ key: 'a' }]);
               expect(result).toBe(false);
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });

          it.each(scenarios)('loadBrowseCategories returns an expired empty result when %s', async (_label, setup) => {
               setup();
               const result = await loadBrowseCategories();
               expect(result).toEqual({ data: [], updatedAt: 0, isExpired: true });
               expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
          });

          it.each(scenarios)('loadAllBrowseCategoryData returns null when %s', async (_label, setup) => {
               setup();
               expect(await loadAllBrowseCategoryData()).toBeNull();
          });
     });

     describe('writes are scoped to the (user_id, location_id) pair', () => {
          it('saveBrowseCategories scopes its UPDATE to both columns', async () => {
               setCurrentUserId(5);
               setCurrentLocationId(10);

               await saveBrowseCategories([{ id: 1 }]);

               const call = mockDb.runAsync.mock.calls.find(([sql]) => sql.includes('UPDATE browse_category_state'));
               expect(call).toBeDefined();
               const [sql, params] = call;
               expect(sql).toContain('WHERE user_id = ? AND location_id = ?');
               expect(params.slice(-2)).toEqual([5, 10]);
          });

          it('a different (user, location) pair scopes to a different row', async () => {
               setCurrentUserId(6);
               setCurrentLocationId(11);

               await saveMaxCategories(7);

               const [, params] = mockDb.runAsync.mock.calls.find(([sql]) => sql.includes('UPDATE browse_category_state'));
               expect(params.slice(-2)).toEqual([6, 11]);
          });

          it('saveBrowseCategoryList scopes its UPDATE to both columns', async () => {
               setCurrentUserId(5);
               setCurrentLocationId(10);

               await saveBrowseCategoryList([{ key: 'a' }]);

               const [sql, params] = mockDb.runAsync.mock.calls.find(([s]) => s.includes('UPDATE browse_category_list'));
               expect(sql).toContain('WHERE user_id = ? AND location_id = ?');
               expect(params.slice(-2)).toEqual([5, 10]);
          });
     });

     describe('reads are scoped to the (user_id, location_id) pair', () => {
          it('loadBrowseCategories queries WHERE user_id = ? AND location_id = ?', async () => {
               setCurrentUserId(5);
               setCurrentLocationId(10);
               mockDb.getFirstAsync.mockResolvedValueOnce({ categories_json: '[{"id":1}]', updated_at: Date.now() });

               const result = await loadBrowseCategories();

               expect(result.data).toEqual([{ id: 1 }]);
               const [sql, params] = mockDb.getFirstAsync.mock.calls[0];
               expect(sql).toContain('WHERE user_id = ? AND location_id = ?');
               expect(params).toEqual([5, 10]);
          });

          it('loadMaxCategories defaults to 5 with no matching row', async () => {
               setCurrentUserId(5);
               setCurrentLocationId(10);
               expect(await loadMaxCategories()).toBe(5);
          });
     });

     describe('saveAllBrowseCategoryData', () => {
          it('is a no-op with no current user/location', async () => {
               await saveAllBrowseCategoryData({ categories: [] });
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });

          it('completes without throwing (regression guard: no withTransactionAsync usage)', async () => {
               setCurrentUserId(5);
               setCurrentLocationId(10);
               await expect(saveAllBrowseCategoryData({ categories: [{ id: 1 }], categoryList: [] })).resolves.toBeUndefined();
          });

          it('scopes every write to the current (user, location) pair', async () => {
               setCurrentUserId(5);
               setCurrentLocationId(10);
               await saveAllBrowseCategoryData({ categories: [{ id: 1 }], categoryList: [{ key: 'a' }], maxCategories: 3 });

               const updateCalls = mockDb.runAsync.mock.calls.filter(([sql]) => sql.startsWith('UPDATE'));
               expect(updateCalls.length).toBeGreaterThan(0);
               updateCalls.forEach(([, params]) => {
                    expect(params.slice(-2)).toEqual([5, 10]);
               });
          });
     });

     describe('resetAllBrowseCategoryData', () => {
          it('is a no-op with no current user/location', async () => {
               await resetAllBrowseCategoryData();
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });

          it('scopes the reset to the current (user, location) pair without deleting rows', async () => {
               setCurrentUserId(5);
               setCurrentLocationId(10);
               await resetAllBrowseCategoryData();

               mockDb.runAsync.mock.calls.forEach(([sql, params]) => {
                    expect(sql).toMatch(/^UPDATE/);
                    expect(params.slice(-2)).toEqual([5, 10]);
               });
          });
     });

     describe('backfillLegacyScope', () => {
          it('is a no-op unless both a user id and a location id are given', async () => {
               await backfillLegacyScope(null, 10);
               await backfillLegacyScope(5, null);
               await backfillLegacyScope(null, null);
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });

          it('issues one guarded UPDATE per table, claiming only fully-orphaned rows', async () => {
               await backfillLegacyScope(5, 10);

               expect(mockDb.runAsync).toHaveBeenCalledTimes(2); // browse_category_state + browse_category_list
               mockDb.runAsync.mock.calls.forEach(([sql, params]) => {
                    expect(sql).toContain('WHERE user_id IS NULL AND location_id IS NULL');
                    expect(sql).toContain('NOT EXISTS');
                    expect(params).toEqual([5, 10, 5, 10]);
               });
          });

          it('completes without throwing (regression guard: no withTransactionAsync usage)', async () => {
               await expect(backfillLegacyScope(5, 10)).resolves.toBeUndefined();
          });
     });
});
