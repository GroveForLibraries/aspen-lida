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
          logWarnMessage('Could not load discovery version, the version was undefined. Something is wrong.');
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
 * Manipulate arrays, objects, strings, and numbers
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
 * Remove duplicate values from an array of primitive types (strings or numbers)
 * by converting to a Set and back to an array
 * @param arr
 * @returns {any[]}
 */
export function uniquePrimitiveArray(arr) {
     return [...new Set(arr)];
}

/**
 * Truncate a string to a maximum length, appending an omission suffix if truncated.
 * The omission suffix counts toward maxLength.
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

function escapeRegExp(string) {
     return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createPropertyMatcher(property, value) {
     return (item) => item?.[property] === value;
}

function createTruthyPropertyMatcher(property) {
     return (item) => Boolean(item?.[property]);
}

function matchesObjectProperties(item, predicate) {
     return Object.entries(predicate).every(([key, value]) => item?.[key] === value);
}

function resolveCollectionPredicate(predicate, options = {}) {
     const { allowStringProperty = false } = options;

     if (Array.isArray(predicate) && predicate.length >= 2) {
          return createPropertyMatcher(predicate[0], predicate[1]);
     }

     if (typeof predicate === 'string' && allowStringProperty) {
          return createTruthyPropertyMatcher(predicate);
     }

     if (isPlainObject(predicate)) {
          return (item) => matchesObjectProperties(item, predicate);
     }

     if (typeof predicate === 'function') {
          return predicate;
     }

     return null;
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

/**
 * Returns true when a value is object-like, including arrays.
 * @param value
 * @returns {boolean}
 */
export function isObjectLike(value) {
     return value !== null && typeof value === 'object';
}

/**
 * Returns true when a value is a non-null object and not an array.
 * @param value
 * @returns {boolean}
 */
export const isObject = isPlainObject;

/**
 * Returns true when a value is a finite number.
 * @param value
 * @returns {boolean}
 */
export function isNumber(value) {
     return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Returns true when a value is empty: null/undefined, an empty string, an empty
 * array, or a plain object with no own enumerable keys.
 * @param value
 * @returns {boolean}
 */
export function isEmpty(value) {
     if (value == null) return true;
     if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
     if (typeof value === 'object') return Object.keys(value).length === 0;
     return false;
}

/**
 * Returns the size of an array, string, array-like object, or plain object.
 * @param value
 * @returns {number}
 */
export function size(value) {
     if (value == null) return 0;
     if (typeof value === 'string' || Array.isArray(value)) return value.length;
     if (isObjectLike(value) && typeof value.length === 'number' && Number.isInteger(value.length) && value.length >= 0) return value.length;
     if (isObjectLike(value)) return Object.keys(value).length;
     return 0;
}

/**
 * Recursively merge own enumerable properties of the source objects into the target,
 * mutating and returning the target. Nested plain objects are merged recursively,
 * undefined source values never overwrite existing target values, and all other
 * values (including arrays) are assigned directly rather than merged by index.
 * @param target
 * @param sources
 * @returns {*}
 */
export function mergeDeep(target, ...sources) {
     for (const source of sources) {
          if (!isPlainObject(source)) continue;
          for (const key of Object.keys(source)) {
               const sourceValue = source[key];
               if (sourceValue === undefined) continue;
               if (isPlainObject(sourceValue) && isPlainObject(target[key])) {
                    mergeDeep(target[key], sourceValue);
               } else {
                    target[key] = sourceValue;
               }
          }
     }
     return target;
}

/**
 * Deep-merge source objects into a new object and return the clone.
 * @param sources
 * @returns {{}|*}
 */
export function mergeIntoNew(...sources) {
     return mergeDeep({}, ...sources);
}

/**
 * Deep-equality check for plain objects, arrays, and primitives.
 * @param a
 * @param b
 * @returns {boolean}
 */
export function isEqual(a, b) {
     if (a === b) return true;
     if (Array.isArray(a) || Array.isArray(b)) {
          if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
          return a.every((value, index) => isEqual(value, b[index]));
     }
     if (isPlainObject(a) && isPlainObject(b)) {
          const aKeys = Object.keys(a);
          const bKeys = Object.keys(b);
          if (aKeys.length !== bKeys.length) return false;
          return aKeys.every((key) => isEqual(a[key], b[key]));
     }
     return false;
 }

/**
 * Maps arrays or object values with a shared iteratee.
 * For objects, the iteratee receives (value, key, collection).
 * @param collection
 * @param iteratee
 * @returns {Array}
 */
function mapCollection(collection, iteratee) {
     if (Array.isArray(collection)) {
          return collection.map((item, index, array) => iteratee(item, index, array));
     }

     if (isObjectLike(collection)) {
          return Object.entries(collection).map(([key, value]) => iteratee(value, key, collection));
     }

     return [];
}

/**
 * Iterates arrays or object values with a shared iteratee.
 * For objects, the iteratee receives (value, key, collection).
 * @param collection
 * @param iteratee
 */
function forEachCollection(collection, iteratee) {
     if (Array.isArray(collection)) {
          collection.forEach((item, index, array) => iteratee(item, index, array));
          return;
     }

     if (isObjectLike(collection)) {
          Object.entries(collection).forEach(([key, value]) => iteratee(value, key, collection));
     }
}

/**
 * Find the first item in an array-like collection whose given property strictly
 * equals value.
 * @param arr
 * @param property
 * @param value
 * @returns {*}
 */
export function findByProperty(arr, property, value) {
     return toArray(arr).find(createPropertyMatcher(property, value));
}

/**
 * Return an item from an array-like collection by index.
 * @param arr
 * @param index
 * @returns {*}
 */
export function getItemAtIndex(arr, index) {
     return toArray(arr)[index];
}

/**
 * Safely read a nested property path from an object.
 * @param value
 * @param path
 * @param defaultValue
 * @returns {*}
 */
export function getProperty(value, path, defaultValue = undefined) {
     const keys = Array.isArray(path) ? path : String(path ?? '').split('.').filter(Boolean);
     let current = value;

     for (const key of keys) {
          if (current == null) {
               return defaultValue;
          }
          current = current[key];
     }

     return current === undefined ? defaultValue : current;
}

/**
 * Return a shallow-cloned object or array with the provided property path set.
 * @param value
 * @param path
 * @param nextValue
 * @returns {*}
 */
export function setProperty(value, path, nextValue) {
     const keys = Array.isArray(path) ? path : String(path ?? '').split('.').filter(Boolean);
     if (keys.length === 0) return value;

     const root = Array.isArray(value) ? [...value] : { ...(value ?? {}) };
     let target = root;
     let source = value ?? {};

     for (let index = 0; index < keys.length - 1; index++) {
          const key = keys[index];
          const sourceValue = source?.[key];
          const clonedValue = Array.isArray(sourceValue) ? [...sourceValue] : { ...(sourceValue ?? {}) };
          target[key] = clonedValue;
          target = clonedValue;
          source = sourceValue ?? {};
     }

     target[keys[keys.length - 1]] = nextValue;
     return root;
}

/**
 * Concatenate values into a new array.
 * @param firstValue
 * @param values
 * @returns {Array}
 */
export function concatValues(firstValue, ...values) {
     const result = Array.isArray(firstValue) ? [...firstValue] : [firstValue];

     values.forEach((value) => {
          if (Array.isArray(value)) {
               result.push(...value);
          } else {
               result.push(value);
          }
     });

     return result;
}

/**
 * Remove falsey values from a collection.
 * @param values
 * @returns {Array}
 */
export function compactValues(values) {
     return toArray(values).filter(Boolean);
}

/**
 * Returns the keys of an object, or an empty array.
 * @param value
 * @returns {string[]}
 */
export function objectKeys(value) {
     return isObjectLike(value) ? Object.keys(value) : [];
}

/**
 * Lower-case text with camelCase, snake_case, and kebab-case spacing normalized.
 * @param value
 * @returns {string}
 */
export function lowerCaseText(value) {
     return String(value ?? '')
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/[_-]+/g, ' ')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ');
}

/**
 * Returns a random item from a collection.
 * @param values
 * @returns {*}
 */
export function sampleValue(values) {
     const arr = toArray(values);
     if (arr.length === 0) return undefined;
     return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Trims the provided characters from both sides of a string.
 * @param value
 * @param characters
 * @returns {string}
 */
export function trimCharacters(value, characters = ' ') {
     const pattern = new RegExp(`^[${escapeRegExp(characters)}]+|[${escapeRegExp(characters)}]+$`, 'g');
     return String(value ?? '').replace(pattern, '');
}

/**
 * Trims the provided characters from the start of a string.
 * @param value
 * @param characters
 * @returns {string}
 */
export function trimStartCharacters(value, characters = ' ') {
     const pattern = new RegExp(`^[${escapeRegExp(characters)}]+`, 'g');
     return String(value ?? '').replace(pattern, '');
}

/**
 * Trims the provided characters from the end of a string.
 * @param value
 * @param characters
 * @returns {string}
 */
export function trimEndCharacters(value, characters = ' ') {
     const pattern = new RegExp(`[${escapeRegExp(characters)}]+$`, 'g');
     return String(value ?? '').replace(pattern, '');
}

/**
 * Split a string value into parts.
 * @param value
 * @param separator
 * @returns {string[]}
 */
export function splitString(value, separator) {
     return String(value ?? '').split(separator);
}

export const isArray = Array.isArray;
export const merge = mergeDeep;
export const map = mapCollection;
export const forEach = forEachCollection;
export const find = (collection, predicate) => {
     const matcher = resolveCollectionPredicate(predicate, { allowStringProperty: true });
     return matcher ? toArray(collection).find(matcher) : undefined;
};
export const filter = (collection, predicate) => {
     const matcher = resolveCollectionPredicate(predicate, { allowStringProperty: true });
     return matcher ? toArray(collection).filter(matcher) : [];
};
export const matchesProperty = createPropertyMatcher;
export const sortBy = (collection, iteratees) => {
     const keys = Array.isArray(iteratees) ? iteratees : [iteratees];
     return orderByFields(collection, keys, keys.map(() => 'asc'));
};
export const concat = concatValues;
export const findIndex = (collection, predicate) => {
     const matcher = resolveCollectionPredicate(predicate);
     return matcher ? toArray(collection).findIndex(matcher) : -1;
};
export const nth = getItemAtIndex;
export const get = getProperty;
export const set = setProperty;
export const lowerCase = lowerCaseText;
export const sample = sampleValue;
export const trim = trimCharacters;
export const trimStart = trimStartCharacters;
export const trimEnd = trimEndCharacters;
export const split = splitString;
export const compact = compactValues;
export const keys = objectKeys;

/** *******************************************************************
 * Manipulate and format dates (replacing moment.js)
 ******************************************************************* **/
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isValidDateInstance(value) {
     return value instanceof Date && !Number.isNaN(value.getTime());
}

function coerceToDate(value) {
     if (isValidDateInstance(value)) {
          return value;
     }

     if (typeof value === 'string') {
          const localDate = parseLocalDateString(value);
          if (localDate) {
               return localDate;
          }
     }

     const parsed = new Date(value);
     return isValidDateInstance(parsed) ? parsed : null;
}

function padDateValue(value) {
     return String(value).padStart(2, '0');
}

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
     return formatDateShort(date);
}

/**
 * Format a date as "MMM D, YYYY".
 * @param date
 * @returns {string}
 */
export function formatDateShort(date) {
     const resolvedDate = coerceToDate(date);
     if (!resolvedDate) return '';
     return `${MONTH_NAMES_SHORT[resolvedDate.getMonth()]} ${resolvedDate.getDate()}, ${resolvedDate.getFullYear()}`;
}

/**
 * Format a date as "dddd, MMMM D, YYYY".
 * @param date
 * @returns {string}
 */
export function formatDateFull(date) {
     const resolvedDate = coerceToDate(date);
     if (!resolvedDate) return '';
     return `${DAY_NAMES_LONG[resolvedDate.getDay()]}, ${MONTH_NAMES_LONG[resolvedDate.getMonth()]} ${resolvedDate.getDate()}, ${resolvedDate.getFullYear()}`;
}

/**
 * Format a date as "h:mm A".
 * @param date
 * @returns {string}
 */
export function formatTime(date) {
     const resolvedDate = coerceToDate(date);
     if (!resolvedDate) return '';
     const hours = resolvedDate.getHours();
     const displayHour = hours % 12 || 12;
     const minutes = padDateValue(resolvedDate.getMinutes());
     const period = hours >= 12 ? 'PM' : 'AM';
     return `${displayHour}:${minutes} ${period}`;
}

/**
 * Format a date as "MM/DD/YYYY".
 * @param date
 * @returns {string}
 */
export function formatDateUs(date) {
     const resolvedDate = coerceToDate(date);
     if (!resolvedDate) return '';
     return `${padDateValue(resolvedDate.getMonth() + 1)}/${padDateValue(resolvedDate.getDate())}/${resolvedDate.getFullYear()}`;
}

/**
 * Format a date as a local "YYYY-MM-DDTHH:mm:ss" string.
 * @param date
 * @returns {string}
 */
export function formatFacetDateTime(date) {
     const resolvedDate = coerceToDate(date);
     if (!resolvedDate) return '';
     return `${resolvedDate.getFullYear()}-${padDateValue(resolvedDate.getMonth() + 1)}-${padDateValue(resolvedDate.getDate())}T${padDateValue(resolvedDate.getHours())}:${padDateValue(resolvedDate.getMinutes())}:${padDateValue(resolvedDate.getSeconds())}`;
}

/**
 * Return a new Date set to the provided time on the provided base date.
 * @param hours
 * @param minutes
 * @param baseDate
 * @param seconds
 * @returns {Date|null}
 */
export function createTimeOnDate(hours, minutes, baseDate = new Date(), seconds = 0) {
     const resolvedBaseDate = coerceToDate(baseDate);
     if (!resolvedBaseDate) return null;
     const next = new Date(resolvedBaseDate.getTime());
     next.setHours(Number(hours) || 0, Number(minutes) || 0, Number(seconds) || 0, 0);
     return next;
}

/**
 * Parse a local YYYY-MM-DD string without timezone conversion.
 * @param value
 * @returns {Date|null}
 */
export function parseLocalDateString(value) {
     if (isValidDateInstance(value)) {
          return new Date(value.getTime());
     }

     if (typeof value !== 'string') return null;

     const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
     if (!match) return null;

     const year = Number(match[1]);
     const monthIndex = Number(match[2]) - 1;
     const day = Number(match[3]);
     const parsed = new Date(year, monthIndex, day);

     if (parsed.getFullYear() !== year || parsed.getMonth() !== monthIndex || parsed.getDate() !== day) {
          return null;
     }

     return parsed;
}

/**
 * Parse an HH:mm or HH:mm:ss time string onto a base date.
 * @param value
 * @param baseDate
 * @returns {Date|null}
 */
export function parseTimeOnDate(value, baseDate = new Date()) {
     if (typeof value !== 'string') return null;

     const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
     if (!match) return null;

     return createTimeOnDate(match[1], match[2], baseDate, match[3] ?? 0);
}

/**
 * Parse an event API date-time string such as "YYYY-MM-DD HH:mm:ss" as a local Date.
 * @param value
 * @returns {Date|null}
 */
export function parseEventDateTime(value) {
     if (isValidDateInstance(value)) {
          return new Date(value.getTime());
     }

     if (typeof value !== 'string') return null;

     const normalized = value.trim().replace('T', ' ');
     const match = normalized.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})(?::(\d{2}))?$/);
     if (match) {
          const baseDate = parseLocalDateString(match[1]);
          if (!baseDate) return null;
          return parseTimeOnDate(`${match[2]}:${match[3] ?? '00'}`, baseDate);
     }

     return parseToDate(value);
}

/**
 * Build shared display values for event start/end date-time strings.
 * @param startValue
 * @param endValue
 * @returns {{startDate: Date|null, endDate: Date|null, displayDay: string, displayStartTime: string, displayEndTime: string}}
 */
export function getEventDateDisplayData(startValue, endValue = null) {
     const startDate = parseEventDateTime(startValue);
     const endDate = parseEventDateTime(endValue);

     return {
          startDate,
          endDate,
          displayDay: startDate ? formatDateFull(startDate) : '',
          displayStartTime: startDate ? formatTime(startDate) : '',
          displayEndTime: endDate ? formatTime(endDate) : '',
     };
}

/**
 * Get the full English day name for a date.
 * @param date
 * @returns {string}
 */
export function getDayName(date) {
     const resolvedDate = coerceToDate(date);
     if (!resolvedDate) return '';
     return DAY_NAMES_LONG[resolvedDate.getDay()];
}

/**
 * Get the numeric day of week (0-6).
 * @param date
 * @returns {number}
 */
export function getNumericDayOfWeek(date = new Date()) {
     const resolvedDate = coerceToDate(date);
     return resolvedDate ? resolvedDate.getDay() : NaN;
}

/**
 * Compare whether dateA is before dateB.
 * @param dateA
 * @param dateB
 * @returns {boolean}
 */
export function isDateBefore(dateA, dateB) {
     const resolvedDateA = coerceToDate(dateA);
     const resolvedDateB = coerceToDate(dateB);
     if (!resolvedDateA || !resolvedDateB) return false;
     return resolvedDateA.getTime() < resolvedDateB.getTime();
}

/**
 * Compare whether dateA is after dateB.
 * @param dateA
 * @param dateB
 * @returns {boolean}
 */
export function isDateAfter(dateA, dateB) {
     const resolvedDateA = coerceToDate(dateA);
     const resolvedDateB = coerceToDate(dateB);
     if (!resolvedDateA || !resolvedDateB) return false;
     return resolvedDateA.getTime() > resolvedDateB.getTime();
}

/**
 * Subtract years from a date and return a new Date.
 * @param date
 * @param years
 * @returns {Date|null}
 */
export function subtractYears(date, years) {
     const resolvedDate = coerceToDate(date);
     if (!resolvedDate) return null;
     const next = new Date(resolvedDate.getTime());
     next.setFullYear(next.getFullYear() - Number(years || 0));
     return next;
}

/**
 * Get the current date.
 * @returns {Date}
 */
export function getCurrentDate() {
     return new Date();
}

/**
 * Get today's open/closed status for a weekly hours collection.
 * @param hours
 * @param now
 * @returns {{hasHours: boolean, isClosedToday: boolean, status: string, openingTime: Date|null, closingTime: Date|null, todaysHours: object|null}}
 */
export function getTodaysHoursStatus(hours, now = new Date()) {
     const hasHours = Array.isArray(hours) && hours.length > 0;
     if (!hasHours) {
          return {
               hasHours: false,
               isClosedToday: true,
               status: 'closed',
               openingTime: null,
               closingTime: null,
               todaysHours: null,
          };
     }

     const currentDate = coerceToDate(now) ?? new Date();
     const day = getNumericDayOfWeek(currentDate);
     const todaysHours = hours.find((item) => Number(item?.day) === day) ?? null;

     if (!todaysHours || todaysHours.isClosed) {
          return {
               hasHours: true,
               isClosedToday: true,
               status: 'closed',
               openingTime: null,
               closingTime: null,
               todaysHours,
          };
     }

     const openingTime = parseTimeOnDate(todaysHours.open, currentDate);
     const closingTime = parseTimeOnDate(todaysHours.close, currentDate);

     if (!openingTime || !closingTime) {
          return {
               hasHours: true,
               isClosedToday: true,
               status: 'closed',
               openingTime,
               closingTime,
               todaysHours,
          };
     }

     const stillOpen = isDateBefore(currentDate, closingTime);
     const stillClosed = isDateBefore(openingTime, currentDate);

     if (!stillOpen) {
          return {
               hasHours: true,
               isClosedToday: true,
               status: 'closed',
               openingTime,
               closingTime,
               todaysHours,
          };
     }

     if (!stillClosed) {
          return {
               hasHours: true,
               isClosedToday: true,
               status: 'closed_until',
               openingTime,
               closingTime,
               todaysHours,
          };
     }

     return {
          hasHours: true,
          isClosedToday: false,
          status: 'open_until',
          openingTime,
          closingTime,
          todaysHours,
     };
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

/**
 * Build a gluestack-v1 swatch object from an AspenLiDA theme color group ({lighter, base, darker, text}),
 * using the provided values as-is for the 300/500/700 shades instead of deriving them, so branded colors
 * are reproduced exactly. Shades the API doesn't provide (50/100/200/400/600/800/900) are filled in from
 * a chroma-interpolated scaffold based on the base color, so the swatch is still complete.
 * @param colorGroup
 * @returns {{}}
 */
export function buildSwatchFromThemeTokens(colorGroup = {}) {
     const { lighter, base, darker, text } = colorGroup ?? {};
     const swatch = generateSwatches(base ?? '#3dbdd6');

     if (base) {
          swatch['500'] = base;
          swatch.base = base;
     }
     if (lighter) {
          swatch['300'] = lighter;
     }
     if (darker) {
          swatch['700'] = darker;
     }
     if (text) {
          swatch['300-text'] = text;
          swatch['500-text'] = text;
          swatch['700-text'] = text;
          swatch.baseContrast = text;
     }

     return swatch;
}

const getColorNumber = (index) => (index === 0 ? 50 : index * 100);

const getContrastText = (color) => {
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
