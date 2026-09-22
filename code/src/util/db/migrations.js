import { getDb } from './sqlite';
import { logDebugMessage, logErrorMessage } from '../logging';

/**
 * Checks if the SQLite user_state table is empty (no rows).
 * This indicates that user data needs to be populated during migration.
 * @returns {Promise<boolean>} - True if user_state is empty, false otherwise
 */
export async function isUserDataEmpty() {
     try {
          const db = await getDb();
          // user_state is no longer a single id=1 row (26.09.01 made it multi-row, keyed by
          // user_id, so a second user logging in doesn't overwrite the first) - this just
          // needs to know whether the table has ever been populated for anyone at all.
          const result = await db.getFirstAsync(
               `SELECT COUNT(*) as count FROM user_state;`
          );
          const count = result?.count ?? 0;
          logDebugMessage(`SQLite migration check: user_state row exists = ${count > 0}`);
          return count === 0;
     } catch (error) {
          logErrorMessage('Error checking if user data is empty');
          logErrorMessage(error);
          // If we can't determine, assume it's empty to be safe
          return true;
     }
}

/**
 * Checks if migration is needed by verifying:
 * 1. User has a valid token
 * 2. User has stored credentials
 * 3. SQLite user_state table is empty
 * @returns {Promise<boolean>} - True if migration is needed
 */
export async function isSQLiteMigrationNeeded(userToken) {
     try {
          if (!userToken) {
               logDebugMessage('SQLite migration not needed: no user token');
               return false;
          }

          const isEmpty = await isUserDataEmpty();
          if (!isEmpty) {
               logDebugMessage('SQLite migration not needed: user_state has data');
               return false;
          }

          logDebugMessage('SQLite migration is needed');
          return true;
     } catch (error) {
          logErrorMessage('Error determining if migration is needed');
          logErrorMessage(error);
          return false;
     }
}

