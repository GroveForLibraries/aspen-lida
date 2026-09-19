import { logDebugMessage, logErrorMessage, logInfoMessage, logWarnMessage } from '../util/logging';
import { LIBRARY, LOGIN_DATA, GLOBALS } from '../util/globals';
import { decode } from 'html-entities';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import chroma from 'chroma-js';

/** *******************************************************************
 * Aspen-specific
 ******************************************************************* **/
/**
 * Format the discovery version string returned by the API and update the library global variable if it has changed.
 * If the payload is undefined, log a warning and return the current version or 'Unknown' if it is not set.
 * @param payload
 * @returns {*|string}
 */
export function formatDiscoveryVersion(payload) {
     if (payload === undefined) {
          // skip trying to parse the version if it is undefined
          logDebugMessage('Could not load discovery version, the version was undefined. Something is wrong.');
          return LIBRARY.version ?? 'Unknown';
     }
     try {
          const result = payload.split(' ');
          if (Array.isArray(result) && result.length > 0) {
               if (LIBRARY.version !== result[0]) {
                    logInfoMessage('Updated LIBRARY.version to ' + result[0]);
                    LIBRARY.version = result[0];
                    return result[0];
               }
          }
     } catch (e) {
          logErrorMessage(e);
     }
     return LIBRARY.version ?? 'Unknown'; // if we couldn't parse the version (??), return the currently stored version or unknown
}

/**
 * Logout the user and clean up data
 * @param {object} queryClient - React Query client for invalidating queries
 * @param {boolean} preserveUsername - If true, keeps @userBarcode for convenience on login screen
 **/
export async function RemoveData(queryClient, preserveUsername = true) {
     let savedUsername = null;

     // Preserve username for user convenience on next login
     if (preserveUsername) {
          try {
               savedUsername = await AsyncStorage.getItem('@userBarcode');
          } catch (e) {
               logWarnMessage('Failed to read @userBarcode before logout');
          }
     }

     try {
          logDebugMessage('Removing Data in secure storage');
          SecureStore.deleteItemAsync('patronName');
          SecureStore.deleteItemAsync('library');
          SecureStore.deleteItemAsync('libraryName');
          SecureStore.deleteItemAsync('locationId');
          SecureStore.deleteItemAsync('solrScope');
          SecureStore.deleteItemAsync('pathUrl');
          SecureStore.deleteItemAsync('version');
          SecureStore.deleteItemAsync('userKey');
          SecureStore.deleteItemAsync('secretKey');
          SecureStore.deleteItemAsync('userToken');
          SecureStore.deleteItemAsync('logo');
          SecureStore.deleteItemAsync('favicon');

          logDebugMessage('Removing Data in async storage');
          await AsyncStorage.removeItem('@userToken');
          await AsyncStorage.removeItem('@patronProfile');
          await AsyncStorage.removeItem('@libraryInfo');
          await AsyncStorage.removeItem('@locationInfo');
          await AsyncStorage.removeItem('@pathUrl');
     } catch (e) {
          logErrorMessage('Error clearing storage');
          logErrorMessage(e);
     }

     logDebugMessage('Clearing Context information');
     // Keep LIBRARY global clear for backwards compatibility
     LIBRARY.url = null;
     LIBRARY.name = null;
     LIBRARY.favicon = null;
     LIBRARY.version = GLOBALS.appVersion;
     LIBRARY.languages = [];
     LIBRARY.localIll = [];
     LOGIN_DATA.showSelectLibrary = true;
     LOGIN_DATA.runGreenhouse = true;
     LOGIN_DATA.num = 0;
     LOGIN_DATA.nearbyLocations = [];
     LOGIN_DATA.allLocations = [];
     LOGIN_DATA.hasPendingChanges = false;
     LOGIN_DATA.loadedInitialData = false;
     LOGIN_DATA.themeSaved = false;

     try {
          if (queryClient !== null) {
               queryClient.invalidateQueries();
               logDebugMessage('Invalidated all queries');
          }
     } catch (e) {
          logErrorMessage('Error invalidating all queries');
          logErrorMessage(e);
     }

      try {
           const { clearAllUserData, resetAllLibrarySystemData, resetAllLibraryBranchData } = require('../util/db');
           await clearAllUserData();
           await resetAllLibrarySystemData();
           await resetAllLibraryBranchData();
           logDebugMessage('Cleared all SQLite data');
      } catch (e) {
           logErrorMessage('Error clearing data from SQLite');
           logErrorMessage(e);
      }

      // Restore username if it was preserved for user convenience
      if (preserveUsername && savedUsername) {
           try {
                await AsyncStorage.setItem('@userBarcode', savedUsername);
                logDebugMessage('Preserved username for next login');
           } catch (e) {
                logWarnMessage('Failed to preserve username for next login');
                logErrorMessage(e);
           }
      }

      logDebugMessage('Storage data cleansed.');
}

/** *******************************************************************
 * Handling URLs and query strings
 ******************************************************************* **/
/**
 * Decode a URL-encoded string
 * @param str
 * @returns {string}
 */
export function urldecode(str) {
     return decodeURIComponent(str.replace(/\+/g, ' '));
}

/**
 * Check if a string is a valid URL
 * @param {string} string - The string to validate
 * @returns {boolean} - True if valid URL, false otherwise
 */
export const isValidUrl = (string) => {
     try {
          new URL(string);
          return true;
     } catch (error) {
          return false;
     }
};

/** *******************************************************************
 * Handling HTML
 ******************************************************************* **/
/**
 * Remove HTML from a string
 **/
export function stripHTML(string) {
     return string.replace(/(<([^>]+)>)/gi, '');
}

/**
 * Normalize arbitrary text for display by optionally stripping HTML,
 * collapsing whitespace, and trimming leading/trailing spaces.
 */
export function normalizeDisplayText(value, options = {}) {
     const {
          stripHtml = true,
          collapseWhitespace = true,
          trim = true,
     } = options;

     let output = String(value ?? '');

     if (stripHtml) {
          output = stripHTML(output);
     }

     if (collapseWhitespace) {
          output = output.replace(/\s+/g, ' ');
     }

     if (trim) {
          output = output.trim();
     }

     return output;
}

/**
 * Decode HTML entities in a string
 **/
export function decodeHTML(string) {
     return decode(string);
}

/** *******************************************************************
 * Manipulate arrays, objects, strings, and numbers (replacing lodash)
 ******************************************************************* **/
/**
 * Convert input values to an array format, handling both array and object structures,
 * and returning a single value as an array if needed
 * @param values
 * @returns {*|unknown[]|*[]}
 */
export function toArray(values) {
     if (Array.isArray(values)) return values;
     if (values && typeof values === 'object') return Object.values(values);
     return [values];
}

/**
 * Returns true when the value is a non-null object and not an array.
 */
export function isPlainObject(value) {
     return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Truncate a string to a maximum length, appending an omission suffix if truncated.
 * Mirrors lodash _.truncate behaviour: the omission counts toward maxLength.
 * @param {string|null|undefined} str
 * @param {number} maxLength
 * @param {string} omission
 * @returns {string}
 */
export function truncate(str, maxLength, omission = '...') {
     if (str == null) return '';
     if (str.length <= maxLength) return str;
     return str.slice(0, maxLength - omission.length) + omission;
}

/**
 * Remove duplicate values from an array of primitive types (strings or numbers)
 * by converting to a Set and back to an array
 * @param arr
 * @returns {any[]}
 */
export function uniquePrimitiveArray(arr) {
     return [...new Set(arr)];
}

/**
 * Get a comparable value from an item based on a key or a function, handling both cases appropriately
 * @param item
 * @param keyOrFn
 * @returns {*}
 */
function getComparableValue(item, keyOrFn) {
     if (typeof keyOrFn === 'function') return keyOrFn(item);
     return item?.[keyOrFn];
}

/**
 * Normalize a value for sorting by converting it to a comparable format:
 * @param value
 * @returns {number|number|string}
 */
function normalizeForSort(value) {
     if (value == null) return '';
     if (typeof value === 'number') return value;
     if (typeof value === 'boolean') return value ? 1 : 0;
     return String(value).toLowerCase();
}

/**
 * Sort an array of items based on specified iteratees (keys or functions) and corresponding sort orders (ascending or descending).
 * @param items
 * @param iteratees
 * @param orders
 * @returns {*[]}
 */
export function orderByFields(items, iteratees = [], orders = []) {
     const arr = Array.isArray(items) ? [...items] : [];
     if (!arr.length) return arr;

     const keys = Array.isArray(iteratees) ? iteratees : [iteratees];
     const dirs = Array.isArray(orders) ? orders : [orders];

     return arr.sort((a, b) => {
          for (let i = 0; i < keys.length; i++) {
               const keyOrFn = keys[i];
               const dir = (dirs[i] ?? 'asc').toLowerCase() === 'desc' ? -1 : 1;

               const av = normalizeForSort(getComparableValue(a, keyOrFn));
               const bv = normalizeForSort(getComparableValue(b, keyOrFn));

               if (av < bv) return -1 * dir;
               if (av > bv) return 1 * dir;
          }
          return 0;
     });
}

/** *******************************************************************
 * Manipulate and format dates (replacing moment.js)
 ******************************************************************* **/
/**
 * Format a Unix timestamp (seconds) to a "MMM D, YYYY" string, e.g. "Jan 4, 2024".
 * Returns an empty string for falsy or invalid input.
 * @param {number|string} unixTimestamp - Unix timestamp in seconds
 * @returns {string}
 */
export function formatUnixDate(unixTimestamp) {
     if (!unixTimestamp) return '';
     const date = new Date(Number(unixTimestamp) * 1000);
     if (isNaN(date.getTime())) return '';
     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
     return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Format a date as a local YYYY-MM-DD string, ensuring that the month and day are zero-padded to two digits.
 * @param date
 * @returns {string}
 */
export function formatLocalDateYYYYMMDD(date = new Date()) {
     const year = date.getFullYear();
     const month = String(date.getMonth() + 1).padStart(2, '0');
     const day = String(date.getDate()).padStart(2, '0');
     return `${year}-${month}-${day}`;
}

/**
 * Add a specified number of days to a given date and return the new date object.
 * @param date
 * @param days
 * @returns {Date}
 */
export function addDays(date, days) {
     const next = new Date(date);
     next.setDate(next.getDate() + days);
     return next;
}

/**
 * Parse a value into a Date object, returning null if the value is null, empty, or cannot be parsed as a valid date.
 * @param value
 * @returns {null|Date}
 */
export function parseToDate(value) {
     if (value == null || value === '') return null;
     const parsed = new Date(value);
     return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** *******************************************************************
 * Color utilities
 ******************************************************************* **/
/**
 * Get the appropriate contrast text color (black or white) using chroma.js to determine the contrast ratio
 * and returning '#000000' for light backgrounds and '#FFFFFF' for dark backgrounds.
 * @param swatch
 * @returns {{}}
 */
export function generateSwatches(swatch) {
     const LIGHTNESS_MAP = [0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15, 0.05];
     const SATURATION_MAP = [0.32, 0.16, 0.08, 0.04, 0, 0, 0.04, 0.08, 0.16, 0.32];
     const HUE_MAP = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36];

     let primaryColor = swatch.replace('#', '');
     if (!chroma.valid(primaryColor)) {
          primaryColor = '#C70833';
     }
     const lightnessGoal = chroma(primaryColor).get('hsl.l');

     const closestLightness = LIGHTNESS_MAP.reduce((prev, curr) => (Math.abs(curr - lightnessGoal) < Math.abs(prev - lightnessGoal) ? curr : prev));

     const baseColorIndex = LIGHTNESS_MAP.findIndex((l) => l === closestLightness);

     const colors = LIGHTNESS_MAP.map((l) => chroma(primaryColor).set('hsl.l', l))
          .map((color) => chroma(color))
          .map((color, i) => {
               const saturationDelta = SATURATION_MAP[i] - SATURATION_MAP[baseColorIndex];
               return saturationDelta >= 0 ? color.saturate(saturationDelta) : color.desaturate(saturationDelta * -1);
          });

     const rawApiColor = chroma(primaryColor);
     const BASE_500_INDEX = 5;
     colors[BASE_500_INDEX] = rawApiColor;

     const object = {};
     let baseColor;
     let baseContrast;

     colors.forEach((color, i) => {
          const num = getColorNumber(i);
          const baseIndex = getColorNumber(baseColorIndex);

          if (baseIndex === num) {
               baseColor = color.hex();
               baseContrast = getContrastText(baseColor);
          }

          const numContrast = `${num}-text`;
          object[num] = color.hex();
          object[numContrast] = getContrastText(color);
     });

     object.base = baseColor;
     object.baseContrast = baseContrast;

     return object;
}

export const getColorNumber = (index) => (index === 0 ? 50 : index * 100);

export const getContrastText = (color) => {
     const WCAG_AA_THRESHOLD = 4.5; // WCAG AA minimum for normal text
     let ratioOnWhite = chroma.contrast(color, '#ffffff');
     let ratioOnBlack = chroma.contrast(color, '#000000');

     if (ratioOnBlack >= WCAG_AA_THRESHOLD) {
          return '#000000';
     }

     if (ratioOnWhite >= WCAG_AA_THRESHOLD) {
          return '#ffffff';
     }

     return ratioOnBlack > ratioOnWhite ? '#000000' : '#ffffff';
};

/** *******************************************************************
 * Error handling
 ******************************************************************* **/
/**
 * Check the problem code sent to display appropriate error message
 * @param code
 * @returns {{title: string, message: string}|null}
 */
export function problemCodeMap(code) {
     switch (code) {
          case 'CLIENT_ERROR':
               return {
                    title: "There's been a glitch",
                    message: "We're not quite sure what went wrong. Try reloading the page or come back later.",
               };
          case 'SERVER_ERROR':
               return {
                    title: 'Something went wrong',
                    message: 'Looks like our server encountered an internal error or misconfiguration and was unable to complete your request. Please try again in a while.',
               };
          case 'TIMEOUT_ERROR':
               return {
                    title: 'Connection timed out',
                    message: 'Looks like the server is taking to long to respond, this can be caused by either poor connectivity or an error with our servers. Please try again in a while.',
               };
          case 'CONNECTION_ERROR':
               return {
                    title: 'Problem connecting',
                    message: 'Check your internet connection and try again.',
               };
          case 'NETWORK_ERROR':
               return {
                    title: 'Problem connecting',
                    message: 'Looks like our servers are currently unavailable. Please try again in a while.',
               };
          case 'CANCEL_ERROR':
               return {
                    title: 'Something went wrong',
                    message: "We're not quite sure what went wrong so the request to our server was cancelled. Please try again in awhile.",
               };
          default:
               return null;
     }
}
