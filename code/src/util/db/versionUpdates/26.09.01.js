export const key = '26.09.01';

const COLLECTION_TABLES = [
     'user_accounts', 'user_viewers', 'user_lists', 'user_list_groups',
     'user_locations', 'user_reading_history', 'user_saved_events', 'user_cards',
     'user_notification_settings', 'user_app_preferences', 'user_debug_messages',
     'user_notification_history', 'user_inbox', 'user_sublocations', 'user_saved_searches',
];

/**
 * Moves every login-identity cache table off the singleton-row pattern
 * and onto multi-row storage keyed by the identity that owns the row:
 *   - user_state + all user_* collection tables: keyed by user_id
 *   - browse_category_state / browse_category_list: keyed by (user_id, location_id)
 *   - library_branch_state: keyed by location_id (already an existing data column)
 *   - library_system_state: keyed by library_id (already an existing data column)
 *
 * This change ensures we're only loading data for the current location/library and user,
 * while paving the way for fast switching between users/locations
 *
 * SQLite can't drop a CHECK constraint via ALTER TABLE, so each table is rebuilt:
 * rename -> create the new shape -> copy data forward -> drop the old copy -> index.
 * user_id is a plain data column on every table it appears on - never a foreign key.
 * @param db
 * @returns {Promise<void>}
 */
export async function up(db) {
     // ─── user_state: drop CHECK(id=1), keep existing columns/order, add unique index ──
     await db.execAsync(`
          ALTER TABLE user_state RENAME TO user_state__old;

          CREATE TABLE user_state (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               updated_at INTEGER NOT NULL,
               user_id INTEGER,
               display_name TEXT,
               cat_name TEXT,
               ils_barcode TEXT,
               cat_username TEXT,
               num_checked_out INTEGER,
               num_overdue INTEGER,
               num_holds INTEGER,
               num_holds_available INTEGER,
               num_lists INTEGER,
               num_saved_searches INTEGER,
               num_saved_searches_new INTEGER,
               num_reading_history INTEGER,
               num_linked_accounts INTEGER,
               num_saved_events_upcoming INTEGER,
               fines TEXT,
               has_year_in_review INTEGER,
               year_in_review_name TEXT,
               last_list_used TEXT,
               hide_soft_delete_list_ui INTEGER,
               hold_sort_unavailable TEXT,
               hold_sort_available TEXT,
               checkout_sort TEXT,
               interface_language TEXT,
               pickup_location_id TEXT,
               home_location_id TEXT,
               alternate_library_card TEXT,
               alternate_library_card_password TEXT,
               remember_hold_pickup_location INTEGER,
               prompt_for_hold_notifications INTEGER,
               profile_json TEXT,
               language TEXT,
               language_display_name TEXT,
               notification_onboard INTEGER,
               expo_token TEXT,
               seen_notification_onboard_prompt INTEGER,
               checkout_sort_method TEXT,
               hold_pending_sort_method TEXT,
               hold_ready_sort_method TEXT,
               preferred_pickup_location_is_valid INTEGER,
               preferred_pickup_location_warning TEXT
          );

          INSERT INTO user_state SELECT * FROM user_state__old;
          DROP TABLE user_state__old;

          CREATE UNIQUE INDEX IF NOT EXISTS idx_user_state_user_id ON user_state(user_id);
     `);

     // ─── user_* collection tables: drop CHECK(id=1), append user_id, index it ──────────
     for (const table of COLLECTION_TABLES) {
          await db.execAsync(`
               ALTER TABLE ${table} RENAME TO ${table}__old;

               CREATE TABLE ${table} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    updated_at INTEGER NOT NULL,
                    payload TEXT,
                    user_id INTEGER
               );

               INSERT INTO ${table} (id, updated_at, payload)
                    SELECT id, updated_at, payload FROM ${table}__old;
               DROP TABLE ${table}__old;

               CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_user_id ON ${table}(user_id);
          `);
     }

     // ─── browse_category_state / browse_category_list: append (user_id, location_id) ──
     await db.execAsync(`
          ALTER TABLE browse_category_state RENAME TO browse_category_state__old;

          CREATE TABLE browse_category_state (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               updated_at INTEGER NOT NULL,
               categories_json TEXT,
               max_categories INTEGER,
               user_id INTEGER,
               location_id INTEGER
          );

          INSERT INTO browse_category_state (id, updated_at, categories_json, max_categories)
               SELECT id, updated_at, categories_json, max_categories FROM browse_category_state__old;
          DROP TABLE browse_category_state__old;

          CREATE UNIQUE INDEX IF NOT EXISTS idx_browse_category_state_user_location
               ON browse_category_state(user_id, location_id);

          ALTER TABLE browse_category_list RENAME TO browse_category_list__old;

          CREATE TABLE browse_category_list (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               updated_at INTEGER NOT NULL,
               list_json TEXT,
               user_id INTEGER,
               location_id INTEGER
          );

          INSERT INTO browse_category_list (id, updated_at, list_json)
               SELECT id, updated_at, list_json FROM browse_category_list__old;
          DROP TABLE browse_category_list__old;

          CREATE UNIQUE INDEX IF NOT EXISTS idx_browse_category_list_user_location
               ON browse_category_list(user_id, location_id);
     `);

     // ─── library_branch_state: drop CHECK(id=1), key on existing location_id column ───
     await db.execAsync(`
          ALTER TABLE library_branch_state RENAME TO library_branch_state__old;

          CREATE TABLE library_branch_state (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               updated_at INTEGER NOT NULL,
               location_id INTEGER,
               display_name TEXT,
               library_id INTEGER,
               is_main_branch INTEGER,
               solr_scope TEXT,
               scope TEXT,
               self_check_enabled INTEGER,
               location_json TEXT,
               self_check_settings_json TEXT,
               locations_json TEXT
          );

          INSERT INTO library_branch_state SELECT * FROM library_branch_state__old;
          DROP TABLE library_branch_state__old;

          CREATE UNIQUE INDEX IF NOT EXISTS idx_library_branch_state_location_id
               ON library_branch_state(location_id);
     `);

     // ─── library_system_state: drop CHECK(id=1), key on existing library_id column ────
     await db.execAsync(`
          ALTER TABLE library_system_state RENAME TO library_system_state__old;

          CREATE TABLE library_system_state (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               updated_at INTEGER NOT NULL,
               url TEXT,
               name TEXT,
               favicon TEXT,
               library_id INTEGER,
               version TEXT,
               languages_json TEXT,
               local_ill_json TEXT,
               library_json TEXT,
               menu_json TEXT,
               catalog_status INTEGER,
               catalog_status_message TEXT,
               home_screen_links_json TEXT,
               app_settings_json TEXT,
               app_settings_url_cache TEXT,
               app_settings_slug_cache TEXT
          );

          INSERT INTO library_system_state SELECT * FROM library_system_state__old;
          DROP TABLE library_system_state__old;

          CREATE UNIQUE INDEX IF NOT EXISTS idx_library_system_state_library_id
               ON library_system_state(library_id);
     `);
}
