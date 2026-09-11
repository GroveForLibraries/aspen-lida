import { ThemedMaterialCommunityIcons as MaterialCommunityIcons, ThemedMaterialIcons as MaterialIcons } from '../../components/themed/ThemedMaterialIcons';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React from 'react';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadingSpinner } from '../../components/loadingSpinner';
import { DisplayAndroidEndOfSupportMessage, DisplaySystemMessage } from '../../components/Notifications';
import { SearchContext, SystemMessagesContext } from '../../context/initialContext';
import { useLibrary, useHomeScreenLinks, useUpdateHomeScreenLinks } from '../../hooks/useLibrarySystemData';
import { useUserState } from '../../hooks/useUserData';
import { useBrowseCategories, useMaxCategories, useUpdateBrowseCategories, useUpdateMaxCategories, useBrowseCategoryExpiration } from '../../hooks/useBrowseCategoryData';
import { navigateStack } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getHomeScreenFeed } from '../../util/api/search';
import { formatDiscoveryVersion } from '../../helpers/helpers';
import { getDefaultFacets, getSearchIndexes, getSearchSources } from '../../util/api/search';
import DisplayBrowseCategory from './Category';
import { DisplayErrorAlertDialog } from '../../components/loadError';
import { logDebugMessage, getErrorMessage } from '../../util/logging';
import HomeScreenLinkGrid from './Link';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonSpinner as ButtonSpinner, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { FlatList } from '@/components/ui/flat-list';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedInputSlot as InputSlot } from '../../components/themed/ThemedFormControls';
import { ScreenContainer } from '@/src/components/ScreenContainer';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * DiscoverHomeScreen component that displays the home screen of the discovery interface, including a search bar, home screen links, and browse categories. It fetches data from the API and updates the state accordingly.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const DiscoverHomeScreen = () => {
     const navigation = useNavigation();
     const isFocused = useIsFocused();
     const [loading, setLoading] = React.useState(false);
     const insets = useSafeAreaInsets();

     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { updateIndexes, updateSources, updateCurrentIndex, updateCurrentSource } = React.useContext(SearchContext);
     const { data: userState } = useUserState();
     const notificationOnboard = userState?.notificationOnboard ?? 0;
     const library = useLibrary();
     const homeScreenLinks = useHomeScreenLinks();
     const updateHomeScreenLinks = useUpdateHomeScreenLinks();
     const category = useBrowseCategories();
     const maxNum = useMaxCategories();
     const updateBrowseCategories = useUpdateBrowseCategories();
     const updateMaxCategories = useUpdateMaxCategories();
     const { categoriesExpired } = useBrowseCategoryExpiration();
     const browseRefreshInFlightRef = React.useRef(false);
     const emptyRefreshAttemptedRef = React.useRef(false);
     const categoryRef = React.useRef(category);
     const homeScreenLinksRef = React.useRef(homeScreenLinks);
     const language = useActiveLanguage();

     const [preliminaryLoadingCheck, setPreliminaryCheck] = React.useState(false);

     const version = formatDiscoveryVersion(library.discoveryVersion);
     const [searchTerm, setSearchTerm] = React.useState('');

     const [promptOpen, setPromptOpen] = React.useState('');

     const [showAndroidEndSupportMessage, setShowAndroidEndSupportMessage] = React.useState(false);
     const [androidEndSupportMessageIsOpen, setAndroidEndSupportMessageIsOpen] = React.useState(false);

     const [showErrorDialog, setShowErrorDialog] = React.useState(false);
     const [errorTitle, setErrorTitle] = React.useState('');
     const [errorMessage, setErrorMessage] = React.useState('');

     React.useEffect(() => {
          categoryRef.current = category;
     }, [category]);

     React.useEffect(() => {
          homeScreenLinksRef.current = homeScreenLinks;
     }, [homeScreenLinks]);

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => {
                    return null;
               } });
     }, [navigation]);

     useFocusEffect(
          React.useCallback(() => {
               const checkSettings = async () => {
                    logDebugMessage("Checking Settings from Home Screen");
                    if (Platform.OS === 'android') {
                         if (Device.platformApiLevel <= 30) {
                              setShowAndroidEndSupportMessage(true);
                              setAndroidEndSupportMessageIsOpen(true);
                         }
                    }

                    updateCurrentIndex('Keyword');
                    updateCurrentSource('local');
                    await getSearchIndexes(library.baseUrl, language, 'local').then((result) => {
                         updateIndexes(result);
                    });
                    await getSearchSources(library.baseUrl, language).then((result) => {
                         updateSources(result);
                    });

                    await getDefaultFacets(library.baseUrl, 5, language);
               };
               checkSettings();
          }, [language])
     );

     // Refresh browse/home feed when user navigates to Home and only write if changed.
     useFocusEffect(
          React.useCallback(() => {
                const refreshBrowseContentOnHomeFocus = async () => {
                    if (!library.baseUrl) {
                         return;
                    }

                     if (browseRefreshInFlightRef.current) {
                         return;
                    }

                    browseRefreshInFlightRef.current = true;
                    const requestedMax = maxNum > 0 ? maxNum : 5;

                    if (maxNum <= 0) {
                         await updateMaxCategories(5);
                    }

                     logDebugMessage("Home focus: refreshing browse categories/home links from API");
                    try {
                         const response = await getHomeScreenFeed(requestedMax, library.baseUrl);
                         if (response?.ok) {
                              const result = response.data.result;
                               const nextBrowseCategories = result?.browseCategories ?? [];
                               const nextHomeScreenLinks = result?.homeScreenLinks ?? [];

                               const browseCategoriesChanged = JSON.stringify(categoryRef.current ?? []) !== JSON.stringify(nextBrowseCategories);
                               const homeScreenLinksChanged = JSON.stringify(homeScreenLinksRef.current ?? []) !== JSON.stringify(nextHomeScreenLinks);

                               if (browseCategoriesChanged || homeScreenLinksChanged) {
                                    if (browseCategoriesChanged) {
                                         await updateBrowseCategories(nextBrowseCategories);
                                    }
                                    if (homeScreenLinksChanged) {
                                         await updateHomeScreenLinks(nextHomeScreenLinks);
                                    }
                               }

                               if (Array.isArray(nextBrowseCategories) && nextBrowseCategories.length > 0) {
                                   emptyRefreshAttemptedRef.current = false;
                              }
                               if (browseCategoriesChanged || homeScreenLinksChanged) {
                                    logDebugMessage("Home focus: browse/home content updated");
                               } else {
                                    logDebugMessage("Home focus: browse/home content unchanged, skipped SQLite updates");
                               }
                         } else {
                               logDebugMessage("Error refreshing browse categories/home links from API");
                         }
                    } catch (error) {
                          logDebugMessage("Error refreshing browse categories/home links on Home focus: " + error.message);
                    } finally {
                         browseRefreshInFlightRef.current = false;
                    }
               };

                refreshBrowseContentOnHomeFocus();
           }, [maxNum, library.baseUrl, updateBrowseCategories, updateHomeScreenLinks, updateMaxCategories])
     );

     const clearText = () => {
          setSearchTerm('');
     };

     const search = () => {
          navigateStack('BrowseTab', 'SearchResults', {
               term: searchTerm,
               type: 'catalog',
               prevRoute: 'DiscoveryScreen',
               scannerSearch: false });
          clearText();
     };

     const openScanner = async () => {
          navigateStack('BrowseTab', 'Scanner');
     };

     const onRefreshCategories = async () => {
          try {
               const requestedMax = maxNum > 0 ? maxNum : 5;
               const response = await getHomeScreenFeed(requestedMax, library.baseUrl);
               if (response?.ok) {
                    const result = response.data.result;
                    const nextBrowseCategories = result?.browseCategories ?? [];
                    const nextHomeScreenLinks = result?.homeScreenLinks ?? [];
                    const browseCategoriesChanged = JSON.stringify(category ?? []) !== JSON.stringify(nextBrowseCategories);
                    const homeScreenLinksChanged = JSON.stringify(homeScreenLinks ?? []) !== JSON.stringify(nextHomeScreenLinks);

                    if (browseCategoriesChanged || homeScreenLinksChanged) {
                         setLoading(true);
                         try {
                              if (browseCategoriesChanged) {
                                   await updateBrowseCategories(nextBrowseCategories);
                              }
                              if (homeScreenLinksChanged) {
                                   await updateHomeScreenLinks(nextHomeScreenLinks);
                              }
                         } finally {
                              setLoading(false);
                         }
                    }

                    if (browseCategoriesChanged || homeScreenLinksChanged) {
                         logDebugMessage("Browse categories/home links refreshed");
                    } else {
                         logDebugMessage("Browse categories/home links unchanged, skipped SQLite updates");
                    }
               } else {
                    logDebugMessage("Error refreshing browse categories");
                    getErrorMessage(response?.code ?? 0, response?.problem);
               }
          } catch (error) {
               logDebugMessage("Error during refresh: " + error.message);
          }
     };

     const onLoadAllCategories = async () => {
          try {
               const response = await getHomeScreenFeed(9999, library.baseUrl);
               if (response?.ok) {
                    const result = response.data.result;
                    const nextBrowseCategories = result?.browseCategories ?? [];
                    const nextHomeScreenLinks = result?.homeScreenLinks ?? [];
                     const browseCategoriesChanged = JSON.stringify(categoryRef.current ?? []) !== JSON.stringify(nextBrowseCategories);
                     const homeScreenLinksChanged = JSON.stringify(homeScreenLinksRef.current ?? []) !== JSON.stringify(nextHomeScreenLinks);

                    if (browseCategoriesChanged || homeScreenLinksChanged) {
                         setLoading(true);
                         try {
                              if (browseCategoriesChanged) {
                                   await updateBrowseCategories(nextBrowseCategories);
                              }
                              if (homeScreenLinksChanged) {
                                   await updateHomeScreenLinks(nextHomeScreenLinks);
                              }
                         } finally {
                              setLoading(false);
                         }
                    }

                    if (browseCategoriesChanged || homeScreenLinksChanged) {
                         logDebugMessage("All categories/home links loaded");
                    } else {
                         logDebugMessage("Load all returned unchanged browse/home content");
                    }
               } else {
                    logDebugMessage("Error fetching all browse categories");
                    getErrorMessage(response?.code ?? 0, response?.problem);
               }
          } catch (error) {
               logDebugMessage("Error loading all categories: " + error.message);
          }
     };

     const showManageCategories = () => {
          navigateStack('MoreTab', 'MyPreferences_ManageBrowseCategories', { prevRoute: 'HomeScreen' });
     };

     const showSystemMessage = () => {
          if (Array.isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} />;
                    }
                    return null;
               });
          }
          return null;
     };

     const androidEndSupportMessage = () => {
          if (showAndroidEndSupportMessage && androidEndSupportMessageIsOpen) {
               logDebugMessage("Showing Android End of Support Message");
               return <DisplayAndroidEndOfSupportMessage language={language} setIsOpen={setAndroidEndSupportMessageIsOpen} isOpen={androidEndSupportMessageIsOpen} />;
          }
     };

     if (loading === true) {
          return loadingSpinner();
     }

     const clearSearch = () => {
          setSearchTerm('');
     };

     const listBottomPadding = insets.bottom + 96;

     return (
          <ScreenContainer safeArea>
               <FlatList
                    contentContainerStyle={{ paddingBottom: listBottomPadding }}
                    ListHeaderComponent={
                         <Box className="py-[10px]">
                              {androidEndSupportMessage()}
                              {showSystemMessage()}
                              <FormControl className="px-2">
                                   <Input>
                                        <InputSlot>
                                             <MaterialIcons name="search" size={20} className="ml-2" />
                                        </InputSlot>
                                        <InputField returnKeyType="search" variant="outline" autoCapitalize="none" onChangeText={(term) => setSearchTerm(term)} placeholder={getTermFromDictionary(language, 'search')} onSubmitEditing={search} value={searchTerm} />
                                        {searchTerm ? (
                                             <InputSlot onPress={() => clearSearch()}>
                                                  <MaterialIcons name="close" size={20} className="mr-2" />
                                             </InputSlot>
                                        ) : null}
                                        <InputSlot onPress={() => openScanner()}>
                                             <MaterialCommunityIcons name="barcode-scan" size={20} className="mr-2" />
                                        </InputSlot>
                                   </Input>
                              </FormControl>
                              {homeScreenLinks && homeScreenLinks.length > 0 ? (
                                   <HomeScreenLinkGrid links={homeScreenLinks} />
                              ) : null}
                         </Box>
                    }
                    data={category}
                    keyExtractor={(item, index) => {
                         return `${item?.id ?? item?.textId ?? item?.sourceListId ?? item?.label ?? `${item?.source ?? 'browse'}-${item?.sourceListId ?? 'category'}`}-${index}`;
                    }}
                    renderItem={({ item }) => (
                         <Box className="px-2">
                              <DisplayBrowseCategory category={item} />
                         </Box>
                    )}
                    ListFooterComponent={
                         <Box className="py-5">
                              <ButtonOptions language={language} showManageCategories={showManageCategories} onRefreshCategories={onRefreshCategories} discoveryVersion={library.discoveryVersion} onLoadAllCategories={onLoadAllCategories} />
                              {showErrorDialog && (
                                   <DisplayErrorAlertDialog title={errorTitle} message={errorMessage} />
                              )}
                         </Box>
                    }
               />
          </ScreenContainer>
     );
};

/**
 * ButtonOptions component that renders a group of buttons for managing browse categories, including loading all categories, managing categories, and refreshing categories. It uses the theme colors and handles loading states for each button.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const ButtonOptions = (props) => {
     const { brand } = useTheme();
     const [loading, setLoading] = React.useState(false);
     const [refreshing, setRefreshing] = React.useState(false);
     const { language, showManageCategories, onRefreshCategories, onLoadAllCategories } = props;

     return (
          <Center>
               <ButtonGroup
                    className="flex-col">
                    <Button
                         autoLoading={false}
                         isDisabled={loading}
                         colorScheme="primary"
                         size="md"
                         onPress={async () => {
                              setLoading(true);
                              try {
                                   await onLoadAllCategories();
                              } finally {
                                   setLoading(false);
                              }
                         }}>
                         {loading ? (
                          <ButtonSpinner key="spinner" className="mr-1" style={{ color: brand.primary['500-text'] }} />
                         ) : (
                             <MaterialIcons
                                  key="icon"
                                  name="schedule"
                                  size={16}
                                  color={brand.primary['500-text']}
                                  className="mr-1"
                             />
                         )}
                         <ButtonText
                             className="font-medium"
                             size="sm"
                         >
                             {getTermFromDictionary(language, 'browse_categories_load_all')}
                         </ButtonText>
                    </Button>

                    <Button
                         colorScheme="primary"
                         onPress={() => {
                             showManageCategories();
                         }}>
                         <MaterialIcons
                             name="settings"
                             size={16}
                             color={brand.primary['500-text']}
                             className="mr-1"
                         />
                         <ButtonText
                             className="font-medium"
                             size="sm"
                         >
                             {getTermFromDictionary(language, 'browse_categories_manage')}
                         </ButtonText>
                    </Button>

                    <Button
                         autoLoading={false}
                         isDisabled={refreshing}
                         colorScheme="primary"
                         onPress={async () => {
                             setRefreshing(true);
                             try {
                                   await onRefreshCategories();
                              } finally {
                                   setRefreshing(false);
                              }
                         }}>
                         {refreshing ? <ButtonSpinner style={{ color: brand.primary['500-text'] }} /> : <MaterialIcons name="refresh" size={16} color={brand.primary['500-text']} className="mr-1" />}

                         <ButtonText size="sm" className="font-medium">
                              {getTermFromDictionary(language, 'browse_categories_refresh')}
                         </ButtonText>
                    </Button>
               </ButtonGroup>
          </Center>
     );
};
