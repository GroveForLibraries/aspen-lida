/**
 * userRepository.test.js
 * Tests for user_state / user_* collection table scoping, self-heal, the
 * case-insensitive username lookup, and the legacy-row backfill.
 */

import {
     saveUserProfile,
     saveUserSettings,
     savePickupLocationPrefs,
     saveLastListUsed,
     loadUserState,
     saveAccounts, loadAccounts,
     saveLists,
     loadAllUserData,
     saveAllUserData,
     clearAllUserData,
     backfillLegacyUserId,
     findCachedUserIdForUsername,
} from '../src/util/db/repositories/userRepository';
import { setCurrentUserId, getCurrentUserId, clearSessionContext } from '../src/util/db/sessionContext';

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

const COLLECTION_TABLES = [
     'user_accounts', 'user_viewers', 'user_lists', 'user_list_groups',
     'user_locations', 'user_reading_history', 'user_saved_events', 'user_cards',
     'user_notification_settings', 'user_app_preferences', 'user_debug_messages',
     'user_notification_history', 'user_inbox', 'user_sublocations', 'user_saved_searches',
];

describe('userRepository', () => {
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

     describe('saveUserProfile - self-heal', () => {
          it('self-heals the current user id from user.id and scopes the write to it', async () => {
               await saveUserProfile({ id: 5, displayName: 'Jane' });

               expect(getCurrentUserId()).toBe(5);
               const call = mockDb.runAsync.mock.calls.find(([sql]) => sql.includes('UPDATE user_state'));
               expect(call).toBeDefined();
               const [sql, params] = call;
               expect(sql).toContain('WHERE user_id = ?');
               expect(params[params.length - 1]).toBe(5);
          });

          it('falls back to the already-tracked current user id when user.id is absent', async () => {
               setCurrentUserId(8);
               await saveUserProfile({ displayName: 'No id in payload' });

               const [, params] = mockDb.runAsync.mock.calls.find(([sql]) => sql.includes('UPDATE user_state'));
               expect(params[params.length - 1]).toBe(8);
          });

          it('skips the save entirely when no user id is known from any source', async () => {
               await saveUserProfile({ displayName: 'Nobody' });
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });
     });

     describe('non-self-healing saves - guard clauses when no current user id', () => {
          const cases = [
               ['saveUserSettings', () => saveUserSettings({ language: 'en' })],
               ['savePickupLocationPrefs', () => savePickupLocationPrefs(true, null)],
               ['saveLastListUsed', () => saveLastListUsed('123')],
               ['saveAccounts', () => saveAccounts([{ id: 1 }])],
               ['saveLists', () => saveLists([{ id: 1 }])],
          ];

          it.each(cases)('%s is a no-op with no current user id', async (_name, fn) => {
               expect(getCurrentUserId()).toBeNull();
               await fn();
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });
     });

     describe('loadUserState / loadAllUserData - scoping', () => {
          it('returns null with no current user id, without touching the database', async () => {
               expect(await loadUserState()).toBeNull();
               expect(await loadAllUserData()).toBeNull();
               expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
          });

          it('scopes the SELECT to the current user id', async () => {
               setCurrentUserId(5);
               await loadUserState();

               const [sql, params] = mockDb.getFirstAsync.mock.calls[0];
               expect(sql).toContain('WHERE user_id = ?');
               expect(params).toEqual([5]);
          });
     });

     describe('collection table upserts (e.g. user_accounts)', () => {
          it('upserts keyed on user_id with ON CONFLICT DO UPDATE', async () => {
               setCurrentUserId(5);
               await saveAccounts([{ id: 1 }]);

               const [sql, params] = mockDb.runAsync.mock.calls[0];
               expect(sql).toContain('INSERT INTO user_accounts');
               expect(sql).toContain('ON CONFLICT(user_id) DO UPDATE');
               expect(params[0]).toBe(5);
          });

          it('is a no-op with no current user id', async () => {
               await saveAccounts([{ id: 1 }]);
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });

          it('loadAccounts scopes its SELECT to the current user id', async () => {
               setCurrentUserId(5);
               mockDb.getFirstAsync.mockResolvedValueOnce({ payload: JSON.stringify([{ id: 1 }]) });

               const result = await loadAccounts();

               expect(result).toEqual([{ id: 1 }]);
               const [sql, params] = mockDb.getFirstAsync.mock.calls[0];
               expect(sql).toContain('WHERE user_id = ?');
               expect(params).toEqual([5]);
          });

          it('loadAccounts returns null with no current user id', async () => {
               expect(await loadAccounts()).toBeNull();
          });
     });

     describe('saveAllUserData / clearAllUserData', () => {
          it('completes without throwing (regression guard: no withTransactionAsync usage)', async () => {
               await expect(saveAllUserData({ user: { id: 5 } })).resolves.toBeUndefined();
          });

          it('scopes every collection-table write to the resolved user id', async () => {
               await saveAllUserData({ user: { id: 5 }, accounts: [{ id: 1 }] });

               const collectionCalls = mockDb.runAsync.mock.calls.filter(([sql]) =>
                    COLLECTION_TABLES.some((table) => sql.includes(`INSERT INTO ${table}`))
               );
               expect(collectionCalls.length).toBe(COLLECTION_TABLES.length);
               collectionCalls.forEach(([, params]) => {
                    expect(params[0]).toBe(5);
               });
          });

          it('clearAllUserData is a no-op with no current user id', async () => {
               await clearAllUserData();
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });

          it('clearAllUserData deletes only the current user\'s rows', async () => {
               setCurrentUserId(5);
               await clearAllUserData();

               const deleteCalls = mockDb.runAsync.mock.calls.filter(([sql]) => sql.startsWith('DELETE FROM'));
               expect(deleteCalls.length).toBe(1 + COLLECTION_TABLES.length); // user_state + each collection
               deleteCalls.forEach(([sql, params]) => {
                    expect(sql).toContain('WHERE user_id = ?');
                    expect(params).toEqual([5]);
               });
          });
     });

     describe('findCachedUserIdForUsername - case-insensitive matching', () => {
          it('normalizes the query to lowercase and matches cat_username OR ils_barcode', async () => {
               mockDb.getFirstAsync.mockResolvedValueOnce({ user_id: 42 });

               const result = await findCachedUserIdForUsername('JaneDoe123');

               expect(result).toBe(42);
               const [sql, params] = mockDb.getFirstAsync.mock.calls[0];
               expect(sql).toContain('LOWER(cat_username)');
               expect(sql).toContain('LOWER(ils_barcode)');
               expect(params).toEqual(['janedoe123', 'janedoe123']);
          });

          it('trims surrounding whitespace before matching', async () => {
               mockDb.getFirstAsync.mockResolvedValueOnce({ user_id: 42 });
               await findCachedUserIdForUsername('  JaneDoe123  ');

               const [, params] = mockDb.getFirstAsync.mock.calls[0];
               expect(params).toEqual(['janedoe123', 'janedoe123']);
          });

          it('returns null without querying for an empty/falsy username', async () => {
               expect(await findCachedUserIdForUsername('')).toBeNull();
               expect(await findCachedUserIdForUsername(null)).toBeNull();
               expect(await findCachedUserIdForUsername(undefined)).toBeNull();
               expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
          });

          it('returns null when no row matches', async () => {
               mockDb.getFirstAsync.mockResolvedValueOnce(null);
               expect(await findCachedUserIdForUsername('unknown')).toBeNull();
          });
     });

     describe('backfillLegacyUserId', () => {
          it('is a no-op for a null/invalid user id', async () => {
               await backfillLegacyUserId(null);
               await backfillLegacyUserId('not-a-number');
               expect(mockDb.runAsync).not.toHaveBeenCalled();
          });

          it('issues one guarded UPDATE per collection table, claiming only orphaned rows', async () => {
               await backfillLegacyUserId(5);

               expect(mockDb.runAsync).toHaveBeenCalledTimes(COLLECTION_TABLES.length);
               mockDb.runAsync.mock.calls.forEach(([sql, params]) => {
                    expect(sql).toContain('WHERE user_id IS NULL');
                    expect(sql).toContain('NOT EXISTS');
                    expect(params).toEqual([5, 5]);
               });
          });

          it('completes without throwing (regression guard: no withTransactionAsync usage)', async () => {
               await expect(backfillLegacyUserId(5)).resolves.toBeUndefined();
          });
     });
});
