import { GLOBALS } from '../globals';
import { logDebugMessage, logErrorMessage, logInfoMessage, logWarnMessage } from '../logging';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import base64 from 'react-native-base64';
import { API_KEY_1, API_KEY_2, API_KEY_3, API_KEY_4, API_KEY_5 } from '@env';
import * as Sentry from '@sentry/react-native';
import { insertApiErrorLog } from '../db';

const ERROR_TYPES = {
     TIMEOUT: 'TIMEOUT_ERROR',
     CONNECTION: 'CONNECTION_ERROR',
     NETWORK: 'NETWORK_ERROR',
     AUTHENTICATION: 'AUTHENTICATION_ERROR',
     INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
     BAD_DATA: 'BAD_DATA',
};

const ASPEN_ERROR_CODES = {
     INVALID_LOGIN: 'invalid_login',
};

// polyfill for base64 (required for legacy authentication)
if (!global.btoa) {
     global.btoa = base64.encode;
}
if (!global.atob) {
     global.atob = base64.decode;
}

/**
 * Create authentication tokens for Aspen API requests
 * This is for the legacy authentication method
 */
function createAuthTokens() {
     let tokens = [API_KEY_1, API_KEY_2, API_KEY_3, API_KEY_4, API_KEY_5];
     if (!__DEV__) {
          tokens = [process.env.API_KEY_1, process.env.API_KEY_2, process.env.API_KEY_3, process.env.API_KEY_4, process.env.API_KEY_5];
     }
     const filteredTokens = tokens.filter(Boolean);
     const tokenPool = filteredTokens.length > 0 ? filteredTokens : tokens;
     const thisKey = tokenPool[Math.floor(Math.random() * tokenPool.length)];
     const encoded = base64.encode(thisKey);

     return {
          username: encoded,
          password: encoded,
     };
}

/**
 * Build headers for Aspen Discovery API requests
 */
function buildHeaders(isPost = false, language = 'en', customHeaders = {}, postAsFormData = true) {
     const headers = {
          'User-Agent': `Aspen LiDA ${Device.modelName} ${Device.osName}/${Device.osVersion}`,
          Version: `v${GLOBALS.appVersion} ${GLOBALS.appStage} [b${GLOBALS.appBuild}] p${GLOBALS.appPatch}`,
          'LiDA-SessionID': GLOBALS.appSessionId,
          'LiDA-Slug': GLOBALS.slug,
          'Cache-Control': 'no-cache',
          'Preferred-Language': language,
     };

     // legacy authentication method
     const authTokens = createAuthTokens();
     headers['Authorization'] = `Basic ${base64.encode(`${authTokens.username}:${authTokens.password}`)}`;

     return { ...headers, ...customHeaders };
}

/**
 * Create FormData with user credentials for POST requests
 * This is for the legacy authentication method
 */
async function createPostData(additionalData = {}) {
     const formData = new FormData();

     try {
          const secretKey = await SecureStore.getItemAsync('secretKey');
          const userKey = await SecureStore.getItemAsync('userKey');

          if (userKey) formData.append('username', userKey);
          if (secretKey) formData.append('password', secretKey);
     } catch (e) {
          logErrorMessage('Unable to fetch user keys for POST request');
          logErrorMessage(e);
     }

     Object.keys(additionalData).forEach((key) => {
          if (additionalData[key] !== undefined && additionalData[key] !== null) {
               formData.append(key, additionalData[key]);
          }
     });

     return formData;
}

/**
 * HTTP client for Aspen Discovery APIs
 */
export class ApiClient {
     constructor(config = {}) {
          this.baseURL = config.baseURL || '';
          this.timeout = config.timeout || GLOBALS.timeoutAverage;
          this.language = config.language || 'en';
          this.retryConfig = config.retryConfig || { maxRetries: 1, delay: 1000 };
          this.debugMode = __DEV__;
          this.logAllAPICalls = true;
     }

     buildUrl(endpoint, params = {}) {
          const base = (this.baseURL || '').replace(/\/+$/, '');
          const path = String(endpoint || '').replace(/^\/+/, '');
          const full = `${base}/${path}`;

          const hasParams = params && Object.keys(params).length > 0;
          if (!hasParams) return full;

          const [pathname, existingQuery = ''] = full.split('?');
          const searchParams = new URLSearchParams(existingQuery);

          Object.entries(params).forEach(([key, value]) => {
               if (value !== undefined && value !== null && value !== '') {
                    searchParams.set(key, String(value));
               }
          });

          const query = searchParams.toString();
          return query ? `${pathname}?${query}` : pathname;
     }

     createAbortController() {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          return { controller, timeoutId };
     }

     async fetchWithRetry(url, options, retryCount = 0) {
          try {
               return await fetch(url, options);
          } catch (error) {
               if (retryCount < this.retryConfig.maxRetries && error.name !== 'AbortError') {
                    await new Promise((resolve) => setTimeout(resolve, this.retryConfig.delay * (retryCount + 1)));
                    return this.fetchWithRetry(url, options, retryCount + 1);
               }
               logDebugMessage("Got error fetching " + url);
               logDebugMessage(error);
               throw error;
          }
     }

     /**
      * Validate Aspen Discovery response structure
      */
     validateAspenResponse(data, url) {
          if (!data || typeof data !== 'object') {
               logErrorMessage('No response from ' + url );
               return {
                    valid: false,
                    error: ERROR_TYPES.BAD_DATA,
                    message: 'Response is not a valid object',
                    code: 'INVALID_RESPONSE_TYPE',
               };
          }

          if (typeof data !== 'object') {
               logErrorMessage('Response from ' + url + ' is not a valid object');
               logErrorMessage(data);
               return {
                    valid: false,
                    error: ERROR_TYPES.BAD_DATA,
                    message: 'Response is not a valid object',
                    code: 'INVALID_RESPONSE_TYPE',
               };
          }

          if (data.result === undefined) {
               logErrorMessage('No result field in response from ' + url)
               logErrorMessage(data);
               return {
                    valid: false,
                    error: ERROR_TYPES.BAD_DATA,
                    message: 'No result field in response',
                    code: 'MISSING_RESULT',
               };
          }

          return { valid: true };
     }

     checkAuthError(data) {
          if (!data) return null;

          if (data.message?.includes('Login unsuccessful') || data.message?.includes('Unable to validate user') || data.errorCode === ASPEN_ERROR_CODES.INVALID_LOGIN) {
               return {
                    type: ERROR_TYPES.INVALID_CREDENTIALS,
                    message: 'Your login credentials are invalid. Please log in again.',
                    code: ASPEN_ERROR_CODES.INVALID_LOGIN,
                    shouldLogout: true,
               };
          }

          return null;
     }

     async request(url, options = {}, config = {}) {
          let timeoutId;

          try {
               logInfoMessage(`[API Request] ${options.method} ${url}`);

               const { controller, timeoutId: tid } = this.createAbortController();
               timeoutId = tid;
               options.signal = options.signal || controller.signal;

               const response = await this.fetchWithRetry(url, options);
               clearTimeout(timeoutId);

               const contentType = response.headers.get('content-type');
               let data;

               if (contentType?.includes('application/json')) {
                    const rawText = await response.text();

                    try {
                         data = JSON.parse(rawText);
                    } catch (jsonError) {
                         logErrorMessage("Could not parse response from " + url + " as json");
                         logErrorMessage("Raw body causing error: " + rawText);

                         data = null;
                    }
               } else if (contentType?.includes('text')) {
                    data = await response.text();
               } else {
                    data = await response.blob();
               }

               const statusTextSuffix = response.statusText ? `: ${response.statusText}` : '';
               if (!response.ok) {
                    logDebugMessage(`[API Response] ${response.status}${statusTextSuffix}`);
               }

               const result = {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers),
                    data,
                    config,
               };

               if (response.ok) {
                    const validation = this.validateAspenResponse(data, url);
                    if (!validation.valid) {
                         if(validation.code === "INVALID_RESPONSE_TYPE") {
                              // We have a response.ok but data is invalid JSON - likely an error from Aspen Discovery surfacing
                              const error = new Error(validation.message);
                              error.type = validation.error;
                              error.code = validation.code;
                              error.response = result;
                              logDebugMessage(`[API Request]: Validation error: ${validation.message}`);
                              throw error;
                         } else {
                              logWarnMessage(`[API Request]: Validation warning: ${validation.message} for ${url}`);
                         }
                    }

                    const authError = this.checkAuthError(data);
                    if (authError) {
                         const error = new Error(authError.message);
                         error.type = authError.type;
                         error.code = authError.code;
                         error.shouldLogout = authError.shouldLogout;
                         logWarnMessage(`[API Request]: Authentication issue: ${authError.message}`);
                         throw error;
                    }

                    /**
                     * Log OK API response details for debugging if debug mode is enabled or
                     * if the response contains debug information.
                     */
                    if (this.debugMode || data.debug || data.result?.debug) {
                         await insertApiErrorLog({
                              method: options.method,
                              endpoint: url,
                              status: response.status || null,
                              problem: '',
                              message: response.message || '',
                              requestUrl: url,
                              requestParams: options.params || null,
                              requestBody: options.body || null,
                              responseBody: data || null,
                         });
                    }

                    return result;
               }

               /**
                * For non-OK responses, throw an error
                * @type {Error}
                */
               const error = new Error(`HTTP ${response.status}`);
               error.response = result;
               error.status = response.status;
               throw error;
          } catch (error) {
               logErrorMessage("ERROR occurred in request to " + url + " - " + error);
               if (timeoutId) clearTimeout(timeoutId);

               let errorType = ERROR_TYPES.NETWORK;
               let shouldLogout = error.shouldLogout || false; // we don't actually use this yet, but will be useful in the future
               let isSentryWorthy = true;

               if (error.name === 'AbortError') {
                    errorType = ERROR_TYPES.TIMEOUT;
               } else if (error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
                    errorType = ERROR_TYPES.CONNECTION;
               } else if (error.status === 401) {
                    errorType = ERROR_TYPES.AUTHENTICATION;
                    shouldLogout = true;
               } else if (error.status === 403) {
                    errorType = ERROR_TYPES.AUTHENTICATION;
                    shouldLogout = true;
               } else if (error.type) {
                    errorType = error.type;
                    isSentryWorthy = error.type !== ERROR_TYPES.INVALID_CREDENTIALS;
               }

               const errorDetails = {
                    method: options.method,
                    endpoint: url,
                    status: error.status || null,
                    problem: error.type || 'NETWORK_ERROR',
                    message: error.message || 'Unknown error',
                    requestUrl: url,
                    requestParams: options.params || null,
                    requestBody: options.body || null,
                    responseBody: error.response?.data || null,
               };

               /**
                * Only log to Sentry if we're in production or
                * if it's an error we consider important enough to log during dev
                * (i.e. not invalid credentials)
                */
               if (!__DEV__ || isSentryWorthy) {
                    Sentry.captureException(error, {
                         level: error.status >= 500 ? 'error' : 'warning',
                         extra: errorDetails,
                    });
               }

               // Log all API errors to the database
               await insertApiErrorLog(errorDetails);

               if (config.customErrorMessage) {
                    logDebugMessage(config.customErrorMessage);
               } else {
                    logDebugMessage(`[API Error] ${errorType}: ${errorDetails.message}${error.status ? ` (${error.status})` : ''}`);
               }

               return {
                    ok: false,
                    status: error.status || null,
                    problem: errorType,
                    data: error.response?.data || null,
                    config,
               };
          }
     }

     /**
      * GET request
      */
     async get(endpoint, params = {}, config = {}) {
          const url = this.buildUrl(endpoint, params);
          const headers = buildHeaders(false, this.language, config.headers);

          const options = {
               method: 'GET',
               headers,
          };

          return this.request(url, options, config);
     }

     /**
      * POST request
      */
     async post(endpoint, data = {}, config = {}, postAsFormData = true) {
          const url = this.buildUrl(endpoint, config.params);
          let formData;
          let headers = buildHeaders(true, this.language, config.headers, postAsFormData);
          if (postAsFormData) {
               formData = await createPostData(data);
          }else{
               formData = typeof data === 'object' ? JSON.stringify(data) : data;;
          }
          const options = {
               method: 'POST',
               headers: { ...headers },
               body: formData,
          };

          return this.request(url, options, { ...config });
     }

     /**
      * Update configuration
      */
     updateConfig(newConfig = {}) {
          if (newConfig.baseURL) this.baseURL = newConfig.baseURL;
          if (newConfig.timeout) this.timeout = newConfig.timeout;
          if (newConfig.language) this.language = newConfig.language;
     }

     setLanguage(language) {
          this.language = language;
     }

     setDebugMode(enabled) {
          this.debugMode = enabled;
          logDebugMessage(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
     }
}

export { createAuthTokens, buildHeaders, createPostData, ERROR_TYPES, ASPEN_ERROR_CODES };
const apiClient = new ApiClient();
export default apiClient;
