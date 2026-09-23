import * as SecureStore from 'expo-secure-store';
import React from 'react';
import {
     getLanguageDisplayName,
     getTranslatedTermsForUserPreferredLanguage,
     setTranslationsLibrary,
     translationsLibrary } from '../translations/TranslationService';
import {
     getCatalogStatus,
     getLibraryInfo,
     getLibraryLanguages,
     getLibraryLinks,
     getLocationInfo,
     normalizeLibraryLanguagesPayload,
     getSelfCheckSettings } from '../util/api/system';
import {
     fetchNotificationHistory,
     getAppPreferencesForUser,
     getPickupLocations,
     getPickupSublocations,
     getLinkedAccounts,
     refreshProfile } from '../util/api/user';
import { formatLinkedAccounts, formatNotificationHistory, formatPickupLocations } from '../util/api/userHelper';
import { LIBRARY } from '../util/globals';
import {
     loadAllUserData,
     loadAllLibraryBranchData,
     saveUserProfile,
     saveAccounts,
     saveLocations,
     saveCards,
     saveAppPreferences,
     saveNotificationHistory,
     saveInbox,
     saveAllLibraryBranchData,
     loadAllLibrarySystemData,
     loadAllLanguageData,
     saveCatalogStatus,
     saveLibrary,
     saveMenu,
     getCurrentLibraryId } from '../util/db';
import { getErrorMessage, logDebugMessage, logErrorMessage, logWarnMessage } from '../util/logging.js';
import { isPlainObject, stripHTML } from '../helpers/helpers';

const noop = () => {};

function resolveSelfCheckEnabled(result = {}) {
     const candidates = [
          result?.settings?.isEnabled,
          result?.settings?.enableSelfCheck,
          result?.settings?.selfCheckEnabled,
          result?.isEnabled,
          result?.enableSelfCheck,
          result?.selfCheckEnabled,
          result?.selfCheckSettings?.isEnabled,
          result?.selfCheckSettings?.enableSelfCheck,
          result?.selfCheckSettings?.selfCheckEnabled,
     ];

     for (const candidate of candidates) {
          if (candidate === true || candidate === 1 || candidate === '1') return true;
          if (candidate === false || candidate === 0 || candidate === '0') return false;
          if (typeof candidate === 'string') {
               const lowered = candidate.toLowerCase();
               if (lowered === 'true') return true;
               if (lowered === 'false') return false;
          }
     }

     return undefined;
}

/**
 * Shared fetch-and-persist logic for the four startup cache domains (user, library
 * branch, library system, language). Extracted from Loading.js's blocking loading
 * pipeline so the same `{ runInBackground: true }` code path - already used there
 * whenever a single domain is stale but the others are fresh - can also run headless,
 * without mounting LoadingScreen (see BackgroundCacheRefresher).
 *
 * All UI-only setters (progress bar, error screen, stale-fallback flags) default to
 * no-ops: they're only reachable on the `runInBackground: false` (blocking) branches,
 * which Loading.js uses by passing its own setters in.
 */
export function useDataSync({
     library = {},
     language = 'en',
     languages = [],
     updateLanguage = noop,
     updateLanguageDisplayName = noop,
     updateLanguages = noop,
     updateDictionary = noop,
     updateLibraryVersion = noop,
     numSteps = 1,
     setLoadedUser = noop,
     setLocation = noop,
     setLibraryData = noop,
     setLibraryLinksQuerySuccess = noop,
     setHasError = noop,
     setErrorTitle = noop,
     setErrorMessage = noop,
     setProgress = noop,
     setHasUsableUserCache = noop,
     setShouldBlockUserFetch = noop,
     setIsInitialUserDataReady = noop,
     setHasUsableLibraryBranchCache = noop,
     setShouldBlockLibraryBranchFetch = noop,
     setIsInitialLibraryBranchDataReady = noop,
     setHasUsableLibrarySystemCache = noop,
     setShouldBlockLibrarySystemFetch = noop,
     setIsInitialLibrarySystemDataReady = noop,
     setHasUsableLanguageCache = noop,
     setShouldBlockLanguageFetch = noop,
     setIsInitialLanguageDataReady = noop,
} = {}) {
     const isCachedUserForCurrentLogin = React.useCallback(async (cachedUser) => {
          if (!cachedUser) return false;
          const loginUserKey = (await SecureStore.getItemAsync('userKey')) ?? '';
          const normalizedKey = String(loginUserKey).toLowerCase();
          const normalizedCat = String(cachedUser?.cat_username ?? '').toLowerCase();
          const normalizedBarcode = String(cachedUser?.ils_barcode ?? '').toLowerCase();
          return !normalizedKey || normalizedKey === normalizedCat || normalizedKey === normalizedBarcode;
     }, []);

     const applyStaleUserFallback = React.useCallback(async () => {
          logDebugMessage("Applying Stale User Fallback");
          const cached = await loadAllUserData();
          const cachedUser = cached?.user ?? null;
          const isCurrentUser = await isCachedUserForCurrentLogin(cachedUser);
          if (!isCurrentUser) return false;

          const fallbackLanguage = cachedUser.interfaceLanguage ?? 'en';
          setLoadedUser(cachedUser);
          await updateLanguage(fallbackLanguage);
          await updateLanguageDisplayName(getLanguageDisplayName(fallbackLanguage, languages));
          try {
               await getTranslatedTermsForUserPreferredLanguage(fallbackLanguage, LIBRARY.url);
               setTranslationsLibrary(translationsLibrary);
               await updateDictionary(translationsLibrary);
          } catch (translationError) {
               logWarnMessage('Unable to refresh translations for stale cached user language. Continuing startup with cached dictionary.');
               logErrorMessage(translationError);
          }
          setHasUsableUserCache(true);
          setShouldBlockUserFetch(false);
          setIsInitialUserDataReady(true);
          return true;
     }, [isCachedUserForCurrentLogin, languages, updateLanguage, updateLanguageDisplayName, updateDictionary, setLoadedUser, setHasUsableUserCache, setShouldBlockUserFetch, setIsInitialUserDataReady]);

     const applyStaleLibraryBranchFallback = React.useCallback(async () => {
          const cached = await loadAllLibraryBranchData();
          const hasStaleBranchData = !!cached?.location && !!cached.location.locationId;
          if (!hasStaleBranchData) return false;

          setLocation(cached?.location || {});
          setHasUsableLibraryBranchCache(true);
          setShouldBlockLibraryBranchFetch(false);
          setIsInitialLibraryBranchDataReady(true);
          return true;
     }, [setLocation, setHasUsableLibraryBranchCache, setShouldBlockLibraryBranchFetch, setIsInitialLibraryBranchDataReady]);

     const applyStaleLibrarySystemFallback = React.useCallback(async () => {
          const cached = await loadAllLibrarySystemData();
          if (!cached?.library) return false;

          setLibraryData(cached.library);
          if (cached.library.discoveryVersion) {
               await updateLibraryVersion(cached.library.discoveryVersion);
          }
          setHasUsableLibrarySystemCache(true);
          setShouldBlockLibrarySystemFetch(false);
          setIsInitialLibrarySystemDataReady(true);
          setLibraryLinksQuerySuccess(true);
          return true;
     }, [updateLibraryVersion, setLibraryData, setHasUsableLibrarySystemCache, setShouldBlockLibrarySystemFetch, setIsInitialLibrarySystemDataReady, setLibraryLinksQuerySuccess]);

     const applyStaleLanguageFallback = React.useCallback(async () => {
          const cached = await loadAllLanguageData();
          const cachedLanguages = Array.isArray(cached?.languages) ? cached.languages : [];
          const hasStaleLanguageData = cachedLanguages.length > 0;
          if (!hasStaleLanguageData) return false;

          const cachedDictionary = isPlainObject(cached?.dictionary) ? cached.dictionary : {};
          await updateLanguages(cachedLanguages);
          setTranslationsLibrary(cachedDictionary);
          await updateDictionary(cachedDictionary);
          setHasUsableLanguageCache(true);
          setShouldBlockLanguageFetch(false);
          setIsInitialLanguageDataReady(true);
          return true;
     }, [updateLanguages, updateDictionary, setHasUsableLanguageCache, setShouldBlockLanguageFetch, setIsInitialLanguageDataReady]);

     const fetchAndPersistUserData = React.useCallback(async ({ runInBackground = false } = {}) => {
          logDebugMessage({ event: 'fetchAndPersistUserData:start', runInBackground });
          try {
               const profileResp = await refreshProfile(LIBRARY.url);
               const validProfile = profileResp?.ok && profileResp?.data?.result?.success !== false && profileResp?.data?.result?.success !== 'false';
               if (!validProfile) {
                    if (runInBackground) return false;
                    const usedStaleData = await applyStaleUserFallback();
                    if (usedStaleData) {
                         setProgress(prevProgress => prevProgress + (100 / numSteps));
                         return true;
                    }
                    const error = getErrorMessage(profileResp?.code ?? 0, profileResp?.problem);
                    setHasError(true);
                    setErrorTitle('Unable to load patron profile');
                    setErrorMessage(error.message);
                    return false;
               }

               const profile = profileResp.data.result.profile ?? {};
               await saveUserProfile(profile);
               setLoadedUser(profile);
               logDebugMessage("Updating language in fetchAndPersistUserData");
               const profileLanguage = profile.interfaceLanguage ?? 'en';
               await updateLanguage(profileLanguage);
               await updateLanguageDisplayName(getLanguageDisplayName(profileLanguage ?? 'en', languages));
               try {
                    await getTranslatedTermsForUserPreferredLanguage(profileLanguage, LIBRARY.url);
                    setTranslationsLibrary(translationsLibrary);
                    await updateDictionary(translationsLibrary);
               } catch (translationError) {
                    logWarnMessage('Unable to refresh translations for interface language after profile load. Continuing startup.');
                    logErrorMessage(translationError);
               }

               try {
                    const languageResponse = await getLibraryLanguages(LIBRARY.url);
                    if (languageResponse?.ok) {
                         const fetchedLanguages = normalizeLibraryLanguagesPayload(
                              languageResponse?.data?.result?.languages
                         );
                         await updateLanguages(fetchedLanguages);
                         if (fetchedLanguages.length > 0) {
                              setIsInitialLanguageDataReady(true);
                         }
                    }
               } catch (languageListError) {
                    logWarnMessage('Unable to refresh available language list after profile load. Continuing startup.');
                    logErrorMessage(languageListError);
               }

               const pickupResp = typeof getPickupLocations === 'function'
                    ? await getPickupLocations(LIBRARY.url)
                    : null;
               if (pickupResp?.ok) {
                    const pickupLocations = formatPickupLocations(pickupResp.data?.result ?? {});
                    await saveLocations(pickupLocations?.locations ?? []);
               }

               if (typeof getPickupSublocations === 'function') {
                    await getPickupSublocations(LIBRARY.url);
               }

               const linkedResp = await getLinkedAccounts(LIBRARY.url, 'en');
               if (linkedResp?.ok) {
                    const linkedAccounts = formatLinkedAccounts(profile, [], library?.barcodeStyle ?? 'UNKNOWN', linkedResp.data?.result?.linkedAccounts);
                    await saveAccounts(linkedAccounts.accounts ?? []);
                    await saveCards(linkedAccounts.cards ?? []);
               }

               const appPrefsResp = await getAppPreferencesForUser(LIBRARY.url, 'en');
               if (appPrefsResp?.ok) {
                    await saveAppPreferences(appPrefsResp.data?.result ?? {});
               }

               const notifResp = await fetchNotificationHistory(1, 20, true, LIBRARY.url, 'en');
               if (notifResp?.ok) {
                    const notificationHistory = formatNotificationHistory(notifResp.data?.result ?? {});
                    await saveNotificationHistory(notificationHistory);
                    await saveInbox(notificationHistory?.inbox ?? []);
               }

               if (!runInBackground) {
                    setProgress(prevProgress => prevProgress + (100 / numSteps));
                    setIsInitialUserDataReady(true);
               }

               logDebugMessage({ event: 'fetchAndPersistUserData:success', runInBackground });
               return true;
          } catch (error) {
               if (runInBackground) {
                    logWarnMessage('Background user-data refresh failed. Continuing with cached data.');
                    logErrorMessage(error);
                    return false;
               }
               const usedStaleData = await applyStaleUserFallback();
               if (usedStaleData) {
                    setProgress(prevProgress => prevProgress + (100 / numSteps));
                    return true;
               }
               setHasError(true);
               setErrorTitle(null);
               setErrorMessage('Error loading user data. Please try again or contact the library.');
               logErrorMessage(error);
               return false;
          }
     }, [applyStaleUserFallback, library?.barcodeStyle, languages, numSteps, updateLanguage, updateLanguageDisplayName, updateLanguages, updateDictionary, setLoadedUser, setHasError, setErrorTitle, setErrorMessage, setProgress, setIsInitialUserDataReady, setIsInitialLanguageDataReady]);

     const fetchAndPersistLibraryBranchData = React.useCallback(async ({ runInBackground = false } = {}) => {
          logDebugMessage({ event: 'fetchAndPersistLibraryBranchData:start', runInBackground });
          try {
               const configuredLocationId = await SecureStore.getItemAsync('locationId');
               const locationResp = await getLocationInfo(LIBRARY.url, configuredLocationId);
               if (!locationResp?.ok) {
                    if (runInBackground) {
                         logWarnMessage('Background location refresh failed. Continuing with cached data.');
                         return false;
                    }
                    const usedStaleData = await applyStaleLibraryBranchFallback();
                    if (usedStaleData) return true;
                    const error = getErrorMessage(locationResp?.code ?? 0, locationResp?.problem);
                    setHasError(true);
                    setErrorTitle("Unable to load library branches");
                    setErrorMessage(error.message);
                    return false;
               }

               const location = locationResp.data.result?.location ?? [];

               const selfCheckLocationId = configuredLocationId ?? location?.locationId ?? null;
               const selfCheckResp = await getSelfCheckSettings(LIBRARY.url, selfCheckLocationId);
               let selfCheckEnabled;
               let selfCheckSettings;

               if (selfCheckResp?.ok) {
                    const result = selfCheckResp.data?.result ?? {};
                    const settings = isPlainObject(result?.settings) ? result.settings : {};
                    const normalizedEnabled = resolveSelfCheckEnabled(result);

                    if (typeof normalizedEnabled === 'boolean') {
                         selfCheckEnabled = normalizedEnabled;
                    }
                    if (Object.keys(settings).length > 0) {
                         selfCheckSettings = settings;
                    }
               }

               await saveAllLibraryBranchData({
                    location: location,
                    ...(typeof selfCheckEnabled !== 'undefined' ? { enableSelfCheck: selfCheckEnabled } : {}),
                    ...(typeof selfCheckSettings !== 'undefined' ? { selfCheckSettings } : {})
               });

               if (!runInBackground) {
                    setIsInitialLibraryBranchDataReady(true);
                    setLocation(location);
               }

               logDebugMessage({ event: 'fetchAndPersistLibraryBranchData:success', runInBackground });
               return true;
          } catch (error) {
               if (runInBackground) {
                    logWarnMessage('Background library-branch-data refresh failed. Continuing with cached data.');
                    logErrorMessage(error);
                    return false;
               }
               const usedStaleData = await applyStaleLibraryBranchFallback();
               if (usedStaleData) return true;
               setHasError(true);
               setErrorTitle(null);
               setErrorMessage('Error loading library branch data. Please try again or contact the library.');
               logErrorMessage(error);
               return false;
          }
     }, [applyStaleLibraryBranchFallback, setIsInitialLibraryBranchDataReady, setLocation, setHasError, setErrorTitle, setErrorMessage]);

     const fetchAndPersistLibrarySystemData = React.useCallback(async ({ runInBackground = false } = {}) => {
          logDebugMessage({ event: 'fetchAndPersistLibrarySystemData:start', runInBackground });
          try {
               const catalogResp = await getCatalogStatus(LIBRARY.url);
               let catalogStatus = 0;
               let catalogStatusMessage = '';
               if (catalogResp?.ok) {
                    catalogStatus = catalogResp.data.result?.catalogStatus ?? 0;
                    if (catalogResp.data.result?.api?.message) {
                         catalogStatusMessage = stripHTML(catalogResp.data.result.api.message);
                    }
               }

               const libraryResp = await getLibraryInfo(LIBRARY.url, getCurrentLibraryId());
               if (!libraryResp?.ok) {
                    if (runInBackground) {
                         logWarnMessage('Background library info refresh failed. Continuing with cached data.');
                         return false;
                    }
                    const usedStaleData = await applyStaleLibrarySystemFallback();
                    if (usedStaleData) return true;
                    const error = getErrorMessage(libraryResp?.code ?? 0, libraryResp?.problem);
                    setHasError(true);
                    setErrorTitle("Unable to load library info");
                    setErrorMessage(error.message);
                    return false;
               }

               const libraryInfo = libraryResp.data.result?.library ?? {};
               setLibraryData(libraryInfo);

               const linksResp = await getLibraryLinks(LIBRARY.url);
               const menu = linksResp?.ok ? (linksResp.data.result?.items ?? []) : [];

               await saveCatalogStatus(catalogStatus, catalogStatusMessage);
               await saveLibrary(libraryInfo);
               await saveMenu(menu);

               if (libraryInfo.discoveryVersion) {
                    await updateLibraryVersion(libraryInfo.discoveryVersion);
               }

               if (!runInBackground) {
                    setIsInitialLibrarySystemDataReady(true);
                    setLibraryLinksQuerySuccess(true);
               }

               logDebugMessage({ event: 'fetchAndPersistLibrarySystemData:success', runInBackground });
               return true;
          } catch (error) {
               if (runInBackground) {
                    logWarnMessage('Background library-system-data refresh failed. Continuing with cached data.');
                    logErrorMessage(error);
                    return false;
               }
               const usedStaleData = await applyStaleLibrarySystemFallback();
               if (usedStaleData) return true;
               setHasError(true);
               setErrorTitle(null);
               setErrorMessage('Error loading library system data. Please try again or contact the library.');
               logErrorMessage(error);
               return false;
          }
     }, [applyStaleLibrarySystemFallback, updateLibraryVersion, setLibraryData, setIsInitialLibrarySystemDataReady, setLibraryLinksQuerySuccess, setHasError, setErrorTitle, setErrorMessage]);

     const fetchAndPersistLanguageData = React.useCallback(async ({ runInBackground = false } = {}) => {
          try {
               const activeLanguage = language ?? 'en';

               const languageResponse = await getLibraryLanguages(LIBRARY.url);
               if (!languageResponse?.ok) {
                    if (runInBackground) {
                         logWarnMessage('Background language-list refresh failed. Continuing with cached language list.');
                         return false;
                    }
                    const usedStaleData = await applyStaleLanguageFallback();
                    if (usedStaleData) {
                         setProgress(prevProgress => prevProgress + (100 / numSteps));
                         return true;
                    }
                    const error = getErrorMessage(languageResponse?.code ?? 0, languageResponse?.problem);
                    setHasError(true);
                    setErrorTitle('Unable to load library languages');
                    setErrorMessage(error.message);
                    return false;
               }

               const fetchedLanguages = normalizeLibraryLanguagesPayload(
                    languageResponse?.data?.result?.languages
               );
               await updateLanguages(fetchedLanguages);

               await getTranslatedTermsForUserPreferredLanguage(activeLanguage, LIBRARY.url);
               setTranslationsLibrary(translationsLibrary);
               await updateDictionary(translationsLibrary);

               if (!runInBackground) {
                    setIsInitialLanguageDataReady(true);
                    setProgress(prevProgress => prevProgress + (100 / numSteps));
               }

               return true;
          } catch (error) {
               if (runInBackground) {
                    logWarnMessage('Background language-data refresh failed. Continuing with cached translations.');
                    logErrorMessage(error);
                    return false;
               }
               const usedStaleData = await applyStaleLanguageFallback();
               if (usedStaleData) {
                    setProgress(prevProgress => prevProgress + (100 / numSteps));
                    return true;
               }
               setHasError(true);
               setErrorTitle(null);
               setErrorMessage('Error loading language data. Please try again or contact the library.');
               logErrorMessage(error);
               return false;
          }
     }, [applyStaleLanguageFallback, language, updateLanguages, updateDictionary, numSteps, setHasError, setErrorTitle, setErrorMessage, setProgress, setIsInitialLanguageDataReady]);

     return {
          fetchAndPersistUserData,
          fetchAndPersistLibraryBranchData,
          fetchAndPersistLibrarySystemData,
          fetchAndPersistLanguageData,
          applyStaleLibrarySystemFallback,
     };
}