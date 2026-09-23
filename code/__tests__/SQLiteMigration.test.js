/**
 * SQLiteMigration.test.js
 * Tests for SQLite migration detection and flow
 */

import { isUserDataEmpty, isSQLiteMigrationNeeded } from '../src/util/db';
import { getDb } from '../src/util/db';

jest.mock('../src/util/db/sqlite', () => ({
     getDb: jest.fn(),
}));

jest.mock('../src/util/logging', () => ({
     logDebugMessage: jest.fn(),
     logErrorMessage: jest.fn(),
     logWarnMessage: jest.fn(),
}));

describe('SQLite Migration Detection', () => {
     let mockDb;

     beforeEach(() => {
          jest.clearAllMocks();
          mockDb = {
               getFirstAsync: jest.fn(),
          };
          getDb.mockResolvedValue(mockDb);
     });

     describe('isUserDataEmpty()', () => {
          it('should return true when user_state table has no rows', async () => {
               mockDb.getFirstAsync.mockResolvedValueOnce({ count: 0 });
               const result = await isUserDataEmpty();
               expect(result).toBe(true);
               expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
                    expect.stringContaining('SELECT COUNT(*) as count FROM user_state')
               );
          });

          it('should return false when user_state table has rows', async () => {
               mockDb.getFirstAsync.mockResolvedValueOnce({ count: 1 });
               const result = await isUserDataEmpty();
               expect(result).toBe(false);
          });

          it('should return true if query result is null/undefined', async () => {
               mockDb.getFirstAsync.mockResolvedValueOnce(null);
               const result = await isUserDataEmpty();
               expect(result).toBe(true);
          });

          it('should return true on database error', async () => {
               mockDb.getFirstAsync.mockRejectedValueOnce(new Error('Database error'));
               const result = await isUserDataEmpty();
               expect(result).toBe(true);
          });

          it('should not scope the count by "WHERE id = 1" (regression: user_state is multi-row since 26.09.01, keyed by user_id - scoping by the old singleton id would only ever see the first user ever logged in on the device)', async () => {
               mockDb.getFirstAsync.mockResolvedValueOnce({ count: 2 });
               await isUserDataEmpty();

               const [sql] = mockDb.getFirstAsync.mock.calls[0];
               expect(sql).not.toMatch(/WHERE\s+id\s*=\s*1/i);
          });
     });

     describe('isSQLiteMigrationNeeded()', () => {
          it('should return false when userToken is null', async () => {
               const result = await isSQLiteMigrationNeeded(null);
               expect(result).toBe(false);
          });

          it('should return false when userToken is empty string', async () => {
               const result = await isSQLiteMigrationNeeded('');
               expect(result).toBe(false);
          });

          it('should return true when user has token and user_state is empty', async () => {
               mockDb.getFirstAsync.mockResolvedValueOnce({ count: 0 });
               const result = await isSQLiteMigrationNeeded('valid-token');
               expect(result).toBe(true);
          });

          it('should return false when user has token but user_state has data', async () => {
               mockDb.getFirstAsync.mockResolvedValueOnce({ count: 1 });
               const result = await isSQLiteMigrationNeeded('valid-token');
               expect(result).toBe(false);
          });

          it('should return true when count lookup fails (safe fallback path)', async () => {
               mockDb.getFirstAsync.mockRejectedValueOnce(new Error('DB error'));
               const result = await isSQLiteMigrationNeeded('valid-token');
               expect(result).toBe(true);
          });
     });
});

