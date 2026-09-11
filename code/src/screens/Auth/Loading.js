import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import * as Sentry from '@sentry/react-native';
import { SystemMessagesContext } from '../../context/initialContext';
import { buildThemeForLibrary, runExclusiveThemeInit, useTheme, TOKENS } from '../../themes/theme';
import {
     getLanguageDisplayName,
     getTermFromDictionary,
     getTranslatedTermsForUserPreferredLanguage,
     setTranslationsLibrary,
     translationsLibrary } from '../../translations/TranslationService';
import {
     getCatalogStatus,
     getLibraryInfo,
     getLibraryLanguages,
     getLibraryLinks,
     getLocationInfo,
      normalizeLibraryLanguagesPayload,
     getSelfCheckSettings,
     getSystemMessages
} from '../../util/api/system';
import {getHomeScreenFeed} from '../../util/api/search';
import {
     fetchNotificationHistory,
     getAppPreferencesForUser,
     getPickupLocations,
     getPickupSublocations,
     getLinkedAccounts,
     refreshProfile
} from '../../util/api/user';
import {formatLinkedAccounts, formatNotificationHistory, formatPickupLocations} from '../../util/api/userHelper';
import { GLOBALS, LIBRARY, isBrandedApp } from '../../util/globals';
import {CatalogOffline} from './CatalogOffline';
import {ForceLogout} from './ForceLogout';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
     saveHomeScreenLinks,
     loadBrowseCategories,
     loadThemeState,
     saveThemeState,
     isStoredThemeIdMatch,
     loadLocation } from '../../util/db';
import {
     useUpdateLibraryVersion,
     useUpdateCatalogStatus } from '../../hooks/useLibrarySystemData';
import {
     useUpdateBrowseCategories,
     useUpdateMaxCategories } from '../../hooks/useBrowseCategoryData';
import {
     useActiveLanguage,
     useAvailableLanguages,
     useUpdateActiveLanguage,
     useUpdateAvailableLanguages,
     useUpdateDictionary,
     useUpdateLanguageDisplayName } from '../../hooks/useLanguageData';
import {getErrorMessage, logDebugMessage, logErrorMessage, logWarnMessage} from '../../util/logging.js';
import {isPlainObject, stripHTML, RemoveData} from '../../helpers/helpers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box } from '@/components/ui/box';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { VStack } from '@/components/ui/vstack';
import { ScreenContainer } from '@/src/components/ScreenContainer';

const USER_DATA_STALE_MS = 24 * 60 * 60 * 1000;         // 24 hours
const LANGUAGE_DATA_STALE_MS = 24 * 60 * 60 * 1000;     // 24 hours
const LIBRARY_BRANCH_DATA_STALE_MS = 24 * 60 * 60 * 1000;     // 24 hours
const LIBRARY_SYSTEM_METADATA_STALE_MS = 24 * 60 * 60 * 1000;     // 24 hours
const LIBRARY_SYSTEM_MENU_STALE_MS = 24 * 60 * 60 * 1000;     // 24 hours

Notifications.setNotificationHandler({
     handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false }) });

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
 * LoadingScreen component that handles the initial loading and data fetching for the app, including user data, library branch data, library system metadata, and language data. It also manages error handling and displays a progress indicator during the loading process.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const LoadingScreen = () => {
     const queryClient = useQueryClient();
     const navigation = useNavigation();
     const route = useRoute();
     const isScreenFocused = useIsFocused();
     const isSQLiteMigrationNeeded = route.params?.isSQLiteMigrationNeeded ?? false;
     const [isFocused, setIsFocused] = React.useState(0);
     const [progress, setProgress] = React.useState(0);
     const [isReloading, setIsReloading] = React.useState(false);
     const [hasError, setHasError] = React.useState(false);
     const [errorMessage, setErrorMessage] = React.useState(null);
     const [errorTitle, setErrorTitle] = React.useState(null);
     const [hasUsableUserCache, setHasUsableUserCache] = React.useState(false);
     const [shouldBlockUserFetch, setShouldBlockUserFetch] = React.useState(true);
       const [isInitialUserDataReady, setIsInitialUserDataReady] = React.useState(false);
       const [hasHydratedUserCacheDecision, setHasHydratedUserCacheDecision] = React.useState(false);
       const [hasUsableLibraryBranchCache, setHasUsableLibraryBranchCache] = React.useState(false);
       const [shouldBlockLibraryBranchFetch, setShouldBlockLibraryBranchFetch] = React.useState(true);
        const [isInitialLibraryBranchDataReady, setIsInitialLibraryBranchDataReady] = React.useState(false);
        const [hasHydratedLibraryBranchCacheDecision, setHasHydratedLibraryBranchCacheDecision] = React.useState(false);
        const [isSQLiteDataLoaded, setIsSQLiteDataLoaded] = React.useState(false);
        const [hasUsableLibrarySystemCache, setHasUsableLibrarySystemCache] = React.useState(false);
        const [shouldBlockLibrarySystemFetch, setShouldBlockLibrarySystemFetch] = React.useState(true);
        const [isInitialLibrarySystemDataReady, setIsInitialLibrarySystemDataReady] = React.useState(false);
        const [hasHydratedLibrarySystemCacheDecision, setHasHydratedLibrarySystemCacheDecision] = React.useState(false);
        const [hasUsableLanguageCache, setHasUsableLanguageCache] = React.useState(false);
        const [shouldBlockLanguageFetch, setShouldBlockLanguageFetch] = React.useState(true);
        const [isInitialLanguageDataReady, setIsInitialLanguageDataReady] = React.useState(false);
        const [hasHydratedLanguageCacheDecision, setHasHydratedLanguageCacheDecision] = React.useState(false);
       const isBlockingUserFetchInFlightRef = React.useRef(false);
       const isBlockingLibraryBranchFetchInFlightRef = React.useRef(false);
       const isBlockingLibrarySystemFetchInFlightRef = React.useRef(false);
       const userDataFetchInvocationRef = React.useRef(0);
       const libraryBranchFetchInvocationRef = React.useRef(0);
       const librarySystemFetchInvocationRef = React.useRef(0);
       const fetchAndPersistUserDataRef = React.useRef(null);
       const fetchAndPersistLibraryBranchDataRef = React.useRef(null);
       const fetchAndPersistLibrarySystemDataRef = React.useRef(null);

       const updateBrowseCategories = useUpdateBrowseCategories();
       const updateMaxCategories = useUpdateMaxCategories();
       const language = useActiveLanguage();
       const languages = useAvailableLanguages();
       const updateLanguage = useUpdateActiveLanguage();
       const updateLanguages = useUpdateAvailableLanguages();
       const updateDictionary = useUpdateDictionary();
       const updateLanguageDisplayName = useUpdateLanguageDisplayName();
       const { updateSystemMessages } = React.useContext(SystemMessagesContext);
       const { updateTheme, updateColorMode, textColor } = useTheme();

       // Get library system update hooks
       const updateLibraryVersion = useUpdateLibraryVersion();
       const updateCatalogStatus = useUpdateCatalogStatus();

       const [loadingText, setLoadingText] = React.useState('');
       const [loadingTheme, setLoadingTheme] = React.useState(true);
       const [loadedUser, setLoadedUser] = React.useState({});
       const [location, setLocation] = React.useState({});
       const [libraryData, setLibraryData] = React.useState({});
        const [libraryLinksQuerySuccess, setLibraryLinksQuerySuccess] = React.useState(false);
        const [browseCategoryQuerySuccess, setBrowseCategoryQuerySuccess] = React.useState(false);
       const library = libraryData ?? {};
       const appSettings = libraryData?.appSettings ?? LIBRARY?.appSettings ?? {};
       const loadingMessageType = appSettings?.loadingMessageType;
       const loadingMessage = appSettings?.loadingMessage;
       const user = loadedUser;
        // Use URL availability to start hydration/bootstrap. Requiring library metadata here can deadlock
        // because metadata is fetched later in this same loading pipeline.
        const hasResolvedLibraryContext = !!LIBRARY.url;

     const insets = useSafeAreaInsets();
     const { neutralPairs, brand } = useTheme();
     const borderColor = neutralPairs?.border?.light ?? TOKENS.semanticTokens.light.border;

     const numSteps = 14;

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
     }, [isCachedUserForCurrentLogin, languages, updateLanguage, updateLanguageDisplayName, updateDictionary]);

     const applyStaleLibraryBranchFallback = React.useCallback(async () => {
          const cached = await loadAllLibraryBranchData();
          const hasStaleBranchData = !!cached?.location && !!cached.location.locationId;
          if (!hasStaleBranchData) return false;

          setLocation(cached?.location || {});
          setHasUsableLibraryBranchCache(true);
          setShouldBlockLibraryBranchFetch(false);
          setIsInitialLibraryBranchDataReady(true);
          return true;
     }, []);

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
     }, [updateLibraryVersion]);

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
     }, [updateLanguages, updateDictionary]);

     /**
      * Handle silent SQLite migration for users upgrading from Context storage.
      * Attempts to fetch and populate SQLite tables using stored credentials.
      * If migration fails, logs user out and asks them to re-authenticate.
      */
     React.useEffect(() => {
          if (!isScreenFocused || !isSQLiteMigrationNeeded || !hasResolvedLibraryContext) {
               return;
          }

          let migrationCancelled = false;

          const performSilentMigration = async () => {
               logDebugMessage('SQLite migration: Starting silent migration for existing user');
               try {
                    // Attempt to fetch and populate all critical user data
                    const profileResp = await refreshProfile(LIBRARY.url);
                    const validProfile = profileResp?.ok && profileResp?.data?.result?.success !== false && profileResp?.data?.result?.success !== 'false';

                    if (!validProfile) {
                         logErrorMessage('SQLite migration: Failed to refresh user profile');
                         throw new Error('Failed to refresh user profile: ' + (profileResp?.problem || 'Unknown error'));
                    }

                    if (migrationCancelled) return;

                    const profile = profileResp.data.result.profile ?? {};
                    await saveUserProfile(profile);
                    logDebugMessage('SQLite migration: Successfully saved user profile');

                    // Attempt to fetch and save library branch data
                    const configuredLocationId = await SecureStore.getItemAsync('locationId');
                    const locationResp = await getLocationInfo(LIBRARY.url, configuredLocationId);
                    if (!locationResp?.ok) {
                         throw new Error('Failed to load location info');
                    }

                    if (migrationCancelled) return;

                    const location = locationResp.data.result?.location ?? [];
                    const selfCheckLocationId = configuredLocationId ?? location?.locationId ?? null;
                    const selfCheckResp = await getSelfCheckSettings(LIBRARY.url, selfCheckLocationId);

                    let selfCheckEnabled;
                    let selfCheckSettings;
                    if (selfCheckResp?.ok) {
                         const result = selfCheckResp.data?.result ?? {};
                         selfCheckEnabled = resolveSelfCheckEnabled(result);
                         selfCheckSettings = isPlainObject(result?.settings) ? result.settings : {};
                    }

                    await saveAllLibraryBranchData({
                         location: location,
                         ...(typeof selfCheckEnabled !== 'undefined' ? { enableSelfCheck: selfCheckEnabled } : {}),
                         ...(typeof selfCheckSettings !== 'undefined' ? { selfCheckSettings } : {})
                    });
                    logDebugMessage('SQLite migration: Successfully saved library branch data');

                    if (migrationCancelled) return;

                    // Attempt to fetch and save library system data
                    const catalogResp = await getCatalogStatus(LIBRARY.url);
                    let catalogStatus = 0;
                    let catalogStatusMessage = '';
                    if (catalogResp?.ok) {
                         catalogStatus = catalogResp.data.result?.catalogStatus ?? 0;
                         if (catalogResp.data.result?.api?.message) {
                              catalogStatusMessage = stripHTML(catalogResp.data.result.api.message);
                         }
                    }

                    const libraryResp = await getLibraryInfo(LIBRARY.url, LIBRARY.id);
                    if (!libraryResp?.ok) {
                         throw new Error('Failed to load library info');
                    }

                    if (migrationCancelled) return;

                    const libraryInfo = libraryResp.data.result?.library ?? {};
                    const linksResp = await getLibraryLinks(LIBRARY.url);
                    const menu = linksResp?.ok ? (linksResp.data.result?.items ?? []) : [];

                    await saveCatalogStatus(catalogStatus, catalogStatusMessage);
                    await saveLibrary(libraryInfo);
                    await saveMenu(menu);
                    logDebugMessage('SQLite migration: Successfully saved library system data');

                    logDebugMessage('SQLite migration: Completed successfully');
               } catch (error) {
                    if (migrationCancelled) return;

                    logErrorMessage('SQLite migration: Failed to populate SQLite tables');
                    logErrorMessage(error);

                    // Log to Sentry for support debugging
                    if (typeof Sentry !== 'undefined' && Sentry.captureException) {
                         Sentry.captureException(error, {
                              tags: { type: 'sqlite_migration_failure' }
                         });
                    }

                    // Force logout with migration error flag
                    logWarnMessage('SQLite migration: Forcing logout due to migration failure');
                    try {
                         await RemoveData(queryClient, true);
                    } catch (logoutError) {
                         logErrorMessage('SQLite migration: Error during logout cleanup');
                         logErrorMessage(logoutError);
                    }

                    // Navigate back to login with migration error
                    navigation.reset({
                         index: 0,
                         routes: [
                              {
                                   name: 'Login',
                                   params: { migrationError: true }
                              }
                         ]
                    });
               }
          };

          performSilentMigration();

          return () => {
               migrationCancelled = true;
          };
     }, [isScreenFocused, isSQLiteMigrationNeeded, hasResolvedLibraryContext, queryClient, navigation]);

     const fetchAndPersistUserData = React.useCallback(async ({ runInBackground = false } = {}) => {
          const invocationId = ++userDataFetchInvocationRef.current;
          logDebugMessage({
               event: 'fetchAndPersistUserData:start',
               invocationId,
               runInBackground });
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

                logDebugMessage({
                     event: 'fetchAndPersistUserData:success',
                     invocationId,
                     runInBackground });

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
               logDebugMessage({
                    event: 'fetchAndPersistUserData:error',
                    invocationId,
                    runInBackground });
               setHasError(true);
               setErrorTitle(null);
               setErrorMessage('Error loading user data. Please try again or contact the library.');
               logErrorMessage(error);
               return false;
          }
     }, [applyStaleUserFallback, library?.barcodeStyle, languages, numSteps, updateLanguage, updateLanguageDisplayName]);

      React.useEffect(() => {
           fetchAndPersistUserDataRef.current = fetchAndPersistUserData;
      }, [fetchAndPersistUserData]);

      const fetchAndPersistLibraryBranchData = React.useCallback(async ({ runInBackground = false } = {}) => {
          const invocationId = ++libraryBranchFetchInvocationRef.current;
          logDebugMessage({
               event: 'fetchAndPersistLibraryBranchData:start',
               invocationId,
               runInBackground });
          try {
               // Fetch location info
               const configuredLocationId = await SecureStore.getItemAsync('locationId');
               const locationResp = await getLocationInfo(LIBRARY.url, configuredLocationId);
               if (!locationResp?.ok) {
                    if (runInBackground) {
                         logWarnMessage('Background location refresh failed. Continuing with cached data.');
                         return false;
                    }
                    const usedStaleData = await applyStaleLibraryBranchFallback();
                    if (usedStaleData) {
                         return true;
                    }
                    const error = getErrorMessage(locationResp?.code ?? 0, locationResp?.problem);
                    setHasError(true);
                    setErrorTitle("Unable to load library branches");
                    setErrorMessage(error.message);
                    return false;
               }

               const location = locationResp.data.result?.location ?? [];

               // Fetch self-check settings
               const selfCheckLocationId = configuredLocationId ?? location?.locationId ?? null;
               logDebugMessage({
                    event: 'self_check_settings_request',
                    configuredLocationId,
                    locationDataLocationId: location?.locationId ?? null,
                    selfCheckLocationId,
               });
               const selfCheckResp = await getSelfCheckSettings(LIBRARY.url, selfCheckLocationId);
               let selfCheckEnabled;
               let selfCheckSettings;

               if (selfCheckResp?.ok) {
                    const result = selfCheckResp.data?.result ?? {};
                    const settings = isPlainObject(result?.settings) ? result.settings : {};
                    const rawEnabled = result?.settings?.isEnabled;
                    const normalizedEnabled = resolveSelfCheckEnabled(result);
                    const success = result?.success === true || result?.success === 'true';
                    logDebugMessage({
                         event: 'self_check_settings_response',
                         locationId: selfCheckLocationId,
                         success,
                         rawEnabled,
                         normalizedEnabled,
                    });

                    if (typeof normalizedEnabled === 'boolean') {
                         selfCheckEnabled = normalizedEnabled;
                    }

                    if (Object.keys(settings).length > 0) {
                         selfCheckSettings = settings;
                    } else if (success) {
                         logWarnMessage({
                              event: 'self_check_enabled_unrecognized',
                              locationId: selfCheckLocationId,
                              settings: result?.settings ?? null,
                         });
                    }
               }

                // Save all library branch data in one transaction
                await saveAllLibraryBranchData({
                     location: location,
                     ...(typeof selfCheckEnabled !== 'undefined' ? { enableSelfCheck: selfCheckEnabled } : {}),
                     ...(typeof selfCheckSettings !== 'undefined' ? { selfCheckSettings } : {})
                });

                if (!runInBackground) {
                     setIsInitialLibraryBranchDataReady(true);
                     setLocation(location);
                }

               logDebugMessage({
                    event: 'fetchAndPersistLibraryBranchData:success',
                    invocationId,
                    runInBackground });

               return true;
          } catch (error) {
               if (runInBackground) {
                    logWarnMessage('Background library-branch-data refresh failed. Continuing with cached data.');
                    logErrorMessage(error);
                    return false;
               }
               const usedStaleData = await applyStaleLibraryBranchFallback();
               if (usedStaleData) {
                    return true;
               }
               logDebugMessage({
                    event: 'fetchAndPersistLibraryBranchData:error',
                    invocationId,
                    runInBackground });
               setHasError(true);
               setErrorTitle(null);
               setErrorMessage('Error loading library branch data. Please try again or contact the library.');
               logErrorMessage(error);
               return false;
          }
     }, [applyStaleLibraryBranchFallback]);

      React.useEffect(() => {
           fetchAndPersistLibraryBranchDataRef.current = fetchAndPersistLibraryBranchData;
      }, [fetchAndPersistLibraryBranchData]);

      const fetchAndPersistLibrarySystemData = React.useCallback(async ({ runInBackground = false } = {}) => {
           const invocationId = ++librarySystemFetchInvocationRef.current;
           logDebugMessage({
                event: 'fetchAndPersistLibrarySystemData:start',
                invocationId,
                runInBackground });
           try {
                // Fetch catalog status
                const catalogResp = await getCatalogStatus(LIBRARY.url);
                let catalogStatus = 0;
                let catalogStatusMessage = '';
                if (catalogResp?.ok) {
                     catalogStatus = catalogResp.data.result?.catalogStatus ?? 0;
                     if (catalogResp.data.result?.api?.message) {
                          catalogStatusMessage = stripHTML(catalogResp.data.result.api.message);
                     }
                }

                // Fetch library info
                const libraryResp = await getLibraryInfo(LIBRARY.url, LIBRARY.id);
                if (!libraryResp?.ok) {
                     if (runInBackground) {
                          logWarnMessage('Background library info refresh failed. Continuing with cached data.');
                          return false;
                     }
                     const usedStaleData = await applyStaleLibrarySystemFallback();
                     if (usedStaleData) {
                          return true;
                     }
                     const error = getErrorMessage(libraryResp?.code ?? 0, libraryResp?.problem);
                     setHasError(true);
                     setErrorTitle("Unable to load library info");
                     setErrorMessage(error.message);
                     return false;
                }

                const libraryInfo = libraryResp.data.result?.library ?? {};
                setLibraryData(libraryInfo);

                // Fetch library links (menu)
                const linksResp = await getLibraryLinks(LIBRARY.url);
                const menu = linksResp?.ok ? (linksResp.data.result?.items ?? []) : [];

                // Save library system data
                await saveCatalogStatus(catalogStatus, catalogStatusMessage);
                await saveLibrary(libraryInfo);
                await saveMenu(menu);

                // Update library version if present
                if (libraryInfo.discoveryVersion) {
                     await updateLibraryVersion(libraryInfo.discoveryVersion);
                }

                if (!runInBackground) {
                     setIsInitialLibrarySystemDataReady(true);
                     setLibraryLinksQuerySuccess(true);
                }

                logDebugMessage({
                     event: 'fetchAndPersistLibrarySystemData:success',
                     invocationId,
                     runInBackground });

                return true;
           } catch (error) {
                if (runInBackground) {
                     logWarnMessage('Background library-system-data refresh failed. Continuing with cached data.');
                     logErrorMessage(error);
                     return false;
                }
                const usedStaleData = await applyStaleLibrarySystemFallback();
                if (usedStaleData) {
                     return true;
                }
                logDebugMessage({
                     event: 'fetchAndPersistLibrarySystemData:error',
                     invocationId,
                     runInBackground });
                setHasError(true);
                setErrorTitle(null);
                setErrorMessage('Error loading library system data. Please try again or contact the library.');
                logErrorMessage(error);
                return false;
           }
      }, [applyStaleLibrarySystemFallback, updateLibraryVersion]);

       React.useEffect(() => {
            fetchAndPersistLibrarySystemDataRef.current = fetchAndPersistLibrarySystemData;
       }, [fetchAndPersistLibrarySystemData]);

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

                 //No need to sort these since they are already sorted by the API
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
       }, [applyStaleLanguageFallback, language, updateLanguages, updateDictionary, numSteps]);

       React.useEffect(() => {
            if (!isScreenFocused || !hasResolvedLibraryContext || hasError) return;
            let cancelled = false;

            const hydrateUserCache = async () => {
                 try {
                      logDebugMessage('hydrateUserCache: starting SQLite hydration');
                      const cached = await loadAllUserData();
                      const loginUserKey = (await SecureStore.getItemAsync('userKey')) ?? '';
                      const cachedUser = cached?.user ?? null;
                      const normalizedKey = String(loginUserKey).toLowerCase();
                      const normalizedCat = String(cachedUser?.cat_username ?? '').toLowerCase();
                      const normalizedBarcode = String(cachedUser?.ils_barcode ?? '').toLowerCase();
                      const matchesLoggedInUser = !normalizedKey || normalizedKey === normalizedCat || normalizedKey === normalizedBarcode;
                      const hasAnyCachedUserData = !!cachedUser && matchesLoggedInUser;

                      logDebugMessage('hydrateUserCache: cache snapshot');
                      logDebugMessage({
                           hasCachedUser: !!cachedUser,
                           hasUpdatedAt: !!cached?.updatedAt,
                           loginKeyPresent: normalizedKey.length > 0,
                           matchesCatUsername: !!normalizedKey && normalizedKey === normalizedCat,
                           matchesBarcode: !!normalizedKey && normalizedKey === normalizedBarcode,
                           matchesLoggedInUser,
                           hasAnyCachedUserData });

                      if (cancelled) return;

                      if (hasAnyCachedUserData) {
                           logDebugMessage('hydrateUserCache: using cached user data');
                           setHasUsableUserCache(true);
                           setShouldBlockUserFetch(false);
                           setIsInitialUserDataReady(true);
                           setLoadedUser(cachedUser);

                           const isStale = !cached?.updatedAt || Date.now() - cached.updatedAt > USER_DATA_STALE_MS;
                           logDebugMessage({
                                event: 'hydrateUserCache: stale check',
                                isStale,
                                cacheAgeMs: cached?.updatedAt ? Date.now() - cached.updatedAt : null,
                                staleThresholdMs: USER_DATA_STALE_MS });
                           if (isStale) {
                                logDebugMessage('hydrateUserCache: cache stale, running background refresh');
                                fetchAndPersistUserDataRef.current?.({ runInBackground: true });
                           } else {
                                logDebugMessage('hydrateUserCache: fresh cache path, skipping user-data API fetch');
                           }
                      } else {
                           logDebugMessage('hydrateUserCache: cache missing or user mismatch, forcing blocking fetch');
                           setHasUsableUserCache(false);
                           setShouldBlockUserFetch(true);
                      }
                      setHasHydratedUserCacheDecision(true);
                 } catch (error) {
                      if (cancelled) return;
                      logWarnMessage('hydrateUserCache: failed, falling back to blocking fetch');
                      logErrorMessage(error);
                      setHasUsableUserCache(false);
                      setShouldBlockUserFetch(true);
                      setHasHydratedUserCacheDecision(true);
                 }
            };

            hydrateUserCache();
            return () => {
                 cancelled = true;
            };
       }, [isScreenFocused, hasResolvedLibraryContext, hasError]);

        React.useEffect(() => {
             if (hasHydratedUserCacheDecision && hasHydratedLibraryBranchCacheDecision && hasHydratedLibrarySystemCacheDecision && hasHydratedLanguageCacheDecision) {
                  logDebugMessage('All SQLite hydrations complete, marking SQLite data as loaded');
                  setIsSQLiteDataLoaded(true);
             }
        }, [hasHydratedUserCacheDecision, hasHydratedLibraryBranchCacheDecision, hasHydratedLibrarySystemCacheDecision, hasHydratedLanguageCacheDecision]);

     React.useEffect(() => {
          if (isSQLiteDataLoaded && (isInitialUserDataReady || hasUsableUserCache) && (isInitialLibrarySystemDataReady || hasUsableLibrarySystemCache) && (isInitialLibraryBranchDataReady || hasUsableLibraryBranchCache) && (isInitialLanguageDataReady || hasUsableLanguageCache) && !hasError) {
               logDebugMessage('All data ready from cache, clearing isReloading');
               setIsReloading(false);
          }
     }, [isSQLiteDataLoaded, isInitialUserDataReady, hasUsableUserCache, isInitialLibrarySystemDataReady, hasUsableLibrarySystemCache, isInitialLibraryBranchDataReady, hasUsableLibraryBranchCache, isInitialLanguageDataReady, hasUsableLanguageCache, hasError]);

     React.useEffect(() => {
          if (!isScreenFocused || !hasResolvedLibraryContext || hasError) return;
          let cancelled = false;

          const hydrateLibraryBranchCache = async () => {
               try {
                    logDebugMessage('hydrateLibraryBranchCache: starting SQLite hydration');
                    const cached = await loadAllLibraryBranchData();
                    const hasAnyCachedLibraryBranchData = !!cached && (!!cached.location || !!cached.selfCheckSettings);

                    logDebugMessage('hydrateLibraryBranchCache: cache snapshot');
                    logDebugMessage({
                         hasCachedLocation: !!cached?.location,
                         hasCachedSelfCheck: !!cached?.selfCheckSettings,
                         hasAnyCachedLibraryBranchData });

                    if (cancelled) return;

                     if (hasAnyCachedLibraryBranchData) {
                          logDebugMessage('hydrateLibraryBranchCache: using cached library branch data');
                          setHasUsableLibraryBranchCache(true);
                          setShouldBlockLibraryBranchFetch(false);
                          setIsInitialLibraryBranchDataReady(true);
                          setLocation(cached?.location || {});

                         const branchUpdatedAt = cached?.updatedAt ?? cached?.updated_at ?? 0;
                         const isStale = !branchUpdatedAt || (Date.now() - branchUpdatedAt > LIBRARY_BRANCH_DATA_STALE_MS);
                         logDebugMessage({
                              event: 'hydrateLibraryBranchCache: stale check',
                              isStale,
                              cacheAgeMs: branchUpdatedAt ? Date.now() - branchUpdatedAt : null,
                              staleThresholdMs: LIBRARY_BRANCH_DATA_STALE_MS });
                         if (isStale) {
                              logDebugMessage('hydrateLibraryBranchCache: cache stale, running background refresh');
                              fetchAndPersistLibraryBranchDataRef.current?.({ runInBackground: true });
                         } else {
                              logDebugMessage('hydrateLibraryBranchCache: fresh cache path, skipping library-branch-data API fetch');
                         }
                    } else {
                         logDebugMessage('hydrateLibraryBranchCache: cache missing, forcing blocking fetch');
                         setHasUsableLibraryBranchCache(false);
                         setShouldBlockLibraryBranchFetch(true);
                    }
                    setHasHydratedLibraryBranchCacheDecision(true);
               } catch (error) {
                    if (cancelled) return;
                    logWarnMessage('hydrateLibraryBranchCache: failed, falling back to blocking fetch');
                    logErrorMessage(error);
                    setHasUsableLibraryBranchCache(false);
                    setShouldBlockLibraryBranchFetch(true);
                    setHasHydratedLibraryBranchCacheDecision(true);
               }
          };

           hydrateLibraryBranchCache();
           return () => {
                cancelled = true;
           };
      }, [isScreenFocused, hasResolvedLibraryContext, hasError]);

      React.useEffect(() => {
           if (!isScreenFocused || !hasResolvedLibraryContext || hasError) return;
           let cancelled = false;

           const hydrateLibrarySystemCache = async () => {
                try {
                     logDebugMessage('hydrateLibrarySystemCache: starting SQLite hydration');
                     const cached = await loadAllLibrarySystemData();
                     const hasAnyCachedLibrarySystemData = !!cached && !!cached.library;

                     logDebugMessage('hydrateLibrarySystemCache: cache snapshot');
                     logDebugMessage({
                          hasCachedLibrary: !!cached?.library,
                          hasCachedMenu: !!cached?.menu,
                          hasCachedCatalogStatus: cached?.catalogStatus !== undefined,
                          hasAnyCachedLibrarySystemData });

                     if (cancelled) return;

                     if (hasAnyCachedLibrarySystemData) {
                          logDebugMessage('hydrateLibrarySystemCache: using cached library system data');
                          setHasUsableLibrarySystemCache(true);
                          setShouldBlockLibrarySystemFetch(false);
                          setIsInitialLibrarySystemDataReady(true);
                          setLibraryData(cached?.library || {});

                          // Stale checks for different data types
                          const metadataIsStale = Date.now() - (cached?.updatedAt ?? 0) > LIBRARY_SYSTEM_METADATA_STALE_MS;
                          const menuIsStale = Date.now() - (cached?.updatedAt ?? 0) > LIBRARY_SYSTEM_MENU_STALE_MS;

                          logDebugMessage({
                               event: 'hydrateLibrarySystemCache: stale check',
                               metadataIsStale,
                               menuIsStale,
                               cacheAgeMs: cached?.updatedAt ? Date.now() - cached.updatedAt : null,
                               metadataStaleThresholdMs: LIBRARY_SYSTEM_METADATA_STALE_MS,
                               menuStaleThresholdMs: LIBRARY_SYSTEM_MENU_STALE_MS });

                          if (metadataIsStale || menuIsStale) {
                               logDebugMessage('hydrateLibrarySystemCache: cache stale, running background refresh');
                               fetchAndPersistLibrarySystemDataRef.current?.({ runInBackground: true });
                          } else {
                               logDebugMessage('hydrateLibrarySystemCache: fresh cache path, skipping library-system-data API fetch');
                          }
                     } else {
                          logDebugMessage('hydrateLibrarySystemCache: cache missing, forcing blocking fetch');
                          setHasUsableLibrarySystemCache(false);
                          setShouldBlockLibrarySystemFetch(true);
                     }
                     setHasHydratedLibrarySystemCacheDecision(true);
                } catch (error) {
                     if (cancelled) return;
                     logWarnMessage('hydrateLibrarySystemCache: failed, falling back to blocking fetch');
                     logErrorMessage(error);
                     setHasUsableLibrarySystemCache(false);
                     setShouldBlockLibrarySystemFetch(true);
                     setHasHydratedLibrarySystemCacheDecision(true);
                }
           };

           hydrateLibrarySystemCache();
           return () => {
                cancelled = true;
           };
      }, [isScreenFocused, hasResolvedLibraryContext, hasError]);

      React.useEffect(() => {
           if (!isScreenFocused || !hasResolvedLibraryContext || hasError) return;
           let cancelled = false;

           const hydrateLanguageCache = async () => {
                try {
                     const cached = await loadAllLanguageData();
                     const cachedLanguages = Array.isArray(cached?.languages) ? cached.languages : [];
                     const cachedDictionary = isPlainObject(cached?.dictionary) ? cached.dictionary : {};
                     const hasCachedLanguageList = cachedLanguages.length > 0;
                     const hasCachedDictionary = Object.keys(cachedDictionary).length > 0;

                     if (cancelled) return;

                     if (hasCachedDictionary) {
                          setTranslationsLibrary(cachedDictionary);
                          await updateDictionary(cachedDictionary);
                     }

                     if (hasCachedLanguageList) {
                          await updateLanguages(cachedLanguages);

                          setHasUsableLanguageCache(true);
                          setShouldBlockLanguageFetch(false);
                          setIsInitialLanguageDataReady(true);

                          const isStale = !cached?.updatedAt || (Date.now() - cached.updatedAt > LANGUAGE_DATA_STALE_MS);
                          if (isStale) {
                               fetchAndPersistLanguageData({ runInBackground: true });
                          }
                     } else {
                          setHasUsableLanguageCache(false);
                          setShouldBlockLanguageFetch(true);
                          setIsInitialLanguageDataReady(false);
                     }

                     setHasHydratedLanguageCacheDecision(true);
                } catch (error) {
                     if (cancelled) return;
                     logWarnMessage('hydrateLanguageCache: failed, falling back to blocking language fetch');
                     logErrorMessage(error);
                     setHasUsableLanguageCache(false);
                     setShouldBlockLanguageFetch(true);
                     setHasHydratedLanguageCacheDecision(true);
                }
           };

           hydrateLanguageCache();
           return () => {
                cancelled = true;
           };
      }, [isScreenFocused, hasResolvedLibraryContext, hasError, updateLanguages, updateDictionary, fetchAndPersistLanguageData]);

      React.useEffect(() => {
          if (!isScreenFocused) return;

          let cancelled = false;
          const initializeOnFocus = async () => {
               logDebugMessage('Loading screen focused');
               if (isFocused !== 0) {
                    logDebugMessage('isFocused is not 0.');
                    return;
               }

               setIsFocused(1);
               setIsReloading(true);
               setProgress(0);
               queryClient.clear();

               try {
                    await runExclusiveThemeInit(async () => {
                         const currentThemeState = await loadThemeState();
                         const currentLocation = await loadLocation();
                         const currentLocationId = currentLocation?.locationId != null ? Number(currentLocation.locationId) : null;
                         const mode = currentThemeState?.colorMode === 'dark' ? 'dark' : 'light';
                         await updateColorMode(mode);
                         const hasStoredTheme = Boolean(currentThemeState?.themeColors?.primary && currentThemeState?.themeColors?.secondary && currentThemeState?.themeColors?.tertiary);
                         // Branded apps pick their themeId from a per-location catalog, not the static
                         // app-config value, so there's no single expected id to compare against - instead,
                         // the stored theme only counts as "matching" if it was fetched for the SAME location
                         // that's currently active, so switching locations (e.g. at login) always refetches.
                         const hasMatchingThemeId = isBrandedApp()
                              ? currentThemeState?.themeId != null && currentThemeState?.locationId === currentLocationId
                              : await isStoredThemeIdMatch(GLOBALS.themeId ?? 1);

                         if (!hasStoredTheme || !hasMatchingThemeId) {
                              const builtTheme = await buildThemeForLibrary(LIBRARY.url, currentLocationId);
                              await saveThemeState({
                                   themeId: builtTheme.themeId,
                                   locationId: builtTheme.locationId,
                                   colorMode: mode,
                                   textColor: mode === 'dark' ? 'textLight50' : 'textLight950',
                                   themeColors: builtTheme.themeColors,
                                   header: builtTheme.header });
                              await updateTheme(builtTheme.theme, builtTheme.themeId, builtTheme.locationId, builtTheme.header);
                         }
                    });
               } catch (e) {
                    logErrorMessage('Unable to load theme state in Loading screen');
                    logErrorMessage(e);
               } finally {
                    if (!cancelled) {
                         setLoadingTheme(false);
                    }
               }

               //if we have no library we should set error
               //to avoid being stuck on loading screen.
               if (!cancelled && LIBRARY.url === null) {
                    setHasError(true);
               }
          };

          initializeOnFocus();
          return () => {
               cancelled = true;
          };
     }, [isScreenFocused, isFocused, queryClient, updateColorMode, updateTheme]);

      /**
       * Load information needed to display the interface. These are done sequentially since some calls may rely on previous data.
       * This is done by controlling when each query is enabled.
       */

      /**
       * First check to see if the catalog is online and check to see if offline mode is active.
       */
      let catalogStatusSuccess = false;
      const [catalogStatusData, setCatalogStatusData] = React.useState(null);
      const [catalogStatus, setCatalogStatusState] = React.useState(0);

      React.useEffect(() => {
           if (!isScreenFocused || !LIBRARY.url || loadingTheme) return;
           let cancelled = false;

           (async () => {
                try {
                     const data = await getCatalogStatus(LIBRARY.url);
                     if (cancelled) return;

                     if (data?.ok) {
                          let catalogMessage = null;
                          if (data.data.result?.api?.message) {
                               catalogMessage = stripHTML(data.data.result.api.message);
                          }
                          let status = data.data.result?.catalogStatus ?? 0;
                          await saveCatalogStatus(status, catalogMessage);
                          await updateCatalogStatus(status, catalogMessage);
                          setCatalogStatusState(status);
                          if (loadingMessageType === 1) {
                               setLoadingText('Loading catalog...');
                          }else if (loadingMessageType === 2) {
                               setLoadingText(loadingMessage);
                          }
                          logDebugMessage("Loaded catalog status");
                          setProgress(prevProgress => prevProgress + (100 / numSteps));
                          catalogStatusSuccess = true;
                          setCatalogStatusData(data);
                     } else {
                          const staleSystem = await loadAllLibrarySystemData();
                          const staleStatus = staleSystem?.catalogStatus;
                          if (typeof staleStatus === 'number') {
                               logWarnMessage('Catalog status unavailable; using stale cached catalog status');
                               setCatalogStatusState(staleStatus);
                               const staleMessage = staleSystem?.catalogStatusMessage ?? '';
                               await updateCatalogStatus(staleStatus, staleMessage);
                               setCatalogStatusData({ ok: true, data: { result: { catalogStatus: staleStatus } } });
                          } else {
                               logWarnMessage("Setting Error to true because catalog status returned not ok and no stale data exists");
                               const error = getErrorMessage(data?.code ?? 0, data?.problem);
                               setHasError(true);
                               setErrorMessage(error.message);
                               setErrorTitle("Unable to determine catalog status");
                          }
                     }
                } catch (error) {
                     if (cancelled) return;
                     const staleSystem = await loadAllLibrarySystemData();
                     const staleStatus = staleSystem?.catalogStatus;
                     if (typeof staleStatus === 'number') {
                          logWarnMessage('Catalog status request failed; using stale cached catalog status');
                          setCatalogStatusState(staleStatus);
                          const staleMessage = staleSystem?.catalogStatusMessage ?? '';
                          await updateCatalogStatus(staleStatus, staleMessage);
                          setCatalogStatusData({ ok: true, data: { result: { catalogStatus: staleStatus } } });
                     } else {
                          logDebugMessage("Setting Error to true because loading catalog status failed and no stale data exists");
                          logErrorMessage(error);
                          setHasError(true);
                          setErrorTitle(null);
                          setErrorMessage('Error checking catalog status. Please try again or contact the library.');
                     }
                }
           })();

           return () => {
                cancelled = true;
           };
      }, [isScreenFocused, LIBRARY.url, loadingTheme]);

      const [languagesQuerySuccess, setLanguagesQuerySuccess] = React.useState(false);

      React.useEffect(() => {
           if (!isScreenFocused || !catalogStatusData || hasError || !hasHydratedLanguageCacheDecision || !shouldBlockLanguageFetch || isInitialLanguageDataReady) {
                return;
           }

           let cancelled = false;
           const runBlockingLanguageFetch = async () => {
                if (loadingMessageType === 1) {
                     setLoadingText('Loading Languages');
                }

                const ok = await fetchAndPersistLanguageData({ runInBackground: false });
                if (cancelled || !ok) {
                     return;
                }

                setLanguagesQuerySuccess(true);
                if (loadingMessageType === undefined || loadingMessageType === 0) {
                     setLoadingText(getTermFromDictionary(language ?? 'en', 'loading_1'));
                } else if (loadingMessageType === 1) {
                     setLoadingText('Loading Library Information');
                }
           };

           runBlockingLanguageFetch();
           return () => {
                cancelled = true;
           };
      }, [isScreenFocused, catalogStatusData, hasError, hasHydratedLanguageCacheDecision, shouldBlockLanguageFetch, isInitialLanguageDataReady, fetchAndPersistLanguageData, loadingMessageType, language]);

      React.useEffect(() => {
           if (!isScreenFocused || hasError || !hasHydratedLanguageCacheDecision || shouldBlockLanguageFetch || !isInitialLanguageDataReady) {
                return;
           }
           setLanguagesQuerySuccess(true);
      }, [isScreenFocused, hasError, hasHydratedLanguageCacheDecision, shouldBlockLanguageFetch, isInitialLanguageDataReady]);

       let librarySystemQuerySuccess = false;

       React.useEffect(() => {
           if (!isScreenFocused || hasError || !languagesQuerySuccess) return;
           let cancelled = false;

           (async () => {
                try {
                     const data = await getLibraryInfo(LIBRARY.url, LIBRARY.id);
                     if (cancelled) return;

                     if (data?.ok) {
                          const libraryInfo = data.data.result?.library ?? [];
                          logDebugMessage("Loaded Library Info");
                          setProgress(prevProgress => prevProgress + (100 / numSteps));
                          await saveLibrary(libraryInfo);
                          setLibraryData(libraryInfo);
                          if (libraryInfo.discoveryVersion) {
                               await updateLibraryVersion(libraryInfo.discoveryVersion);
                          }
                           if (loadingMessageType === 1) {
                                setLoadingText('Loading User Information');
                           }
                           librarySystemQuerySuccess = true;
                      } else {
                          const usedStaleData = await applyStaleLibrarySystemFallback();
                          if (!usedStaleData) {
                               logDebugMessage("Error loading library system settings");
                               logDebugMessage(data);
                               const error = getErrorMessage(data?.code ?? 0, data?.problem);
                               setHasError(true);
                               setErrorMessage(error.message);
                               setErrorTitle("Unable to load library configuration");
                          }
                     }
                } catch (error) {
                     if (cancelled) return;
                     const usedStaleData = await applyStaleLibrarySystemFallback();
                     if (!usedStaleData) {
                          logWarnMessage("Setting Error to true because loading library system failed");
                          setHasError(true);
                          setErrorTitle(null);
                          setErrorMessage('Error loading library configuration. Please try again or contact the library.');
                          logErrorMessage(error);
                     }
                }
           })();

           return () => {
                cancelled = true;
           };
      }, [applyStaleLibrarySystemFallback, isScreenFocused, hasError, languagesQuerySuccess]);

       React.useEffect(() => {
           if (!isScreenFocused || hasError || (!isInitialUserDataReady && !hasUsableUserCache) || libraryLinksQuerySuccess) return;
           let cancelled = false;

           if (isInitialLibrarySystemDataReady || hasUsableLibrarySystemCache) {
                setLibraryLinksQuerySuccess(true);
                return;
           }

           (async () => {
                try {
                     const data = await getLibraryLinks(LIBRARY.url);
                     if (cancelled) return;

                     if (data?.ok) {
                          const links = data.data.result?.items ?? [];
                          setProgress(prevProgress => prevProgress + (100 / numSteps));
                          logDebugMessage("Loaded Library Links");
                          await saveMenu(links);
                          if (loadingMessageType === 1) {
                               setLoadingText('Loading Home Screen Feed');
                          }
                           setLibraryLinksQuerySuccess(true);
                      } else {
                          const staleSystem = await loadAllLibrarySystemData();
                          const staleMenu = Array.isArray(staleSystem?.menu) ? staleSystem.menu : null;
                          if (staleMenu) {
                               logWarnMessage('Library links unavailable; using stale cached menu links');
                               await saveMenu(staleMenu);
                               setLibraryLinksQuerySuccess(true);
                          } else {
                               logDebugMessage("Error loading library links");
                               logDebugMessage(data);
                               const error = getErrorMessage(data?.code ?? 0, data?.problem);
                               setHasError(true);
                               setErrorMessage(error.message);
                               setErrorTitle("Unable to load menu links");
                          }
                     }
                } catch (error) {
                     if (cancelled) return;
                     const staleSystem = await loadAllLibrarySystemData();
                     const staleMenu = Array.isArray(staleSystem?.menu) ? staleSystem.menu : null;
                     if (staleMenu) {
                          logWarnMessage('Library links request failed; using stale cached menu links');
                          await saveMenu(staleMenu);
                          setLibraryLinksQuerySuccess(true);
                     } else {
                          logDebugMessage("Setting Error to true because loading library links failed");
                          logErrorMessage(error);
                          setHasError(true);
                          setErrorTitle(null);
                          setErrorMessage('Unknown error loading library links. Please try again or contact the library.');
                     }
                }
           })();

           return () => {
                cancelled = true;
           };
      }, [isScreenFocused, hasError, isInitialUserDataReady, hasUsableUserCache, libraryLinksQuerySuccess, isInitialLibrarySystemDataReady, hasUsableLibrarySystemCache]);

       React.useEffect(() => {
           if (!isScreenFocused || hasError || !libraryLinksQuerySuccess) return;
           let cancelled = false;

           (async () => {
                try {
                     const data = await getHomeScreenFeed(5, LIBRARY.url);
                     if (cancelled) return;

                     if (data?.ok) {
                          logDebugMessage("Loaded Home Screen Feed");
                          setProgress(prevProgress => prevProgress + (100 / numSteps));
                          const result = data.data.result;
                          // If browse categories are missing, seed empty data and continue startup.
                          updateBrowseCategories(Array.isArray(result?.browseCategories) ? result.browseCategories : []);
                          updateMaxCategories(5);
                          await saveHomeScreenLinks(result.homeScreenLinks);
                          if (loadingMessageType === 1) {
                               setLoadingText('Loading Browse Category List');
                          }
                           setBrowseCategoryQuerySuccess(true);
                      } else {
                          logWarnMessage("Home screen feed unavailable; continuing with existing/empty browse categories");
                          logDebugMessage(data);
                            // Non-fatal: prefer stale cached categories; fall back to empty list.
                            const staleBrowseCategories = await loadBrowseCategories();
                            updateBrowseCategories(Array.isArray(staleBrowseCategories?.data) ? staleBrowseCategories.data : []);
                          await saveHomeScreenLinks([]);
                          setBrowseCategoryQuerySuccess(true);
                     }
                } catch (error) {
                     if (cancelled) return;
                     logWarnMessage("Home screen feed request failed; continuing without blocking startup");
                     logErrorMessage(error);
                       // Non-fatal: prefer stale cached categories; fall back to empty list.
                       const staleBrowseCategories = await loadBrowseCategories();
                       updateBrowseCategories(Array.isArray(staleBrowseCategories?.data) ? staleBrowseCategories.data : []);
                     await saveHomeScreenLinks([]);
                     setBrowseCategoryQuerySuccess(true);
                }
           })();

           return () => {
                cancelled = true;
           };
       }, [isScreenFocused, hasError, libraryLinksQuerySuccess]);

      React.useEffect(() => {
           if (!isScreenFocused || !hasHydratedUserCacheDecision || !shouldBlockUserFetch || !hasResolvedLibraryContext || hasError || isInitialUserDataReady) return;
          let cancelled = false;

          const runBlockingUserFetch = async () => {
               if (isBlockingUserFetchInFlightRef.current) {
                    logDebugMessage('runBlockingUserFetch: skipped duplicate invocation while fetch already in flight');
                    return;
               }
               isBlockingUserFetchInFlightRef.current = true;
               logDebugMessage('runBlockingUserFetch: starting blocking user-data fetch');
               setLoadingText('Loading User Information');
               try {
                    const ok = await fetchAndPersistUserData({ runInBackground: false });
                    if (!cancelled && ok) {
                         setIsReloading(false);
                    }
               } finally {
                    isBlockingUserFetchInFlightRef.current = false;
                    logDebugMessage('runBlockingUserFetch: completed blocking user-data fetch');
               }
          };

          runBlockingUserFetch();
          return () => {
               cancelled = true;
          };
      }, [isScreenFocused, hasHydratedUserCacheDecision, shouldBlockUserFetch, hasResolvedLibraryContext, hasError, isInitialUserDataReady, fetchAndPersistUserData]);

     React.useEffect(() => {
          if (!isScreenFocused || !hasHydratedLibraryBranchCacheDecision || !shouldBlockLibraryBranchFetch || !hasResolvedLibraryContext || hasError || isInitialLibraryBranchDataReady) return;
          let cancelled = false;

          const runBlockingLibraryBranchFetch = async () => {
               if (isBlockingLibraryBranchFetchInFlightRef.current) {
                    logDebugMessage('runBlockingLibraryBranchFetch: skipped duplicate invocation while fetch already in flight');
                    return;
               }
               isBlockingLibraryBranchFetchInFlightRef.current = true;
               logDebugMessage('runBlockingLibraryBranchFetch: starting blocking library-branch-data fetch');
               setLoadingText('Loading Branch Information');
               try {
                    const ok = await fetchAndPersistLibraryBranchData({ runInBackground: false });
                    if (!cancelled && ok) {
                         setIsReloading(false);
                    }
               } finally {
                    isBlockingLibraryBranchFetchInFlightRef.current = false;
                    logDebugMessage('runBlockingLibraryBranchFetch: completed blocking library-branch-data fetch');
               }
          };

           runBlockingLibraryBranchFetch();
           return () => {
                cancelled = true;
           };
      }, [isScreenFocused, hasHydratedLibraryBranchCacheDecision, shouldBlockLibraryBranchFetch, hasResolvedLibraryContext, hasError, isInitialLibraryBranchDataReady, fetchAndPersistLibraryBranchData]);

      React.useEffect(() => {
           if (!isScreenFocused || !hasHydratedLibrarySystemCacheDecision || !shouldBlockLibrarySystemFetch || !hasResolvedLibraryContext || hasError || isInitialLibrarySystemDataReady) return;
           let cancelled = false;

           const runBlockingLibrarySystemFetch = async () => {
                if (isBlockingLibrarySystemFetchInFlightRef.current) {
                     logDebugMessage('runBlockingLibrarySystemFetch: skipped duplicate invocation while fetch already in flight');
                     return;
                }
                isBlockingLibrarySystemFetchInFlightRef.current = true;
                logDebugMessage('runBlockingLibrarySystemFetch: starting blocking library-system-data fetch');
                setLoadingText('Loading Library Information');
                try {
                     const ok = await fetchAndPersistLibrarySystemData({ runInBackground: false });
                     if (!cancelled && ok) {
                          setIsReloading(false);
                     }
                } finally {
                     isBlockingLibrarySystemFetchInFlightRef.current = false;
                     logDebugMessage('runBlockingLibrarySystemFetch: completed blocking library-system-data fetch');
                }
           };

           runBlockingLibrarySystemFetch();
           return () => {
                cancelled = true;
           };
      }, [isScreenFocused, hasHydratedLibrarySystemCacheDecision, shouldBlockLibrarySystemFetch, hasResolvedLibraryContext, hasError, isInitialLibrarySystemDataReady, fetchAndPersistLibrarySystemData]);

        useQuery(['system_messages', LIBRARY.url], () => getSystemMessages(libraryData?.libraryId, location?.locationId, LIBRARY.url), {
              enabled: isScreenFocused && hasError === false && (isInitialUserDataReady || hasUsableUserCache) && (isInitialLibrarySystemDataReady || hasUsableLibrarySystemCache) && !!location?.locationId,
          onSuccess: (data) => {
               if(data.ok) {
                    logDebugMessage("Loaded System Messages");
                    const rawMessages = data.data.result?.systemMessages;
                    const messages = Array.isArray(rawMessages)
                         ? rawMessages
                         : rawMessages
                              ? [rawMessages]
                              : [];
                    setProgress(prevProgress => prevProgress + (100 / numSteps));
                    updateSystemMessages(messages);
                    setIsReloading(false);
                    if (loadingMessageType === 1) {
                         setLoadingText('Loading App Preferences');
                    }
               } else {
                    logDebugMessage("Error loading system messages");
                    logDebugMessage(data);
                    const error = getErrorMessage(data.code ?? 0, data.problem);
                    setHasError(true);
                    setErrorMessage(error.message);
                    setErrorTitle("Unable to load system messages");
               }
          },
          onError: (error) => {
               logDebugMessage("Setting Error to true because loading system messages failed");
               logErrorMessage(error);
               setHasError(true);
               setErrorTitle(null);
               setErrorMessage('Unknown error loading system messages. Please try again or contact the library.')
          }
     });

     React.useEffect(() => {
          if (!isScreenFocused) return;
          if (isSQLiteDataLoaded && (isInitialUserDataReady || hasUsableUserCache) && (isInitialLibrarySystemDataReady || hasUsableLibrarySystemCache) && (isInitialLibraryBranchDataReady || hasUsableLibraryBranchCache) && (isInitialLanguageDataReady || hasUsableLanguageCache) && !hasError && catalogStatus === 0) {
               setProgress(100);
               navigation.navigate('DrawerStack', {
                    user: user,
                    library: library,
                    location: location,
                    prevRoute: 'LoadingScreen',
               });
          }
     }, [isScreenFocused, isSQLiteDataLoaded, isInitialUserDataReady, hasUsableUserCache, isInitialLibrarySystemDataReady, hasUsableLibrarySystemCache, isInitialLibraryBranchDataReady, hasUsableLibraryBranchCache, isInitialLanguageDataReady, hasUsableLanguageCache, hasError, catalogStatus, user, library, location, navigation]);

     if (hasError) {
          return <ForceLogout title={errorTitle} reason={errorMessage} />;
     }

     if (catalogStatus > 0) {
          // catalog is offline
          return <CatalogOffline />;
     }

     return (
          <ScreenContainer className="items-center justify-center w-full">
               <Box style={{ width: '90%', maxWidth: 400, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
                    <VStack>
                         <Heading size="md" className="pb-5">
                              {loadingText}
                         </Heading>
                         <Progress value={progress} size="md" testID="progress-bar" style={{ width: '100%', backgroundColor: borderColor }}>
                              <ProgressFilledTrack style={{ backgroundColor: brand.primary[500] }} />
                         </Progress>
                    </VStack>
               </Box>
          </ScreenContainer>
     );
};
