/**
 * dumpSQLiteTable.test.js
 * Regression tests for scoping the Support screen's "Share" cache dump to only the
 * currently active user/location/library, rather than every row that's ever existed in
 * the table since the 26.09.01 migration made these tables multi-row.
 */

import { dumpSQLiteTable } from '../src/util/logging';
import {
     setCurrentUserId, setCurrentLocationId, setCurrentLibraryId, clearSessionContext,
} from '../src/util/db/sessionContext';

jest.mock('../src/util/db/sqlite', () => ({
     getDb: jest.fn(),
}));

import { getDb } from '../src/util/db/sqlite';

describe('dumpSQLiteTable scoping', () => {
     let mockDb;

     beforeEach(() => {
          jest.clearAllMocks();
          clearSessionContext();
          mockDb = {
               getAllAsync: jest.fn().mockResolvedValue([]),
               getFirstAsync: jest.fn().mockResolvedValue({ total: 0 }),
          };
          getDb.mockResolvedValue(mockDb);
     });

     describe('user-scoped tables (e.g. user_state)', () => {
          it('scopes the dump to the current user id', async () => {
               setCurrentUserId(5);

               await dumpSQLiteTable('user_state');

               const call = mockDb.getAllAsync.mock.calls.find(([sql]) => sql.includes('"user_state"'));
               expect(call).toBeDefined();
               const [sql, params] = call;
               expect(sql).toContain('WHERE "user_id" = ?');
               expect(params).toEqual([5, 1000]);
          });

          it('returns zero rows rather than an unscoped dump when no current user is known', async () => {
               const result = await dumpSQLiteTable('user_state');

               expect(result.success).toBe(true);
               expect(result.rowCount).toBe(0);
               expect(result.totalRows).toBe(0);
               expect(mockDb.getAllAsync).not.toHaveBeenCalled();
          });

          it('dumping "user_accounts" also scopes every companion user_* table by user_id', async () => {
               setCurrentUserId(5);

               await dumpSQLiteTable('user_accounts');

               expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.any(String), [5, 1000]);
               // Every companion-table query should have used the scoped WHERE clause.
               mockDb.getAllAsync.mock.calls.forEach(([sql]) => {
                    expect(sql).toContain('WHERE "user_id" = ?');
               });
          });

          it('a different current user id scopes to a different set of rows', async () => {
               setCurrentUserId(9);
               await dumpSQLiteTable('user_state');
               expect(mockDb.getAllAsync.mock.calls[0][1]).toEqual([9, 1000]);
          });
     });

     describe('location-scoped tables', () => {
          it('scopes library_branch_state to the current location id', async () => {
               setCurrentLocationId(10);

               await dumpSQLiteTable('library_branch_state');

               const [sql, params] = mockDb.getAllAsync.mock.calls[0];
               expect(sql).toContain('WHERE "location_id" = ?');
               expect(params).toEqual([10, 1000]);
          });

          it('returns zero rows for theme_state with no current location', async () => {
               const result = await dumpSQLiteTable('theme_state');
               expect(result.rowCount).toBe(0);
               expect(mockDb.getAllAsync).not.toHaveBeenCalled();
          });

          it('dumping "theme_state" also scopes its companion theme_catalog table by location_id', async () => {
               setCurrentLocationId(10);

               await dumpSQLiteTable('theme_state');

               const themeCatalogCall = mockDb.getAllAsync.mock.calls.find(([sql]) => sql.includes('"theme_catalog"'));
               expect(themeCatalogCall).toBeDefined();
               const [sql, params] = themeCatalogCall;
               expect(sql).toContain('WHERE "location_id" = ?');
               expect(params).toEqual([10, 1000]);
          });
     });

     describe('library-scoped tables', () => {
          it('scopes library_system_state to the current library id', async () => {
               setCurrentLibraryId(2);

               await dumpSQLiteTable('library_system_state');

               const [sql, params] = mockDb.getAllAsync.mock.calls[0];
               expect(sql).toContain('WHERE "library_id" = ?');
               expect(params).toEqual([2, 1000]);
          });

          it('returns zero rows for library_system_state with no current library', async () => {
               const result = await dumpSQLiteTable('library_system_state');
               expect(result.rowCount).toBe(0);
               expect(mockDb.getAllAsync).not.toHaveBeenCalled();
          });
     });

     describe('composite (user_id, location_id)-scoped tables', () => {
          it('scopes browse_category_state to both the current user and location', async () => {
               setCurrentUserId(5);
               setCurrentLocationId(10);

               await dumpSQLiteTable('browse_category_state');

               const [sql, params] = mockDb.getAllAsync.mock.calls[0];
               expect(sql).toContain('WHERE "user_id" = ? AND "location_id" = ?');
               expect(params).toEqual([5, 10, 1000]);
          });

          it('returns zero rows when only one half of the pair is known', async () => {
               setCurrentUserId(5);
               // location not set

               const result = await dumpSQLiteTable('browse_category_state');

               expect(result.rowCount).toBe(0);
               expect(mockDb.getAllAsync).not.toHaveBeenCalled();
          });
     });

     describe('unscoped tables', () => {
          it('language_state is dumped without any WHERE clause (not identity-scoped)', async () => {
               await dumpSQLiteTable('language_state');

               const [sql] = mockDb.getAllAsync.mock.calls[0];
               expect(sql).not.toContain('WHERE');
          });
     });

     describe('row-count metadata reflects the scoped count, not the whole table', () => {
          it('totalRows comes from a scoped COUNT(*), not an unscoped one', async () => {
               setCurrentUserId(5);
               mockDb.getFirstAsync.mockResolvedValueOnce({ total: 3 });

               const result = await dumpSQLiteTable('user_state');

               expect(result.totalRows).toBe(3);
               const [countSql, countParams] = mockDb.getFirstAsync.mock.calls[0];
               expect(countSql).toContain('WHERE "user_id" = ?');
               expect(countParams).toEqual([5]);
          });

          it('totalRows is 0, and COUNT is never queried, when the identity is unresolvable', async () => {
               const result = await dumpSQLiteTable('library_system_state');

               expect(result.totalRows).toBe(0);
               expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
          });
     });
});
