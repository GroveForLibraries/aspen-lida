export const key = '26.10.00';

/**
 * Stores each user's selected theme per location.
 * This table does not duplicate theme data; it only stores the user's chosen theme_id
 * so the app can resolve that choice against theme_catalog on startup.
 *
 * Primary key:
 *   - one selected theme per (user_id, location_id)
 *
 * Columns:
 *   - user_id: owning patron/user
 *   - location_id: library location the preference applies to
 *   - theme_id: selected theme from theme_catalog
 *   - updated_at: last write timestamp
 *
 * @param db
 * @returns {Promise<void>}
 */
export async function up(db) {
     await db.execAsync(`
          CREATE TABLE IF NOT EXISTS user_theme_preferences (
               user_id INTEGER NOT NULL,
               location_id INTEGER NOT NULL,
               theme_id INTEGER NOT NULL,
               updated_at INTEGER NOT NULL,
               PRIMARY KEY (user_id, location_id)
          );

          CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_location
               ON user_theme_preferences(location_id);

          CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_theme
               ON user_theme_preferences(theme_id);
     `);
}
