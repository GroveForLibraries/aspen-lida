import { getDb } from '../sqlite';
import { safeStringify } from '../serialize';
import { getCurrentUserId, setCurrentUserId } from '../sessionContext';
import {logDebugMessage} from "../../logging";
import { boolToInt, intToBool, numberOrNull, safeParse } from '../../../helpers/helpers';

async function ensureUserStateRow(db, now, userId) {
     if (userId == null) return;
     await db.runAsync(
          `INSERT INTO user_state (user_id, updated_at) VALUES (?, ?)
           ON CONFLICT(user_id) DO NOTHING;`,
          [userId, now]
     );
}

// ─── user_state: targeted partial saves ──────────────────────────────────────

/**
 * Saves the full user profile object scalar fields.
 * Called when the user profile API returns fresh data.
 * The row is keyed by user_id (not a foreign key, just the owning patron's id) so a
 * different patron logging in gets their own row instead of overwriting this one.
 */
export async function saveUserProfile(user = {}) {
     const userId = numberOrNull(user.id) ?? getCurrentUserId();
     if (userId == null) {
          logDebugMessage('saveUserProfile: no current user id, skipping save');
          return;
     }
     setCurrentUserId(userId);

     const db = await getDb();
     const now = Date.now();
     await ensureUserStateRow(db, now, userId);
     await db.runAsync(
          `UPDATE user_state SET
                updated_at = ?,
                user_id = ?,
                display_name = ?,
                cat_name = ?,
                ils_barcode = ?,
                cat_username = ?,
                num_checked_out = ?,
                num_overdue = ?,
                num_holds = ?,
                num_holds_available = ?,
                num_lists = ?,
                num_saved_searches = ?,
                num_saved_searches_new = ?,
                num_reading_history = ?,
                num_linked_accounts = ?,
                num_saved_events_upcoming = ?,
                fines = ?,
                has_year_in_review = ?,
                year_in_review_name = ?,
                last_list_used = ?,
                hide_soft_delete_list_ui = ?,
                hold_sort_unavailable = ?,
                hold_sort_available = ?,
                checkout_sort = ?,
                interface_language = ?,
                language = ?,
                pickup_location_id = ?,
                home_location_id = ?,
                alternate_library_card = ?,
                alternate_library_card_password = ?,
                remember_hold_pickup_location = ?,
                prompt_for_hold_notifications = ?,
                profile_json = ?
           WHERE user_id = ?;`,
          [
               now,
               userId,
               user.displayName ?? null,
               user.cat_name ?? null,
               user.ils_barcode ?? null,
               user.cat_username ?? null,
               numberOrNull(user.numCheckedOut),
               numberOrNull(user.numOverdue),
               numberOrNull(user.numHolds),
               numberOrNull(user.numHoldsAvailable),
               numberOrNull(user.numLists),
               numberOrNull(user.numSavedSearches),
               numberOrNull(user.numSavedSearchesNew),
               numberOrNull(user.numReadingHistory),
               numberOrNull(user.numLinkedAccounts),
               numberOrNull(user.numSavedEventsUpcoming),
               user.fines ?? null,
               boolToInt(user.hasYearInReview),
               user.yearInReviewName ?? null,
               user.lastListUsed ?? null,
               boolToInt(user.hideSoftDeleteListUI),
               user.holdSortUnavailable ?? null,
               user.holdSortAvailable ?? null,
               user.checkoutSort ?? null,
               user.interfaceLanguage ?? 'en',
               user.interfaceLanguage ?? null,
               user.pickupLocationId ? String(user.pickupLocationId) : null,
               user.homeLocationId ? String(user.homeLocationId) : null,
               user.alternateLibraryCard ?? null,
               user.alternateLibraryCardPassword ?? null,
               numberOrNull(user.rememberHoldPickupLocation),
               boolToInt(user.promptForHoldNotifications),
               safeStringify(user),
               userId,
          ]
     );
}

/**
 * Saves session/preference fields that don't come directly from the user profile.
 */
export async function saveUserSettings(settings = {}) {
     const userId = getCurrentUserId();
     if (userId == null) {
          logDebugMessage('saveUserSettings: no current user id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureUserStateRow(db, now, userId);
     const fieldMappings = [
          ['language', 'language', value => value],
          ['languageDisplayName', 'language_display_name', value => value],
          ['notificationOnboard', 'notification_onboard', numberOrNull],
          ['expoToken', 'expo_token', value => String(value)],
          ['seenNotificationOnboardPrompt', 'seen_notification_onboard_prompt', boolToInt],
          ['userCheckoutSortMethod', 'checkout_sort_method', value => value],
          ['userHoldPendingSortMethod', 'hold_pending_sort_method', value => value],
          ['userHoldReadySortMethod', 'hold_ready_sort_method', value => value],
     ];

     const updates = [];
     const values = [];

     for (const [settingName, columnName, transform] of fieldMappings) {
          const value = settings[settingName];

          // Skip both null and undefined values.
          if (value === null || value === undefined) {
               continue;
          }

          updates.push(`${columnName} = ?`);
          values.push(transform(value));
     }

     // Nothing was supplied that needs updating.
     if (updates.length === 0) {
          logDebugMessage("No user settings to update");
          return;
     }

     updates.unshift('updated_at = ?');
     values.unshift(now);
     values.push(userId);

     await db.runAsync(
          `UPDATE user_state
              SET ${updates.join(', ')}
            WHERE user_id = ?;`,
          values
     );
}

/**
 * Saves pickup location validity and warning after the pickup locations API responds.
 */
export async function savePickupLocationPrefs(isValid, warning) {
     const userId = getCurrentUserId();
     if (userId == null) {
          logDebugMessage('savePickupLocationPrefs: no current user id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureUserStateRow(db, now, userId);
     await db.runAsync(
          `UPDATE user_state SET
                updated_at = ?,
                preferred_pickup_location_is_valid = ?,
                preferred_pickup_location_warning = ?
           WHERE user_id = ?;`,
          [now, boolToInt(isValid), warning ?? null, userId]
     );
}

/**
 * Saves the most recently used list id for quick reuse in list-related screens.
 */
export async function saveLastListUsed(listId) {
     const userId = getCurrentUserId();
     if (userId == null) {
          logDebugMessage('saveLastListUsed: no current user id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureUserStateRow(db, now, userId);
     await db.runAsync(
          `UPDATE user_state SET
                updated_at = ?,
                last_list_used = ?
           WHERE user_id = ?;`,
          [now, listId ? String(listId) : null, userId]
     );
}

/**
 * Resolves the numeric user_id for a cached row by the patron's username/barcode -
 * the one stable identity known at cold app start (SecureStore's `userKey`), before any
 * network call and before a numeric user_id can be looked up any other way. Splash.js
 * uses this to set the current user id so its cache-bypass checks are correctly scoped.
 * Returns null if no cached row matches (new user, or first-ever login).
 */
export async function findCachedUserIdForUsername(username) {
     if (!username) return null;
     // Case-insensitive: the typed/scanned login value doesn't reliably match the ILS's
     // stored casing for cat_username/ils_barcode.
     const normalized = String(username).trim().toLowerCase();
     if (!normalized) return null;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT user_id FROM user_state
            WHERE LOWER(cat_username) = ? OR LOWER(ils_barcode) = ?
            LIMIT 1;`,
          [normalized, normalized]
     );
     return row?.user_id ?? null;
}

// ─── user_state: read ─────────────────────────────────────────────────────────

/**
 * Loads the user state row for the currently logged-in user.
 * Returns null if no current user is set, or no row exists yet for them.
 */
export async function loadUserState() {
     const userId = getCurrentUserId();
     if (userId == null) return null;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT * FROM user_state WHERE user_id = ? LIMIT 1;`,
          [userId]
     );

     if (!row) return null;

     // Merge: specific columns override anything in profile_json,
     // but profile_json fills in any extra fields not in individual columns.
     const profileJson = safeParse(row.profile_json) ?? {};

     const user = {
          ...profileJson,
          id: row.user_id ?? profileJson.id,
          displayName: row.display_name ?? profileJson.displayName,
          cat_name: row.cat_name ?? profileJson.cat_name,
          ils_barcode: row.ils_barcode ?? profileJson.ils_barcode,
          cat_username: row.cat_username ?? profileJson.cat_username,
          numCheckedOut: row.num_checked_out ?? profileJson.numCheckedOut,
          numOverdue: row.num_overdue ?? profileJson.numOverdue,
          numHolds: row.num_holds ?? profileJson.numHolds,
          numHoldsAvailable: row.num_holds_available ?? profileJson.numHoldsAvailable,
          numLists: row.num_lists ?? profileJson.numLists,
          numSavedSearches: row.num_saved_searches ?? profileJson.numSavedSearches,
          numSavedSearchesNew: row.num_saved_searches_new ?? profileJson.numSavedSearchesNew,
          numReadingHistory: row.num_reading_history ?? profileJson.numReadingHistory,
          numLinkedAccounts: row.num_linked_accounts ?? profileJson.numLinkedAccounts,
          numSavedEventsUpcoming: row.num_saved_events_upcoming ?? profileJson.numSavedEventsUpcoming,
          fines: row.fines ?? profileJson.fines,
          hasYearInReview: intToBool(row.has_year_in_review) ?? profileJson.hasYearInReview,
          yearInReviewName: row.year_in_review_name ?? profileJson.yearInReviewName,
          lastListUsed: row.last_list_used ?? profileJson.lastListUsed,
          hideSoftDeleteListUI: intToBool(row.hide_soft_delete_list_ui) ?? profileJson.hideSoftDeleteListUI,
          holdSortUnavailable: row.hold_sort_unavailable ?? profileJson.holdSortUnavailable,
          holdSortAvailable: row.hold_sort_available ?? profileJson.holdSortAvailable,
          checkoutSort: row.checkout_sort ?? profileJson.checkoutSort,
          interfaceLanguage: row.interface_language ?? profileJson.interfaceLanguage,
          pickupLocationId: row.pickup_location_id ?? profileJson.pickupLocationId,
          homeLocationId: row.home_location_id ?? profileJson.homeLocationId,
          alternateLibraryCard: row.alternate_library_card ?? profileJson.alternateLibraryCard,
          alternateLibraryCardPassword: row.alternate_library_card_password ?? profileJson.alternateLibraryCardPassword,
          rememberHoldPickupLocation: row.remember_hold_pickup_location ?? profileJson.rememberHoldPickupLocation,
          promptForHoldNotifications: intToBool(row.prompt_for_hold_notifications) ?? profileJson.promptForHoldNotifications,
     };

     return {
          updatedAt: row.updated_at,
          user,
          language: row.language,
          languageDisplayName: row.language_display_name,
          notificationOnboard: row.notification_onboard,
          expoToken: row.expo_token ?? false,
          seenNotificationOnboardPrompt: intToBool(row.seen_notification_onboard_prompt),
          userCheckoutSortMethod: row.checkout_sort_method,
          userHoldPendingSortMethod: row.hold_pending_sort_method,
          userHoldReadySortMethod: row.hold_ready_sort_method,
          preferredPickupLocationIsValid: intToBool(row.preferred_pickup_location_is_valid),
          preferredPickupLocationWarning: row.preferred_pickup_location_warning,
     };
}

// ─── Collection table helpers ─────────────────────────────────────────────────

async function upsertCollection(tableName, data) {
     const userId = getCurrentUserId();
     if (userId == null) {
          logDebugMessage(`${tableName}: no current user id, skipping save`);
          return;
     }

     const db = await getDb();
     await db.runAsync(
          `INSERT INTO ${tableName} (user_id, updated_at, payload) VALUES (?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET updated_at = excluded.updated_at, payload = excluded.payload;`,
          [userId, Date.now(), safeStringify(data)]
     );
}

async function fetchCollection(tableName) {
     const userId = getCurrentUserId();
     if (userId == null) return null;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT payload FROM ${tableName} WHERE user_id = ? LIMIT 1;`,
          [userId]
     );
     return safeParse(row?.payload);
}

// ─── Individual table operations ──────────────────────────────────────────────

export const saveAccounts = (data) => upsertCollection('user_accounts', data);
export const loadAccounts = () => fetchCollection('user_accounts');

export const saveViewers = (data) => upsertCollection('user_viewers', data);
export const loadViewers = () => fetchCollection('user_viewers');

export const saveLists = (data) => upsertCollection('user_lists', data);
export const loadLists = () => fetchCollection('user_lists');

export const saveListGroups = (data) => upsertCollection('user_list_groups', data);
export const loadListGroups = () => fetchCollection('user_list_groups');

export const saveLocations = (data) => upsertCollection('user_locations', data);
export const loadLocations = () => fetchCollection('user_locations');

export const saveReadingHistory = (data) => upsertCollection('user_reading_history', data);
export const loadReadingHistory = () => fetchCollection('user_reading_history');

export const saveSavedEvents = (data) => upsertCollection('user_saved_events', data);
export const loadSavedEvents = () => fetchCollection('user_saved_events');

export const saveCards = (data) => upsertCollection('user_cards', data);
export const loadCards = () => fetchCollection('user_cards');

export const saveNotificationSettings = (data) => upsertCollection('user_notification_settings', data);
export const loadNotificationSettings = () => fetchCollection('user_notification_settings');

export const saveAppPreferences = (data) => upsertCollection('user_app_preferences', data);
export const loadAppPreferences = () => fetchCollection('user_app_preferences');

export const saveDebugMessages = (data) => upsertCollection('user_debug_messages', data);
export const loadDebugMessages = () => fetchCollection('user_debug_messages');

export const saveNotificationHistory = (data) => upsertCollection('user_notification_history', data);
export const loadNotificationHistory = () => fetchCollection('user_notification_history');

export const saveInbox = (data) => upsertCollection('user_inbox', data);
export const loadInbox = () => fetchCollection('user_inbox');

export const saveSublocations = (data) => upsertCollection('user_sublocations', data);
export const loadSublocations = () => fetchCollection('user_sublocations');

export const saveSavedSearches = (data) => upsertCollection('user_saved_searches', data);
export const loadSavedSearches = () => fetchCollection('user_saved_searches');

// ─── Combined ─────────────────────────────────────────────────────────────────

const COLLECTION_TABLES = [
     'user_accounts', 'user_viewers', 'user_lists', 'user_list_groups',
     'user_locations', 'user_reading_history', 'user_saved_events', 'user_cards',
     'user_notification_settings', 'user_app_preferences', 'user_debug_messages',
     'user_notification_history', 'user_inbox', 'user_sublocations', 'user_saved_searches',
];

/**
 * Saves all user data in a single database transaction.
 * Used for initial full write on first login.
 */
export async function saveAllUserData(state = {}) {
     const userId = numberOrNull(state.user?.id) ?? getCurrentUserId();
     if (userId == null) {
          logDebugMessage('saveAllUserData: no current user id, skipping save');
          return;
     }
     setCurrentUserId(userId);

     // Not wrapped in a transaction: this can run alongside several other concurrent
     // SQLite hydration/fetch effects during login/app-startup, and expo-sqlite doesn't
     // support overlapping transactions on one connection ("cannot rollback - no
     // transaction is active" if two try to run at once). Each save below already targets
     // the same user_id row independently, so atomicity across them isn't needed here.
     const db = await getDb();
     const now = Date.now();
     await ensureUserStateRow(db, now, userId);

     await saveUserProfile(state.user ?? {});
     await saveUserSettings({
          language: state.language,
          languageDisplayName: state.languageDisplayName,
          notificationOnboard: state.notificationOnboard,
          expoToken: state.expoToken,
          seenNotificationOnboardPrompt: state.seenNotificationOnboardPrompt,
          userCheckoutSortMethod: state.userCheckoutSortMethod,
          userHoldPendingSortMethod: state.userHoldPendingSortMethod,
          userHoldReadySortMethod: state.userHoldReadySortMethod,
     });
     await savePickupLocationPrefs(state.preferredPickupLocationIsValid, state.preferredPickupLocationWarning);

     const collections = [
          ['user_accounts', state.accounts],
          ['user_viewers', state.viewers],
          ['user_lists', state.lists],
          ['user_list_groups', state.listGroups],
          ['user_locations', state.locations],
          ['user_reading_history', state.readingHistory],
          ['user_saved_events', state.savedEvents],
          ['user_cards', state.cards],
          ['user_notification_settings', state.notificationSettings],
          ['user_app_preferences', state.appPreferences],
          ['user_debug_messages', state.userDebugMessage],
          ['user_notification_history', state.notificationHistory],
          ['user_inbox', state.inbox],
          ['user_sublocations', state.sublocations],
          ['user_saved_searches', state.savedSearches],
     ];

     for (const [table, data] of collections) {
          await db.runAsync(
               `INSERT INTO ${table} (user_id, updated_at, payload) VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET updated_at = excluded.updated_at, payload = excluded.payload;`,
               [userId, now, safeStringify(data)]
          );
     }
}

/**
 * Loads all user data from each table in parallel.
 * Returns null if no user_state row exists for the current user.
 */
export async function loadAllUserData() {
     const stateRow = await loadUserState();
     if (!stateRow) return null;

     const [
          accounts, viewers, lists, listGroups, locations,
          readingHistory, savedEvents, cards, notificationSettings,
          appPreferences, userDebugMessage, notificationHistory,
          inbox, sublocations, savedSearches,
     ] = await Promise.all([
          loadAccounts(), loadViewers(), loadLists(), loadListGroups(), loadLocations(),
          loadReadingHistory(), loadSavedEvents(), loadCards(), loadNotificationSettings(),
          loadAppPreferences(), loadDebugMessages(), loadNotificationHistory(),
          loadInbox(), loadSublocations(), loadSavedSearches(),
     ]);

     return {
          ...stateRow,
          accounts, viewers, lists, listGroups, locations,
          readingHistory, savedEvents, cards, notificationSettings,
          appPreferences, userDebugMessage, notificationHistory,
          inbox, sublocations, savedSearches,
     };
}

/**
 * Deletes the current user's row from every user table.
 * Not used on logout (logout must not delete SQLite data) - kept for flows that
 * genuinely need to purge a patron's cached data, e.g. account removal.
 */
export async function clearAllUserData() {
     const userId = getCurrentUserId();
     if (userId == null) return;

     const db = await getDb();
     await db.runAsync(`DELETE FROM user_state WHERE user_id = ?;`, [userId]);
     for (const table of COLLECTION_TABLES) {
          await db.runAsync(`DELETE FROM ${table} WHERE user_id = ?;`, [userId]);
     }
}

/**
 * One-time backfill for installs upgrading from the pre-26.09.01 singleton-row schema.
 * Before this migration, only user_state had a user_id column - the collection tables'
 * single legacy row has user_id = NULL until this runs. Safe to call on every app start:
 * it only ever touches rows still missing a user_id, so it's a no-op afterward.
 */
export async function backfillLegacyUserId(userId) {
     const numericUserId = numberOrNull(userId);
     if (numericUserId == null) return;

     // Not wrapped in a transaction: this runs during app startup alongside several other
     // concurrent SQLite hydration/fetch effects, and expo-sqlite doesn't support
     // overlapping transactions on one connection ("cannot rollback - no transaction is
     // active" if two try to run at once). Each UPDATE below is already a self-contained,
     // idempotent, guarded statement, so atomicity across tables isn't needed here.
     const db = await getDb();
     for (const table of COLLECTION_TABLES) {
          // Guard against the unique(user_id) index: only claim the orphaned legacy
          // row if this user doesn't already have a real row (e.g. logged in fresh
          // post-migration on an earlier boot).
          await db.runAsync(
               `UPDATE ${table} SET user_id = ?
                 WHERE user_id IS NULL
                   AND NOT EXISTS (SELECT 1 FROM ${table} WHERE user_id = ?);`,
               [numericUserId, numericUserId]
          );
     }
}
