import { getDb } from '../sqlite';
import { safeStringify } from '../serialize';
import { getCurrentLocationId, setCurrentLocationId } from '../sessionContext';
import { logDebugMessage } from '../../logging';
import { boolToInt, intToBool, numberOrNull, safeParse } from '../../../helpers/helpers';

async function ensureLibraryBranchRow(db, now, locationId) {
     if (locationId == null) return;
     await db.runAsync(
          `INSERT INTO library_branch_state (location_id, updated_at) VALUES (?, ?)
           ON CONFLICT(location_id) DO NOTHING;`,
          [locationId, now]
     );
}

// ─── library_branch_state: targeted partial saves ─────────────────────────────

/**
 * Saves the current location (branch) object.
 * Called when location info is fetched from API. Rows are keyed by location_id so a
 * different branch/location gets its own row instead of overwriting this one.
 */
export async function saveLocation(location = {}) {
     const locationId = numberOrNull(location.locationId) ?? getCurrentLocationId();
     if (locationId == null) {
          logDebugMessage('saveLocation: no current location id, skipping save');
          return;
     }
     setCurrentLocationId(locationId);

     const db = await getDb();
     const now = Date.now();
     await ensureLibraryBranchRow(db, now, locationId);
     await db.runAsync(
          `UPDATE library_branch_state SET
                updated_at = ?,
                location_id = ?,
                display_name = ?,
                library_id = ?,
                is_main_branch = ?,
                solr_scope = ?,
                location_json = ?
           WHERE location_id = ?;`,
          [
               now,
               locationId,
               location.displayName ?? null,
               numberOrNull(location.libraryId),
               boolToInt(location.isMainBranch),
               location.solrScope ?? null,
               safeStringify(location),
               locationId,
          ]
     );
}

/**
 * Loads the current location from database.
 */
export async function loadLocation() {
     const locationId = getCurrentLocationId();
     if (locationId == null) return null;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT location_json FROM library_branch_state WHERE location_id = ? LIMIT 1;`,
          [locationId]
     );
     return safeParse(row?.location_json);
}

/**
 * Saves the search scope for the current location.
 */
export async function saveScope(scope = '') {
     const locationId = getCurrentLocationId();
     if (locationId == null) {
          logDebugMessage('saveScope: no current location id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibraryBranchRow(db, now, locationId);
     await db.runAsync(
          `UPDATE library_branch_state SET
                updated_at = ?,
                scope = ?
           WHERE location_id = ?;`,
          [now, scope ?? null, locationId]
     );
}

/**
 * Loads the search scope from database.
 */
export async function loadScope() {
     const locationId = getCurrentLocationId();
     if (locationId == null) return '';

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT scope FROM library_branch_state WHERE location_id = ? LIMIT 1;`,
          [locationId]
     );
     return row?.scope ?? '';
}

/**
 * Saves self-check enabled status.
 */
export async function saveSelfCheckEnabled(enabled = false) {
     const locationId = getCurrentLocationId();
     if (locationId == null) {
          logDebugMessage('saveSelfCheckEnabled: no current location id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibraryBranchRow(db, now, locationId);
     await db.runAsync(
          `UPDATE library_branch_state SET
                updated_at = ?,
                self_check_enabled = ?
           WHERE location_id = ?;`,
          [now, boolToInt(enabled), locationId]
     );
}

/**
 * Loads self-check enabled status from database.
 */
export async function loadSelfCheckEnabled() {
     const locationId = getCurrentLocationId();
     if (locationId == null) return null;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT self_check_enabled FROM library_branch_state WHERE location_id = ? LIMIT 1;`,
          [locationId]
     );
     return intToBool(row?.self_check_enabled);
}

/**
 * Saves self-check settings (barcode styles, keyboard type, etc.).
 */
export async function saveSelfCheckSettings(settings = {}) {
     const locationId = getCurrentLocationId();
     if (locationId == null) {
          logDebugMessage('saveSelfCheckSettings: no current location id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibraryBranchRow(db, now, locationId);
     await db.runAsync(
          `UPDATE library_branch_state SET
                updated_at = ?,
                self_check_settings_json = ?
           WHERE location_id = ?;`,
          [now, safeStringify(settings), locationId]
     );
}

/**
 * Loads self-check settings from database.
 */
export async function loadSelfCheckSettings() {
     const locationId = getCurrentLocationId();
     if (locationId == null) return {};

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT self_check_settings_json FROM library_branch_state WHERE location_id = ? LIMIT 1;`,
          [locationId]
     );
     return safeParse(row?.self_check_settings_json) ?? {};
}

/**
 * Saves all available locations (branches).
 * Stores as JSON array for easy retrieval.
 */
export async function saveLocations(locations = []) {
     const locationId = getCurrentLocationId();
     if (locationId == null) {
          logDebugMessage('saveLocations: no current location id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibraryBranchRow(db, now, locationId);
     await db.runAsync(
          `UPDATE library_branch_state SET
                updated_at = ?,
                locations_json = ?
           WHERE location_id = ?;`,
          [now, safeStringify(locations), locationId]
     );
}

/**
 * Loads all available locations from database.
 */
export async function loadLocations() {
     const locationId = getCurrentLocationId();
     if (locationId == null) return [];

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT locations_json FROM library_branch_state WHERE location_id = ? LIMIT 1;`,
          [locationId]
     );
     return safeParse(row?.locations_json) ?? [];
}

// ─── Utility functions ─────────────────────────────────────────────────────────

/**
 * Saves all library branch data.
 * Used when initializing library branch data on app startup.
 */
export async function saveAllLibraryBranchData(state = {}) {
     const locationId = numberOrNull(state.location?.locationId) ?? getCurrentLocationId();
     if (locationId == null) {
          logDebugMessage('saveAllLibraryBranchData: no current location id, skipping save');
          return;
     }
     setCurrentLocationId(locationId);

     const db = await getDb();
     const now = Date.now();
     await ensureLibraryBranchRow(db, now, locationId);

     await saveLocation(state.location ?? {});
     await saveScope(state.scope ?? '');
     if (Object.prototype.hasOwnProperty.call(state, 'enableSelfCheck')) {
          await saveSelfCheckEnabled(state.enableSelfCheck);
     }
     if (Object.prototype.hasOwnProperty.call(state, 'selfCheckSettings')) {
          await saveSelfCheckSettings(state.selfCheckSettings ?? {});
     }
     await saveLocations(state.locations ?? []);
}

/**
 * Loads all library branch data from database for the current location.
 */
export async function loadAllLibraryBranchData() {
     const locationId = getCurrentLocationId();
     if (locationId == null) return null;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT * FROM library_branch_state WHERE location_id = ? LIMIT 1;`,
          [locationId]
     );

     if (!row) return null;

     return {
          location: safeParse(row.location_json),
          scope: row.scope ?? '',
          enableSelfCheck: intToBool(row.self_check_enabled),
          selfCheckSettings: safeParse(row.self_check_settings_json) ?? {},
          locations: safeParse(row.locations_json) ?? [],
          updatedAt: row.updated_at ?? 0,
     };
}

/**
 * Resets the current location's library branch data.
 * Not wired into logout (logout must not delete/clear SQLite data) - available for
 * flows that genuinely need to force a refetch for the current location.
 */
export async function resetAllLibraryBranchData() {
     const locationId = getCurrentLocationId();
     if (locationId == null) return;

     const db = await getDb();
     const now = Date.now();
     await db.runAsync(
          `UPDATE library_branch_state SET
                updated_at = ?,
                display_name = NULL,
                library_id = NULL,
                is_main_branch = NULL,
                solr_scope = NULL,
                scope = NULL,
                self_check_enabled = NULL,
                location_json = NULL,
                self_check_settings_json = NULL,
                locations_json = NULL
           WHERE location_id = ?;`,
          [now, locationId]
     );
}
