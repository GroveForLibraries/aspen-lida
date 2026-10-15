import * as SecureStore from 'expo-secure-store';
import { getDb } from '../sqlite';
import { safeStringify } from '../serialize';
import { getCurrentUserId, setCurrentUserId } from '../sessionContext';
import { logDebugMessage } from '../../logging';
import { numberOrNull, safeParse } from '../../../helpers/helpers';
import { findCachedUserIdForUsername } from './userRepository';

const ROW_ID = 1;

async function resolveThemePreferenceUserId() {
     const currentUserId = numberOrNull(getCurrentUserId());
     if (currentUserId !== null) {
          return currentUserId;
     }

     const loginUserKey = await SecureStore.getItemAsync('userKey');
     const resolvedUserId = numberOrNull(await findCachedUserIdForUsername(loginUserKey ?? ''));
     if (resolvedUserId !== null) {
          setCurrentUserId(resolvedUserId);
     }
     return resolvedUserId;
}

async function ensureThemeRow(db, now) {
     await db.runAsync(`INSERT OR IGNORE INTO theme_state (id, updated_at) VALUES (?, ?);`, [ROW_ID, now]);
}

export async function saveThemeState(state = {}) {
     const db = await getDb();
     const now = Date.now();
     await ensureThemeRow(db, now);
     logDebugMessage('Saving Theme State');
     await db.runAsync(
          `UPDATE theme_state SET
                updated_at = ?,
                theme_id = ?,
                location_id = ?,
                color_mode = ?,
                theme_colors_json = ?,
                header_json = ?
           WHERE id = ?;`,
          [now, numberOrNull(state.themeId), numberOrNull(state.locationId), state.colorMode ?? null, safeStringify(state.themeColors ?? null), safeStringify(state.header ?? null), ROW_ID]
     );
}

export async function loadThemeState() {
     const db = await getDb();
     const row = await db.getFirstAsync(`SELECT * FROM theme_state WHERE id = ? LIMIT 1;`, [ROW_ID]);

     if (!row) return null;

     // Always derive textColor from colorMode so it can never be stale or inconsistent
     // regardless of what was stored (different code paths used different token formats).
     const colorMode = row.color_mode ?? 'light';

     return {
          themeId: row.theme_id ?? null,
          locationId: row.location_id ?? null,
          colorMode,
          textColor: colorMode === 'dark' ? '#e5e7eb' : '#57534e',
          themeColors: safeParse(row.theme_colors_json),
          header: safeParse(row.header_json),
          updatedAt: row.updated_at ?? 0,
     };
}

export async function saveThemeColors(themeColors, themeId, locationId, header) {
     const current = await loadThemeState();
     await saveThemeState({
          ...current,
          themeId: themeId ?? current?.themeId ?? null,
          locationId: locationId ?? current?.locationId ?? null,
          themeColors: themeColors ?? null,
          header: header ?? current?.header ?? null,
     });
}

export async function saveThemeColorMode(colorMode) {
     const current = await loadThemeState();
     await saveThemeState({
          ...current,
          colorMode,
     });
}

export async function resetThemeState() {
     const db = await getDb();
     const now = Date.now();
     await ensureThemeRow(db, now);
     await db.runAsync(
          `UPDATE theme_state SET
                updated_at = ?,
                theme_colors_json = NULL
           WHERE id = ?;`,
          [now, ROW_ID]
     );
}

export async function isStoredThemeIdMatch(themeId) {
     const current = await loadThemeState();
     const currentThemeId = numberOrNull(current?.themeId);
     const incomingThemeId = numberOrNull(themeId);
     if (incomingThemeId === null || currentThemeId === null) {
          return false;
     }
     return currentThemeId === incomingThemeId;
}

/**
 * Remove every stored theme catalog row across all locations.
 * Used when the library forces a single theme, so no stale per-location themes remain selectable.
 */
export async function clearThemeCatalog() {
     const db = await getDb();
     await db.runAsync(`DELETE FROM theme_catalog;`);
}

/**
 * Replace the stored theme catalog for a location with the given list of themes,
 * one row per theme, so the app can offer a theme switcher without a network round trip.
 * theme_id is the theme's own id as sent by getAspenLiDAThemesByLocation (not a local
 * surrogate key), so it can be used to requery that specific theme for updated data later.
 * @param locationId
 * @param themes
 */
// Not wrapped in a transaction: this can run concurrently with other startup/login SQLite
// work (e.g. a location's branch data being saved at the same time), and expo-sqlite
// doesn't support overlapping transactions on one connection ("cannot rollback - no
// transaction is active" if two try to run at once - previously left Loading.js hanging on
// a promise that never resolved). A theme catalog fetch for the same location running twice
// at once is not a realistic concurrent case in this app, and any transient inconsistency
// self-heals on the next fetch, so this is not worth the collision risk.
export async function saveThemeCatalog(locationId, themes = []) {
     const db = await getDb();
     const now = Date.now();
     const id = numberOrNull(locationId);
     if (id === null) return;

     await db.runAsync(`DELETE FROM theme_catalog WHERE location_id = ?;`, [id]);

     for (const theme of themes) {
          const themeId = numberOrNull(theme?.id);
          if (themeId === null) continue;

          await db.runAsync(
               `INSERT OR REPLACE INTO theme_catalog (
                     location_id, theme_id, updated_at, weight, name, base_mode, logo,
                     header_json, primary_json, secondary_json, tertiary_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
               [id, themeId, now, numberOrNull(theme?.weight) ?? 0, theme?.name ?? null, theme?.baseMode ?? null, theme?.logo ?? null, safeStringify(theme?.header ?? null), safeStringify(theme?.primary ?? null), safeStringify(theme?.secondary ?? null), safeStringify(theme?.tertiary ?? null)]
          );
     }
}

/**
 * Load the stored theme catalog for a location, ordered the same way it was fetched (by weight).
 * @param locationId
 * @returns {Promise<Array>}
 */
export async function loadThemeCatalog(locationId) {
     const db = await getDb();
     const id = numberOrNull(locationId);
     if (id === null) return [];

     const rows = await db.getAllAsync(`SELECT * FROM theme_catalog WHERE location_id = ? ORDER BY weight ASC, theme_id ASC;`, [id]);

     return (rows ?? []).map((row) => ({
          id: row.theme_id,
          themeId: row.theme_id,
          weight: row.weight ?? 0,
          name: row.name,
          baseMode: row.base_mode,
          logo: row.logo,
          header: safeParse(row.header_json),
          primary: safeParse(row.primary_json),
          secondary: safeParse(row.secondary_json),
          tertiary: safeParse(row.tertiary_json),
     }));
}

export async function saveUserThemePreference(locationId, themeId) {
     const normalizedUserId = await resolveThemePreferenceUserId();
     const normalizedLocationId = numberOrNull(locationId);
     const normalizedThemeId = numberOrNull(themeId);

     if (normalizedUserId === null || normalizedLocationId === null || normalizedThemeId === null) {
          logDebugMessage('saveUserThemePreference: missing userId, locationId, or themeId; skipping save');
          return;
     }

     const db = await getDb();
     const now = Date.now();

     await db.runAsync(
          `INSERT INTO user_theme_preferences (user_id, location_id, theme_id, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id, location_id)
           DO UPDATE SET
                theme_id = excluded.theme_id,
                updated_at = excluded.updated_at;`,
          [normalizedUserId, normalizedLocationId, normalizedThemeId, now]
     );
}

export async function loadUserThemePreference(locationId) {
     const normalizedUserId = await resolveThemePreferenceUserId();
     const normalizedLocationId = numberOrNull(locationId);

     if (normalizedUserId === null || normalizedLocationId === null) {
          return null;
     }

     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT user_id, location_id, theme_id, updated_at
             FROM user_theme_preferences
            WHERE user_id = ? AND location_id = ?
            LIMIT 1;`,
          [normalizedUserId, normalizedLocationId]
     );

     if (!row) return null;

     return {
          userId: row.user_id ?? null,
          locationId: row.location_id ?? null,
          themeId: row.theme_id ?? null,
          updatedAt: row.updated_at ?? 0,
     };
}

export async function clearUserThemePreference(locationId) {
     const normalizedUserId = await resolveThemePreferenceUserId();
     const normalizedLocationId = numberOrNull(locationId);

     if (normalizedUserId === null || normalizedLocationId === null) {
          return;
     }

     const db = await getDb();
     await db.runAsync(
          `DELETE FROM user_theme_preferences
            WHERE user_id = ? AND location_id = ?;`,
          [normalizedUserId, normalizedLocationId]
     );
}
