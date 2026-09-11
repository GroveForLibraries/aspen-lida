import { GLOBALS } from './globals';
import * as Sentry from '@sentry/react-native';

/**
 * Does logging of messages to console.log depending on the value of logLevel within the app config.
 * values are:
 * 0 -> No logging
 * 1 -> Debug and higher
 * 2 -> Info and higher
 * 3 -> Warning and higher
 * 4 -> Error and higher
 */

/**
 * Does logging of messages to console.log depending on the value of logLevel within the app config.
 * @param message
 */
export function logDebugMessage(message) {
     if (__DEV__) {
          if (GLOBALS.logLevel === 1) {
               logMessage("DEBUG", message);
          }
     }
}

/**
 * Does logging of messages to console.log depending on the value of logLevel within the app config.
 * @param message
 */
export function logInfoMessage(message) {
     if (__DEV__) {
          if (GLOBALS.logLevel === 1 || GLOBALS.logLevel === 2) {
               logMessage("INFO", message);
          }
     }
}

/**
 * Does logging of messages to console.log depending on the value of logLevel within the app config.
 * @param message
 */
export function logWarnMessage(message) {
     if (__DEV__) {
          if (GLOBALS.logLevel >= 1 && GLOBALS.logLevel <=3) {
               logMessage("WARN", message);
          }
     }else{
          logSentryMessage(message, 'warning');
     }
}

/**
 * Does logging of messages to console.log depending on the value of logLevel within the app config.
 * @param message
 */
export function logErrorMessage(message) {
     if (__DEV__) {
          if (GLOBALS.logLevel >= 1 && GLOBALS.logLevel <=4) {
               logMessage('ERROR', message);
          }
     }else{
          logSentryMessage(message, 'error');
     }
}

/**
 * Does logging of messages to console.log depending on the value of logLevel within the app config.
 * @param type
 * @param message
 */
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
 * Does logging of messages to Sentry depending on the value of logLevel within the app config.
 * @param message
 * @param level
 */
export function logSentryMessage(message, level = 'error') {
     if (!__DEV__) {
          Sentry.captureMessage(
                message,
               {
                    level: level,
               }
          );
     }
}

/**
 * Returns an error message object based on the provided arguments. The function can handle both object and non-object arguments, extracting relevant information to construct a user-friendly error message. It also sends the error details to Sentry for monitoring and debugging purposes.
 * @param arg1
 * @param arg2
 * @param arg3
 * @returns {{title: string, message: string, code: string}|{title: string, message: string, code: string}|{title: string, message: string, code: string}|{title: string, message: string, code: string|*}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}|{title: string, message: string, code: number}}
 */
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
               extra: { code: errorDetails.code, problem, statusCode },
          });
     }

     return errorDetails;
}
