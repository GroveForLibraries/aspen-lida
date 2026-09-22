import {
     Button,
     ButtonGroup,
     ButtonIcon,
     ButtonText,
     Heading,
     Box,
     Center,
     FlatList,
     HStack,
     Pressable,
     Text,
     SafeAreaView,
     Badge,
     BadgeText,
     VStack,
     Input, InputSlot, InputIcon, InputField, FormControl
} from '@gluestack-ui/themed';
import { CommonActions, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';

import {ScanBarcode, SearchIcon, SlidersHorizontalIcon, XIcon} from 'lucide-react-native';

import React from 'react';
import { ScrollView } from 'react-native';
import { loadError } from '../../components/loadError';
import { popToast } from '../../components/feedback';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { DisplaySystemMessage } from '../../components/Notifications';

import { SearchContext, SystemMessagesContext } from '../../context/initialContext';
import { getCleanTitle } from '../../helpers/item';
import { useLibraryScope, useLibraryLocation } from '../../hooks/useLibraryBranchData';
import {navigate, navigateStack} from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { GLOBALS, SearchGlobal } from '../../util/globals';
import { decodeHTML, getEventDateDisplayData, isValidUrl, compact, filter, find, forEach, isEmpty, isEqual, map, size, truncate } from '../../helpers/helpers';
import { getAppliedFilters, getAvailableFacetsKeys, getSortList } from '../../util/api/search';
import { setDefaultFacets } from '../../util/api/searchHelper';

import AddToList from './AddToList';
import {logDebugMessage, logErrorMessage, logInfoMessage} from '../../util/logging';
import { createApiClient } from '../../util/api/apiFactory';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { useLibrary } from '../../hooks/useLibrarySystemData';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

export const SearchResults = () => {
     const navigation = useNavigation();
     const route = useRoute();
     const [page, setPage] = React.useState(1);
     const [storedTerm, setStoredTerm] = React.useState(SearchGlobal.term);
      const library = useLibrary();
      const language = useActiveLanguage();
      const scope = useLibraryScope();
      const { currentIndex, currentSource, updateCurrentIndex, updateCurrentSource, updateIndexes, updateSources } = React.useContext(SearchContext);
     const { theme, textColor, colorMode } = useTheme();
     const url = library.baseUrl;
     const [paginationLabel, setPaginationLabel] = React.useState('Page 1 of 1');

     const queryClient = useQueryClient();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);

     let term = useRoute().params.term ?? '%';
     term = term.replace(/" "/g, '%20');

     let isScannerSearch = useRoute().params.scannerSearch ?? false;

     let params = useRoute().params.pendingParams ?? [];

     const prevRoute = useRoute().params.prevRoute ?? 'SearchHome';

     const type = useRoute().params.type ?? 'catalog';
     const id = useRoute().params.id ?? null;
     const barcodeType = useRoute().params.barcodeType ?? null;

     const systemMessagesForScreen = [];

     if (term && term !== storedTerm) {
          logDebugMessage('Search term changed. Clearing previous search options...');
          setStoredTerm(term);
          setPage(1);
          SearchGlobal.pendingFilters = [];
          SearchGlobal.sortMethod = 'relevance';
          SearchGlobal.appliedFilters = [];
          SearchGlobal.sortList = [];
          SearchGlobal.availableFacets = [];
          SearchGlobal.defaultFacets = [];
          SearchGlobal.pendingFilters = [];
          SearchGlobal.appendedParams = '';
          params = [];
     }

     React.useEffect(() => {
          if (Array.isArray(systemMessages)) {
               systemMessages.map((obj, index, collection) => {
                    if (obj.showOn === '0') {
                         systemMessagesForScreen.push(obj);
                    }
               });
          }
     }, [systemMessages]);

     const { status, data, error, isFetching, isPreviousData } = useQuery({
          queryKey: ['searchResults', url, page, term, scope, params, type, id, language, currentIndex, currentSource],
          queryFn: () => fetchSearchResults(term, page, scope, url, type, id, language, currentIndex, currentSource, barcodeType),
          keepPreviousData: true,
          staleTime: 1000,
          onSuccess: (data) => {
               if (data.totalPages) {
                    let tmp = getTermFromDictionary(language, 'page_of_page');
                    tmp = tmp.replace('%1%', page);
                    tmp = tmp.replace('%2%', data.totalPages);
                    setPaginationLabel(tmp);
               }
               if ((data.totalResults === 1 || data.totalResults === '1') && isScannerSearch) {
                    const result = data.results[0];
                    if (result.key) {
                         navigate('GroupedWorkScreen', {
                              id: result.key,
                              title: getCleanTitle(result.title),
                              url: library.baseUrl,
                              libraryContext: library });
                    }
               }
          },
          onError: (error) => {
               logDebugMessage("Error searching");
               logErrorMessage(error);
          }
      });

      // When the filter modal closes, check if filters were updated and refetch
      useFocusEffect(
           React.useCallback(() => {
                // Check if SearchGlobal has pending params that differ from current route params
                if (SearchGlobal.pendingParams && !isEqual(SearchGlobal.pendingParams, params)) {
                     logDebugMessage('Filters were updated in modal, invalidating query to refetch');
                     // Invalidate the query to force a refetch
                     queryClient.invalidateQueries({
                          queryKey: ['searchResults', url, page, term, scope, params, type, id, language, currentIndex, currentSource],
                          exact: false
                     });
                     // Reset pending params after handling
                     SearchGlobal.pendingParams = [];
                }
           }, [queryClient, url, page, term, scope, params, type, id, language, currentIndex, currentSource])
      );

      const Header = () => {
          const num = Math.trunc(Number(data?.totalResults ?? 0) || 0);
          if (num > 0) {
               let label = num + ' ' + getTermFromDictionary(language, 'results');
               if (num === 1) {
                    label = num + ' ' + getTermFromDictionary(language, 'result');
               }
               return (
                    <Box bgColor={colorMode === 'light' ? "$coolGray100" : "$coolGray700"} borderBottomWidth="$1" borderColor={colorMode === 'light' ? "$coolGray200" : "$warmGray600"}>
                         <Box m="$2">
                              <Text color={textColor}>{label}</Text>
                         </Box>
                    </Box>
               );
          }

          return null;
     };

     const Paging = () => {
          if (data.totalPages > 1) {
               return (
                    <Box p="$2" bgColor={colorMode === 'light' ? "$coolGray100" : "$coolGray700"} borderTopWidth="$1" borderColor={colorMode === 'light' ? "$coolGray200" : "$warmGray600"} flexWrap="nowrap" alignItems="center">
                         <ScrollView horizontal>
                              <ButtonGroup>
                                   <Button onPress={() => setPage(page - 1)} isDisabled={page === 1} size="sm" bgColor={theme.tokens.colors.primary['500']}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'previous')}</ButtonText>
                                   </Button>
                                   <Button
                                        bgColor={theme.tokens.colors.primary['500']}
                                        onPress={() => {
                                             if (!isPreviousData && data.hasMore) {
                                                  setPage(page + 1);
                                             }
                                        }}
                                        isDisabled={isPreviousData || !data.hasMore}
                                        size="sm">
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'next')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ScrollView>
                         <Text mt="$2" fontSize="$2xs" color={textColor}>
                              {paginationLabel}
                         </Text>
                    </Box>
               );
          }

          return null;
     };

     const showSystemMessage = () => {
          if (Array.isArray(systemMessages)) {
               return systemMessages.map((obj, index, collection) => {
                    if (obj.showOn === '0') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
               });
          }
          return null;
     };

     const NoResults = () => {
          return (
               <>
                    {systemMessagesForScreen.length > 0 ? <Box p="$2">{showSystemMessage()}</Box> : null}
                    <Center flex={1}>
                         <Heading pt="$5" color={textColor}>
                              {getTermFromDictionary(language, 'no_results')}
                         </Heading>
                         <Text bold w="75%" textAlign="center" color={textColor}>
                              {route.params?.term}
                         </Text>
                    </Center>
               </>
          );
     };

     return (
          <SafeAreaView style={{ flex: 1 }}>
               {systemMessagesForScreen.length > 0 ? <Box p="$2">{showSystemMessage()}</Box> : null}
               {status === 'loading' || isFetching ? (
                    <LoadingSpinner />
               ) : status === 'error' ? (
                    loadError('Error', '')
               ) : (
                    <Box flex={1}>
                         {data.totalResults > 0 ? <FilterBar navigation={navigation} /> : null}
                         <SearchBox term={term} navigation={navigation} />
                         <FlatList data={data.results} ListHeaderComponent={Header} ListFooterComponent={Paging} ListEmptyComponent={NoResults} renderItem={({ item }) => <DisplayResult data={item} />} keyExtractor={(item, index) => index.toString()} />
                    </Box>
               )}
          </SafeAreaView>
     );
};

const DisplayResult = (data) => {
     const item = data.data;
     const library = useLibrary();
     const language = useActiveLanguage();
     const { theme, textColor, colorMode } = useTheme();
     const { currentSource } = React.useContext(SearchContext);
     const backgroundColor = colorMode === 'light' ? "$warmGray200" : "$coolGray900";

     const handlePressItem = () => {
          if (currentSource === 'events') {
               let eventSource = item.source;
               if (item.source === 'lc') {
                    eventSource = 'library_calendar';
               }
               if (item.source === 'libcal' || item.source === 'springshare_libcal') {
                    eventSource = 'springshare';
               }

               if (item.bypass) {
                    openURL(item.url);
               } else {
                    navigate('EventScreen', {
                         id: item.key,
                         title: getCleanTitle(item.title),
                         url: library.baseUrl,
                         source: eventSource });
               }
          } else {
               navigate('GroupedWorkScreen', {
                    id: item.key,
                    title: getCleanTitle(item.title),
                    url: library.baseUrl,
                    libraryContext: library });
          }
     };

     const formats = item?.itemList ?? [];

     function getFormat(n) {

          // Skip empty or invalid formats.
          if (!n || !n.name || n.name.trim() === '') {
               return null;
          }

          return (
               <Badge key={n.key} borderRadius="$sm" borderColor={theme.tokens.colors.primary['400']} variant="outline" bg="transparent">
                    <BadgeText textTransform="none" color={theme.tokens.colors.primary['400']} fontSize="$xs">
                         {n.name}
                    </BadgeText>
               </Badge>
          );
     }

     const openURL = async (url) => {
          const browserParams = {
               enableDefaultShareMenuItem: false,
               presentationStyle: 'automatic',
               showTitle: false,
               toolbarColor: backgroundColor,
               controlsColor: textColor,
               secondaryToolbarColor: backgroundColor };
          await WebBrowser.openBrowserAsync(url, browserParams)
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
                              await WebBrowser.openBrowserAsync(url, browserParams)
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
     };

     const imageUrl = item.image;

     const key = 'medium_' + item.key;
     let url = library.baseUrl + '/bookcover.php?id=' + item.key + '&size=medium';

     if (currentSource === 'events') {
          const keyParts = item.key.split('_');
          if(isValidUrl(imageUrl)) {
               url = imageUrl;
          } else {
              url += '&type=' + keyParts[0] + '_event';
          }

          let registrationRequired = false;
           if (item.registration_required !== undefined) {
               registrationRequired = item.registration_required;
          }

          const startTime = item.start_date.date;
          const endTime = item.end_date.date;
          const { displayDay, displayStartTime, displayEndTime } = getEventDateDisplayData(startTime, endTime);

          let locationData = item?.location ?? [];
          let roomData = item?.room ?? null;

          return (
               <Pressable borderBottomWidth={1} borderColor={colorMode === 'light' ? '$warmGray400' : '$warmGray600'} pl="$4" pr="$5" py="$2" onPress={handlePressItem}>
                    <HStack space="md">
                         <VStack sx={{ '@base': { width: 100 }, '@lg': { width: 180 } }}>
                              <Box sx={{ '@base': { height: 150 }, '@lg': { height: 250 } }}>
                                   <Image
                                        alt={item.title}
                                        source={url}
                                        style={{
                                             width: '100%',
                                             height: '100%',
                                             borderRadius: 4,
                                        }}
                                        placeholder={blurhash}
                                        transition={1000}
                                        contentFit="cover"
                                   />
                              </Box>
                              {item.canAddToList ? <AddToList source="Events" itemId={item.key} btnStyle="sm" /> : null}
                         </VStack>
                         <VStack w="65%" pt="$1">
                              <Text color={textColor} bold fontSize="$sm" pb="$1">
                                   {decodeHTML(item.title)}
                              </Text>
                              {item.start_date && item.end_date ? (
                                   <>
                                        <Text color={textColor} fontSize="$xs">
                                             {displayDay}
                                        </Text>
                                        <Text color={textColor} fontSize="$xs">
                                             {displayStartTime} - {displayEndTime}
                                        </Text>
                                   </>
                              ) : null}
                              {locationData.name ? (
                                   <Text color={textColor} fontSize="$xs">
                                        {locationData.name}
                                   </Text>
                              ) : null}
                              {registrationRequired ? (
                                   <HStack mt="$4" direction="row" space="xs" flexWrap="wrap">
                                        <Badge key={0} borderRadius="$sm" borderColor={theme.tokens.colors.secondary['400']} variant="outline" bg="transparent">
                                             <BadgeText textTransform="none" color={theme.tokens.colors.secondary['400']} fontSize="$xs">
                                                  {getTermFromDictionary(language, 'registration_required')}
                                             </BadgeText>
                                        </Badge>
                                   </HStack>
                              ) : null}
                         </VStack>
                    </HStack>
               </Pressable>
          );
     }

     return (
          <Pressable borderBottomWidth="$1" borderColor={colorMode === 'light' ? "$warmGray400" : "$warmGray600"} pl="$4" pr="$5" py="$2" onPress={handlePressItem}>
               <HStack space="md">
                    <VStack sx={{ '@base': { width: 100 }, '@lg': { width: 180 } }}>
                         <Box sx={{ '@base': { height: 150 }, '@lg': { height: 250 } }}>
                              <Image
                                   alt={item.title}
                                   source={url}
                                   style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: 4 }}
                                   placeholder={blurhash}
                                   transition={1000}
                                   contentFit="cover"
                              />
                         </Box>
                         {item.language ? (
                              <Center
                                   mt="$1"
                                   sx={{
                                        bgColor: colorMode === 'light' ? "$warmGray200" : "$coolGray900" }}>
                                   <Badge
                                        size="$sm"
                                        sx={{
                                             bgColor: colorMode === 'light' ? "$warmGray200" : "$coolGray900" }}>
                                        <BadgeText textTransform="none" color={colorMode === 'light' ? "$coolGray600" : "$warmGray400"} sx={{ '@base': { fontSize: 10 }, '@lg': { fontSize: 16, padding: 4, textAlign: 'center' } }}>
                                             {item.language}
                                        </BadgeText>
                                   </Badge>
                              </Center>
                         ) : null}
                         <AddToList itemId={item.key} btnStyle="sm" />
                    </VStack>
                    <VStack w="65%" pt="$1">
                         <Text color={textColor} bold fontSize="$sm" pb="$1">
                              {item.title}
                         </Text>
                         {item.author ? (
                              <Text color={textColor} fontSize="$xs">
                                   {getTermFromDictionary(language, 'by')} {item.author}
                              </Text>
                         ) : null}
                         <HStack mt="$4" direction="row" space="xs" flexWrap="wrap">
                              {compact(map(formats, getFormat))}
                         </HStack>
                    </VStack>
               </HStack>
          </Pressable>
     );
};

const FilterBar = ({ navigation }) => {
     const language = useActiveLanguage();
     const library = useLibrary();
     const { theme, colorMode, textColor } = useTheme();
     const type = useRoute().params.type ?? 'catalog';

     if (navigation === undefined) {
          logErrorMessage("Navigation is undefined in Filter Bar");
          return null;
     }
     if (type === 'catalog') {
          return (
               <Box padding="$2" paddingBottom="$0" bgColor={colorMode === 'light' ? '$coolGray100' : '$coolGray700'} borderColor={colorMode === 'light' ? '$coolGray200' : '$warmGray600'} flexWrap="nowrap">
                    <ScrollView horizontal>
                         <Button
                              size="sm"
                              variant="solid"
                              mr="$1"
                              bg={theme.tokens.colors.primary['600']}
                              onPress={() => {
                                   navigation.push('modal', {
                                        screen: 'Filters',
                                        params: {
                                             pendingUpdates: [],
                                        },
                                   });
                              }}>
                              <ButtonIcon color={theme.tokens.colors.primary['600-text']} as={SlidersHorizontalIcon} mr="$1" />
                              <ButtonText color={theme.tokens.colors.primary['600-text']}>{getTermFromDictionary(language, 'filters')}</ButtonText>
                         </Button>
                         <CreateFilterButton navigation={navigation} />
                    </ScrollView>
               </Box>
          );
     }
};

const SearchBox = ({term, navigation}) => {
     const language = useActiveLanguage();
     const { colorMode, textColor } = useTheme();
     const [searchTerm, setSearchTerm] = React.useState(term);

     const openScanner = async () => {
          navigateStack('BrowseTab', 'Scanner');
     };

     const clearSearch = () => {
          setSearchTerm('');
     }

     const updateSearch = async () => {
          setSearchTerm(searchTerm);
          navigation.dispatch(CommonActions.setParams({ term: searchTerm }));
     };

     return (
          <Box padding="$2" bgColor={colorMode === 'light' ? '$coolGray100' : '$coolGray700'} borderColor={colorMode === 'light' ? '$coolGray200' : '$warmGray600'} borderBottomWidth="$1">
               <FormControl pb="$5">
                    <Input borderColor={colorMode === 'light' ? '$coolGray500' : '$warmGray300'}>
                         <InputSlot>
                              <InputIcon as={SearchIcon} ml="$2" color={textColor} />
                         </InputSlot>
                         <InputField returnKeyType="search" variant="outline" autoCapitalize="none" onChangeText={(term) => setSearchTerm(term)} status="info" placeholder={getTermFromDictionary(language, 'search')} onSubmitEditing={updateSearch} value={searchTerm} size="$lg" sx={{ color: textColor, borderColor: textColor, ':focus': { borderColor: textColor } }} />
                         {searchTerm ? (
                              <InputSlot onPress={() => clearSearch()}>
                                   <InputIcon as={XIcon} mr="$2" color={textColor} />
                              </InputSlot>
                         ) : null}
                         <InputSlot onPress={() => openScanner()}>
                              <InputIcon as={ScanBarcode} mr="$2" color={textColor} />
                         </InputSlot>
                    </Input>
               </FormControl>
          </Box>
     );
}

const CreateFilterButtonDefaults = ({navigation}) => {
     const defaults = SearchGlobal.defaultFacets;
     const location = useLibraryLocation();
     const library = useLibrary();
     const { theme, colorMode, textColor } = useTheme();

     const locationGroupedWorkDisplaySettings = location.groupedWorkDisplaySettings ?? [];
     const libraryGroupedWorkDisplaySettings = library.groupedWorkDisplaySettings ?? [];

     let defaultAvailabilityToggleLabel = 'Entire Collection';
     let defaultAvailabilityToggleValue = 'global';
     if (locationGroupedWorkDisplaySettings.availabilityToggleValue) {
          defaultAvailabilityToggleValue = locationGroupedWorkDisplaySettings.availabilityToggleValue;
     } else if (libraryGroupedWorkDisplaySettings.availabilityToggleValue) {
          defaultAvailabilityToggleValue = libraryGroupedWorkDisplaySettings.availabilityToggleValue;
     }

     if (defaultAvailabilityToggleValue === 'global') {
          if (locationGroupedWorkDisplaySettings.superScopeLabel || isEmpty(locationGroupedWorkDisplaySettings.superScopeLabel)) {
               defaultAvailabilityToggleLabel = locationGroupedWorkDisplaySettings.superScopeLabel;
          } else if (libraryGroupedWorkDisplaySettings.superScopeLabel || isEmpty(libraryGroupedWorkDisplaySettings.superScopeLabel)) {
               defaultAvailabilityToggleLabel = libraryGroupedWorkDisplaySettings.superScopeLabel;
          }
     } else if (defaultAvailabilityToggleValue === 'local') {
          if (locationGroupedWorkDisplaySettings.localLabel || isEmpty(locationGroupedWorkDisplaySettings.localLabel)) {
               defaultAvailabilityToggleLabel = locationGroupedWorkDisplaySettings.localLabel;
          } else if (libraryGroupedWorkDisplaySettings.localLabel || isEmpty(libraryGroupedWorkDisplaySettings.localLabel)) {
               defaultAvailabilityToggleLabel = libraryGroupedWorkDisplaySettings.localLabel;
          }
     } else if (defaultAvailabilityToggleValue === 'available') {
          if (locationGroupedWorkDisplaySettings.availableLabel || isEmpty(locationGroupedWorkDisplaySettings.availableLabel)) {
               defaultAvailabilityToggleLabel = locationGroupedWorkDisplaySettings.availableLabel;
          } else if (libraryGroupedWorkDisplaySettings.availableLabel || isEmpty(libraryGroupedWorkDisplaySettings.availableLabel)) {
               defaultAvailabilityToggleLabel = libraryGroupedWorkDisplaySettings.availableLabel;
          }
     } else if (defaultAvailabilityToggleValue === 'available_online') {
          if (locationGroupedWorkDisplaySettings.availableOnlineLabel || isEmpty(locationGroupedWorkDisplaySettings.availableOnlineLabel)) {
               defaultAvailabilityToggleLabel = locationGroupedWorkDisplaySettings.availableOnlineLabel;
          } else if (libraryGroupedWorkDisplaySettings.availableOnlineLabel || isEmpty(libraryGroupedWorkDisplaySettings.availableOnlineLabel)) {
               defaultAvailabilityToggleLabel = libraryGroupedWorkDisplaySettings.availableOnlineLabel;
          }
     }

     return (
          <ButtonGroup space="sm" vertical>
               {defaults.map((obj, index) => {
                    if (obj['field'] === 'availability_toggle') {
                         const label = obj['label'] + ': ' + defaultAvailabilityToggleLabel;
                         return (
                              <Button
                                   key={index}
                                   size="sm"
                                   variant="outline"
                                   borderColor={colorMode === 'light' ? '$trueGray300' : '$warmGray400'}
                                   onPress={() => {
                                        navigation.push('modal', {
                                             screen: 'Facet',
                                             params: {
                                                  navigation: navigation,
                                                  key: obj['field'],
                                                  title: obj['label'],
                                                  facets: SearchGlobal.availableFacets[obj['label']].facets,
                                                  pendingUpdates: [],
                                                  extra: obj,
                                             },
                                        });
                                   }}>
                                   <ButtonText color={textColor}>{label}</ButtonText>
                              </Button>
                         );
                    }

                    return (
                         <Button
                              key={index}
                              size="sm"
                              variant="outline"
                              borderColor={colorMode === 'light' ? theme.tokens.colors.primary['400'] : '$warmGray400'}
                              onPress={() => {
                                   navigation.push('modal', {
                                        screen: 'Facet',
                                        params: {
                                             navigation: navigation,
                                             key: obj['field'],
                                             title: obj['label'],
                                             facets: SearchGlobal.availableFacets[obj['label']].facets,
                                             pendingUpdates: [],
                                             extra: obj,
                                        },
                                   });
                              }}>
                              <ButtonText color={textColor}>{obj['label']}</ButtonText>
                         </Button>
                    );
               })}
          </ButtonGroup>
     );
};

const CreateFilterButton = ({navigation}) => {
     const { currentSource } = React.useContext(SearchContext);
     const { theme, colorMode, textColor } = useTheme();
     const appliedFacets = SearchGlobal.appliedFilters;
     const sort = find(appliedFacets['Sort By'], {
          field: 'sort_by',
          value: 'relevance' });

     if ((size(appliedFacets) > 0 && size(sort) === 0) || (size(appliedFacets) >= 1 && size(sort) > 1) || (size(appliedFacets) >= 1 && currentSource === 'events')) {
          console.log("using applied filters bar")
          return (
               <ButtonGroup space="sm" vertical>
                    {map(appliedFacets, function (item, index, collection) {
                         const cluster = filter(SearchGlobal.availableFacets, ['field', item[0]['field']]);
                         let labels = '';
                         forEach(item, function (value, key) {
                              let label = value['display'];
                              if (item[0].field === 'sort_by') {
                                   label = getSortLabel(label);
                              }
                              if (labels.length === 0) {
                                   labels = labels.concat(String(label ?? ''));
                              } else {
                                   labels = labels.concat(', ', String(label ?? ''));
                              }
                         });
                         const label = truncate(index + ': ' + labels);
                         return (
                              <Button
                                   variant="outline"
                                   size="sm"
                                   key={index}
                                   borderColor={colorMode === 'light' ? '$trueGray300' : '$warmGray400'}
                                   onPress={() => {
                                        navigation.push('modal', {
                                             screen: 'Facet',
                                             params: {
                                                  data: item,
                                                  navigation,
                                                  defaultValues: [],
                                                  key: item[0]['field'],
                                                  title: cluster[0]['label'],
                                                  facets: item[0]['facets'],
                                                  pendingUpdates: [],
                                                  extra: cluster[0],
                                             },
                                        });
                                   }}>
                                   <ButtonText color={textColor}>{label}</ButtonText>
                              </Button>
                         );
                    })}
               </ButtonGroup>
          );
     }

     return <CreateFilterButtonDefaults navigation={navigation} />;
};

async function fetchSearchResults(term, page, scope, url, type, id, language, index, source, barcodeType) {
     const client = createApiClient({
          url,
          timeout: GLOBALS.timeoutFast,
          language });

     const params = {
          library: scope ?? null,
          lookfor: term ?? null,
          pageSize: 25,
          page: page ?? 1,
          type: type ?? 'catalog',
          id,
          language,
          includeSortList: true,
          source,
          searchIndex: index,
          barcodeType };

     logDebugMessage('fetchSearchResults: ' + SearchGlobal.appendedParams);

     const endpoint = '/SearchAPI?method=searchLite' + SearchGlobal.appendedParams;
     const results = await client.post(endpoint, {}, { params });

     const data = results.ok ? (results.data ?? {}) : {};

     let morePages = true;
     if (data.result?.page_current === data.result?.page_total) {
          morePages = false;
     } else if (data.result?.page_total === 1) {
          morePages = false;
     }

     SearchGlobal.id = data?.result?.id ?? null;
     SearchGlobal.sortMethod = data?.result?.sort ?? '';
     SearchGlobal.term = data?.result?.lookfor ?? '';
     SearchGlobal.availableFacets = data?.result?.options ?? [];

     await getSortList(url, language);
     await getAvailableFacetsKeys(url, language);
     await getAppliedFilters(url, language);

     setDefaultFacets(data?.result?.options ?? []);

     return {
          results: data.result?.items ?? [],
          totalResults: data.result?.totalResults ?? 0,
          curPage: data.result?.page_current ?? 0,
          totalPages: data.result?.page_total ?? 0,
          hasMore: morePages,
          source: data?.result?.searchSource ?? 'local',
          index: data?.result?.searchIndex ?? 'Keyword',
          term,
          message: data.data?.message ?? null,
          error: data.data?.error?.message ?? false };
}

function getSortLabel(payload = '') {
     let label = payload;
     if (payload) {
          if (payload === 'year desc,title asc') {
               label = 'Publication Year Desc';
          } else if (payload === 'relevance') {
               label = 'Best Match';
          } else if (payload === 'author asc,title asc') {
               label = 'Author';
          } else if (payload === 'title') {
               label = 'Title';
          } else if (payload === 'days_since_added asc') {
               label = 'Date Purchased Desc';
          } else if (payload === 'sort_callnumber') {
               label = 'Call Number';
          } else if (payload === 'sort_popularity') {
               label = 'Total Checkouts';
          } else if (payload === 'sort_rating') {
               label = 'User Rating';
          } else if (payload === 'total_holds desc') {
               label = 'Number of Holds';
          }
     }
     return label;
}
