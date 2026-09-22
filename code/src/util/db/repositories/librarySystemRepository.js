import { getDb } from '../sqlite';
import { safeStringify } from '../serialize';
import { getCurrentLibraryId, setCurrentLibraryId } from '../sessionContext';
import { logDebugMessage } from '../../logging';
import { numberOrNull, safeParse } from '../../../helpers/helpers';

async function ensureLibrarySystemRow(db, now, libraryId) {
     if (libraryId == null) return;
     await db.runAsync(
          `INSERT INTO library_system_state (library_id, updated_at) VALUES (?, ?)
           ON CONFLICT(library_id) DO NOTHING;`,
          [libraryId, now]
     );
}

// ─── library_system_state: targeted partial saves ────────────────────────────

/**
 * Saves the library URL. Rows are keyed by library_id so a different library/system
 * gets its own row instead of overwriting this one.
 */
export async function saveLibraryUrl(url = '') {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) {
          logDebugMessage('saveLibraryUrl: no current library id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibrarySystemRow(db, now, libraryId);
     await db.runAsync(
          `UPDATE library_system_state SET
                updated_at = ?,
                url = ?
           WHERE library_id = ?;`,
          [now, url ?? null, libraryId]
     );
}

/**
 * Loads the library URL from database.
 */
export async function loadLibraryUrl() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return '';

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT url FROM library_system_state WHERE library_id = ? LIMIT 1;`,
          [libraryId]
     );
     return row?.url ?? '';
}

/**
 * Saves the library version.
 */
export async function saveLibraryVersion(version = '') {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) {
          logDebugMessage('saveLibraryVersion: no current library id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibrarySystemRow(db, now, libraryId);
     await db.runAsync(
          `UPDATE library_system_state SET
                updated_at = ?,
                version = ?
           WHERE library_id = ?;`,
          [now, version ?? null, libraryId]
     );
}

/**
 * Loads the library version from database.
 */
export async function loadLibraryVersion() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return '';

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT version FROM library_system_state WHERE library_id = ? LIMIT 1;`,
          [libraryId]
     );
     return row?.version ?? '';
}

/**
 * Saves available interface languages for the current library.
 */
export async function saveLibraryLanguages(languages = []) {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) {
          logDebugMessage('saveLibraryLanguages: no current library id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibrarySystemRow(db, now, libraryId);
     await db.runAsync(
          `UPDATE library_system_state SET
                updated_at = ?,
                languages_json = ?
           WHERE library_id = ?;`,
          [now, safeStringify(Array.isArray(languages) ? languages : []), libraryId]
     );
}

/**
 * Loads available interface languages for the current library.
 */
export async function loadLibraryLanguages() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return [];

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT languages_json FROM library_system_state WHERE library_id = ? LIMIT 1;`,
          [libraryId]
     );
     return safeParse(row?.languages_json) ?? [];
}

/**
 * Saves library metadata (name, favicon, library_id, languages, localIll).
 * Prefers the already-tracked current library id over metadata.libraryId: getLibraryInfo
 * (util/api/system.js) can silently retry with GLOBALS.libraryId and return that library's
 * data when the originally requested id comes back "Library not found"
 */
export async function saveLibraryMetadata(metadata = {}) {
     const libraryId = getCurrentLibraryId() ?? numberOrNull(metadata.libraryId);
     if (libraryId == null) {
          logDebugMessage('saveLibraryMetadata: no current library id, skipping save');
          return;
     }
     setCurrentLibraryId(libraryId);

     const db = await getDb();
     const now = Date.now();
     await ensureLibrarySystemRow(db, now, libraryId);
     await db.runAsync(
          `UPDATE library_system_state SET
                updated_at = ?,
                name = ?,
                favicon = ?,
                library_id = ?,
                languages_json = ?,
                local_ill_json = ?
           WHERE library_id = ?;`,
          [
               now,
               metadata.displayName ?? metadata.name ?? null,
               metadata.favicon ?? null,
               libraryId,
               safeStringify(metadata.languages ?? []),
               safeStringify(metadata.localIll ?? []),
               libraryId,
          ]
     );
}

/**
 * Loads library metadata from database.
 */
export async function loadLibraryMetadata() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return null;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT name, favicon, library_id, languages_json, local_ill_json FROM library_system_state WHERE library_id = ? LIMIT 1;`,
          [libraryId]
     );
     if (!row) return null;
     return {
          name: row.name ?? null,
          favicon: row.favicon ?? null,
          libraryId: row.library_id ?? null,
          languages: safeParse(row.languages_json) ?? [],
          localIll: safeParse(row.local_ill_json) ?? [],
     };
}

/**
 * Saves the complete library object (from getLibraryInfo API response).
 */
export async function saveLibrary(library = {}) {
     const libraryId = getCurrentLibraryId() ?? numberOrNull(library.libraryId);
     if (libraryId == null) {
          logDebugMessage('saveLibrary: no current library id, skipping save');
          return;
     }
     setCurrentLibraryId(libraryId);

     const db = await getDb();
     const now = Date.now();
     await ensureLibrarySystemRow(db, now, libraryId);
     await db.runAsync(
          `UPDATE library_system_state SET
                updated_at = ?,
                name = ?,
                favicon = ?,
                library_json = ?
           WHERE library_id = ?;`,
          [now, library.displayName ?? null, library.favicon ?? null, safeStringify(library), libraryId]
     );
}

/**
 * Loads the complete library object from database.
 */
export async function loadLibrary() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return {};

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT library_json FROM library_system_state WHERE library_id = ? LIMIT 1;`,
          [libraryId]
     );
     return safeParse(row?.library_json) ?? {};
}

/**
 * Saves menu links.
 */
export async function saveMenu(menu = []) {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) {
          logDebugMessage('saveMenu: no current library id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibrarySystemRow(db, now, libraryId);
     await db.runAsync(
          `UPDATE library_system_state SET
                updated_at = ?,
                menu_json = ?
           WHERE library_id = ?;`,
          [now, safeStringify(menu), libraryId]
     );
}

/**
 * Loads menu links from database.
 */
export async function loadMenu() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return [];

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT menu_json FROM library_system_state WHERE library_id = ? LIMIT 1;`,
          [libraryId]
     );
     return safeParse(row?.menu_json) ?? [];
}

/**
 * Saves catalog status and status message.
 */
export async function saveCatalogStatus(status = 0, message = '') {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) {
          logDebugMessage('saveCatalogStatus: no current library id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibrarySystemRow(db, now, libraryId);
     await db.runAsync(
          `UPDATE library_system_state SET
                updated_at = ?,
                catalog_status = ?,
                catalog_status_message = ?
           WHERE library_id = ?;`,
          [now, numberOrNull(status), message ?? null, libraryId]
     );
}

/**
 * Loads catalog status and message from database.
 */
export async function loadCatalogStatus() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return { status: 0, message: '' };

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT catalog_status, catalog_status_message FROM library_system_state WHERE library_id = ? LIMIT 1;`,
          [libraryId]
     );
     return {
          status: row?.catalog_status ?? 0,
          message: row?.catalog_status_message ?? '',
     };
}

/**
 * Saves home screen links.
 */
export async function saveHomeScreenLinks(links = []) {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) {
          logDebugMessage('saveHomeScreenLinks: no current library id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibrarySystemRow(db, now, libraryId);
     await db.runAsync(
          `UPDATE library_system_state SET
                updated_at = ?,
                home_screen_links_json = ?
           WHERE library_id = ?;`,
          [now, safeStringify(links), libraryId]
     );
}

/**
 * Loads home screen links from database.
 */
export async function loadHomeScreenLinks() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return [];

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT home_screen_links_json FROM library_system_state WHERE library_id = ? LIMIT 1;`,
          [libraryId]
     );
     return safeParse(row?.home_screen_links_json) ?? [];
}

/**
 * Saves app settings with URL/slug cache for staleness checking.
 */
export async function saveAppSettings(settings = {}, urlCache = '', slugCache = '') {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) {
          logDebugMessage('saveAppSettings: no current library id, skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();
     await ensureLibrarySystemRow(db, now, libraryId);
     await db.runAsync(
          `UPDATE library_system_state SET
                updated_at = ?,
                app_settings_json = ?,
                app_settings_url_cache = ?,
                app_settings_slug_cache = ?
           WHERE library_id = ?;`,
          [now, safeStringify(settings), urlCache ?? null, slugCache ?? null, libraryId]
     );
}

/**
 * Loads app settings with cache metadata from database.
 */
export async function loadAppSettings() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return null;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT app_settings_json, app_settings_url_cache, app_settings_slug_cache, updated_at FROM library_system_state WHERE library_id = ? LIMIT 1;`,
          [libraryId]
     );
     if (!row) return null;
     return {
          settings: safeParse(row.app_settings_json) ?? {},
          urlCache: row.app_settings_url_cache ?? '',
          slugCache: row.app_settings_slug_cache ?? '',
          updatedAt: row.updated_at ?? 0,
     };
}

// ─── Utility functions ─────────────────────────────────────────────────────────

/**
 * Saves all library system data.
 * Used when initializing library system data on app startup.
 */
export async function saveAllLibrarySystemData(state = {}) {
     // Prefers the already-tracked current library id over state.metadata/library.libraryId
     // for the same reason saveLibrary does - see its comment.
     const libraryId = getCurrentLibraryId() ?? numberOrNull(state.metadata?.libraryId ?? state.library?.libraryId);
     if (libraryId == null) {
          logDebugMessage('saveAllLibrarySystemData: no current library id, skipping save');
          return;
     }
     setCurrentLibraryId(libraryId);

     const db = await getDb();
     const now = Date.now();
     await ensureLibrarySystemRow(db, now, libraryId);

     await saveLibraryUrl(state.url ?? '');
     await saveLibraryVersion(state.version ?? '');
     await saveLibraryMetadata(state.metadata ?? {});
     await saveLibrary(state.library ?? {});
     await saveMenu(state.menu ?? []);
     await saveCatalogStatus(state.catalogStatus ?? 0, state.catalogStatusMessage ?? '');
     await saveHomeScreenLinks(state.homeScreenLinks ?? []);
     await saveAppSettings(
          state.appSettings ?? {},
          state.appSettingsUrlCache ?? '',
          state.appSettingsSlugCache ?? ''
     );
}

/**
 * Loads all library system data from database for the current library.
 */
export async function loadAllLibrarySystemData() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return null;

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT * FROM library_system_state WHERE library_id = ? LIMIT 1;`,
          [libraryId]
     );

     if (!row) return null;

     return {
          url: row.url ?? '',
          version: row.version ?? '',
          name: row.name ?? null,
          favicon: row.favicon ?? null,
          libraryId: row.library_id ?? null,
          languages: safeParse(row.languages_json) ?? [],
          localIll: safeParse(row.local_ill_json) ?? [],
          library: safeParse(row.library_json) ?? {},
          menu: safeParse(row.menu_json) ?? [],
          catalogStatus: row.catalog_status ?? 0,
          catalogStatusMessage: row.catalog_status_message ?? '',
          homeScreenLinks: safeParse(row.home_screen_links_json) ?? [],
          appSettings: safeParse(row.app_settings_json) ?? {},
          appSettingsUrlCache: row.app_settings_url_cache ?? '',
          appSettingsSlugCache: row.app_settings_slug_cache ?? '',
          updatedAt: row.updated_at ?? 0,
     };
}

/**
 * Resets the current library's system data.
 * Not wired into logout (logout must not delete/clear SQLite data) - available for
 * flows that genuinely need to force a refetch for the current library.
 */
export async function resetAllLibrarySystemData() {
     const libraryId = getCurrentLibraryId();
     if (libraryId == null) return;

     const db = await getDb();
     const now = Date.now();
     await db.runAsync(
          `UPDATE library_system_state SET
                updated_at = ?,
                url = NULL,
                name = NULL,
                favicon = NULL,
                version = NULL,
                languages_json = NULL,
                local_ill_json = NULL,
                library_json = NULL,
                menu_json = NULL,
                catalog_status = NULL,
                catalog_status_message = NULL,
                home_screen_links_json = NULL,
                app_settings_json = NULL,
                app_settings_url_cache = NULL,
                app_settings_slug_cache = NULL
           WHERE library_id = ?;`,
          [now, libraryId]
     );
}
