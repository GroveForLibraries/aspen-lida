import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Image } from 'expo-image';
import { getTermFromDictionary, ensureTranslationsLibraryHydrated, setTranslationsLibrary } from '../../translations/TranslationService';
import { buildThemeForLibrary, runExclusiveThemeInit, THEME_STALE_MS, useTheme } from '../../themes/theme';
import {
     isStoredThemeIdMatch,
     loadAllLanguageData,
     loadAllLibraryBranchData,
     loadAllLibrarySystemData,
     loadAllUserData,
     loadLibraryUrl,
     loadLocation,
     loadThemeState,
     saveThemeState,
} from '../../util/db';
import { isPlainObject } from '../../helpers/helpers';
import { GLOBALS, LIBRARY, isBrandedApp } from '../../util/globals';
import { logDebugMessage, logErrorMessage } from '../../util/logging';
import { prehydrateLibrarySystemSnapshotCache } from '../../hooks/useLibrarySystemData';
import { prehydrateLibraryBranchSnapshotCache, invalidateSelfCheckSnapshot } from '../../hooks/useLibraryBranchData';
import { prehydrateLanguageSnapshotCache } from '../../hooks/useLanguageData';
import { prehydrateUserDataSnapshotCache } from '../../hooks/useUserData';
import { saveSelfCheckEnabled, saveSelfCheckSettings } from '../../util/db';
import { getSelfCheckSettings } from '../../util/api/system';
import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';
import { VStack } from '@/components/ui/vstack';

const splashImage = Constants.expoConfig.extra.loginLogo;
const splashBackgroundColor = Constants.expoConfig.splash.backgroundColor;

const USER_DATA_STALE_MS = 24 * 60 * 60 * 1000;         // 24 hours
const LANGUAGE_DATA_STALE_MS = 24 * 60 * 60 * 1000;     // 24 hours
const LIBRARY_BRANCH_DATA_STALE_MS = 24 * 60 * 60 * 1000;   // 24 hours
const LIBRARY_SYSTEM_METADATA_STALE_MS = 24 * 60 * 60 * 1000;     // 24 hours
const LIBRARY_SYSTEM_MENU_STALE_MS = 24 * 60 * 60 * 1000;     // 24 hours

function isCacheStale(updatedAt, thresholdMs) {
     if (!updatedAt) {
          return true;
     }
     return Date.now() - Number(updatedAt) > thresholdMs;
}


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
 * Evaluates the startup cache to determine if the app can bypass loading and whether background refreshes are needed for user, library branch, library system, and language data.
 * @returns {Promise<{canBypassLoading: false|*, hasUsableUserCache: boolean, hasUsableLibraryBranchCache: boolean, hasUsableLibrarySystemCache: boolean, hasUsableLanguageCache: false|*, shouldRefreshUserInBackground: boolean, shouldRefreshLibraryBranchInBackground: boolean, shouldRefreshLibrarySystemInBackground, shouldRefreshLanguageInBackground: *|boolean}>}
 */
export async function evaluateStartupCache() {
     const [cachedUserState, cachedLibraryBranchState, cachedLibrarySystemState, cachedLanguageState, loginUserKey] = await Promise.all([
          loadAllUserData(),
          loadAllLibraryBranchData(),
          loadAllLibrarySystemData(),
          loadAllLanguageData(),
          ensureTranslationsLibraryHydrated(),
          SecureStore.getItemAsync('userKey'),
     ]);

     const cachedUser = cachedUserState?.user ?? null;
     const cachedLibraryLanguages = Array.isArray(cachedLibrarySystemState?.languages)
          ? cachedLibrarySystemState.languages
          : [];
     const cachedLanguageDictionary = isPlainObject(cachedLanguageState?.dictionary)
          ? cachedLanguageState.dictionary
          : {};
     const cachedLanguageList = Array.isArray(cachedLanguageState?.languages) && cachedLanguageState.languages.length > 0
          ? cachedLanguageState.languages
          : cachedLibraryLanguages;
     const languageUpdatedAt = cachedLanguageState?.updatedAt ?? cachedLibrarySystemState?.updatedAt ?? 0;

     const resolvedLanguageState = {
          languages: cachedLanguageList,
          dictionary: cachedLanguageDictionary,
          updatedAt: languageUpdatedAt,
     };

     if (Object.keys(cachedLanguageDictionary).length > 0) {
          setTranslationsLibrary(cachedLanguageDictionary);
     }

     const normalizedLoginKey = String(loginUserKey ?? '').toLowerCase();
     const normalizedCatUsername = String(cachedUser?.cat_username ?? '').toLowerCase();
     const normalizedBarcode = String(cachedUser?.ils_barcode ?? '').toLowerCase();
     const matchesLoggedInUser = !normalizedLoginKey || normalizedLoginKey === normalizedCatUsername || normalizedLoginKey === normalizedBarcode;

     const hasUsableUserCache = !!cachedUser && matchesLoggedInUser;
     const hasCachedLocation =
          !!cachedLibraryBranchState?.location &&
          !!cachedLibraryBranchState.location.locationId;
     const hasCachedSelfCheckSettings =
          isPlainObject(cachedLibraryBranchState?.selfCheckSettings) &&
          Object.keys(cachedLibraryBranchState.selfCheckSettings).length > 0;
     const hasUsableSelfCheckCache =
          !!cachedLibraryBranchState &&
          (typeof cachedLibraryBranchState.enableSelfCheck === 'boolean' || hasCachedSelfCheckSettings);
     const hasUsableLibraryBranchCache = !!cachedLibraryBranchState && hasCachedLocation;
     const hasUsableLibrarySystemCache = !!cachedLibrarySystemState && !!cachedLibrarySystemState.library;
     const hasUsableLanguageCache =
          cachedLanguageList.length > 0 &&
          isPlainObject(cachedLanguageDictionary);

     const branchUpdatedAt = cachedLibraryBranchState?.updatedAt ?? cachedLibraryBranchState?.updated_at ?? 0;
     const userCacheStale = hasUsableUserCache && isCacheStale(cachedUserState?.updatedAt, USER_DATA_STALE_MS);
     const libraryBranchCacheStale = hasUsableLibraryBranchCache && isCacheStale(branchUpdatedAt, LIBRARY_BRANCH_DATA_STALE_MS);
     const librarySystemMetadataStale = hasUsableLibrarySystemCache && isCacheStale(cachedLibrarySystemState?.updatedAt, LIBRARY_SYSTEM_METADATA_STALE_MS);
     const librarySystemMenuStale = hasUsableLibrarySystemCache && isCacheStale(cachedLibrarySystemState?.updatedAt, LIBRARY_SYSTEM_MENU_STALE_MS);
     const languageCacheStale = hasUsableLanguageCache && isCacheStale(languageUpdatedAt, LANGUAGE_DATA_STALE_MS);

     const canBypassLoading =
          hasUsableUserCache &&
          hasUsableLibraryBranchCache &&
          hasUsableLibrarySystemCache &&
          hasUsableLanguageCache;
     logDebugMessage("Can bypass loading? " + canBypassLoading);

      try {
           const persistedLibraryUrl = await loadLibraryUrl();
           const libraryUrl = LIBRARY.url || persistedLibraryUrl;

           if (libraryUrl && cachedLibraryBranchState?.location?.locationId) {
                const configuredLocationId = await SecureStore.getItemAsync('locationId');
                const selfCheckLocationId = configuredLocationId ?? cachedLibraryBranchState.location.locationId;

                logDebugMessage({
                     event: 'splash_self_check_settings_request',
                     libraryUrl,
                     configuredLocationId,
                     locationDataLocationId: cachedLibraryBranchState.location.locationId,
                     selfCheckLocationId,
                });

                if (typeof getSelfCheckSettings === 'function') {
                     const selfCheckResp = await getSelfCheckSettings(libraryUrl, selfCheckLocationId);
                     if (selfCheckResp?.ok) {
                          const result = selfCheckResp.data?.result ?? {};
                          const rawEnabled = result?.settings?.isEnabled;
                          const normalizedEnabled = resolveSelfCheckEnabled(result);
                          const success = result?.success === true || result?.success === 'true';

                          logDebugMessage({
                               event: 'splash_self_check_settings_response',
                               locationId: selfCheckLocationId,
                               success,
                               rawEnabled,
                               normalizedEnabled,
                          });

                          if (typeof normalizedEnabled === 'boolean') {
                               await saveSelfCheckEnabled(normalizedEnabled);
                               logDebugMessage({
                                    event: 'splash_self_check_enabled_saved',
                                    value: normalizedEnabled,
                               });
                          }

                          if (isPlainObject(result?.settings)) {
                               await saveSelfCheckSettings(result.settings);
                               logDebugMessage({
                                    event: 'splash_self_check_settings_saved',
                                    settingsKeys: Object.keys(result.settings),
                               });
                          }

                          if (typeof normalizedEnabled === 'boolean' || isPlainObject(result?.settings)) {
                               invalidateSelfCheckSnapshot(normalizedEnabled, result?.settings);
                               logDebugMessage({
                                    event: 'splash_self_check_snapshot_invalidated',
                               });
                          }
                     }
                }
           } else {
                logDebugMessage({
                     event: 'splash_self_check_settings_skipped',
                     reason: 'missing libraryUrl or locationId',
                     hasLibraryUrl: !!libraryUrl,
                     hasLocationId: !!cachedLibraryBranchState?.location?.locationId,
                });
           }
      } catch (error) {
           logErrorMessage('Splash: failed to fetch fresh self-check settings');
           logErrorMessage(error);
      }

      // Validate and normalize self-check settings from cache as fallback
      if (cachedLibraryBranchState && (hasUsableSelfCheckCache || hasCachedLocation)) {
           try {
                const normalizedEnabled = resolveSelfCheckEnabled(cachedLibraryBranchState);
                if (typeof normalizedEnabled === 'boolean') {
                     await saveSelfCheckEnabled(normalizedEnabled);
                }
                if (isPlainObject(cachedLibraryBranchState.selfCheckSettings)) {
                     await saveSelfCheckSettings(cachedLibraryBranchState.selfCheckSettings);
                }
                logDebugMessage({
                     event: 'splash_self_check_cache_validated',
                     normalizedEnabled,
                     hasSelfCheckSettings: !!cachedLibraryBranchState.selfCheckSettings,
                });
           } catch (error) {
                logErrorMessage('Splash: failed to validate cached self-check settings');
                logErrorMessage(error);
           }
      }

     // Pre-populate module-level snapshot caches so hook consumers receive data
     // on their very first render instead of waiting for an async SQLite round-trip.
     // Do this regardless of bypass decision so both paths benefit.
     prehydrateLibrarySystemSnapshotCache(cachedLibrarySystemState);
     prehydrateLibraryBranchSnapshotCache(cachedLibraryBranchState);
     prehydrateLanguageSnapshotCache(resolvedLanguageState);
     prehydrateUserDataSnapshotCache(cachedUserState);

     // Seed LIBRARY.version global so formatDiscoveryVersion callers never see undefined
     // on the bypass path (they normally get it set as a side-effect by Loading.js).
     const cachedVersion = cachedLibrarySystemState?.library?.discoveryVersion;
     if (cachedVersion && LIBRARY.version !== cachedVersion.split(' ')[0]) {
          LIBRARY.version = cachedVersion.split(' ')[0];
          logDebugMessage('evaluateStartupCache: seeded LIBRARY.version from cache: ' + LIBRARY.version);
     }

     return {
          canBypassLoading,
          hasUsableUserCache,
          hasUsableLibraryBranchCache,
          hasUsableLibrarySystemCache,
          hasUsableLanguageCache,
          shouldRefreshUserInBackground: userCacheStale,
          shouldRefreshLibraryBranchInBackground: libraryBranchCacheStale,
          shouldRefreshLibrarySystemInBackground: librarySystemMetadataStale || librarySystemMenuStale,
          shouldRefreshLanguageInBackground: languageCacheStale,
     };
}

export const SplashScreen = ({ shouldInitializeTheme = false, forceRefreshTheme = false, onThemeInitialized }) => {
     const { updateTheme, updateColorMode } = useTheme();
     const hasRunInitRef = React.useRef(false);
     const initializedCallbackRef = React.useRef(false);

     React.useEffect(() => {
          if (hasRunInitRef.current) {
               if (!initializedCallbackRef.current && typeof onThemeInitialized === 'function') {
                    initializedCallbackRef.current = true;
                    onThemeInitialized();
               }
               return;
          }
          hasRunInitRef.current = true;
          let active = true;

          const initializeTheme = async () => {
               logDebugMessage(`Splash theme init: start (enabled=${shouldInitializeTheme} forceRefresh=${forceRefreshTheme})`);
               if (!shouldInitializeTheme) {
                    logDebugMessage('Splash theme init: skipped (shouldInitializeTheme=false)');
                    if (typeof onThemeInitialized === 'function' && active) {
                         onThemeInitialized();
                    }
                    return;
               }

               try {
                    await runExclusiveThemeInit(async () => {
                         const currentThemeState = await loadThemeState();
                         const currentLocation = await loadLocation();
                         const currentLocationId = currentLocation?.locationId != null ? Number(currentLocation.locationId) : null;
                         const mode = currentThemeState?.colorMode === 'dark' ? 'dark' : 'light';
                         logDebugMessage(`Splash theme init: loaded state mode=${mode} hasColors=${Boolean(currentThemeState?.themeColors?.primary && currentThemeState?.themeColors?.secondary && currentThemeState?.themeColors?.tertiary)}`);
                         await updateColorMode(mode);

                         const hasStoredTheme = Boolean(currentThemeState?.themeColors?.primary && currentThemeState?.themeColors?.secondary && currentThemeState?.themeColors?.tertiary);
                         // Branded apps pick their themeId from a per-location catalog, not the static
                         // app-config value, so there's no single expected id to compare against - instead,
                         // the stored theme only counts as "matching" if it was fetched for the SAME location
                         // that's currently active, so switching locations (e.g. at login) always refetches.
                         const hasMatchingThemeId = isBrandedApp()
                              ? currentThemeState?.themeId != null &&
                                (currentLocationId == null || currentThemeState?.locationId === currentLocationId)
                              : await isStoredThemeIdMatch(Constants.expoConfig.extra.themeId ?? 1);
                         const themeAgeMs = currentThemeState?.updatedAt ? Date.now() - currentThemeState.updatedAt : Number.POSITIVE_INFINITY;
                         const isThemeStale = themeAgeMs > THEME_STALE_MS;
                         logDebugMessage(`Splash theme init: validation hasStoredTheme=${hasStoredTheme} hasMatchingThemeId=${hasMatchingThemeId} expectedThemeId=${Constants.expoConfig.extra.themeId ?? 1}`);

                         const shouldFetchFromApi = forceRefreshTheme || !hasStoredTheme || !hasMatchingThemeId || isThemeStale;
                         logDebugMessage(`Splash theme init: shouldFetchFromApi=${shouldFetchFromApi} isThemeStale=${isThemeStale} themeAgeMs=${themeAgeMs}`);

                         if (!shouldFetchFromApi && hasStoredTheme && hasMatchingThemeId) {
                              logDebugMessage('Splash theme init: applying cached theme from SQLite');
                              await updateTheme({
                                   tokens: {
                                        colors: currentThemeState.themeColors,
                                   },
                               });
                         } else {
                              const persistedLibraryUrl = await loadLibraryUrl();
                              const themeUrl = LIBRARY.url || persistedLibraryUrl || GLOBALS.url || Constants.expoConfig.extra.apiUrl;
                              if (!themeUrl) {
                                   logDebugMessage('Splash theme init: no URL available yet, skipping fetch and leaving defaults until library context is ready');
                                   return;
                              }

                              logDebugMessage(`Splash theme init: fetching theme from API url=${themeUrl}`);
                              const builtTheme = await buildThemeForLibrary(themeUrl, currentLocationId);
                              await saveThemeState({
                                   themeId: builtTheme.themeId,
                                   locationId: builtTheme.locationId,
                                   colorMode: mode,
                                   textColor: mode === 'dark' ? 'textLight50' : 'textLight950',
                                   themeColors: builtTheme.themeColors,
                                   header: builtTheme.header,
                                });
                              logDebugMessage(`Splash theme init: saved fetched theme themeId=${builtTheme.themeId}`);
                              await updateTheme(builtTheme.theme, builtTheme.themeId, builtTheme.locationId, builtTheme.header);
                         }
                    });
                    logDebugMessage('Splash theme init: complete');
               } catch (error) {
                    logErrorMessage('Splash theme initialization failed');
                    logErrorMessage(error);
               } finally {
                    logDebugMessage('Splash theme init: finalize callback');
                   if (!initializedCallbackRef.current && typeof onThemeInitialized === 'function' && active) {
                        initializedCallbackRef.current = true;
                        onThemeInitialized();
                   }
               }
          };

          initializeTheme();

          return () => {
               logDebugMessage('Splash theme init: cleanup (component unmounted)');
               active = false;
          };
     }, [forceRefreshTheme, onThemeInitialized, shouldInitializeTheme, updateColorMode, updateTheme]);

     return (
          <Center testID="splash-center" className="px-3" style={{ flex: 1, backgroundColor: splashBackgroundColor }}>
               <VStack space="md" className="items-center">
                    <Image source={{ uri: splashImage }} style={{ width: 192.0, height: 192.0 }} contentFit="contain" alt={getTermFromDictionary('en', 'app_name')} />
                    <Spinner size="small" />
               </VStack>
          </Center>
     );
};
