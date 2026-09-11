import { getDb } from '../sqlite';
import { safeStringify } from '../serialize';
import {logDebugMessage} from "../../logging";

const ROW_ID = 1;

function numberOrNull(value) {
     const num = Number(value);
     return Number.isFinite(num) ? num : null;
}

function safeParse(json) {
     if (!json || typeof json !== 'string') return null;
     try {
          return JSON.parse(json);
     } catch {
          return null;
     }
}

async function ensureThemeRow(db, now) {
     await db.runAsync(
          `INSERT OR IGNORE INTO theme_state (id, updated_at) VALUES (?, ?);`,
          [ROW_ID, now]
     );
}

export async function saveThemeState(state = {}) {
     const db = await getDb();
     const now = Date.now();
     await ensureThemeRow(db, now);
     logDebugMessage("Saving Theme State");
     logDebugMessage(state);
     await db.runAsync(
          `UPDATE theme_state SET
                updated_at = ?,
                theme_id = ?,
                location_id = ?,
                color_mode = ?,
                theme_colors_json = ?,
                header_json = ?
           WHERE id = ?;`,
          [
               now,
               numberOrNull(state.themeId),
               numberOrNull(state.locationId),
               state.colorMode ?? null,
               safeStringify(state.themeColors ?? null),
               safeStringify(state.header ?? null),
               ROW_ID,
          ]
     );
}

export async function loadThemeState() {
     const db = await getDb();
     const row = await db.getFirstAsync(
          `SELECT * FROM theme_state WHERE id = ? LIMIT 1;`,
          [ROW_ID]
     );

     if (!row) return null;

     // Always derive textColor from colorMode so it can never be stale or inconsistent
     // regardless of what was stored (different code paths used different token formats).
     const colorMode = row.color_mode ?? 'light';
     const result = {
          themeId: row.theme_id ?? null,
          locationId: row.location_id ?? null,
          colorMode,
          textColor: colorMode === 'dark' ? '#e5e7eb' : '#57534e',
          themeColors: safeParse(row.theme_colors_json),
          header: safeParse(row.header_json),
          updatedAt: row.updated_at ?? 0,
     };
     //logDebugMessage("Loading theme state");
     //logDebugMessage(result);
     return result;
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
 * Replace the stored theme catalog for a location with the given list of themes,
 * one row per theme, so the app can offer a theme switcher without a network round trip.
 * theme_id is the theme's own id as sent by getAspenLiDAThemesByLocation (not a local
 * surrogate key), so it can be used to requery that specific theme for updated data later.
 * @param locationId
 * @param themes
 */
export async function saveThemeCatalog(locationId, themes = []) {
     const db = await getDb();
     const now = Date.now();
     const id = numberOrNull(locationId);
     if (id === null) return;

     await db.withTransactionAsync(async () => {
          await db.runAsync(`DELETE FROM theme_catalog WHERE location_id = ?;`, [id]);

          for (const theme of themes) {
               const themeId = numberOrNull(theme?.id);
               if (themeId === null) continue;

               await db.runAsync(
                    `INSERT OR REPLACE INTO theme_catalog (
                          location_id, theme_id, updated_at, weight, name, base_mode, logo,
                          header_json, primary_json, secondary_json, tertiary_json
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                    [
                         id,
                         themeId,
                         now,
                         numberOrNull(theme?.weight) ?? 0,
                         theme?.name ?? null,
                         theme?.baseMode ?? null,
                         theme?.logo ?? null,
                         safeStringify(theme?.header ?? null),
                         safeStringify(theme?.primary ?? null),
                         safeStringify(theme?.secondary ?? null),
                         safeStringify(theme?.tertiary ?? null),
                    ]
               );
          }
     });
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

     const rows = await db.getAllAsync(
          `SELECT * FROM theme_catalog WHERE location_id = ? ORDER BY weight ASC, theme_id ASC;`,
          [id]
     );

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
