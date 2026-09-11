import { CommonActions, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import _ from 'lodash';
import { ThemedMaterialCommunityIcons as MaterialCommunityIcons, ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import moment from 'moment';
import React from 'react';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { loadError } from '../../components/loadError';
import { popToast } from '@/src/components/feedback';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { DisplaySystemMessage } from '../../components/Notifications';
import { SearchContext, SystemMessagesContext } from '../../context/initialContext';
import { getCleanTitle } from '../../helpers/item';
import { useLibraryScope, useLibraryLocation } from '../../hooks/useLibraryBranchData';
import {navigate, navigateStack} from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { GLOBALS, SearchGlobal } from '../../util/globals';
import { decodeHTML, isValidUrl } from '../../helpers/helpers';
import { getAppliedFilters, getAvailableFacetsKeys, getSortList } from '../../util/api/search';
import { setDefaultFacets } from '../../util/api/searchHelper';
import AddToList from './AddToList';
import {logDebugMessage, logErrorMessage, logInfoMessage} from '../../util/logging';
import { createApiClient } from '../../util/api/apiFactory';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { ThemedBadge as Badge, ThemedBadgeText as BadgeText } from '../../components/themed/ThemedBadge';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedInputSlot as InputSlot } from '../../components/themed/ThemedFormControls';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { FlatList } from '@/components/ui/flat-list';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { ScreenContainer } from '@/src/components/ScreenContainer';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * SearchResults component that displays search results based on the provided search term, page number, and other parameters. It fetches data from the API and renders a list of results with pagination controls. It also handles system messages and error states.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SearchResults = () => {
     const navigation = useNavigation();
     const route = useRoute();
     const [page, setPage] = React.useState(1);
     const [storedTerm, setStoredTerm] = React.useState(SearchGlobal.term);
      const library = useLibrary();
      const language = useActiveLanguage();
      const scope = useLibraryScope();
      const { currentIndex, currentSource } = React.useContext(SearchContext);
     const { brand, neutrals, textColor } = useTheme();
     const url = library.baseUrl;
     const [paginationLabel, setPaginationLabel] = React.useState('Page 1 of 1');

     const queryClient = useQueryClient();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);

     let term = useRoute().params.term ?? '%';
     term = term.replace(/" "/g, '%20');

     let isScannerSearch = useRoute().params.scannerSearch ?? false;

     let params = useRoute().params.pendingParams ?? [];

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
          if (_.isArray(systemMessages)) {
               systemMessages.map((obj) => {
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
                if (SearchGlobal.pendingParams && !_.isEqual(SearchGlobal.pendingParams, params)) {
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
          const num = _.toInteger(data?.totalResults);
          if (num > 0) {
               let label = num + ' ' + getTermFromDictionary(language, 'results');
               if (num === 1) {
                    label = num + ' ' + getTermFromDictionary(language, 'result');
               }
               return (
                    <Box style={{ backgroundColor: neutrals.surfaceMuted, borderBottomWidth: 1, borderColor: neutrals.border }}>
                         <Box className="m-2">
                              <Text>{label}</Text>
                         </Box>
                    </Box>
               );
          }

          return null;
     };

     const Paging = () => {
          if (data.totalPages > 1) {
               return (
                    <Box className="px-4 py-2" style={{ borderTopWidth: 1, borderColor: neutrals.border, flexWrap: 'nowrap', alignItems: 'center' }}>
                         <ScrollView horizontal>
                              <ButtonGroup>
                                   <Button onPress={() => setPage(page - 1)} isDisabled={page === 1} size="sm" colorScheme="primary">
                                        <ButtonText>{getTermFromDictionary(language, 'previous')}</ButtonText>
                                   </Button>
                                   <Button
                                        colorScheme="primary"
                                        onPress={() => {
                                             if (!isPreviousData && data.hasMore) {
                                                  setPage(page + 1);
                                             }
                                        }}
                                        isDisabled={isPreviousData || !data.hasMore}
                                        size="sm">
                                        <ButtonText>{getTermFromDictionary(language, 'next')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ScrollView>
                         <Text className="mt-2" size="2xs">
                              {paginationLabel}
                         </Text>
                    </Box>
               );
          }

          return null;
     };

     const showSystemMessage = () => {
          if (_.isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
                    return null;
               });
          }
          return null;
     };

     const NoResults = () => {
          return (
               <>
                    {_.size(systemMessagesForScreen) > 0 ? <Box className="p-2">{showSystemMessage()}</Box> : null}
                    <Center className="flex-1">
                         <Heading className="pt-5">
                              {getTermFromDictionary(language, 'no_results')}
                         </Heading>
                         <Text bold className="w-[75%] text-center">
                              {route.params?.term}
                         </Text>
                    </Center>
               </>
          );
     };

     return (
          <ScreenContainer safeArea style={{ flex: 1 }}>
               {_.size(systemMessagesForScreen) > 0 ? <Box className="p-2">{showSystemMessage()}</Box> : null}
               {status === 'loading' || isFetching ? (
                    <LoadingSpinner />
               ) : status === 'error' ? (
                    loadError('Error', '')
               ) : (
                    <Box className="flex-1">
                         {data.totalResults > 0 ? <FilterBar navigation={navigation} /> : null}
                         <SearchBox term={term} navigation={navigation} />
                         <FlatList data={data.results} ListHeaderComponent={Header} ListFooterComponent={Paging} ListEmptyComponent={NoResults} renderItem={({ item }) => <DisplayResult data={item} />} keyExtractor={(item, index) => index.toString()} />
                    </Box>
               )}
          </ScreenContainer>
     );
};

const DisplayResult = (data) => {
     const item = data.data;
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals, textColor } = useTheme();
     const { currentSource } = React.useContext(SearchContext);
     const backgroundColor = neutrals.surface;

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
               <Badge key={n.key} colorScheme="secondary" variant="outline">
                    <BadgeText colorScheme="secondary">
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
          if (!_.isUndefined(item.registration_required)) {
               registrationRequired = item.registration_required;
          }

          const startTime = item.start_date.date;
          const endTime = item.end_date.date;

          let time1 = startTime.split(' ');
          let day = time1[0];
          let time2 = endTime.split(' ');

          let time1arr = time1[1].split(':');
          let time2arr = time2[1].split(':');

          let displayDay = moment(day);
          let displayStartTime = moment().set({ hour: time1arr[0], minute: time1arr[1] });
          let displayEndTime = moment().set({ hour: time2arr[0], minute: time2arr[1] });

          displayDay = moment(displayDay).format('dddd, MMMM D, YYYY');
          displayStartTime = moment(displayStartTime).format('h:mm A');
          displayEndTime = moment(displayEndTime).format('h:mm A');

          let locationData = item?.location ?? [];
          let roomData = item?.room ?? null;

          return (
               <Pressable className="pl-4 pr-5 py-2" style={{ borderBottomWidth: 1, borderColor: neutrals.border }} onPress={handlePressItem}>
                    <HStack space="md">
                         <VStack className="w-25">
                              <Box className="h-[150px]">
                                   <Image
                                        alt={item.title}
                                        source={url}
                                        className="rounded"
                                        style={{ width: '100%', height: '100%' }}
                                        placeholder={blurhash}
                                        transition={1000}
                                        contentFit="cover"
                                   />
                              </Box>
                              {item.canAddToList ? <AddToList source="Events" itemId={item.key} btnStyle="sm" /> : null}
                         </VStack>
                         <VStack className="w-[65%] pt-1">
                              <Text bold className="pb-1" size="sm">
                                   {decodeHTML(item.title)}
                              </Text>
                              {item.start_date && item.end_date ? (
                                   <>
                                        <Text size="xs">
                                             {displayDay}
                                        </Text>
                                        <Text size="xs">
                                             {displayStartTime} - {displayEndTime}
                                        </Text>
                                   </>
                              ) : null}
                              {locationData.name ? (
                                   <Text size="xs">
                                        {locationData.name}
                                   </Text>
                              ) : null}
                              {registrationRequired ? (
                                   <HStack space="xs" className="mt-4 flex-row flex-wrap">
                                        <Badge key={0} colorScheme="secondary" variant="outline">
                                             <BadgeText colorScheme="secondary" className="text-xs">
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
          <Pressable className="pl-4 pr-5 py-2" style={{ borderBottomWidth: 1, borderColor: neutrals.border }} onPress={handlePressItem}>
               <HStack space="md">
                    <VStack className="w-25">
                         <Box className="h-[150px]">
                              <Image
                                   alt={item.title}
                                   source={url}
                                   className="rounded"
                                   style={{ width: '100%', height: '100%' }}
                                   placeholder={blurhash}
                                   transition={1000}
                                   contentFit="cover"
                              />
                         </Box>
                         {item.language ? (
                              <Center className="mt-1">
                                   <Badge
                                        size="sm"
                                        style={{ backgroundColor: neutrals.surfaceMuted }}>
                                        <BadgeText style={{ color: neutrals.iconMuted, fontSize: 10, textAlign: 'center' }}>
                                             {item.language}
                                        </BadgeText>
                                   </Badge>
                              </Center>
                         ) : null}
                         <AddToList itemId={item.key} btnStyle="sm" />
                    </VStack>
                    <VStack className="w-[65%] pt-1">
                         <Text bold className="pb-1" size="sm">
                              {item.title}
                         </Text>
                         {item.author ? (
                              <Text size="xs">
                                   {getTermFromDictionary(language, 'by')} {item.author}
                              </Text>
                         ) : null}
                         <HStack space="xs" className="mt-4 flex-row flex-wrap">
                              {_.compact(_.map(formats, getFormat))}
                         </HStack>
                    </VStack>
               </HStack>
          </Pressable>
     );
};

const FilterBar = ({ navigation }) => {
     const language = useActiveLanguage();
     const { brand, neutrals } = useTheme();
     const type = useRoute().params.type ?? 'catalog';

     if (navigation === undefined) {
          logErrorMessage("Navigation is undefined in Filter Bar");
          return null;
     }
     if (type === 'catalog') {
          return (
               <Box className="p-2 pb-0" style={{ backgroundColor: neutrals.surface, borderColor: neutrals.border, flexWrap: 'nowrap' }}>
                    <ScrollView horizontal>
                         <Button
                              size="sm"
                              variant="solid"
                              colorScheme="primary"
                              className="mr-1"
                              onPress={() => {
                                   navigation.push('modal', {
                                        screen: 'Filters',
                                        params: {
                                             pendingUpdates: [],
                                        },
                                   });
                              }}>
                              <MaterialCommunityIcons name="tune" size={18} color={brand.primary['500-text']} className="mr-1" />
                              <ButtonText>{getTermFromDictionary(language, 'filters')}</ButtonText>
                         </Button>
                         <CreateFilterButton navigation={navigation} />
                    </ScrollView>
               </Box>
          );
     }
};

const SearchBox = ({term, navigation}) => {
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
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
          <Box className="p-2" style={{ backgroundColor: neutrals.surface, borderColor: neutrals.border, borderBottomWidth: 1 }}>
               <FormControl>
                    <Input>
                         <InputSlot>
                              <MaterialIcons name="search" size={20} className="ml-2" />
                         </InputSlot>
                         <InputField returnKeyType="search" variant="outline" autoCapitalize="none" onChangeText={(term) => setSearchTerm(term)} placeholder={getTermFromDictionary(language, 'search')} onSubmitEditing={updateSearch} value={searchTerm} />
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
          </Box>
     );
}

const CreateFilterButtonDefaults = ({navigation}) => {
     const defaults = SearchGlobal.defaultFacets;
     const location = useLibraryLocation();
     const library = useLibrary();
     const { neutrals, brand, textColor } = useTheme();

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
          if (locationGroupedWorkDisplaySettings.superScopeLabel || _.isEmpty(locationGroupedWorkDisplaySettings.superScopeLabel)) {
               defaultAvailabilityToggleLabel = locationGroupedWorkDisplaySettings.superScopeLabel;
          } else if (libraryGroupedWorkDisplaySettings.superScopeLabel || _.isEmpty(libraryGroupedWorkDisplaySettings.superScopeLabel)) {
               defaultAvailabilityToggleLabel = libraryGroupedWorkDisplaySettings.superScopeLabel;
          }
     } else if (defaultAvailabilityToggleValue === 'local') {
          if (locationGroupedWorkDisplaySettings.localLabel || _.isEmpty(locationGroupedWorkDisplaySettings.localLabel)) {
               defaultAvailabilityToggleLabel = locationGroupedWorkDisplaySettings.localLabel;
          } else if (libraryGroupedWorkDisplaySettings.localLabel || _.isEmpty(libraryGroupedWorkDisplaySettings.localLabel)) {
               defaultAvailabilityToggleLabel = libraryGroupedWorkDisplaySettings.localLabel;
          }
     } else if (defaultAvailabilityToggleValue === 'available') {
          if (locationGroupedWorkDisplaySettings.availableLabel || _.isEmpty(locationGroupedWorkDisplaySettings.availableLabel)) {
               defaultAvailabilityToggleLabel = locationGroupedWorkDisplaySettings.availableLabel;
          } else if (libraryGroupedWorkDisplaySettings.availableLabel || _.isEmpty(libraryGroupedWorkDisplaySettings.availableLabel)) {
               defaultAvailabilityToggleLabel = libraryGroupedWorkDisplaySettings.availableLabel;
          }
     } else if (defaultAvailabilityToggleValue === 'available_online') {
          if (locationGroupedWorkDisplaySettings.availableOnlineLabel || _.isEmpty(locationGroupedWorkDisplaySettings.availableOnlineLabel)) {
               defaultAvailabilityToggleLabel = locationGroupedWorkDisplaySettings.availableOnlineLabel;
          } else if (libraryGroupedWorkDisplaySettings.availableOnlineLabel || _.isEmpty(libraryGroupedWorkDisplaySettings.availableOnlineLabel)) {
               defaultAvailabilityToggleLabel = libraryGroupedWorkDisplaySettings.availableOnlineLabel;
          }
     }

     return (
          <ButtonGroup space="sm">
               {defaults.map((obj, index) => {
                    if (obj['field'] === 'availability_toggle') {
                         const label = obj['label'] + ': ' + defaultAvailabilityToggleLabel;
                         return (
                              <Button
                                   key={index}
                                   size="sm"
                                   variant="outline"
                                   style={{ borderColor: neutrals.border }}
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
                                   <ButtonText style={{ color: textColor }}>{label}</ButtonText>
                              </Button>
                         );
                    }

                    return (
                         <Button
                              key={index}
                              size="sm"
                              variant="outline"
                              colorScheme="primary"
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
                              <ButtonText>{obj['label']}</ButtonText>
                         </Button>
                    );
               })}
          </ButtonGroup>
     );
};

const CreateFilterButton = ({navigation}) => {
     const { currentSource } = React.useContext(SearchContext);
     const { neutrals, textColor } = useTheme();
     const appliedFacets = SearchGlobal.appliedFilters;
     const sort = _.find(appliedFacets['Sort By'], {
          field: 'sort_by',
          value: 'relevance' });

     if ((_.size(appliedFacets) > 0 && _.size(sort) === 0) || (_.size(appliedFacets) >= 1 && _.size(sort) > 1) || (_.size(appliedFacets) >= 1 && currentSource === 'events')) {
          console.log("using applied filters bar")
          return (
               <ButtonGroup space="sm">
                    {_.map(appliedFacets, function (item, index) {
                         const cluster = _.filter(SearchGlobal.availableFacets, ['field', item[0]['field']]);
                         let labels = '';
                         _.forEach(item, function (value) {
                              let label = value['display'];
                              if (item[0].field === 'sort_by') {
                                   label = getSortLabel(label);
                              }
                              if (labels.length === 0) {
                                   labels = labels.concat(_.toString(label));
                              } else {
                                   labels = labels.concat(', ', _.toString(label));
                              }
                         });
                         const label = _.truncate(index + ': ' + labels);
                         return (
                              <Button
                                   variant="outline"
                                   size="sm"
                                   key={index}
                                   style={{ borderColor: neutrals.border }}
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
                                   <ButtonText style={{ color: textColor }}>{label}</ButtonText>
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
