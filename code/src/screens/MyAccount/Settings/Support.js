import * as Device from 'expo-device';
import * as Linking from 'expo-linking';

import { Alert, Box, Center, HStack, Pressable, Text, VStack, ScrollView, Button, ButtonText, Divider, AlertText, CloseIcon } from '@gluestack-ui/themed';
import React from 'react';
import { Platform } from 'react-native';
import { checkVersion } from 'react-native-check-version';

import { useAccounts, useDebugMessages, useUserState } from '../../../hooks/useUserData';
import { formatLinkedAccounts, formatNotificationHistory, formatPickupLocations } from '../../../util/api/userHelper';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { getTranslatedTermsForUserPreferredLanguage, setTranslationsLibrary, translationsLibrary } from '../../../translations/TranslationService';
import { GLOBALS } from '../../../util/globals';
import { useNavigation } from '@react-navigation/native';
import { logDebugMessage, logErrorMessage } from '../../../util/logging';
import { useActiveLanguage, useAllLanguageData, useLanguageUserStateQuery, useUpdateAvailableLanguages, useUpdateDictionary } from '../../../hooks/useLanguageData';
import { buildThemeForLibrary, useTheme } from '../../../themes/theme';
import { useAllLibrarySystemData, useLibraryQuery } from '../../../hooks/useLibrarySystemData';
import { useAllLibraryBranchData, useLibraryLocationQuery } from '../../../hooks/useLibraryBranchData';
import { useThemeStateQuery } from '../../../hooks/useThemeData';
import { useAllBrowseCategoryData } from '../../../hooks/useBrowseCategoryData';
import { fetchNotificationHistory, getAppPreferencesForUser, getLinkedAccounts, getPickupLocations, refreshProfile } from '../../../util/api/user';
import { getCatalogStatus, getLibraryInfo, getLibraryLanguages, getLibraryLinks, getLocationInfo, getSelfCheckSettings, normalizeLibraryLanguagesPayload } from '../../../util/api/system';
import { getBrowseCategoriesAndHomeLinks } from '../../../util/api/search';
import { saveAccounts, saveAllLibraryBranchData, saveAllBrowseCategoryData, saveAppPreferences, saveCards, saveCatalogStatus, saveLibrary, saveLocations, saveMenu, saveNotificationHistory, saveUserProfile, saveThemeState } from '../../../util/db';
import { orderByFields, stripHTML, set, size } from '../../../helpers/helpers';

function formatCachedDateTime(updatedAt) {
     if (!updatedAt) {
          return 'not loaded yet';
     }

     return new Date(updatedAt).toLocaleString();
}

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
     const { theme, textColor, colorMode } = useTheme();
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
     const numLinkedAccounts = size(accounts) ?? 0;
     const libraryUrl = library?.baseUrl ?? allLibrarySystemDataQuery.data?.url ?? '';
     const libraryId = allLibrarySystemDataQuery.data?.libraryId ?? library?.libraryId ?? null;

     React.useEffect(() => {
          (async () => {
               let tmp = await checkStoreVersion();
               if (tmp.url) {
                    if (await Linking.canOpenURL(tmp.url)) {
                         tmp = set(tmp, 'canOpenUrl', true);
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
                              textColor: colorMode === 'dark' ? '$coolGray200' : '$warmGray600',
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
          <Box safeArea={5} flex={1}>
               <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                    <VStack space="sm" px="$4" py="$2">
                         <VStack justifyContent="space-between" py="$1">
                              <Text fontSize="$xs" bold color={textColor}>
                                   {getTermFromDictionary(language, 'app_name')}
                              </Text>
                              <Text color={colorMode === 'light' ? '$coolGray600' : '$warmGray400'}>
                                   {GLOBALS.appVersion} {GLOBALS.appStage} b[{GLOBALS.appBuild}] p[{GLOBALS.appPatch}] c[{GLOBALS.releaseChannel}]
                              </Text>
                         </VStack>
                         <VStack justifyContent="space-between" py="$1">
                              <Text fontSize="$xs" bold color={textColor}>
                                   {getTermFromDictionary(language, 'aspen_discovery')}
                              </Text>
                              <Text color={colorMode === 'light' ? '$coolGray600' : '$warmGray400'}>{library.discoveryVersion}</Text>
                         </VStack>
                         <VStack justifyContent="space-between" py="$1">
                              <Text fontSize="$xs" bold color={textColor}>
                                   {getTermFromDictionary(language, 'os_information')}
                              </Text>
                              <Text color={colorMode === 'light' ? '$coolGray600' : '$warmGray400'}>
                                   {Device.osName} {Device.osVersion}
                              </Text>
                         </VStack>
                         <VStack justifyContent="space-between" py="$1">
                              <Text fontSize="$xs" bold color={textColor}>
                                   {getTermFromDictionary(language, 'device_information')}
                              </Text>
                              <Text color={colorMode === 'light' ? '$coolGray600' : '$warmGray400'}>
                                   {Device.brand} {Device.modelName}, {Device.deviceYearClass}
                              </Text>
                         </VStack>
                         <VStack justifyContent="space-between" py="$1">
                              <Text fontSize="$xs" bold color={textColor}>
                                   {getTermFromDictionary(language, 'current_location')}
                              </Text>
                              <Text color={colorMode === 'light' ? '$coolGray600' : '$warmGray400'}>{location?.displayName ?? '-'}</Text>
                         </VStack>
                         <VStack justifyContent="space-between" py="$1">
                              <Text fontSize="$xs" bold color={textColor}>
                                   {getTermFromDictionary(language, 'current_library')}
                              </Text>
                              <Text color={colorMode === 'light' ? '$coolGray600' : '$warmGray400'}>{library.displayName}</Text>
                         </VStack>
                         <VStack justifyContent="space-between" py="$1">
                              <Text fontSize="$xs" bold color={textColor}>
                                   {getTermFromDictionary(language, 'connected_to')}
                              </Text>
                              <Text color={colorMode === 'light' ? '$coolGray600' : '$warmGray400'}>{library.baseUrl}</Text>
                         </VStack>
                         <VStack justifyContent="space-between" py="$1">
                              <Text fontSize="$xs" bold color={textColor}>
                                   {getTermFromDictionary(language, 'num_linked_accounts')}
                              </Text>
                              <Text color={colorMode === 'light' ? '$coolGray600' : '$warmGray400'}>{numLinkedAccounts}</Text>
                         </VStack>
                         <Divider my="$2" />
                         <VStack justifyContent="space-between" py="$1">
                              <Text bold color={textColor}>
                                   Data Caches
                              </Text>
                              <VStack space="$2" mt="$2">
                                   {cacheItems.map((cacheItem) => (
                                        <Box key={cacheItem.key} py="$2">
                                             <HStack justifyContent="space-between" alignItems="center" space="$2">
                                                  <VStack flex={1}>
                                                       <Text fontSize="$xs" bold color={textColor}>
                                                            {cacheItem.label}
                                                       </Text>
                                                       <Text fontSize="$2xs" color={colorMode === 'light' ? '$coolGray600' : '$warmGray400'}>
                                                            Cached: {formatCachedDateTime(cacheItem.updatedAt)}
                                                       </Text>
                                                  </VStack>
                                                  <Button size="sm" variant="outline" borderColor={colorMode === 'light' ? '$coolGray600' : '$warmGray400'} isDisabled={Boolean(refreshingCache[cacheItem.key]) || isAnyCacheRefreshing} onPress={() => refreshCache(cacheItem.key, cacheItem.refetch)}>
                                                       <ButtonText color={colorMode === 'light' ? '$coolGray600' : '$warmGray400'}>{refreshingCache[cacheItem.key] ? 'Updating...' : 'Update'}</ButtonText>
                                                  </Button>
                                             </HStack>
                                        </Box>
                                   ))}
                              </VStack>
                         </VStack>
                         {enableDebugPanel ? (
                              <>
                                   <Divider my="$2" />
                                   <VStack justifyContent="space-between" py="$1">
                                        <Text fontSize="$xs" bold color={textColor}>
                                             Support Log
                                        </Text>
                                        <ScrollView>
                                             <Box>
                                                  <Text color={textColor} mt="$5" fontSize="$xs" mb="$5">
                                                       {userDebugMessage.join('\n')}
                                                  </Text>
                                             </Box>
                                        </ScrollView>
                                   </VStack>
                              </>
                         ) : null}
                    </VStack>
                    <Divider my="$2" />
                    <Center pt={5} px="$4">
                         <Button bg={theme.tokens.colors.secondary['500']} onPress={() => navigation.navigate('MyDevice_APIErrorLog')}>
                              <ButtonText color={theme.tokens.colors.secondary['500-text']}>{getTermFromDictionary(language, 'open_api_error_log')}</ButtonText>
                         </Button>
                    </Center>
                    {status.needsUpdate ? (
                         <Center mt="$5" px="$4">
                              <Alert action="warning" variant="solid" mb="$2" borderRadius="$sm">
                                   <VStack space="sm" width="$full" p="$3">
                                        <AlertText mr="$2" fontWeight="$bold">
                                             {status.latest} Is Available
                                        </AlertText>
                                        <AlertText mr="$2">Please update your app for the latest features and fixes.</AlertText>
                                        {status.canOpenUrl ? (
                                             <Button action="secondary" onPress={() => openAppStore()}>
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

