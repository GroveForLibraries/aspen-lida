import { createApiClient } from './apiFactory';
import { GLOBALS } from '../globals';
import { saveSublocations } from '../db';
import { popAlert, popToast } from '../../components/feedback';
import { getTermFromDictionary } from '../../translations/TranslationHelper';
import {logDebugMessage, logErrorMessage, logInfoMessage, logWarnMessage} from '../logging.js';
import * as WebBrowser from 'expo-web-browser';
import { problemCodeMap, stripHTML } from '../../helpers/helpers';
import { addDays, formatLocalDateYYYYMMDD, parseToDate } from '../../helpers/helpers';

export function resolveReactivationDate(selectedReactivationDate, allowIndefinite = false) {
     const today = formatLocalDateYYYYMMDD();

     const selectedDate = parseToDate(selectedReactivationDate);
     if (selectedDate) {
          const selected = formatLocalDateYYYYMMDD(selectedDate);

          if (selected === today) {
               if (allowIndefinite) return null;
               return formatLocalDateYYYYMMDD(addDays(new Date(), 30));
          }

          return selected;
     }

     if (!allowIndefinite) {
          return formatLocalDateYYYYMMDD(addDays(new Date(), 30));
     }

     return null;
}
import * as Device from 'expo-device';

function userClient(url = null, timeout = GLOBALS.timeoutAverage, language = 'en') {
     return createApiClient({ url, timeout, language });
}

/** *******************************************************************
 * General
 ******************************************************************* **/
/**
 * Refreshes the profile information for the user.
 * This is used after actions that may change the profile information (like placing a hold)
 * to ensure we have the most current information.
 * @param url
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function refreshProfile(url = null) {
     const client = userClient(url, GLOBALS.timeoutSlow);
     logDebugMessage('Refreshing profile');

     return await client.post(
          '/UserAPI?method=getPatronProfile',
          {},
          {
               params: {
                    linkedUsers: true,
                    checkIfValid: false,
               },
          }
     );
}

/**
 * Refreshes the profile information for the user, forcing a reload from the ILS.
 * @param url
 * @returns {Promise<{success: boolean, errorFetching: boolean}|*>}
 */
export async function reloadProfile(url = null) {
     const client = userClient(url, GLOBALS.timeoutSlow);
     logDebugMessage('Reloading profile');

     const response = await client.post(
          '/UserAPI?method=getPatronProfile',
          {},
          {
               params: {
                    linkedUsers: true,
                    reload: true,
                    checkIfValid: false,
               },
          }
     );

     if (response.ok) {
          if (response.data?.result?.profile) {
               logDebugMessage("Returning profile");
               return response.data.result.profile;
          }
          if (response.data?.result) {
               logDebugMessage("Returning result");
               return response.data.result;
          }
          logWarnMessage('Reloading profile failed, did not get a result');
     }else{
          logWarnMessage('Reloading profile failed response was not ok');
     }

     return { success: false, errorFetching: true };
}

/**
 * Resets an expired PIN for the user
 * @param pin1
 * @param pin2
 * @param token
 * @param url
 * @returns {Promise<{ok: boolean, status: number, statusText: string, headers: {[p: string]: string}, data: Blob | string, config: {}}|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function resetExpiredPin(pin1, pin2, token, url = null) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
     });

     return await client.post('/UserAPI?method=resetExpiredPin', {
          pin1,
          pin2,
          token,
     });
}

/**
 * Sends a reset PIN request to the user's phone number
 * @param phone
 * @param url
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function forgotBarcode(phone, url) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
     });
     return await client.get('/RegistrationAPI?method=lookupAccountByPhoneNumber', { phone });
}

/**
 * Sends a reset password request to the user's email address
 * @param username
 * @param email
 * @param resendEmail
 * @param ils
 * @param url
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function resetPassword(username = '', email = '', resendEmail = false, ils = null, url) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
     });

     let params = {};
     if (ils === 'koha') {
          params = {
               username,
               email,
               resendEmail,
          };
     } else if (ils === 'sirsi') {
          params = {
               barcode: username,
          };
     } else if (ils === 'evergreen' || ils === 'horizon') {
          params = {
               username,
               email,
               resendEmail,
          };
     } else if (ils === 'millennium') {
          params = {
               barcode: username,
          };
     } else if (ils === 'symphony') {
          params = {
               barcode: username,
          };
     } else {
          params = {
               reset_username: username,
          };
     }

     return await client.get('/UserAPI?method=resetPassword', params);
}

/**
 * Fetches the user profile information for the given credentials.
 * Used for validating credentials when logging in.
 * @param data
 * @param user
 * @param pass
 * @returns {Promise<*|*[]>}
 */
export async function getUserProfile(data, user, pass) {
     const client = createApiClient({
          url: data.patronsLibrary['baseUrl'],
          timeout: GLOBALS.timeoutAverage,
     });

     logDebugMessage("Getting User Profile");
     const response = await client.post(
          '/UserAPI?method=getPatronProfile',
          {
               username: user['valueUser'],
               password: pass['valueSecret'],
          },
          {
               params: {
                    linkedUsers: true,
                    checkIfValid: false,
               },
          }
     );

     if (response.ok && response.data?.result?.profile) {
          return response.data.result.profile;
     }

     return [];
}

/**
 * Updates a given sort type for the user
 * @param sortType
 * @param sortValue
 * @param language
 * @param url
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}>}
 */
export async function setSortPreferences(sortType, sortValue, language = 'en', url = null) {
     const client = userClient(url, GLOBALS.timeoutAverage, language);

     const params = {
          [sortType]: sortValue,
          language,
     };

     const response = await client.post('/UserAPI?method=updateSortPreferences', {}, { params });

     if (!response.ok) {
          logErrorMessage(response);
     }

     return response;
}

/**
 * Fetches messages from the ILS to be displayed to the user in Aspen.
 * @param url
 * @returns {Promise<*|{}|{}>}
 */
export async function getILSMessages(url = null) {
     const client = userClient(url, GLOBALS.timeoutAverage);
     return await client.post('/UserAPI?method=getILSMessages', {});
}

/**
 * Updates the user's alternate library card information. Can be used to add/update the alternate card or delete it if deleteCard is true.
 * @param cardNumber
 * @param cardPassword
 * @param deleteCard
 * @param url
 * @param language
 * @returns {Promise<{success, title, message}|{success: boolean, title: null, message: null}>}
 */
export async function updateAlternateLibraryCard(cardNumber = '', cardPassword = '', deleteCard = false, url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);

     const response = await client.post(
          '/UserAPI?method=updateAlternateLibraryCard',
          {
               alternateLibraryCard: cardNumber,
               alternateLibraryCardPassword: cardPassword,
          },
          {
               params: {
                    deleteAlternateLibraryCard: deleteCard,
                    language,
               },
          }
     );

     if (response.ok) {
          return {
               success: response.data?.success ?? false,
               title: response.data?.title ?? null,
               message: response.data?.message ?? null,
          };
     }

     logErrorMessage(response);
     return {
          success: false,
          title: null,
          message: null,
     };
}

/**
 * Updates the user's email address for OverDrive holds
 * @param itemId
 * @param source
 * @param patronId
 * @param overdriveEmail
 * @param promptForOverdriveEmail
 * @param libraryUrl
 * @param language
 * @returns {Promise<{}|*>}
 */
export async function updateOverDriveEmail(itemId, source, patronId, overdriveEmail, promptForOverdriveEmail, libraryUrl, language = 'en') {
     const client = createApiClient({
          url: libraryUrl,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post('/UserAPI?method=updateOverDriveEmail', {
          itemId,
          itemSource: source,
          userId: patronId,
          overdriveEmail,
          promptForOverdriveEmail,
     });

     if (response.ok && response.data?.result) {
          return response.data.result;
     }

     return {};
}

/**
 * Deletes the Aspen user and related data. Does not delete the user from the ILS.
 * @param url
 * @returns {Promise<*|{success: boolean, message: string}>}
 */
export async function deleteAspenUser(url = null) {
     const client = userClient(url, GLOBALS.timeoutFast);
     const response = await client.post('/UserAPI?method=deleteAspenUser', {});

     if (response.ok && response.data?.result) {
          return response.data.result;
     }

     return {
          success: false,
          message: 'Unknown error trying to complete request.',
     };
}

/** *******************************************************************
 * Authentication & Session Management
 ******************************************************************* **/
/**
 * Validates the given credentials to initiate logging into Aspen LiDA.
 * @param username
 * @param password
 * @param url
 * @returns {Promise<*>}
 */
export async function loginToLiDA(username, password, url) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
     });

     return await client.post('/UserAPI?method=loginToLiDA', {
          username,
          password,
     });
}

/**
 * Validates the given credentials when the user is already logged in
 * @param username
 * @param password
 * @param url
 * @returns {Promise<{}|*>}
 */
export async function validateUser(username, password, url) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutSlow,
     });

     const response = await client.post('/UserAPI?method=validateAccount', {
          username,
          password,
     });

     if (response.ok && response.data?.result) {
          return response.data.result;
     }

     return {};
}

/**
 * Validates the current session to ensure the user is still logged in and the session is active in Aspen Discovery.
 * @param url
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function validateSession(url = null) {
     const client = userClient(url, GLOBALS.timeoutSlow);
     return await client.post('/UserAPI?method=validateSession', {});
}

/**
 * Revalidates the stored user details.
 * @param url
 * @returns {Promise<*|boolean>}
 */
export async function revalidateUser(url = null) {
     const client = userClient(url, GLOBALS.timeoutSlow);
     const response = await client.post('/UserAPI?method=validateUserCredentials', {});

     if (response.ok && response.data?.result?.valid) {
          return response.data.result.valid;
     }

     return false;
}

/**
 * Logout the user and end the Aspen Discovery session
 * @param url
 * @returns {Promise<*|boolean>}
 */
export async function logoutUser(url = null) {
     const client = userClient(url, GLOBALS.timeoutFast);
     const response = await client.get('/UserAPI?method=logout');

     if (response.ok) {
          return response.data;
     }

     return false;
}

/**
 * Passes the logged-in user to a Discovery page, validating the session and credentials before attempting to open the browser.
 * If the session is not valid, it will attempt to revalidate the user and session before opening the browser.
 * If the session cannot be validated, it will show an error message.
 * @param url
 * @param redirectTo
 * @param userId
 * @param backgroundColor
 * @param textColor
 * @param id
 * @param additionalParams
 * @returns {Promise<void>}
 */
export async function passUserToDiscovery(url, redirectTo, userId, backgroundColor, textColor, id = null, additionalParams = null) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
     });

     const response = await client.post('/UserAPI?method=prepareSharedSession', {});

     if (response.ok) {
          const sessionId = response?.data?.result?.session ?? null;

          const browserParams = {
               enableDefaultShareMenuItem: false,
               presentationStyle: 'automatic',
               showTitle: false,
               toolbarColor: backgroundColor,
               controlsColor: textColor,
               secondaryToolbarColor: backgroundColor,
          };

          if (sessionId && userId) {
               let accessUrl = url + '/Authentication/LiDA?init&session=' + sessionId + '&user=' + userId + '&goTo=' + redirectTo + '&id=' + id + '&minimalInterface=true';
               if (additionalParams) {
                    for (const key in additionalParams) {
                         if (Object.prototype.hasOwnProperty.call(additionalParams, key)) {
                              accessUrl += '&' + key + '=' + encodeURIComponent(additionalParams[key]);
                         }
                    }
               }
               await WebBrowser.openBrowserAsync(accessUrl, browserParams)
                    .then((res) => {
                         logDebugMessage(res);
                         if (res.type === 'cancel' || res.type === 'dismiss') {
                              logDebugMessage('User closed or dismissed window.');
                              WebBrowser.dismissBrowser();
                              WebBrowser.coolDownAsync();
                         }
                    })
                    .catch(async (err) => {
                         if (err.message === 'Another WebBrowser is already being presented.') {
                              try {
                                   WebBrowser.dismissBrowser();
                                   WebBrowser.coolDownAsync();
                                   await WebBrowser.openBrowserAsync(accessUrl, browserParams)
                                        .then((response) => {
                                             logDebugMessage(response);
                                             if (response.type === 'cancel') {
                                                  logDebugMessage('User closed window.');
                                             }
                                        })
                                        .catch(async (error) => {
                                             logInfoMessage('Unable to close previous browser session.');
                                        });
                              } catch (error) {
                                   logErrorMessage('Really borked.');
                              }
                         } else {
                              popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
                              logErrorMessage(err);
                         }
                    });
          } else {
               // unable to validate the user
               popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
               logErrorMessage('unable to validate user');
          }
     } else {
          popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
          logErrorMessage(response);
     }
}

/** *******************************************************************
 * Pickup Locations & Pickup Areas/Sublocations
 ******************************************************************* **/
/**
 * Fetch valid pickup locations for the patron based on the grouped work or record they are placing a hold on
 * @param url
 * @param groupedWorkId
 * @param recordId
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getPickupLocations(url = null, groupedWorkId = null, recordId = null) {
     const client = userClient(url, GLOBALS.timeoutAverage);

     return await client.post(
          '/UserAPI?method=getValidPickupLocations',
          {},
          {
               params: { groupedWorkId, recordId },
          }
     );
}

/**
 * Fetch valid pickup sublocations/areas for the patron based on the selected pickup location
 * @param url
 * @param {{ persist?: boolean }} options - When false, fetches sublocations without writing them to SQLite.
 * @returns {Promise<*[]>}
 */
export async function getPickupSublocations(url = null, { persist = true } = {}) {
     const client = userClient(url, GLOBALS.timeoutAverage);
     const response = await client.post('/UserAPI?method=getValidSublocations', {});

     let sublocations = [];

     if (response.ok && response.data?.result?.success) {
          const data = response.data.result.sublocations;
          sublocations = typeof data === 'object' && data !== null ? data : [];
     }

     if (persist) {
          await saveSublocations(sublocations);
     }
     return sublocations;
}

/**
 * Updates hold pickup preferences for the user
 * @param pickupLocationId
 * @param myLocation1Id
 * @param myLocation2Id
 * @param sublocation
 * @param rememberHoldPickupLocation
 * @param language
 * @param url
 * @returns {Promise<void>}
 */
export async function updateHoldPickupPreferences(pickupLocationId = '', myLocation1Id = '', myLocation2Id = '', sublocation = '', rememberHoldPickupLocation = -1, language = 'en', url = null) {
     const params = {
          ...(pickupLocationId && pickupLocationId !== -1 && pickupLocationId !== 0 && { pickupLocationId }),
          ...(myLocation1Id && myLocation1Id !== -1 && myLocation1Id !== 0 && { myLocation1Id }),
          ...(myLocation2Id && myLocation2Id !== -1 && myLocation2Id !== 0 && { myLocation2Id }),
          ...(sublocation && sublocation !== -1 && sublocation !== 0 && { sublocation }),
          rememberHoldPickupLocation: rememberHoldPickupLocation ?? '',
          language,
     };

     const client = userClient(url, GLOBALS.timeoutAverage, language);

     const response = await client.post('/UserAPI?method=updateHoldPickupPreferences', {}, { params });

     if (response.ok) {
          if (response.data?.error) {
               // TODO(api-translation): For response.ok, API should return a localized error title.
               popAlert('Error', response.data.error, 'error');
          } else {
               popAlert(response.data?.result?.title, response.data?.result?.message, response.data?.result?.success === true ? 'success' : 'error');
          }
     } else {
          logErrorMessage(response);
     }
}

/**
 * Changes the pickup location for an existing hold
 * @param holdId
 * @param newLocation
 * @param newSublocation
 * @param url
 * @param userId
 * @param language
 * @returns {Promise<void>}
 */
export async function changeHoldPickUpLocation(holdId, newLocation, newSublocation, url = null, userId, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const params = {
          sessionId: GLOBALS.appSessionId,
          holdId,
          newLocation,
          newSublocation,
          userId,
     };

     const response = await client.post('/UserAPI?method=changeHoldPickUpLocation', {}, { params });

     if (response.ok && response.data?.result) {
          const result = response.data.result;
          popAlert(result.title, result.message, result.success === true ? 'success' : 'error');
     }
}

/** *******************************************************************
 * Checkouts & Holds
 ******************************************************************* **/
/**
 * Returns a list of holds for a user
 * @param readySort
 * @param pendingSort
 * @param holdSource
 * @param url
 * @param refresh
 * @param language
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getPatronHolds(readySort = 'expire', pendingSort = 'sortTitle', holdSource = 'all', url = null, refresh = true, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);

     return await client.post(
          '/UserAPI?method=getPatronHolds',
          {},
          {
               params: {
                    source: holdSource,
                    linkedUsers: true,
                    refreshHolds: refresh,
                    unavailableSort: pendingSort,
                    availableSort: readySort,
                    language,
               },
          }
     );
}

/**
 * Freezes a hold for a given hold ID and record, with an optional reactivation date.
 * If no reactivation date is provided, it will default to 30 days from the current date
 * unless allowIndefinite is true,in which case it will freeze indefinitely until the user thaws it.
 * @param cancelId
 * @param recordId
 * @param source
 * @param url
 * @param patronId
 * @param selectedReactivationDate
 * @param language
 * @param allowIndefinite
 * @returns {Promise<void>}
 */
export async function freezeHold(cancelId, recordId, source, url = null, patronId, selectedReactivationDate = null, language = 'en', allowIndefinite = false) {
     const reactivationDate = resolveReactivationDate(selectedReactivationDate, allowIndefinite);

     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutSlow,
          language,
     });

     const response = await client.post('/UserAPI?method=freezeHold', {
          sessionId: GLOBALS.appSessionId,
          holdId: cancelId,
          recordId,
          itemSource: source,
          reactivationDate,
          userId: patronId,
     });

     if (response.ok && response.data?.result) {
          const result = response.data.result;
          if (result.success === true) {
               popAlert(result.title ?? getTermFromDictionary(language, 'hold_frozen'), result.message, 'success');
          } else {
               popAlert(result.title ?? getTermFromDictionary(language, 'unable_freeze_hold'), result.message, 'error');
          }
     }else{
          // TODO(translation-client): Non-response.ok fallback is local; move title/body to TranslationService keys.
          popAlert('Error', 'Unknown error freezing hold', 'error');
     }
}

/**
 * Freezes multiple holds based on the given data array
 * @param data
 * @param url
 * @param selectedReactivationDate
 * @param language
 * @param allowIndefinite
 * @returns {Promise<void>}
 */
export async function freezeHolds(data, url = null, selectedReactivationDate = null, language = 'en', allowIndefinite = false) {
     const reactivationDate = resolveReactivationDate(selectedReactivationDate, allowIndefinite);

     let numSuccess = 0;
     let numFailed = 0;

     const holdsToFreeze = data.map(async (hold) => {
          const client = createApiClient({
               url,
               timeout: GLOBALS.timeoutFast,
               language,
          });

          const response = await client.post('/UserAPI?method=freezeHold', {
               sessionId: GLOBALS.appSessionId,
               holdId: hold.cancelId,
               recordId: hold.recordId,
               itemSource: hold.source,
               reactivationDate,
               userId: hold.patronId,
          });

          if (response.ok && response.data?.result?.success === true) {
               numSuccess++;
          } else {
               numFailed++;
          }
     });

     await Promise.all(holdsToFreeze);

     let message = '';
     let status = 'success';
     let title = getTermFromDictionary(language, 'holds_frozen');

     if (numSuccess > 0) {
          // TODO(translation-client): Aggregate client-side success summary should use TranslationService key/template.
          message = `${numSuccess} holds frozen successfully.`;
     }

     if (numFailed > 0) {
          status = 'error';
          // TODO(translation-client): Aggregate client-side failure summary should use TranslationService key/template.
          message += ` Unable to freeze ${numFailed} holds.`;
          if (numSuccess === 0) {
               title = getTermFromDictionary(language, 'unable_freeze_hold');
          }
     }

     popAlert(title, message, status);
}

/**
 * Thaws a hold for a given hold ID and record, making it active again.
 * @param cancelId
 * @param recordId
 * @param source
 * @param url
 * @param patronId
 * @param language
 * @returns {Promise<void>}
 */
export async function thawHold(cancelId, recordId, source, url = null, patronId, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post('/UserAPI?method=activateHold', {
          sessionId: GLOBALS.appSessionId,
          holdId: cancelId,
          recordId,
          itemSource: source,
          userId: patronId,
     });

     if (response.ok && response.data?.result) {
          const result = response.data.result;
          if (result.success === true) {
               popAlert(result.title ?? getTermFromDictionary(language, 'hold_thawed'), result.message, 'success');
          } else {
               popAlert(result.title ?? getTermFromDictionary(language, 'unable_thaw_hold'), result.message, 'error');
          }
     }
}

/**
 * Thaws multiple holds based on the given data array
 * @param data
 * @param url
 * @param language
 * @returns {Promise<void>}
 */
export async function thawHolds(data, url = null, language = 'en') {
     let numSuccess = 0;
     let numFailed = 0;

     const holdsToThaw = data.map(async (hold) => {
          const client = createApiClient({
               url,
               timeout: GLOBALS.timeoutFast,
               language,
          });

          const response = await client.post('/UserAPI?method=activateHold', {
               sessionId: GLOBALS.appSessionId,
               holdId: hold.cancelId,
               recordId: hold.recordId,
               itemSource: hold.source,
               userId: hold.patronId,
          });

          if (response.ok && response.data?.result?.success === true) {
               numSuccess++;
          } else {
               numFailed++;
          }
     });

     await Promise.all(holdsToThaw);

     let message = '';
     let status = 'success';

     if (numSuccess > 0) {
          message = `${numSuccess} holds thawed successfully.`;
     }

     if (numFailed > 0) {
          status = 'error';
          message += ` Unable to thaw ${numFailed} holds.`;
     }

     popAlert(getTermFromDictionary(language, 'holds_thawed'), message, status);
}

/**
 * Cancels a hold for a given hold ID and record, removing it from the user's holds.
 * @param cancelId
 * @param recordId
 * @param source
 * @param url
 * @param patronId
 * @param language
 * @returns {Promise<void>}
 */
export async function cancelHold(cancelId, recordId, source, url = null, patronId, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post('/UserAPI?method=cancelHold', {
          sessionId: GLOBALS.appSessionId,
          cancelId,
          recordId,
          itemSource: source,
          userId: patronId,
     });

     if (response.ok && response.data?.result) {
          const result = response.data.result;
          if (result.success === true) {
               popAlert(result.title, result.message, 'success');
          } else {
               popAlert(result.title, result.message, 'error');
          }
     }
}

/**
 * Cancels multiple holds based on the given data array
 * @param data
 * @param url
 * @param language
 * @returns {Promise<void>}
 */
export async function cancelHolds(data, url = null, language = 'en') {
     let numSuccess = 0;
     let numFailed = 0;

     const holdsToCancel = data.map(async (hold) => {
          const client = createApiClient({
               url,
               timeout: GLOBALS.timeoutFast,
               language,
          });

          const response = await client.post('/UserAPI?method=cancelHold', {
               sessionId: GLOBALS.appSessionId,
               cancelId: hold.cancelId,
               recordId: hold.recordId,
               itemSource: hold.source,
               userId: hold.patronId,
          });

          if (response.ok && response.data?.result?.success === true) {
               numSuccess++;
          } else {
               numFailed++;
          }
     });

     await Promise.all(holdsToCancel);

     let message = '';
     let status = 'success';

     if (numSuccess > 0) {
          message = `${numSuccess} holds cancelled successfully.`;
     }

     if (numFailed > 0) {
          status = 'error';
          message += ` Unable to cancel ${numFailed} holds.`;
     }

     popAlert(getTermFromDictionary(language, 'holds_cancelled'), message, status);
}

/**
 * Checkout an item to the patron
 * @param url
 * @param itemId
 * @param source
 * @param patronId
 * @param barcode
 * @param locationId
 * @param barcodeType
 * @returns {Promise<{}|*>}
 */
export async function checkoutItem(url = null, itemId, source, patronId, barcode = '', locationId = '', barcodeType) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
     });

     const response = await client.post('/UserAPI?method=checkoutItem', {
          itemId,
          itemSource: source,
          userId: patronId,
          locationId,
          barcode,
          barcodeType,
     });

     if (response.ok && response.data?.result) {
          return response.data.result;
     }

     return {};
}

/**
 * Place a hold on an item for the patron with options for pickup location, sublocation, and notification preferences.
 * @param url
 * @param itemId
 * @param source
 * @param patronId
 * @param pickupBranch
 * @param sublocation
 * @param rememberPickupLocation
 * @param volumeId
 * @param holdType
 * @param recordId
 * @param holdNotificationPreferences
 * @param variationId
 * @param bibId
 * @returns {Promise<{}|*>}
 */
export async function placeHold(url = null, itemId, source, patronId, pickupBranch, sublocation = '', rememberPickupLocation = '', volumeId = '', holdType = '', recordId = '', holdNotificationPreferences = null, variationId = null, bibId = null) {
     let id = itemId;
     if (variationId) {
          id = variationId;
          holdType = 'item';
     }
     if (volumeId && itemId) {
          if (holdType === 'item') {
               holdType = 'volume';
          }
     }

     const setParams = {
          itemId: id,
          itemSource: source,
          userId: patronId,
          pickupBranch,
          pickupSublocation: sublocation,
          volumeId: volumeId ?? '',
          sublocation,
          holdType,
          recordId,
          bibId,
          rememberHoldPickupLocation: rememberPickupLocation ?? '',
     };

     if (holdNotificationPreferences) {
          if (holdNotificationPreferences.emailNotification === true) {
               setParams.emailNotification = 'on';
          }

          if (holdNotificationPreferences.phoneNotification === true) {
               setParams.phoneNotification = 'on';
               if (holdNotificationPreferences.phoneNumber && holdNotificationPreferences.phoneNumber.length > 0) {
                    setParams.phoneNumber = holdNotificationPreferences.phoneNumber;
               }
          }

          if (holdNotificationPreferences.smsNotification === true) {
               setParams.smsNotification = 'on';
               if (holdNotificationPreferences.smsNumber && holdNotificationPreferences.smsNumber.length > 0) {
                    if (holdNotificationPreferences.smsCarrier && holdNotificationPreferences.smsCarrier !== -1) {
                         setParams.smsCarrier = holdNotificationPreferences.smsCarrier;
                         setParams.smsNumber = holdNotificationPreferences.smsNumber;
                    }
               }
          }
     }

     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
     });

     const response = await client.post('/UserAPI?method=placeHold', setParams);

     if (response.ok && response.data?.result) {
          return response.data.result;
     }

     return {};
}

/**
 * Confirm the provided hold with the ILS
 * @param recordId
 * @param confirmationId
 * @param language
 * @param url
 * @returns {Promise<*|{success: boolean, message: string}>}
 */
export async function confirmHold(recordId, confirmationId, language = 'en', url = null) {
     const client = userClient(url, GLOBALS.timeoutAverage, language);
     const response = await client.post(
          '/UserAPI?method=confirmHold',
          {},
          {
               params: {
                    id: recordId,
                    confirmationId,
                    language,
               },
          }
     );

     if (response.ok) return response.data?.result;
     return {
          success: false,
          message: 'Unable to confirm hold. Please contact your library.',
     };
}

/**
 * Renews a checkout for the patron
 * Includes support for ILS renewals that may require confirmation of renewal fees before proceeding.
 * @param barcode
 * @param recordId
 * @param source
 * @param itemId
 * @param libraryUrl
 * @param userId
 * @param language
 * @returns {Promise<{}|{confirmRenewalFee}|*>}
 */
export async function renewCheckout(barcode, recordId, source, itemId, libraryUrl = null, userId, language = 'en') {
     const validId = itemId ?? barcode;

     const client = createApiClient({
          url: libraryUrl,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post('/UserAPI?method=renewItem', {
          itemBarcode: validId,
          recordId,
          itemSource: source,
          userId,
     });

     if (response.ok && response.data?.result) {
          const result = response.data.result;

          if (source === 'ils') {
               if (result.confirmRenewalFee) {
                    return result;
               }
               popAlert(result.title, stripHTML(result.message), result.success === true ? 'success' : 'error');
          } else {
               popAlert(result.title, stripHTML(result.message), result.success === true ? 'success' : 'error');
          }

          return result;
     }

     return {};
}

/**
 * Confirms a renewal that may have a fee associated with it in the ILS
 * @param barcode
 * @param recordId
 * @param source
 * @param itemId
 * @param libraryUrl
 * @param userId
 * @param language
 * @returns {Promise<{}|{confirmRenewalFee}|*>}
 */
export async function confirmRenewCheckout(barcode, recordId, source, itemId, libraryUrl = null, userId, language = 'en') {
     const validId = itemId ?? barcode;

     const client = createApiClient({
          url: libraryUrl,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post('/UserAPI?method=renewItem', {
          itemBarcode: validId,
          recordId,
          itemSource: source,
          userId,
          confirmedRenewal: true,
     });

     if (response.ok && response.data?.result) {
          const result = response.data.result;

          if (source === 'ils') {
               if (result.confirmRenewalFee) {
                    return result;
               }
               popAlert(result.title, result.message, result.success === true ? 'success' : 'error');
          } else {
               popAlert(result.title, result.message, result.success === true ? 'success' : 'error');
          }

          return result;
     }

     return {};
}

/**
 * Renews all checkouts for the patron
 * Includes support for ILS renewals that may require confirmation of renewal fees before proceeding.
 * @param url
 * @param language
 * @returns {Promise<{}|{confirmRenewalFee}|*>}
 */
export async function renewAllCheckouts(url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);
     const response = await client.post('/UserAPI?method=renewAll', {});

     if (response.ok && response.data?.result) {
          const result = response.data.result;

          if (result.confirmRenewalFee) {
               return result;
          }

          popAlert(result.title, result.renewalMessage?.[0] ?? '', result.success === true ? 'success' : 'error');
          return result;
     }

     return {};
}

/**
 * Confirms renewal of all checkouts that may have fees associated with them in the ILS
 * @param url
 * @param language
 * @returns {Promise<{}|{confirmRenewalFee}|*>}
 */
export async function confirmRenewAllCheckouts(url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post('/UserAPI?method=renewAll', {
          confirmedRenewal: true,
     });

     if (response.ok && response.data?.result) {
          const result = response.data.result;

          if (result.confirmRenewalFee) {
               return result;
          }

          popAlert(result.title, result.renewalMessage?.[0] ?? '', result.success === true ? 'success' : 'error');
          return result;
     }

     return {};
}

/**
 * Returns a checkout for the patron
 * @param userId
 * @param id
 * @param source
 * @param overDriveId
 * @param url
 * @param version
 * @param axis360Id
 * @param language
 * @returns {Promise<void>}
 */
export async function returnCheckout(userId, id, source, overDriveId = null, url = null, version, axis360Id = null, language = 'en') {
     let itemId = id;
     if (overDriveId != null) {
          itemId = overDriveId;
     }
     if (axis360Id != null) {
          itemId = axis360Id;
     }

     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const params = version >= '22.05.00' ? { itemId, userId, itemSource: source } : { id: itemId, userId, itemSource: source };

     const response = await client.post('/UserAPI?method=returnCheckout', params);

     if (response.ok && response.data?.result) {
          const result = response.data.result;
          popAlert(result.title, result.message, result.success === true ? 'success' : 'error');
     }
}

/**
 * Return a list of current checkouts for a user
 * @param source
 * @param url
 * @param refresh
 * @param language
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getPatronCheckedOutItems(source = 'all', url = null, refresh = true, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);
     return await client.post(
          '/UserAPI?method=getPatronCheckedOutItems',
          {},
          {
               params: {
                    source,
                    linkedUsers: true,
                    refreshCheckouts: refresh,
                    language,
               },
          }
     );
}

/** *******************************************************************
 * Browse Category Management
 ******************************************************************* **/
/**
 * Update the status of a browse category for the user (hide/show)
 * @param id
 * @param url
 * @param hide
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function updateBrowseCategoryStatus(id, url = null, hide = 'single') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
     });
     return await client.post(
          '/UserAPI?method=updateBrowseCategoryStatus',
          {},
          {
               params: {
                    browseCategoryId: id,
                    hide,
               },
          }
     );
}

/** *******************************************************************
 * Linked Accounts
 ******************************************************************* **/
/**
 * Return a list of accounts that the user has initiated account linking with
 * @param url
 * @param language
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getLinkedAccounts(url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);
     return await client.post('/UserAPI?method=getLinkedAccounts', {}, { params: { language } });
}

/**
 * Return a list of accounts that the user has been linked to by another user
 * @param url
 * @param language
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getViewerAccounts(url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);
     return await client.post('/UserAPI?method=getViewers', {}, { params: { language } });
}

/**
 * Add an account that the user wants to create a link to
 * @param username
 * @param password
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function addLinkedAccount(username = '', password = '', url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post('/UserAPI?method=addAccountLink', {
          accountToLinkUsername: username,
          accountToLinkPassword: password,
     });

     if (response.ok && response.data?.result?.success !== undefined) {
          const success = response.data.result.success === true;
          popAlert(response.data.result.title, response.data.result.message, success ? 'success' : 'error');
          return success;
     }

     return false;
}

/**
 * Remove an account that the user has created a link to
 * @param patronToRemove
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function removeLinkedAccount(patronToRemove, url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=removeAccountLink',
          {},
          {
               params: {
                    idToRemove: patronToRemove,
                    language,
               },
          }
     );

     if (response.ok && response.data?.result?.success !== undefined) {
          const success = response.data.result.success === true;
          popAlert(response.data.result.title, response.data.result.message, success ? 'success' : 'error');
          return success;
     }

     return false;
}

/**
 * Remove an account that another user has created a link to
 * @param patronToRemove
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function removeViewerAccount(patronToRemove, url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=removeViewerLink',
          {},
          {
               params: {
                    idToRemove: patronToRemove,
                    language,
               },
          }
     );

     if (response.ok && response.data?.result?.success !== undefined) {
          const success = response.data.result.success === true;
          popAlert(response.data.result.title, response.data.result.message, success ? 'success' : 'error');
          return success;
     }

     return false;
}

/**
 * Disables a users ability to use linked accounts
 * @param language
 * @param url
 * @returns {Promise<boolean>}
 */
export async function disableAccountLinking(language = 'en', url = null) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post('/UserAPI?method=disableAccountLinking', {}, { params: { language } });

     if (response.ok && response.data?.result?.success !== undefined) {
          const success = response.data.result.success === true;
          popAlert(response.data.result.title, response.data.result.message, success ? 'success' : 'error');
          return success;
     }

     return false;
}

/**
 * Enables a users ability to use linked accounts if they have previously disabled it
 * @param language
 * @param url
 * @returns {Promise<boolean>}
 */
export async function enableAccountLinking(language = 'en', url = null) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post('/UserAPI?method=enableAccountLinking', {}, { params: { language } });

     if (response.ok && response.data?.result?.success !== undefined) {
          const success = response.data.result.success === true;
          popAlert(response.data.result.title, response.data.result.message, success ? 'success' : 'error');
          return success;
     }

     return false;
}

/** *******************************************************************
 * Translations / Languages
 ******************************************************************* **/
/**
 * Update the user's language preference
 * @param code
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function saveLanguage(code, url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutFast, language);
     const response = await client.post(
          '/UserAPI?method=saveLanguage',
          {},
          {
               params: {
                    languageCode: code,
               },
          }
     );

     if (response.ok) {
          GLOBALS.language = code;
          return true;
     }

     return false;
}

/** *******************************************************************
 * Reading History
 ******************************************************************* **/
/**
 * Fetch the user's reading history with pagination, sorting, and filtering options.
 * @param page
 * @param pageSize
 * @param sort
 * @param filter
 * @param url
 * @param language
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function fetchReadingHistory(page = 1, pageSize = 20, sort = 'checkedOut', filter = '', url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);

     return await client.post(
          '/UserAPI?method=getPatronReadingHistory',
          {},
          {
               params: {
                    page,
                    pageSize,
                    sort_by: sort,
                    language,
                    filter,
               },
          }
     );
}

/**
 * Enable reading history for the user
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function optIntoReadingHistory(url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post('/UserAPI?method=optIntoReadingHistory', {}, { params: { language } });

     return response.ok;
}

/**
 * Enable reading history for the user
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function optOutOfReadingHistory(url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post('/UserAPI?method=optOutOfReadingHistory', {}, { params: { language } });

     return response.ok;
}

/**
 * Delete all reading history for the user
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function deleteAllReadingHistory(url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post('/UserAPI?method=deleteAllFromReadingHistory', {}, { params: { language } });

     if (response.ok && response.data?.result?.success) {
          return true;
     }

     return false;
}

/**
 * Delete selected reading history for the user
 * @param item
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function deleteSelectedReadingHistory(item, url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=deleteSelectedFromReadingHistory',
          {},
          {
               params: {
                    selected: item,
                    language,
               },
          }
     );

     if (response.ok && response.data?.result?.success) {
          return true;
     }

     return false;
}

/** *******************************************************************
 * Notifications
 ******************************************************************* **/
/**
 * Update the status on if the user should be prompted for notification onboarding
 * @param status
 * @param token
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function updateNotificationOnboardingStatus(status, token, url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=updateNotificationOnboardingStatus',
          {
               status,
               token,
          },
          { params: { language } }
     );

     if (response.ok && response.data?.result?.success !== undefined) {
          const success = response.data.result.success;
          return success === true || success === 'true';
     }

     return false;
}

/**
 * Fetch the user's notification history with pagination and an option to force update from the server.
 * @param page
 * @param pageSize
 * @param forceUpdate
 * @param url
 * @param language
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function fetchNotificationHistory(page = 1, pageSize = 20, forceUpdate = false, url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);

     return await client.post(
          '/UserAPI?method=getInbox',
          {},
          {
               params: {
                    page,
                    pageSize,
                    forceUpdate,
                    language,
               },
          }
     );
}

/**
 * Update the status of a message to being read
 * @param id
 * @param url
 * @param language
 * @returns {Promise<{success, title, message}>}
 */
export async function markMessageAsRead(id, url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);

     const response = await client.post(
          '/UserAPI?method=markMessageAsRead',
          {},
          {
               params: {
                    id,
                    language,
               },
          }
     );

     return {
          success: response?.data?.success ?? false,
          title: response?.data?.title ?? null,
          message: response?.data?.message ?? null,
     };
}

/**
 * Update the status of a message to being unread
 * @param id
 * @param url
 * @param language
 * @returns {Promise<{success, title, message}>}
 */
export async function markMessageAsUnread(id, url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);

     const response = await client.post(
          '/UserAPI?method=markMessageAsUnread',
          {},
          {
               params: {
                    id,
                    language,
               },
          }
     );

     return {
          success: response?.data?.success ?? false,
          title: response?.data?.title ?? null,
          message: response?.data?.message ?? null,
     };
}

/**
 * Fetch the user's notification preference for a specific type of notification
 * @param url
 * @param pushToken
 * @returns {Promise<*|boolean>}
 */
export async function getNotificationPreferences(url, pushToken) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
     });

     logDebugMessage('Getting notification preferences');
     const response = await client.post(
          '/UserAPI?method=getNotificationPreferences',
          {
               pushToken,
          },
     );
     if (response.ok) {
          if (response.data?.result?.success === true) {
               return response.data.result;
          } else {
               // TODO(api-translation): For response.ok, API should always return a localized error title.
               popAlert(response.data?.result?.title ?? 'Unknown Error', response.data?.result?.message, 'error');
               return false;
          }
     } else {
          const problem = problemCodeMap(response.problem);
          popToast(problem.title, problem.message, 'error');
          return false;
     }
}

/**
 * Update the user's notification preferences for a specific type of notification
 * @param url
 * @param pushToken
 * @param type
 * @param value
 * @param showToast
 * @returns {Promise<boolean>}
 */
export async function setNotificationPreference(url, pushToken, type, value, showToast = true) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
     });

     logDebugMessage("Setting Notification Preference for " + type + " to " + value + " (push token is " + pushToken + ")");
     const response = await client.post(
          '/UserAPI?method=setNotificationPreference',
          {
               pushToken,
               type,
               value,
          },
          {
               params: { type, value },
          }
     );
     logDebugMessage(response);
     if (response.ok) {
          if (response.data.result.success) {
               return true;
          }else{
               if (showToast) {
                    popAlert(response.data.result.title, response.data.result.message, 'error');
               }
          }
     }else{
          if (showToast) {
               // TODO(translation-client): Non-response.ok fallback is local; move title/body to TranslationService keys.
               popAlert('Error', 'Could not save notification preference', 'error');
          }
          return false;
     }

     return response.ok;
}

/**
 * Save the user's push token for notifications
 * @param url
 * @param pushToken
 * @param updateUserDebugMessage
 * @returns {Promise<boolean>}
 */
export async function savePushToken(url, pushToken, updateUserDebugMessage) {
     updateUserDebugMessage('Saving Push Token ' + pushToken);

     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
     });

     const response = await client.post('/UserAPI?method=saveNotificationPushToken', {
          pushToken,
          deviceModel: Device.modelName,
     });

     if (!response.ok) {
          logErrorMessage('Could not save push token');
          logDebugMessage(response);
          updateUserDebugMessage('Could not save push token');
          updateUserDebugMessage(response);
     }
     return response.ok;
}

/**
 * Fetch the user's saved push tokens for notifications
 * @param libraryUrl
 * @returns {Promise<*|*[]>}
 */
export async function getPushToken(libraryUrl) {
     logDebugMessage('Getting push token');

     const client = createApiClient({
          url: libraryUrl,
          timeout: GLOBALS.timeoutAverage,
     });

     const response = await client.post('/UserAPI?method=getNotificationPushToken', {});

     if (response.ok) {
          if (response.data?.result?.success) {
               logDebugMessage('Got Push Token ' + response.data.result.tokens);
               return response.data.result.tokens;
          } else {
               logWarnMessage('No push tokens found');
               logDebugMessage(response);
               return [];
          }
     } else {
          logWarnMessage('Could not retrieve push tokens');
          logWarnMessage(response);
          return [];
     }
}

/**
 * Delete a push token from the user's account
 * @param libraryUrl
 * @param pushToken
 * @param shouldAlert
 * @returns {Promise<boolean>}
 */
export async function deletePushToken(libraryUrl, pushToken, shouldAlert = false) {
     logDebugMessage('Deleting push token');

     const client = createApiClient({
          url: libraryUrl,
          timeout: GLOBALS.timeoutAverage,
     });

     const response = await client.post('/UserAPI?method=deleteNotificationPushToken', {
          pushToken,
     });

     if (!response.ok) {
          logErrorMessage('Could not delete push token');
          logDebugMessage(response);
     }
     return response.ok;
}

/** *******************************************************************
 * App-specific Settings & Configuration
 ******************************************************************* **/
/**
 * Fetch the user's app preferences, including notification settings and other configurable options.
 * @param url
 * @param language
 * @returns {Promise<*|{ok: boolean, status, problem: string, data, config: {}}|undefined>}
 */
export async function getAppPreferencesForUser(url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutFast, language);
     return await client.post('/UserAPI?method=getAppPreferencesForUser', {}, { params: { language } });
}

/**
 * Update the status on if the user should be prompted for providing screen brightness permissions
 * @param status
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function updateScreenBrightnessStatus(status, url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=updateScreenBrightnessStatus',
          {
               status,
          },
          { params: { language } }
     );

     if (response.ok && response.data?.result?.success !== undefined) {
          const wasUpdated = response.data.result.success;
          return wasUpdated === true || wasUpdated === 'true';
     }

     return false;
}

/** *******************************************************************
 * Campaigns
 ******************************************************************* **/
/**
 * Fetch a list of campaigns for the user with pagination and filtering options.
 * @param page
 * @param pageSize
 * @param filter
 * @param url
 * @param language
 * @returns {Promise<{campaigns, totalResults, totalPages, hasMore: boolean, filter, message}>}
 */
export async function fetchCampaigns(page = 1, pageSize = 20, filter = 'enrolled', url = null, language = 'en') {
     const client = userClient(url, GLOBALS.timeoutAverage, language);

     const response = await client.post(
          '/UserAPI?method=getUserCampaigns',
          {},
          {
               params: {
                    page,
                    pageSize,
                    filter,
                    language,
               },
          }
     );

     let morePages = false;
     if (response.ok && response.data?.result?.page_current !== response.data?.result?.page_total) {
          morePages = true;
     }

     return {
          campaigns: response.data?.result?.campaigns ?? [],
          totalResults: response.data?.result?.totalResults ?? 0,
          totalPages: response.data?.result?.page_total ?? 0,
          hasMore: morePages,
          filter: response.data?.result?.filter ?? 'enrolled',
          message: response.data?.data?.message ?? null,
     };
}

/**
 * Enroll in campaign
 * @param campaignId
 * @param linkedUserId
 * @param filter
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function enrollCampaign(campaignId, linkedUserId, filter = 'enrolled', url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=enrollUserInCampaign',
          {
               campaignId,
               filter,
               linkedUserId,
          },
          { params: { language } }
     );

     if (response.ok && response.data?.result?.success) {
          return true;
     }

     return false;
}

/**
 * Unenroll from campaign
 * @param campaignId
 * @param linkedUserId
 * @param filter
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function unenrollCampaign(campaignId, linkedUserId, filter = 'enrolled', url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=unenrollUserFromCampaign',
          {
               campaignId,
               filter,
               linkedUserId,
          },
          { params: { language } }
     );

     if (response.ok && response.data?.result?.success) {
          return true;
     }

     return false;
}

/**
 * Opt into campaign emails
 * @param campaignId
 * @param linkedUserId
 * @param filter
 * @param optIn
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function optIntoCampaignEmails(campaignId, linkedUserId, filter = 'enrolled', optIn, url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=optUserIntoCampaignEmails',
          {
               campaignId,
               linkedUserId,
               filter,
               optIn,
          },
          { params: { language } }
     );

     if (response.ok && response.data?.result?.success) {
          return true;
     }

     return false;
}

/**
 * Opt into Campaign Leaderboard
 * @param campaignId
 * @param linkedUserId
 * @param filter
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function optUserInToCampaignLeaderboard(campaignId, linkedUserId, filter = 'enrolled', url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=enrollUserInCampaignLeaderboard',
          {
               campaignId,
               filter,
               linkedUserId,
          },
          { params: { language } }
     );

     if (response.ok && response.data?.result?.success) {
          return true;
     }

     return false;
}

/**
 * Opt out of Campaign Leaderboard
 * @param campaignId
 * @param linkedUserId
 * @param filter
 * @param url
 * @param language
 * @returns {Promise<boolean>}
 */
export async function optUserOutOfCampaignLeaderboard(campaignId, linkedUserId, filter = 'enrolled', url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=unenrollUserFromCampaignLeaderboard',
          {
               campaignId,
               filter,
               linkedUserId,
          },
          { params: { language } }
     );

     if (response.ok && response.data?.result?.success) {
          return true;
     }

     return false;
}

/**
 * Add Progress to Activity (Milestone or Extra Credit)
 * @param activityId
 * @param linkedUserId
 * @param activityType
 * @param filter
 * @param url
 * @param language
 * @param campaignId
 * @returns {Promise<boolean>}
 */
export async function addActivityProgress(activityId, linkedUserId, activityType, filter = 'enrolled', url = null, language = 'en', campaignId) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post(
          '/UserAPI?method=addActivityProgress',
          {
               activityId,
               activityType,
               filter,
               linkedUserId,
               campaignId,
          },
          { params: { language } }
     );

     if (response.ok && response.data?.result?.success) {
          return true;
     }

     return false;
}

/** *******************************************************************
 * Accessing Online Materials
 ******************************************************************* **/

/**
 * Access a sample of an OverDrive title
 * @param url
 * @param formatId
 * @param itemId
 * @param sampleNumber
 * @param language
 * @returns {Promise<void>}
 */
export async function overDriveSample(url = null, formatId, itemId, sampleNumber, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
          language,
     });

     const response = await client.post('/UserAPI?method=viewOnlineItem', {
          overDriveId: itemId,
          formatId,
          sampleNumber,
          itemSource: 'overdrive',
          isPreview: 'true',
     });

     if (response.ok && response.data?.result?.url) {
          const accessUrl = response.data.result.url;

          await WebBrowser.openBrowserAsync(accessUrl)
               .then((res) => {
                    logDebugMessage('Response from opening browser for OverDrive Preview');
                    logDebugMessage(res);
               })
               .catch(async (err) => {
                    if (err.message === 'Another WebBrowser is already being presented.') {
                         try {
                              WebBrowser.dismissBrowser();
                              await WebBrowser.openBrowserAsync(accessUrl)
                                   .then((response) => {
                                        logDebugMessage('Response from reopening browser');
                                        logDebugMessage(response);
                                   })
                                   .catch(async (error) => {
                                        logWarnMessage('Unable to close previous browser session.');
                                   });
                         } catch (error) {
                              logErrorMessage('Error displaying browser for OverDrive Preview.');
                              logErrorMessage(error);
                         }
                    } else {
                         popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
                    }
               });
     }
}

/**
 * Access an online item
 * @param userId
 * @param id
 * @param source
 * @param accessOnlineUrl
 * @param url
 * @param language
 * @returns {Promise<void>}
 */
export async function viewOnlineItem(userId, id, source, accessOnlineUrl, url = null, language = 'en') {
     if (source === 'hoopla' || source === 'cloud_library') {
          const client = createApiClient({
               url,
               timeout: GLOBALS.timeoutFast,
               language,
          });

          const response = await client.post('/UserAPI?method=viewOnlineItem', {
               userId,
               itemId: id,
               itemSource: source,
          });

          if (response.ok && response.data?.result?.url) {
               const result = response.data.result.url;

               await WebBrowser.openBrowserAsync(result)
                    .then((res) => {
                         logDebugMessage(res);
                    })
                    .catch(async (err) => {
                         if (err.message === 'Another WebBrowser is already being presented.') {
                              try {
                                   WebBrowser.dismissBrowser();
                                   await WebBrowser.openBrowserAsync(result)
                                        .then((response) => {
                                             logDebugMessage(response);
                                        })
                                        .catch(async (error) => {
                                             popToast(getTermFromDictionary(language, 'error_no_open_resource'), getTermFromDictionary(language, 'error_device_block_browser'), 'error');
                                        });
                              } catch (error) {
                                   logDebugMessage('Really borked.');
                              }
                         } else {
                              popToast(getTermFromDictionary(language, 'error_no_open_resource'), getTermFromDictionary(language, 'error_device_block_browser'), 'error');
                         }
                    });
          }
     } else {
          await WebBrowser.openBrowserAsync(accessOnlineUrl)
               .then((res) => {
                    logDebugMessage(res);
               })
               .catch(async (err) => {
                    if (err.message === 'Another WebBrowser is already being presented.') {
                         try {
                              WebBrowser.dismissBrowser();
                              await WebBrowser.openBrowserAsync(accessOnlineUrl)
                                   .then((response) => {
                                        logDebugMessage(response);
                                   })
                                   .catch((error) => {
                                        logErrorMessage(error);
                                        popToast(getTermFromDictionary(language, 'error_no_open_resource'), getTermFromDictionary(language, 'error_device_block_browser'), 'error');
                                   });
                         } catch (error) {
                              logErrorMessage(error);
                              logErrorMessage('Unable to open.');
                         }
                    } else {
                         popToast(getTermFromDictionary(language, 'error_no_open_resource'), getTermFromDictionary(language, 'error_device_block_browser'), 'error');
                    }
               });
     }
}

/**
 * Access an OverDrive item
 * @param userId
 * @param formatId
 * @param overDriveId
 * @param url
 * @param language
 * @returns {Promise<void>}
 */
export async function viewOverDriveItem(userId, formatId, overDriveId, url = null, language = 'en') {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language,
     });

     const response = await client.post('/UserAPI?method=viewOnlineItem', {
          userId,
          overDriveId,
          formatId: formatId ?? '',
          itemSource: 'overdrive',
     });

     if (response.ok && response.data?.result?.url) {
          const accessUrl = response.data.result.url;

          await WebBrowser.openBrowserAsync(accessUrl)
               .then((res) => {
                    logDebugMessage(res);
               })
               .catch(async (err) => {
                    if (err.message === 'Another WebBrowser is already being presented.') {
                         try {
                              WebBrowser.dismissBrowser();
                              await WebBrowser.openBrowserAsync(accessUrl)
                                   .then((response) => {
                                        logDebugMessage(response);
                                   })
                                   .catch(async (error) => {
                                        logErrorMessage('Unable to close previous browser session.');
                                        logErrorMessage(error);
                                   });
                         } catch (error) {
                              logErrorMessage('Really borked.');
                              logErrorMessage(error);
                         }
                    } else {
                         popToast(getTermFromDictionary(language, 'error_no_open_resource'), getTermFromDictionary(language, 'error_device_block_browser'), 'error');
                    }
               });
     }
}

/**
 * Submit a Local ILL request
 * @param url
 * @param request
 * @returns {Promise<{}|*>}
 */
export async function submitLocalIllRequest(url = null, request) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
     });

     const params = {
          acceptFee: request.acceptFee,
          pickupLocation: request.pickupLocation,
          catalogKey: request.catalogKey,
          volumeId: request.volumeId,
          note: request.note,
     };

     const response = await client.post('/UserAPI?method=submitLocalIllRequest', params);

     if (response.ok) {
          if (response.data?.result?.success === true) {
               popAlert(response.data.result.title, response.data.result.message, 'success');
               return response.data.result;
          } else {
               // TODO(api-translation): For response.ok, API should always return a localized error title.
               popAlert(response.data?.title ?? 'Unknown Error', response.data?.result?.message, 'error');
               return response.data.result;
          }
     }

     return {};
}

/**
 * Submit a Local ILL request via email
 * @param url
 * @param request
 * @returns {Promise<{}|*>}
 */
export async function submitLocalIllRequestEmail(url = null, request) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutAverage,
     });

     const params = {
          title: request.title ?? '',
          author: request.author ?? '',
          recordId: request.recordId,
          volume: request.volume ?? '',
          note: request.note ?? '',
     };

     const response = await client.post('/UserAPI?method=submitLocalIllRequestEmail', params);

     if (response.ok) {
          if (response.data?.error) {
               // TODO(api-translation): For response.ok, API should return a localized error title.
               popAlert('Unexpected Error', response.data.error, 'error');
               return response.data.result;
          } else {
               if (response.data?.result?.success === true) {
                    popAlert(response.data.result.api.title, response.data.result.api.message, 'success');
                    return response.data.result;
               } else {
                    // TODO(api-translation): For response.ok, API should always return a localized error title.
                    popAlert(response.data?.api?.title ?? 'Unknown Error', response.data?.result?.api?.message, 'error');
                    return response.data.result;
               }
          }
     }

     return {};
}
