import { logDebugMessage, logErrorMessage, logWarnMessage } from '../logging';
import { popToast } from '../../components/feedback';
import * as WebBrowser from 'expo-web-browser';
import { getTermFromDictionary } from '../../translations/TranslationHelper';
import { checkoutItem, overDriveSample, placeHold } from './user';
import { orderByFields } from '../../helpers/helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function formatPickupLocations(data) {
     let locations = [];
     const tmp = data.pickupLocations;
     if (Array.isArray(tmp)) {
          locations = tmp.map(({ displayName, code, locationId }) => ({
               key: locationId,
               locationId,
               code,
               name: displayName,
          }));
     }
     data.locations = locations;
     return data;
}

/**
 * Complete the action on the item, i.e. checkout, hold, or view sample
 * Parameters:
 * @param {string} id
 * @param {string} actionType
 * @param {string} patronId
 * @param {string} formatId
 * @param {string} sampleNumber
 * @param {string} pickupBranch
 * @param {string} sublocation
 * @param {string} rememberPickupLocation
 * @param {string} url
 * @param {string} volumeId
 * @param {string} holdType
 * @param {array} holdNotificationPreferences
 * @param {string} variationId
 * @param {string} bibId
 **/
export async function completeAction(id, actionType, patronId, formatId = '', sampleNumber = '', pickupBranch = '', sublocation = '', rememberPickupLocation = '', url, volumeId = '', holdType = '', holdNotificationPreferences, variationId = '', bibId = '') {
     logDebugMessage('Completing action ' + actionType);
     const recordId = id.split(':');
     const source = recordId[0];
     let itemId = recordId[1];
     if (recordId[1] === 'kindle') {
          itemId = recordId[2];
     }

     let patronProfile;
     try {
          const tmp = await AsyncStorage.getItem('@patronProfile');
          patronProfile = JSON.parse(tmp);
     } catch (e) {
          logErrorMessage('Unable to fetch patron profile in grouped work from async storage');
          logErrorMessage(e);
     }

     if (actionType.includes('checkout')) {
          return await checkoutItem(url, itemId, source, patronId);
     } else if (actionType.includes('hold')) {
          if (volumeId) {
               return await placeHold(url, itemId, source, patronId, pickupBranch, sublocation, rememberPickupLocation, volumeId, holdType, id, holdNotificationPreferences);
          } else if (patronProfile && typeof patronProfile === 'object' && !Array.isArray(patronProfile)) {
               if (!patronProfile.overdriveEmail && patronProfile.promptForOverdriveEmail === 1 && source === 'overdrive') {
                    const getPromptForOverdriveEmail = [];
                    getPromptForOverdriveEmail['getPrompt'] = true;
                    getPromptForOverdriveEmail['itemId'] = itemId;
                    getPromptForOverdriveEmail['source'] = source;
                    getPromptForOverdriveEmail['patronId'] = patronId;
                    getPromptForOverdriveEmail['overdriveEmail'] = patronProfile.overdriveEmail;
                    getPromptForOverdriveEmail['promptForOverdriveEmail'] = patronProfile.promptForOverdriveEmail;
                    return getPromptForOverdriveEmail;
               }
          } else {
               return await placeHold(url, itemId, source, patronId, pickupBranch, sublocation, rememberPickupLocation, volumeId, holdType, id, holdNotificationPreferences, variationId);
          }
     } else if (actionType.includes('sample')) {
          return await overDriveSample(url, formatId, itemId, sampleNumber);
     }
}

export async function openSideLoad(redirectUrl) {
     if (redirectUrl) {
          await WebBrowser.openBrowserAsync(redirectUrl)
               .then((res) => {
                    logDebugMessage('Response from opening side load');
                    logDebugMessage(res);
               })
               .catch(async (err) => {
                    if (err.message === 'Another WebBrowser is already being presented.') {
                         try {
                              WebBrowser.dismissBrowser();
                              await WebBrowser.openBrowserAsync(redirectUrl)
                                   .then((response) => {
                                        logDebugMessage('Response from reopening browser');
                                        logDebugMessage(response);
                                   })
                                   .catch(async (error) => {
                                        logWarnMessage('Unable to close previous browser session.');
                                        popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
                                   });
                         } catch (error) {
                              logErrorMessage('Tried to open again but still unable');
                              logErrorMessage(error);
                              popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
                         }
                    } else {
                         logWarnMessage('Unable to open browser window.');
                         popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
                    }
               });
     } else {
          popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_no_valid_url'), 'error');
          logErrorMessage('No redirect URL provided for side load');
     }
}

export function formatHolds(data) {
     let holdsReady = [];
     let holdsNotReady = [];

     if (typeof data.unavailable !== 'undefined') {
          holdsNotReady = Object.values(data.unavailable);
     }

     if (typeof data.available !== 'undefined') {
          holdsReady = Object.values(data.available);
     }

     return [
          {
               title: 'Ready',
               data: holdsReady,
          },
          {
               title: 'Pending',
               data: holdsNotReady,
          },
     ];
}

export function sortHolds(holds, pendingSort, readySort) {
     let sortedHolds = holds;
     let holdsReady = [];
     let holdsNotReady = [];

     let pendingSortMethod = pendingSort;
     if (pendingSort === 'sortTitle') {
          pendingSortMethod = 'title';
     } else if (pendingSort === 'libraryAccount') {
          pendingSortMethod = 'user';
     }

     let readySortMethod = readySort;
     if (readySort === 'sortTitle') {
          readySortMethod = 'title';
     } else if (readySort === 'libraryAccount') {
          readySortMethod = 'user';
     }

     if (holds) {
          if (holds[1].title === 'Pending') {
               holdsNotReady = holds[1].data;
               if (pendingSortMethod === 'position') {
                    holdsNotReady = orderByFields(
                         holdsNotReady,
                         function (obj) {
                              return Number(obj.position);
                         },
                         ['desc']
                    );
               }
               holdsNotReady = orderByFields(holdsNotReady, [pendingSortMethod], ['asc']);
          }

          if (holds[0].title === 'Ready') {
               holdsReady = holds[0].data;
               holdsReady = orderByFields(holdsReady, [readySortMethod], ['asc']);
          }
     }

     return [
          {
               title: 'Ready',
               data: holdsReady,
          },
          {
               title: 'Pending',
               data: holdsNotReady,
          },
     ];
}

export function sortCheckouts(checkouts, sort) {
     let sortedCheckouts = [];
     logDebugMessage('Sorting checkouts by ' + sort);

     let sortMethod = sort;
     let order = 'asc';
     if (sort === 'sortTitle') {
          sortMethod = 'title';
     } else if (sort === 'libraryAccount') {
          sortMethod = 'user';
     } else if (sort === 'dueDesc') {
          sortMethod = 'dueDate';
          order = 'desc';
     } else if (sort === 'dueAsc') {
          sortMethod = 'dueDate';
     } else if (sort === 'timesRenewed') {
          sortMethod = 'renewCount';
          order = 'desc';
     }

     if (checkouts) {
          sortedCheckouts = orderByFields(checkouts, [sortMethod], [order]);
     }

     return sortedCheckouts;
}

export function formatLinkedAccounts(primaryUser, cards, barcodeStyle, data) {
     let count = 1;
     let cardStack = [];
     let accounts = [];
     const primaryCard = {
          key: 0,
          displayName: primaryUser.displayName,
          userId: primaryUser.id,
          ils_barcode: primaryUser.ils_barcode ?? primaryUser.cat_username,
          expired: primaryUser.expired,
          expires: primaryUser.expires,
          barcodeStyle: barcodeStyle,
          homeLocation: primaryUser.homeLocation,
     };
     cardStack.push(primaryCard);
     if (data !== undefined) {
          accounts = Object.values(data ?? {});
          if (accounts.length >= 1) {
               accounts.forEach((account) => {
                    if (!cards.includes(account.ils_barcode)) {
                         count = count + 1;
                         const card = {
                              key: count,
                              displayName: account.displayName,
                              userId: account.id,
                              ils_barcode: account.ils_barcode ?? account.barcode,
                              expired: account.expired,
                              expires: account.expires,
                              barcodeStyle: account.barcodeStyle ?? barcodeStyle,
                              homeLocation: account.homeLocation,
                         };
                         cardStack.push(card);
                    } else if (!cards.includes(account.cat_username)) {
                         count = count + 1;
                         const card = {
                              key: count,
                              displayName: account.displayName,
                              userId: account.id,
                              cat_username: account.cat_username ?? account.barcode,
                              expired: account.expired,
                              expires: account.expires,
                              barcodeStyle: account.barcodeStyle ?? barcodeStyle,
                              homeLocation: account.homeLocation,
                         };
                         cardStack.push(card);
                    }
               });
          }
     }
     return {
          accounts: accounts ?? [],
          cards: cardStack ?? [],
     };
}

export function formatNotificationHistory(data) {
     let morePages = false;

     if (data.page_current !== data.page_total) {
          morePages = true;
     }

     return {
          inbox: data.inbox ?? [],
          totalResults: data.totalResults ?? 0,
          curPage: data.page_current ?? 0,
          totalPages: data.page_total ?? 0,
          hasMore: morePages,
          message: data.message ?? null,
     };
}

export function formatReadingHistory(data) {
     let morePages = false;
     if (data.page_current !== data.page_total) {
          morePages = true;
     }
     return {
          history: data.readingHistory ?? [],
          totalResults: data.totalResults ?? 0,
          curPage: data.page_current ?? 0,
          totalPages: data.page_total ?? 0,
          hasMore: morePages,
          sort: data.sort ?? 'checkedOut',
          message: data.message ?? null,
     };
}
