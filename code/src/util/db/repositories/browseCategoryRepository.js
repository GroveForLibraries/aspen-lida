import { getDb } from '../sqlite';
import { safeStringify } from '../serialize';
import { getCurrentUserId, getCurrentLocationId } from '../sessionContext';
import { logDebugMessage } from '../../logging';
import { numberOrNull, safeParse } from '../../../helpers/helpers';

const CACHE_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Browse categories are scoped to the (user, location) pair the patron is logged into -
 * a different location (or a different user) at the same location gets its own row, so
 * switching back to a previously-seen pair can reuse its cache instead of refetching.
 */
function getCurrentScope() {
     return { userId: getCurrentUserId(), locationId: getCurrentLocationId() };
}

async function ensureBrowseCategoryRow(db, now, userId, locationId) {
     if (userId == null || locationId == null) return;
     await db.runAsync(
          `INSERT INTO browse_category_state (user_id, location_id, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(user_id, location_id) DO NOTHING;`,
          [userId, locationId, now]
     );
}

async function ensureBrowseCategoryListRow(db, now, userId, locationId) {
     if (userId == null || locationId == null) return;
     await db.runAsync(
          `INSERT INTO browse_category_list (user_id, location_id, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(user_id, location_id) DO NOTHING;`,
          [userId, locationId, now]
     );
}

export function isCacheExpired(updatedAt) {
     if (!updatedAt) return true;
     return Date.now() - updatedAt > CACHE_DURATION_MS;
}

// ─── browse_category_state: Category display data ─────────────────────────────

/**
 * Saves the browse categories array and metadata.
 * Called when the home screen feed is fetched from API.
 */
export async function saveBrowseCategories(categories = []) {
     if (!Array.isArray(categories)) {
          return false;
     }
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) {
          logDebugMessage('saveBrowseCategories: no current user/location, skipping save');
          return false;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureBrowseCategoryRow(db, now, userId, locationId);
     await db.runAsync(
          `UPDATE browse_category_state SET
                updated_at = ?,
                categories_json = ?
           WHERE user_id = ? AND location_id = ?;`,
          [now, safeStringify(categories), userId, locationId]
     );
     return true;
}

/**
 * Loads the browse categories from database for the current (user, location) pair.
 * Returns an expired/empty result if there is no match, so callers fetch fresh data.
 */
export async function loadBrowseCategories() {
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) {
          return { data: [], updatedAt: 0, isExpired: true };
     }

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT categories_json, updated_at FROM browse_category_state WHERE user_id = ? AND location_id = ? LIMIT 1;`,
          [userId, locationId]
     );
     return {
          data: safeParse(row?.categories_json) ?? [],
          updatedAt: row?.updated_at ?? 0,
          isExpired: isCacheExpired(row?.updated_at),
     };
}

/**
 * Saves the maximum number of categories to display.
 */
export async function saveMaxCategories(maxNum = 5) {
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) {
          logDebugMessage('saveMaxCategories: no current user/location, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     const normalizedMax = numberOrNull(maxNum);
     const safeMax = normalizedMax && normalizedMax > 0 ? normalizedMax : 5;
     await ensureBrowseCategoryRow(db, now, userId, locationId);
     await db.runAsync(
          `UPDATE browse_category_state SET
                updated_at = ?,
                max_categories = ?
           WHERE user_id = ? AND location_id = ?;`,
           [now, safeMax, userId, locationId]
     );
}

/**
 * Loads the maximum number of categories from database.
 */
export async function loadMaxCategories() {
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) return 5;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT max_categories FROM browse_category_state WHERE user_id = ? AND location_id = ? LIMIT 1;`,
          [userId, locationId]
     );
     const value = numberOrNull(row?.max_categories);
     return value && value > 0 ? value : 5;
}

// ─── browse_category_list: User's available categories with visibility status ──

/**
 * Saves the list of available browse categories with visibility status.
 * Called when user manages browse categories.
 */
export async function saveBrowseCategoryList(list = []) {
     if (!Array.isArray(list)) {
          return false;
     }
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) {
          logDebugMessage('saveBrowseCategoryList: no current user/location, skipping save');
          return false;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureBrowseCategoryListRow(db, now, userId, locationId);
     await db.runAsync(
          `UPDATE browse_category_list SET
                updated_at = ?,
                list_json = ?
           WHERE user_id = ? AND location_id = ?;`,
          [now, safeStringify(list), userId, locationId]
     );
     return true;
}

/**
 * Loads the browse category list from database.
 */
export async function loadBrowseCategoryList() {
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) {
          return { data: [], updatedAt: 0, isExpired: true };
     }

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT list_json, updated_at FROM browse_category_list WHERE user_id = ? AND location_id = ? LIMIT 1;`,
          [userId, locationId]
     );
     return {
          data: safeParse(row?.list_json) ?? [],
          updatedAt: row?.updated_at ?? 0,
          isExpired: isCacheExpired(row?.updated_at),
     };
}

/**
 * Updates a single category's visibility status (optimistic update).
 * Used for immediate UI feedback when user toggles hide/show.
 */
export async function updateBrowseCategoryVisibility(categoryKey, isHidden) {
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) return false;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT list_json FROM browse_category_list WHERE user_id = ? AND location_id = ? LIMIT 1;`,
          [userId, locationId]
     );

     if (!row) return false;

     const list = safeParse(row.list_json) ?? [];
     const normalizedCategoryKey = String(categoryKey);
     const categoryIndex = list.findIndex((cat) =>
          String(cat?.key) === normalizedCategoryKey || String(cat?.sourceId) === normalizedCategoryKey
     );

     if (categoryIndex === -1) return false;

     list[categoryIndex].isHidden = isHidden;

     await db.runAsync(
          `UPDATE browse_category_list SET
                updated_at = ?,
                list_json = ?
           WHERE user_id = ? AND location_id = ?;`,
          [Date.now(), safeStringify(list), userId, locationId]
     );

     return true;
 }

/**
 * Updates multiple categories' visibility in one read/write cycle.
 * This avoids per-item SQLite writes when toggling grouped categories.
 */
export async function updateBrowseCategoryVisibilityBatch(categoryKeys = [], isHidden) {
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) return false;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT list_json FROM browse_category_list WHERE user_id = ? AND location_id = ? LIMIT 1;`,
          [userId, locationId]
     );

     if (!row) return false;

     const list = safeParse(row.list_json) ?? [];
     const keySet = new Set((Array.isArray(categoryKeys) ? categoryKeys : []).map((key) => String(key)));
     if (keySet.size === 0) {
          return false;
     }

     let didUpdate = false;
     const nextList = list.map((cat) => {
          const matches = keySet.has(String(cat?.key)) || keySet.has(String(cat?.sourceId));
          if (!matches) {
               return cat;
          }

          didUpdate = true;
          return {
               ...cat,
               isHidden,
          };
     });

     if (!didUpdate) return false;

     await db.runAsync(
          `UPDATE browse_category_list SET
                updated_at = ?,
                list_json = ?
           WHERE user_id = ? AND location_id = ?;`,
          [Date.now(), safeStringify(nextList), userId, locationId]
     );

     return true;
 }

// ─── Utility functions ─────────────────────────────────────────────────────────

/**
 * Saves all browse category data.
 * Used during app initialization.
 */
export async function saveAllBrowseCategoryData(state = {}) {
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) {
          logDebugMessage('saveAllBrowseCategoryData: no current user/location, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureBrowseCategoryRow(db, now, userId, locationId);
     await ensureBrowseCategoryListRow(db, now, userId, locationId);

     await saveBrowseCategories(state.categories ?? []);
     await saveMaxCategories(state.maxCategories ?? 5);
     await saveBrowseCategoryList(state.categoryList ?? []);
}

/**
 * Loads all browse category data from database for the current (user, location) pair.
 * Returns null if there's no matching row, so callers know to fetch fresh categories.
 */
export async function loadAllBrowseCategoryData() {
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) return null;

     const db = await getDb();
     const categoryRow = await db.getFirstAsync(
          `SELECT * FROM browse_category_state WHERE user_id = ? AND location_id = ? LIMIT 1;`,
          [userId, locationId]
     );
     const listRow = await db.getFirstAsync(
          `SELECT * FROM browse_category_list WHERE user_id = ? AND location_id = ? LIMIT 1;`,
          [userId, locationId]
     );

      if (!categoryRow && !listRow) return null;

      // Use the most recent update time between categories and list
      const categoryUpdatedAt = categoryRow?.updated_at ?? 0;
      const listUpdatedAt = listRow?.updated_at ?? 0;
      const mostRecentUpdatedAt = Math.max(categoryUpdatedAt, listUpdatedAt);

      return {
           categories: safeParse(categoryRow?.categories_json) ?? [],
           maxCategories: numberOrNull(categoryRow?.max_categories) ?? 5,
           categoryList: safeParse(listRow?.list_json) ?? [],
           categoriesUpdatedAt: categoryUpdatedAt,
           categoriesExpired: isCacheExpired(categoryRow?.updated_at),
           listUpdatedAt: listUpdatedAt,
           listExpired: isCacheExpired(listRow?.updated_at),
           updatedAt: mostRecentUpdatedAt,
      };
}

/**
 * Resets the current (user, location) pair's browse category data.
 * Not wired into logout (logout must not delete/clear SQLite data) - available for
 * flows that genuinely need to force a refetch for the current pair.
 */
export async function resetAllBrowseCategoryData() {
     const { userId, locationId } = getCurrentScope();
     if (userId == null || locationId == null) return;

     const db = await getDb();
     const now = Date.now();
     await db.runAsync(
          `UPDATE browse_category_state SET
                updated_at = ?,
                categories_json = NULL,
                max_categories = NULL
           WHERE user_id = ? AND location_id = ?;`,
          [now, userId, locationId]
     );
     await db.runAsync(
          `UPDATE browse_category_list SET
                updated_at = ?,
                list_json = NULL
           WHERE user_id = ? AND location_id = ?;`,
          [now, userId, locationId]
     );
}

/**
 * One-time backfill for installs upgrading from the pre-26.09.01 singleton-row schema.
 * The legacy row (if any) has user_id/location_id = NULL until this runs. Safe to call
 * on every app start: it only touches rows still missing both, so it's a no-op after.
 */
export async function backfillLegacyScope(userId, locationId) {
     const numericUserId = numberOrNull(userId);
     const numericLocationId = numberOrNull(locationId);
     if (numericUserId == null || numericLocationId == null) return;

     const db = await getDb();
     for (const table of ['browse_category_state', 'browse_category_list']) {
          await db.runAsync(
               `UPDATE ${table} SET user_id = ?, location_id = ?
                 WHERE user_id IS NULL AND location_id IS NULL
                   AND NOT EXISTS (
                        SELECT 1 FROM ${table} WHERE user_id = ? AND location_id = ?
                   );`,
               [numericUserId, numericLocationId, numericUserId, numericLocationId]
          );
     }
}
