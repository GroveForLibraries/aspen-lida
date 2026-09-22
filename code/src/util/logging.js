import { GLOBALS } from './globals';
import * as Sentry from '@sentry/react-native';
import { getCurrentUserId, getCurrentLocationId, getCurrentLibraryId } from './db/sessionContext';

/**
 * Does logging of messages to console.log depending on the value of logLevel within the app config.
 * values are:
 * 0 -> No logging
 * 1 -> Debug and higher
 * 2 -> Info and higher
 * 3 -> Warning and higher
 * 4 -> Error and higher
 */
export function logDebugMessage(message) {
     if (__DEV__) {
          if (GLOBALS.logLevel === 1) {
               logMessage("DEBUG", message);
          }
     }
}

export function logInfoMessage(message) {
     if (__DEV__) {
          if (GLOBALS.logLevel === 1 || GLOBALS.logLevel === 2) {
               logMessage("INFO", message);
          }
     }
}

export function logWarnMessage(message, error) {
     if (__DEV__) {
          if (GLOBALS.logLevel >= 1 && GLOBALS.logLevel <=3) {
               logMessage("WARN", message);
               if (error !== undefined) {
                    logMessage("WARN", error);
               }
          }
     }else{
          logSentryMessage(message, 'warning', error);
     }
}

export function logErrorMessage(message, error) {
     if (__DEV__) {
          if (GLOBALS.logLevel >= 1 && GLOBALS.logLevel <=4) {
               logMessage('ERROR', message);
               if (error !== undefined) {
                    logMessage('ERROR', error);
               }
          }
     }else{
          logSentryMessage(message, 'error', error);
     }
}

function logMessage(type, message) {
     if (message instanceof Error) {
          const errorLog = {
              name: message.name,
              message: message.message,
              stack: message.stack,
              // Add other relevant properties if available
          };

          console.error(type + " --> " + JSON.stringify(errorLog, null, 2));
     }else if (typeof message === "object") {
          console.log(type + " --> " + JSON.stringify(message));
     }else if (message === null) {
          console.log(type + " " + null);
     }else{
          console.log(type + " " + message);
     }
}

/**
 * Sends a message or error to Sentry with as much context as is available.
 * Accepts either a bare string/Error as `message`, or a descriptive string
 * `message` paired with the actual Error as `error` (the common
 * `logErrorMessage('doing X failed:', error)` call pattern) - in either case,
 * a real Error is always sent via captureException so the stack trace and
 * exception type aren't lost, with the descriptive string attached as extra
 * context rather than discarded.
 */
export function logSentryMessage(message, level = 'error', error) {
     if (__DEV__) {
          return;
     }

     const exception = error instanceof Error ? error : (message instanceof Error ? message : null);

     if (exception) {
          const contextLabel = exception === message ? undefined : message;
          Sentry.captureException(exception, {
               level,
               extra: contextLabel !== undefined ? { context: contextLabel } : undefined,
          });
     } else {
          const normalizedMessage = typeof message === 'string' ? message : JSON.stringify(message);
          Sentry.captureMessage(
               normalizedMessage,
               {
                    level,
                    // logSentryMessage is always the closest in-app frame on the
                    // synthetic stack trace Sentry builds for plain-string
                    // messages, so every call site would otherwise group/title
                    // as "logSentryMessage" regardless of the actual message.
                    // Fingerprinting on the message text itself keeps distinct
                    // messages as distinct, filterable issues.
                    fingerprint: [normalizedMessage],
                    extra: error !== undefined ? { error } : undefined,
               }
          );
     }
}

export function getErrorMessage(arg1, arg2, arg3 = false) {
     const isObjectArg = arg1 !== null && typeof arg1 === 'object' && !Array.isArray(arg1);
     const statusCode = isObjectArg ? (arg1.statusCode ?? null) : (arg1 ?? null);
     const problem = isObjectArg ? arg1.problem : arg2;
     const sendToSentry = isObjectArg ? (arg1.sendToSentry ?? false) : arg3;

     let errorDetails;
     if (problem) {
          switch (problem) {
               case 'TIMEOUT_ERROR':
                    errorDetails = {
                         title: 'Timeout Error (Client-side)',
                         message: 'The request took too long to respond. Please check your connection and try again.',
                         code: 'TIMEOUT_ERROR',
                    };
                    break;
               case 'CONNECTION_ERROR':
                    errorDetails = {
                         title: 'Connection Error (Client-side)',
                         message: 'Unable to connect to the server. Please verify your internet connection.',
                         code: 'CONNECTION_ERROR',
                    };
                    break;
               case 'NETWORK_ERROR':
                    errorDetails = {
                         title: 'Network Error (Client-side)',
                         message: 'A network error occurred. Please try again or check your connection.',
                         code: 'NETWORK_ERROR',
                    };
                    break;
               default:
                    errorDetails = {
                         title: 'Unknown Error (Client-side)',
                         message: 'Unknown error ' + (statusCode ?? 'UNKNOWN') + ' occurred. Please try again or check your connection.',
                         code: problem,
                    };
                    break;
          }
     } else {
          switch (statusCode) {
               case 400:
                    errorDetails = {
                         title: 'Bad Request (400)',
                         message: 'The server could not understand your request. Please check your input and try again.',
                         code: 400,
                    };
                    break;
               case 401:
                    errorDetails = {
                         title: 'Unauthorized (401)',
                         message: 'You are not authorized to perform this action. Please log in.',
                         code: 401,
                    };
                    break;
               case 403:
                    errorDetails = {
                         title: 'Forbidden (403)',
                         message: 'You do not have permission to access this resource.',
                         code: 403,
                    };
                    break;
               case 404:
                    errorDetails = {
                         title: 'Not Found (404)',
                         message: 'The requested resource could not be found.',
                         code: 404,
                    };
                    break;
               case 405:
                    errorDetails = {
                         title: 'Method Not Allowed (405)',
                         message: 'The request method is not supported for this resource.',
                         code: 405,
                    };
                    break;
               case 408:
                    errorDetails = {
                         title: 'Request Timeout (408)',
                         message: 'The server timed out waiting for your request. Please try again.',
                         code: 408,
                    };
                    break;
               case 409:
                    errorDetails = {
                         title: 'Conflict (409)',
                         message: 'There was a conflict with your request. Please check and try again.',
                         code: 409,
                    };
                    break;
               case 410:
                    errorDetails = {
                         title: 'Gone (410)',
                         message: 'The requested resource is no longer available on the server.',
                         code: 410,
                    };
                    break;
               case 413:
                    errorDetails = {
                         title: 'Payload Too Large (413)',
                         message: 'The request is too large for the server to process.',
                         code: 413,
                    };
                    break;
               case 414:
                    errorDetails = {
                         title: 'URI Too Long (414)',
                         message: 'The requested URI is too long for the server to handle.',
                         code: 414,
                    };
                    break;
               case 415:
                    errorDetails = {
                         title: 'Unsupported Media Type (415)',
                         message: 'The server does not support the media type of the request.',
                         code: 415,
                    };
                    break;
               case 429:
                    errorDetails = {
                         title: 'Too Many Requests (429)',
                         message: 'You have sent too many requests in a given amount of time. Please slow down.',
                         code: 429,
                    };
                    break;
               case 500:
                    errorDetails = {
                         title: 'Internal Server Error (500)',
                         message: 'The server encountered an error. Please try again later.',
                         code: 500,
                    };
                    break;
               case 501:
                    errorDetails = {
                         title: 'Not Implemented (501)',
                         message: 'The server does not support the functionality required to fulfill the request.',
                         code: 501,
                    };
                    break;
               case 502:
                    errorDetails = {
                         title: 'Bad Gateway (502)',
                         message: 'Received an invalid response from the upstream server.',
                         code: 502,
                    };
                    break;
               case 503:
                    errorDetails = {
                         title: 'Service Unavailable (503)',
                         message: 'The server is currently unavailable. Please try again later.',
                         code: 503,
                    };
                    break;
               case 504:
                    errorDetails = {
                         title: 'Gateway Timeout (504)',
                         message: 'The server did not receive a timely response from the upstream server.',
                         code: 504,
                    };
                    break;
               case 505:
                    errorDetails = {
                         title: 'HTTP Version Not Supported (505)',
                         message: 'The server does not support the HTTP protocol version used in the request.',
                         code: 505,
                    };
                    break;
               case 507:
                    errorDetails = {
                         title: 'Insufficient Storage (507)',
                         message: 'The server is unable to store the representation needed to complete the request.',
                         code: 507,
                    };
                    break;
               default:
                    errorDetails = {
                         title: `Error (${statusCode ?? 'UNKNOWN'})`,
                         message: 'An unexpected error occurred. Please try again.',
                         code: statusCode ?? 'UNKNOWN',
                    };
                    break;
          }
     }

     // Always send the error to Sentry unless in DEV environment
     if (!__DEV__ || (__DEV__ && sendToSentry)) {
          Sentry.captureMessage(`[${errorDetails.title}] ${errorDetails.message}`, {
               level: 'error',
               // getErrorMessage is always the closest in-app frame on the
               // synthetic stack trace for these calls, so without an explicit
               // fingerprint every status code/problem would otherwise group
               // together under that shared call site. Fingerprint on the
               // status code + problem type so different error kinds stay
               // distinct, filterable issues (note: this still merges the same
               // status/problem across different endpoints, since the endpoint
               // isn't passed into getErrorMessage).
               fingerprint: [String(statusCode ?? 'none'), String(problem ?? 'none')],
               extra: { code: errorDetails.code, problem, statusCode },
          });
     }

     return errorDetails;
}

/**
 * Test Error logging connection and force a new captureMessage
 * @param {string} testMessage - Optional custom message to send (defaults to test message)
 * @returns {Promise<void>}
 */
export async function testSentryConnection(testMessage = 'Error Logging Connection Test') {
     try {
          // Test 1: Capture a test message
          const messageId = Sentry.captureMessage(
               testMessage,
               {
                    level: 'info',
                    tags: {
                         test: 'connection-test',
                         timestamp: new Date().toISOString(),
                    },
                    extra: {
                         deviceInfo: 'Test message sent from device',
                    },
               }
          );

          logInfoMessage(`Error logging test message captured with ID: ${messageId}`);

          // Test 2: Capture an exception to verify error handling
          try {
               throw new Error('Error logging Test Error - This is intentional');
          } catch (error) {
               const errorId = Sentry.captureException(error, {
                    level: 'warning',
                    tags: {
                         test: 'error-test',
                    },
               });
               logInfoMessage(`Error logging test error captured with ID: ${errorId}`);
          }

          // Test 3: Flush to ensure messages are sent
          await Sentry.close(2000); // Wait up to 2 seconds for messages to be sent
          logInfoMessage('Error logging connection test completed successfully');

          return messageId;
     } catch (error) {
          logErrorMessage(`Error logging connection test failed: ${error.message}`);
          throw error;
     }
}

const USER_ACCOUNT_DUMP_TABLES = [
     'user_accounts',
     'user_app_preferences',
     'user_cards',
     'user_inbox',
     'user_list_groups',
     'user_lists',
     'user_locations',
     'user_notification_settings',
     'user_notification_history',
     'user_reading_history',
     'user_saved_events',
     'user_saved_searches',
     'user_state',
     'user_sublocations',
     'user_viewers',
 ];

const THEME_DUMP_TABLES = [
     'theme_state',
     'theme_catalog',
];

const SQLITE_DUMP_TABLE_LIMITS = {
     user_notification_history: 50,
     user_reading_history: 50,
 };

const USER_SCOPED_TABLES = new Set([
     'user_state', 'user_accounts', 'user_viewers', 'user_lists', 'user_list_groups',
     'user_locations', 'user_reading_history', 'user_saved_events', 'user_cards',
     'user_notification_settings', 'user_app_preferences', 'user_debug_messages',
     'user_notification_history', 'user_inbox', 'user_sublocations', 'user_saved_searches',
]);
const LOCATION_SCOPED_TABLES = new Set(['library_branch_state', 'theme_state', 'theme_catalog']);
const LIBRARY_SCOPED_TABLES = new Set(['library_system_state']);
const USER_AND_LOCATION_SCOPED_TABLES = new Set(['browse_category_state', 'browse_category_list']);

/**
 * Returns the WHERE-clause column(s)/value(s) that scope a table to the currently active
 * user/location/library, or null if the table isn't scoped at all (e.g. language_state).
 * If the table IS scoped but the relevant identity isn't currently known, `resolvable` is
 * false - callers should return no rows rather than fall back to an unscoped dump.
 */
function getTableDumpScope(tableName) {
     if (USER_SCOPED_TABLES.has(tableName)) {
          const userId = getCurrentUserId();
          return { columns: ['user_id'], values: [userId], resolvable: userId != null };
     }
     if (LOCATION_SCOPED_TABLES.has(tableName)) {
          const locationId = getCurrentLocationId();
          return { columns: ['location_id'], values: [locationId], resolvable: locationId != null };
     }
     if (LIBRARY_SCOPED_TABLES.has(tableName)) {
          const libraryId = getCurrentLibraryId();
          return { columns: ['library_id'], values: [libraryId], resolvable: libraryId != null };
     }
     if (USER_AND_LOCATION_SCOPED_TABLES.has(tableName)) {
          const userId = getCurrentUserId();
          const locationId = getCurrentLocationId();
          return { columns: ['user_id', 'location_id'], values: [userId, locationId], resolvable: userId != null && locationId != null };
     }
     return null;
}

function buildScopedWhere(tableName) {
     const scope = getTableDumpScope(tableName);
     if (!scope) {
          return { clause: '', params: [], blocked: false };
     }
     if (!scope.resolvable) {
          return { clause: '', params: [], blocked: true };
     }
     return {
          clause: ` WHERE ${scope.columns.map((column) => `"${column}" = ?`).join(' AND ')}`,
          params: scope.values,
          blocked: false,
     };
}

async function getSQLiteTableRows(db, tableName, limit) {
     const { clause, params, blocked } = buildScopedWhere(tableName);
     if (blocked) {
          return [];
     }
     return await db.getAllAsync(
          `SELECT * FROM "${tableName}"${clause} LIMIT ?`,
          [...params, limit]
     );
 }

async function getSQLiteTableRowCount(db, tableName) {
     const { clause, params, blocked } = buildScopedWhere(tableName);
     if (blocked) {
          return 0;
     }
     const result = await db.getFirstAsync(
          `SELECT COUNT(*) as total FROM "${tableName}"${clause}`,
          params
     );
     return result?.total ?? 0;
}

/**
 * Retrieves all data from a specified SQLite table and sends it to the configured Error Logger
 * @param {string} tableName - The name of the table to dump
 * @param {object} options - Optional configuration
 * @param {number} options.limit - Maximum number of rows to retrieve (default: 1000)
 * @param {string} options.level - Sentry log level (default: 'info')
 * @returns {Promise<{success: boolean, rowCount: number, tableName: string, eventId: string|null}>}
 */
export async function dumpSQLiteTable(tableName, options = {}) {
     const {
          limit = 1000,
          level = 'info',
     } = options;

     try {
          if (!tableName || typeof tableName !== 'string') {
               throw new Error('tableName must be a non-empty string');
          }

          const { getDb } = require('./db/sqlite');

          const db = await getDb();

          let tablesToDump = [tableName];
          if (tableName === 'user_accounts') {
               tablesToDump = USER_ACCOUNT_DUMP_TABLES;
          } else if (tableName === 'theme_state') {
               tablesToDump = THEME_DUMP_TABLES;
          }

          const dumpPayload = {};
          let rowCount = 0;
          let totalRows = 0;

          for (const currentTableName of tablesToDump) {
               const tableLimit = Math.min(limit, SQLITE_DUMP_TABLE_LIMITS[currentTableName] ?? limit);
               const rows = await getSQLiteTableRows(db, currentTableName, tableLimit);
               const currentTotalRows = await getSQLiteTableRowCount(db, currentTableName);

               dumpPayload[currentTableName] = JSON.parse(JSON.stringify(rows ?? []));

               if (currentTableName === tableName) {
                    rowCount = rows?.length ?? 0;
                    totalRows = currentTotalRows;
               }
          }

          const dumpData = {
               tableName,
               data: tableName === 'user_accounts' || tableName === 'theme_state'
                    ? dumpPayload
                    : (dumpPayload[tableName] ?? []),
          };

            // Create unique message with timestamp so each dump gets its own issue
            const timestamp = new Date().toISOString();
            const messageTitle = `SQLite Table Dump: ${tableName} - ${timestamp}`;

            // Send to Sentry with custom fingerprint to create unique issues per dump
            const eventId = Sentry.captureMessage(messageTitle + '\n\n' + JSON.stringify(dumpData, null, 2), {
                 level,
                 tags: {
                      table: tableName,
                      dumpType: 'sqlite-table',
                 },
                 fingerprint: [tableName, timestamp],
            });

          logInfoMessage(
               `SQLite table "${tableName}" dumped to Error Logger (${rowCount}/${totalRows} rows)`
          );

          return {
               success: true,
               rowCount,
               totalRows,
               tableName,
               eventId,
          };
     } catch (error) {
          logErrorMessage(`Failed to dump SQLite table "${tableName}" to Error Logger: ${error.message}`);

          // Send error to Sentry
          Sentry.captureException(error, {
               level: 'error',
               tags: {
                    table: tableName,
                    dumpType: 'sqlite-table-error',
               },
               extra: {
                    tableName,
                    error: error.message,
               },
          });

          return {
               success: false,
               rowCount: 0,
               totalRows: 0,
               tableName,
               eventId: null,
               error: error.message,
          };
     }
}
