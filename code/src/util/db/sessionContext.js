/**
 * In-memory pointer to "who/where is currently logged in," used by the repository
 * layer to scope reads/writes on the multi-row user/browse-category/library caches
 * to the right row without changing every call site's function signature.
 *
 * This is intentionally not persisted here - LoginForm/Loading/Splash set it from
 * the SecureStore/AsyncStorage values (and GLOBALS.libraryId for branded builds)
 * that already track the logged-in identity across app restarts. Logging out clears
 * it so the next login can't accidentally read a previous user's cached rows, without
 * deleting any SQLite data.
 */

import { numberOrNull } from '../../helpers/helpers';

let currentUserId = null;
let currentLocationId = null;
let currentLibraryId = null;

/**
 * Sets the current user id for scoping repository reads/writes to the right row in the user_state table. This is set on login and cleared on logout.
 * @param userId
 */
export function setCurrentUserId(userId) {
     currentUserId = numberOrNull(userId);
}

/**
 * Gets the current user id for scoping repository reads/writes to the right row in the user_state table. This is set on login and cleared on logout.
 * @returns {null}
 */
export function getCurrentUserId() {
     return currentUserId;
}

/**
 * Sets the current location id for scoping repository reads/writes to the right row in the library_branch_state table. This is set on login and cleared on logout.
 * @param locationId
 */
export function setCurrentLocationId(locationId) {
     currentLocationId = numberOrNull(locationId);
}

/**
 * Gets the current location id for scoping repository reads/writes to the right row in the library_branch_state table. This is set on login and cleared on logout.
 * @returns {null}
 */
export function getCurrentLocationId() {
     return currentLocationId;
}

/**
 * Sets the current library id for scoping repository reads/writes to the right row in the library_state table. This is set on login and cleared on logout.
 * @param libraryId
 */
export function setCurrentLibraryId(libraryId) {
     currentLibraryId = numberOrNull(libraryId);
}

/**
 * Gets the current library id for scoping repository reads/writes to the right row in the library_state table. This is set on login and cleared on logout.
 * @returns {null}
 */
export function getCurrentLibraryId() {
     return currentLibraryId;
}

/**
 * Forgets the current user/location/library identity. Called on logout - it does not
 * touch any SQLite rows, it just stops the next login from being able to match them.
 */
export function clearSessionContext() {
     currentUserId = null;
     currentLocationId = null;
     currentLibraryId = null;
}
