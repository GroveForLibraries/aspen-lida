import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import _ from 'lodash';
import React from 'react';
import { Platform } from 'react-native';
import { checkVersion } from 'react-native-check-version';
import { ThemedAlert as Alert, ThemedAlertText as AlertText } from '@/src/components/themed/ThemedAlert';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedDivider as Divider } from '@/src/components/themed/ThemedDivider';
import { HStack } from '@/components/ui/hstack';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { useAccounts, useDebugMessages, useUserState } from '@/src/hooks/useUserData';
import { formatLinkedAccounts, formatNotificationHistory, formatPickupLocations } from '@/src/util/api/userHelper';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { getTranslatedTermsForUserPreferredLanguage, setTranslationsLibrary, translationsLibrary } from '@/src/translations/TranslationService';
import { GLOBALS } from '@/src/util/globals';
import { useNavigation } from '@react-navigation/native';
import { logDebugMessage, logErrorMessage } from '@/src/util/logging';
import { useActiveLanguage, useAllLanguageData, useLanguageUserStateQuery, useUpdateAvailableLanguages, useUpdateDictionary } from '@/src/hooks/useLanguageData';
import { buildThemeForLibrary, useTheme } from '@/src/themes/theme';
import { useAllLibrarySystemData, useLibraryQuery } from '@/src/hooks/useLibrarySystemData';
import { useAllLibraryBranchData, useLibraryLocationQuery } from '@/src/hooks/useLibraryBranchData';
import { useThemeStateQuery } from '@/src/hooks/useThemeData';
import { useAllBrowseCategoryData } from '@/src/hooks/useBrowseCategoryData';
import { fetchNotificationHistory, getAppPreferencesForUser, getLinkedAccounts, getPickupLocations, refreshProfile } from '@/src/util/api/user';
import { getCatalogStatus, getLibraryInfo, getLibraryLanguages, getLibraryLinks, getLocationInfo, getSelfCheckSettings, normalizeLibraryLanguagesPayload } from '@/src/util/api/system';
import { getBrowseCategoriesAndHomeLinks } from '@/src/util/api/search';
import { saveAccounts, saveAllLibraryBranchData, saveAllBrowseCategoryData, saveAppPreferences, saveCards, saveCatalogStatus, saveLibrary, saveLocations, saveMenu, saveNotificationHistory, saveUserProfile, saveThemeState } from '@/src/util/db';
import { stripHTML } from '@/src/helpers/helpers';

function formatCachedDateTime(updatedAt) {
     if (!updatedAt) {
          return 'not loaded yet';
     }

     return new Date(updatedAt).toLocaleString();
}

/**
 * SupportScreen component that displays support information for the app, including app version, library system information, device information, and data cache management. It allows users to refresh various caches and check for app updates. It also provides access to the API error log.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SupportScreen = () => {
     const navigation = useNavigation();
     const accountsQuery = useAccounts();
     const debugMessagesQuery = useDebugMessages();
     const userStateQuery = useUserState();
     const libraryQuery = useLibraryQuery();
     const allLibrarySystemDataQuery = useAllLibrarySystemData();
     const locationQuery = useLibraryLocationQuery();
     const allLibraryBranchDataQuery = useAllLibraryBranchData();
     const languageUserStateQuery = useLanguageUserStateQuery();
     const allLanguageDataQuery = useAllLanguageData();
     const themeStateQuery = useThemeStateQuery();
     const browseCategoryDataQuery = useAllBrowseCategoryData();
     const activeLanguage = useActiveLanguage();
     const updateLanguages = useUpdateAvailableLanguages();
     const updateDictionary = useUpdateDictionary();
     const { neutralPairs, textColor, colorMode } = useTheme();
     const mutedTextColor = colorMode === 'light' ? neutralPairs.icon.light : neutralPairs.iconMuted.dark;
     const [refreshingCache, setRefreshingCache] = React.useState({});
     const isAnyCacheRefreshing = Object.values(refreshingCache).some(Boolean);
     const [status, setStatus] = React.useState({
          needsUpdate: false,
          url: null,
          latest: GLOBALS.appVersion,
          canOpenUrl: false,
     });

     const accounts = accountsQuery.data;
     const userDebugMessage = debugMessagesQuery.data ?? [];
     const library = libraryQuery.data ?? {};
     const location = locationQuery.data ?? {};
     const language = languageUserStateQuery.data?.language ?? languageUserStateQuery.data?.user?.interfaceLanguage ?? 'en';
     const numLinkedAccounts = _.size(accounts) ?? 0;
     const libraryUrl = library?.baseUrl ?? allLibrarySystemDataQuery.data?.url ?? '';
     const libraryId = allLibrarySystemDataQuery.data?.libraryId ?? library?.libraryId ?? null;

     React.useEffect(() => {
          (async () => {
               let tmp = await checkStoreVersion();
               if (tmp.url) {
                    if (await Linking.canOpenURL(tmp.url)) {
                         tmp = _.set(tmp, 'canOpenUrl', true);
                    }
               }
               setStatus(tmp);
          })();
     }, []);

     const refreshCache = React.useCallback(async (cacheKey, refetch) => {
          setRefreshingCache((prev) => ({ ...prev, [cacheKey]: true }));
          try {
               if (!libraryUrl) {
                    logDebugMessage('Support refresh skipped: no cached library URL available');
                    return;
               }

               if (cacheKey === 'accounts') {
                    const profileResp = await refreshProfile(libraryUrl);
                    if (profileResp?.ok) {
                         const profile = profileResp?.data?.result?.profile ?? {};
                         await saveUserProfile(profile);

                         const pickupResp = await getPickupLocations(libraryUrl);
                         if (pickupResp?.ok) {
                              const pickupLocations = formatPickupLocations(pickupResp.data?.result ?? {});
                              await saveLocations(pickupLocations?.locations ?? []);
                         }

                         const linkedResp = await getLinkedAccounts(libraryUrl, activeLanguage ?? 'en');
                         if (linkedResp?.ok) {
                              const linkedAccounts = formatLinkedAccounts(profile, [], library?.barcodeStyle ?? 'UNKNOWN', linkedResp.data?.result?.linkedAccounts);
                              await saveAccounts(linkedAccounts.accounts ?? []);
                              await saveCards(linkedAccounts.cards ?? []);
                         }

                         const appPrefsResp = await getAppPreferencesForUser(libraryUrl, activeLanguage ?? 'en');
                         if (appPrefsResp?.ok) {
                              await saveAppPreferences(appPrefsResp.data?.result ?? {});
                         }

                         const notifResp = await fetchNotificationHistory(1, 20, true, libraryUrl, activeLanguage ?? 'en');
                         if (notifResp?.ok) {
                              const notificationHistory = formatNotificationHistory(notifResp.data?.result ?? {});
                              await saveNotificationHistory(notificationHistory);
                         }
                    }
               }

               if (cacheKey === 'library') {
                    const catalogResp = await getCatalogStatus(libraryUrl);
                    let catalogStatus = 0;
                    let catalogStatusMessage = '';
                    if (catalogResp?.ok) {
                         catalogStatus = catalogResp.data?.result?.catalogStatus ?? 0;
                         if (catalogResp.data?.result?.api?.message) {
                              catalogStatusMessage = stripHTML(catalogResp.data.result.api.message);
                         }
                    }

                    const libraryResp = await getLibraryInfo(libraryUrl, libraryId);
                    if (libraryResp?.ok) {
                         const libraryInfo = libraryResp.data?.result?.library ?? {};
                         const linksResp = await getLibraryLinks(libraryUrl);
                         const menu = linksResp?.ok ? (linksResp.data?.result?.items ?? []) : [];

                         await saveCatalogStatus(catalogStatus, catalogStatusMessage);
                         await saveLibrary(libraryInfo);
                         await saveMenu(menu);
                    }
               }

               if (cacheKey === 'location') {
                    const locationResp = await getLocationInfo(libraryUrl);
                    if (locationResp?.ok) {
                         const locationData = locationResp.data?.result?.location ?? [];
                         const selfCheckResp = await getSelfCheckSettings(libraryUrl, locationData?.locationId ?? null);
                         const updateData = { location: locationData };

                         // Only update self-check if API succeeds
                         if (selfCheckResp?.ok && selfCheckResp.data?.result?.success) {
                              const rawEnabled = selfCheckResp.data.result.settings?.isEnabled;
                              updateData.enableSelfCheck = rawEnabled === true || rawEnabled === 1 || rawEnabled === '1' || rawEnabled === 'true';
                              updateData.selfCheckSettings = selfCheckResp.data.result.settings ?? {};
                         }

                         await saveAllLibraryBranchData(updateData);
                    }
               }

               if (cacheKey === 'language') {
                    const activeLanguageCode = activeLanguage ?? 'en';
                    const languageResponse = await getLibraryLanguages(libraryUrl);
                    if (languageResponse?.ok) {
                         //No need to sort these since they are already sorted by the API
                         const fetchedLanguages = normalizeLibraryLanguagesPayload(
                              languageResponse?.data?.result?.languages
                         );
                         await updateLanguages(fetchedLanguages);

                         await getTranslatedTermsForUserPreferredLanguage(activeLanguageCode, libraryUrl);
                         setTranslationsLibrary(translationsLibrary);
                         await updateDictionary(translationsLibrary);
                    }else{
                         logDebugMessage("Dod not get a successful response loading lanugage data");
                    }
               }

               if (cacheKey === 'theme') {
                    logDebugMessage('Theme cache refresh triggered from Support screen');
                    const themeResponse = await buildThemeForLibrary(libraryUrl);
                    if (themeResponse) {
                         await saveThemeState({
                              themeId: themeResponse.themeId,
                              colorMode: colorMode === 'dark' ? 'dark' : 'light',
                             textColor: colorMode === 'dark' ? '#e5e7eb' : '#57534e',
                              themeColors: themeResponse.themeColors,
                         });
                    }
               }

               if (cacheKey === 'browse_categories') {
                    const browseCategoriesResp = await getBrowseCategoriesAndHomeLinks({ patronsLibrary: library }, userStateQuery.data?.user ?? {}, { valueUser: '', valueSecret: '' });
                    if (browseCategoriesResp?.ok) {
                         const browseData = browseCategoriesResp.data?.result ?? {};
                         await saveAllBrowseCategoryData({
                              browseCategoriesData: browseData.browseCategoriesData ?? [],
                              categoryCounts: browseData.categoryCounts ?? {},
                              maxCategories: browseData.maxCategories ?? 10,
                         });
                    }
               }

               await refetch();
               await userStateQuery.refetch();
               await allLibrarySystemDataQuery.refetch();
               await allLibraryBranchDataQuery.refetch();
               await allLanguageDataQuery.refetch();
               await themeStateQuery.refetch();
               await browseCategoryDataQuery.refetch();
          } catch (e) {
               logErrorMessage(e);
          } finally {
               setRefreshingCache((prev) => ({ ...prev, [cacheKey]: false }));
          }
     }, [activeLanguage, allLanguageDataQuery, allLibraryBranchDataQuery, allLibrarySystemDataQuery, browseCategoryDataQuery, library, library?.barcodeStyle, libraryId, libraryUrl, themeStateQuery, updateDictionary, updateLanguages, userStateQuery]);

     const cacheItems = [
          {
               key: 'accounts',
               label: 'User',
               updatedAt: userStateQuery.data?.updatedAt ?? accountsQuery.dataUpdatedAt,
               refetch: accountsQuery.refetch,
          },
          {
               key: 'library',
               label: 'Library System',
               updatedAt: allLibrarySystemDataQuery.data?.updatedAt ?? libraryQuery.dataUpdatedAt,
               refetch: libraryQuery.refetch,
          },
          {
               key: 'location',
               label: 'Location/Branch',
               updatedAt: allLibraryBranchDataQuery.data?.updatedAt ?? locationQuery.dataUpdatedAt,
               refetch: locationQuery.refetch,
          },
          {
               key: 'language',
               label: 'Language/Translations',
               updatedAt: allLanguageDataQuery.data?.updatedAt ?? languageUserStateQuery.dataUpdatedAt,
               refetch: languageUserStateQuery.refetch,
          },
          {
               key: 'theme',
               label: 'Theme',
               updatedAt: themeStateQuery.data?.updatedAt,
               refetch: themeStateQuery.refetch,
          },
          {
               key: 'browse_categories',
               label: 'Browse Categories',
               updatedAt: browseCategoryDataQuery.data?.updatedAt,
               refetch: browseCategoryDataQuery.refetch,
          },
     ];

     const openAppStore = async () => {
          if (!status.url) {
               return;
          }
          const supported = await Linking.canOpenURL(status.url);
          if (supported) {
               await Linking.openURL(status.url);
          } else {
               logDebugMessage(`Opening app store is not supported ${supported}`);
          }
     };

     const enableDebugPanel = false;

     return (
          <Box className="flex-1">
               <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                    <VStack space="sm" className="px-4 py-2">
                         <VStack className="justify-between py-1">
                              <Text size="xs" bold>
                                   {getTermFromDictionary(language, 'app_name')}
                              </Text>
                              <Text style={{ color: mutedTextColor }}>
                                   {GLOBALS.appVersion} {GLOBALS.appStage} b[{GLOBALS.appBuild}] p[{GLOBALS.appPatch}] c[{GLOBALS.releaseChannel}]
                              </Text>
                         </VStack>
                         <VStack className="justify-between py-1">
                              <Text size="xs" bold>
                                   {getTermFromDictionary(language, 'aspen_discovery')}
                              </Text>
                              <Text style={{ color: mutedTextColor }}>{library.discoveryVersion}</Text>
                         </VStack>
                         <VStack className="justify-between py-1">
                              <Text size="xs" bold>
                                   {getTermFromDictionary(language, 'os_information')}
                              </Text>
                              <Text style={{ color: mutedTextColor }}>
                                   {Device.osName} {Device.osVersion}
                              </Text>
                         </VStack>
                         <VStack className="justify-between py-1">
                              <Text size="xs" bold>
                                   {getTermFromDictionary(language, 'device_information')}
                              </Text>
                              <Text style={{ color: mutedTextColor }}>
                                   {Device.brand} {Device.modelName}, {Device.deviceYearClass}
                              </Text>
                         </VStack>
                         <VStack className="justify-between py-1">
                              <Text size="xs" bold>
                                   {getTermFromDictionary(language, 'current_location')}
                              </Text>
                              <Text style={{ color: mutedTextColor }}>{location?.displayName ?? '-'}</Text>
                         </VStack>
                         <VStack className="justify-between py-1">
                              <Text size="xs" bold>
                                   {getTermFromDictionary(language, 'current_library')}
                              </Text>
                              <Text style={{ color: mutedTextColor }}>{library.displayName}</Text>
                         </VStack>
                         <VStack className="justify-between py-1">
                              <Text size="xs" bold>
                                   {getTermFromDictionary(language, 'connected_to')}
                              </Text>
                              <Text style={{ color: mutedTextColor }}>{library.baseUrl}</Text>
                         </VStack>
                         <VStack className="justify-between py-1">
                              <Text size="xs" bold>
                                   {getTermFromDictionary(language, 'num_linked_accounts')}
                              </Text>
                              <Text style={{ color: mutedTextColor }}>{numLinkedAccounts}</Text>
                         </VStack>
                         <Divider className="my-2" />
                         <VStack className="justify-between py-1">
                              <Text bold>
                                   Data Caches
                              </Text>
                              <VStack space="sm" className="mt-2">
                                   {cacheItems.map((cacheItem) => (
                                        <Box key={cacheItem.key} className="py-2">
                                             <HStack space="sm" className="justify-between items-center">
                                                  <VStack className="flex-1">
                                                       <Text size="xs" bold>
                                                            {cacheItem.label}
                                                       </Text>
                                                       <Text size="2xs" style={{ color: mutedTextColor }}>
                                                            Cached: {formatCachedDateTime(cacheItem.updatedAt)}
                                                       </Text>
                                                  </VStack>
                                                  <Button size="sm" variant="outline" colorScheme="tertiary" isDisabled={Boolean(refreshingCache[cacheItem.key]) || isAnyCacheRefreshing} onPress={() => refreshCache(cacheItem.key, cacheItem.refetch)}>
                                                       <ButtonText>{refreshingCache[cacheItem.key] ? 'Updating...' : 'Update'}</ButtonText>
                                                  </Button>
                                             </HStack>
                                        </Box>
                                   ))}
                              </VStack>
                         </VStack>
                         {enableDebugPanel ? (
                              <>
                                   <Divider className="my-2" />
                                   <VStack className="justify-between py-1">
                                        <Text size="xs" bold>
                                             Support Log
                                        </Text>
                                        <ScrollView>
                                             <Box>
                                                  <Text size="xs" className="mt-5 mb-5">
                                                       {userDebugMessage.join('\n')}
                                                  </Text>
                                             </Box>
                                        </ScrollView>
                                   </VStack>
                              </>
                         ) : null}
                    </VStack>
                    <Divider className="my-2" />
                    <Center className="pt-5 px-4">
                         <Button colorScheme="secondary" onPress={() => navigation.navigate('MyDevice_APIErrorLog')}>
                             <ButtonText>{getTermFromDictionary(language, 'open_api_error_log')}</ButtonText>
                         </Button>
                    </Center>
                    {status.needsUpdate ? (
                         <Center className="mt-5 px-4">
                              <Alert action="warning" variant="solid" className="mb-2 rounded">
                                   <VStack space="sm" className="w-full p-3">
                                        <AlertText action="warning" variant="solid" bold className="mr-2">
                                             {status.latest} Is Available
                                        </AlertText>
                                        <AlertText action="warning" variant="solid" className="mr-2">Please update your app for the latest features and fixes.</AlertText>
                                        {status.canOpenUrl ? (
                                             <Button colorScheme="secondary" onPress={() => openAppStore()}>
                                                  <ButtonText>Update now</ButtonText>
                                             </Button>
                                        ) : null}
                                   </VStack>
                              </Alert>
                         </Center>
                    ) : null}
               </ScrollView>
          </Box>
     );
};

/**
 * Checks the app store for the latest version of the app and determines if an update is needed.
 * @returns {Promise<{needsUpdate: boolean, url: null, latest: string}|{needsUpdate: boolean, url: any, latest: string}>}
 */
async function checkStoreVersion() {
     try {
          const version = await checkVersion({
               bundleId: GLOBALS.bundleId,
               currentVersion: GLOBALS.appVersion });
          if (version.needsUpdate) {
               let url = GLOBALS.iosStoreUrl;
               if (Platform.OS === 'android') {
                    url = GLOBALS.androidStoreUrl;
               }
               return {
                    needsUpdate: true,
                    url: url,
                    latest: version.version };
          }
     } catch (e) {
          logErrorMessage(e);
     }

     return {
          needsUpdate: false,
          url: null,
          latest: GLOBALS.appVersion };
}
