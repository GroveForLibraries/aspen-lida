import { useNavigation, useNavigationState, StackActions } from '@react-navigation/native';
import _ from 'lodash';
import React from 'react';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { SearchContext } from '../../context/initialContext';
import { useLibraryLocation } from '../../hooks/useLibraryBranchData';
import { navigateStack } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { SearchGlobal } from '../../util/globals';
import { buildParamsForUrl } from '../../util/api/searchHelper';
import { UnsavedChangesExit } from './UnsavedChanges';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedMaterialCommunityIcons as MaterialCommunityIcons, ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedInputSlot as InputSlot } from '../../components/themed/ThemedFormControls';

/**
 * FiltersScreen component that displays the search filters and allows users to modify their search criteria. It provides options to select search indexes, sources, and various facets, as well as buttons to update or reset the search.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const FiltersScreen = () => {
     const [isLoading] = React.useState(false);
     const navigation = useNavigation();
     const [loading, setLoading] = React.useState(false);
     const library = useLibrary();
     const location = useLibraryLocation();
     const language = useActiveLanguage();
     const { currentIndex, currentSource } = React.useContext(SearchContext);
     const { neutralPairs, colorMode } = useTheme();
     const insets = useSafeAreaInsets();
     const pendingFiltersFromParams = useNavigationState((state) => state.routes[0]['params']['pendingFilters']);
     const [searchTerm, setSearchTerm] = React.useState(SearchGlobal.term ?? '');

     let facets = SearchGlobal.availableFacets ? Object.keys(SearchGlobal.availableFacets) : [];
     let pendingFilters = SearchGlobal.pendingFilters ?? [];
     React.useEffect(() => {
          if (pendingFilters !== pendingFiltersFromParams) {
               navigation.setOptions({
                    headerRight: () => <UnsavedChangesExit language={language} updateSearch={updateSearch} discardChanges={discardChanges} prevRoute="SearchScreen" /> });
          }
     }, [pendingFilters, pendingFiltersFromParams, language]);

     const locationGroupedWorkDisplaySettings = location?.groupedWorkDisplaySettings ?? [];
     const libraryGroupedWorkDisplaySettings = library?.groupedWorkDisplaySettings ?? [];

     const renderFilter = (label, index) => {
          return (
               <Pressable key={index} className="py-5" style={{ borderBottomWidth: 1, borderColor: colorMode === 'light' ? 'rgba(107, 114, 128, 0.25)' : 'rgba(214, 211, 209, 0.25)' }} onPress={() => openCluster(label)}>
                    <VStack style={{ alignContent: 'center' }}>
                         <HStack style={{ justifyContent: 'space-between', alignItems: 'center', alignContent: 'center', width: '100%' }}>
                              <VStack>
                                   <Text bold>{label}</Text>
                                   {appliedFacet(label)}
                              </VStack>
                              <MaterialIcons name="chevron-right" size={26} color={colorMode === 'light' ? neutralPairs.actionableIndicator.light : neutralPairs.actionableIndicator.dark} />
                         </HStack>
                    </VStack>
               </Pressable>
          );
     };

     const appliedFacet = (cluster) => {
          const facetData = _.filter(SearchGlobal.availableFacets, ['label', cluster]);
          const pendingFacets = _.filter(pendingFilters, ['field', facetData[0]['field']]);
          let text = '';
          if (_.isObjectLike(SearchGlobal.appliedFilters) && !_.isUndefined(SearchGlobal.appliedFilters[cluster])) {
               const facet = SearchGlobal.appliedFilters[cluster];
               _.forEach(facet, function (item) {
                    if (text.length === 0) {
                         text = text.concat(_.toString(item['display']));
                    } else {
                         text = text.concat(', ', _.toString(item['display']));
                    }
               });
          }

          let pendingText = '';
          if (!_.isUndefined(pendingFacets[0])) {
               const obj = pendingFacets[0]['facets'];
               _.forEach(obj, function (value) {
                    if (value === 'year desc,title asc') {
                         value = getTermFromDictionary(language, 'year_desc_title_asc');
                    } else if (value === 'relevance') {
                         value = getTermFromDictionary(language, 'relevance');
                    } else if (value === 'author asc,title asc') {
                         value = getTermFromDictionary(language, 'author');
                    } else if (value === 'title') {
                         value = getTermFromDictionary(language, 'title');
                    } else if (value === 'days_since_added asc') {
                         value = getTermFromDictionary(language, 'date_purchased_desc');
                    } else if (value === 'callnumber_sort') {
                         value = getTermFromDictionary(language, 'callnumber_sort');
                    } else if (value === 'popularity desc') {
                         value = getTermFromDictionary(language, 'total_checkouts');
                    } else if (value === 'rating desc') {
                         value = getTermFromDictionary(language, 'rating_desc');
                    } else if (value === 'total_holds desc') {
                         value = getTermFromDictionary(language, 'total_holds_desc');
                    } else if (value === 'global') {
                         if (locationGroupedWorkDisplaySettings.superScopeLabel || _.isEmpty(locationGroupedWorkDisplaySettings.superScopeLabel)) {
                              value = locationGroupedWorkDisplaySettings.superScopeLabel;
                         } else if (libraryGroupedWorkDisplaySettings.superScopeLabel || _.isEmpty(libraryGroupedWorkDisplaySettings.superScopeLabel)) {
                              value = libraryGroupedWorkDisplaySettings.superScopeLabel;
                         }
                    } else if (value === 'local') {
                         if (locationGroupedWorkDisplaySettings.localLabel || _.isEmpty(locationGroupedWorkDisplaySettings.localLabel)) {
                              value = locationGroupedWorkDisplaySettings.localLabel;
                         } else if (libraryGroupedWorkDisplaySettings.localLabel || _.isEmpty(libraryGroupedWorkDisplaySettings.localLabel)) {
                              value = libraryGroupedWorkDisplaySettings.localLabel;
                         }
                    } else if (value === 'available') {
                         if (locationGroupedWorkDisplaySettings.availableLabel || _.isEmpty(locationGroupedWorkDisplaySettings.availableLabel)) {
                              value = locationGroupedWorkDisplaySettings.availableLabel;
                         } else if (libraryGroupedWorkDisplaySettings.availableLabel || _.isEmpty(libraryGroupedWorkDisplaySettings.availableLabel)) {
                              value = libraryGroupedWorkDisplaySettings.availableLabel;
                         }
                    } else if (value === 'available_online') {
                         if (locationGroupedWorkDisplaySettings.availableOnlineLabel || _.isEmpty(locationGroupedWorkDisplaySettings.availableOnlineLabel)) {
                              value = locationGroupedWorkDisplaySettings.availableOnlineLabel;
                         } else if (libraryGroupedWorkDisplaySettings.availableOnlineLabel || _.isEmpty(libraryGroupedWorkDisplaySettings.availableOnlineLabel)) {
                              value = libraryGroupedWorkDisplaySettings.availableOnlineLabel;
                         }
                    } else {
                         // do nothing
                    }
                    if (pendingText.length === 0) {
                         pendingText = pendingText.concat(_.toString(value));
                    } else {
                         pendingText = pendingText.concat(', ', _.toString(value));
                    }
               });
          }

          if (!_.isEmpty(text) || !_.isEmpty(pendingText)) {
               if (!_.isEmpty(pendingText) && _.isEmpty(text)) {
                   return <Text italic>{pendingText}</Text>;
               } else if (!_.isEmpty(pendingText) && !_.isEmpty(text)) {
                   return <Text italic>{pendingText}</Text>;
               } else {
                   return <Text>{text}</Text>;
               }
          } else {
               return null;
          }
     };

     const actionButtons = () => {
          return (
               <Box style={{ paddingTop: 10, paddingBottom: insets.bottom }}>
                    <Center>
                         <ButtonGroup>
                              <Button colorScheme="primary" variant="link" onPress={() => clearSelections()}>
                                   <ButtonText>{getTermFromDictionary(language, 'reset_all')}</ButtonText>
                              </Button>
                              <Button
                                   colorScheme="primary"
                                   isDisabled={loading}
                                   onPress={() => {
                                        setLoading(true);
                                        updateSearch();
                                   }}>
                                   <ButtonText>{loading ? getTermFromDictionary(language, 'updating', true) : getTermFromDictionary(language, 'update')}</ButtonText>
                              </Button>
                         </ButtonGroup>
                    </Center>
               </Box>
          );
     };

     const openCluster = (cluster) => {
          const obj = SearchGlobal.availableFacets[cluster];
          navigation.navigate('Facet', {
               data: cluster,
               defaultValues: [],
               title: obj['label'],
               key: obj['value'],
               term: '',
               facets: obj.facets,
               pendingUpdates: [],
               extra: obj });
     };

     const openSearchSources = () => {
          navigation.navigate('SearchSource');
     };

     const openSearchIndexes = () => {
          navigation.navigate('SearchIndex');
     };

     const updateSearch = () => {
          const params = buildParamsForUrl();
          SearchGlobal.hasPendingChanges = false;

          // Store updated params in SearchGlobal for SearchResults to pick up
          SearchGlobal.pendingParams = params;

          // Pop the modal screen to close it
          // The parent navigator (BrowseStackNavigator) will dismiss the modal
          const parentNav = navigation.getParent();
          parentNav.dispatch(StackActions.pop());
     };

     const discardChanges = () => {
          SearchGlobal.hasPendingChanges = false;
          SearchGlobal.appliedFilters = [];
          SearchGlobal.sortMethod = 'relevance';
          SearchGlobal.availableFacets = [];
          SearchGlobal.pendingFilters = [];
          SearchGlobal.appendedParams = '';

          navigation.navigate('BrowseTab', {
               screen: 'SearchResults',
               params: {
                    term: SearchGlobal.term,
                    pendingParams: '' } });
     };

     const clearSelections = () => {
          SearchGlobal.hasPendingChanges = false;
          SearchGlobal.appliedFilters = [];
          SearchGlobal.sortMethod = 'relevance';
          SearchGlobal.availableFacets = [];
          SearchGlobal.pendingFilters = [];
          SearchGlobal.appendedParams = '';

          navigation.navigate('BrowseTab', {
               screen: 'SearchResults',
               params: {
                    term: SearchGlobal.term,
                    pendingParams: '' } });
     };

     const clearSearch = () => {
          setSearchTerm('');
     };

     const openScanner = async () => {
          navigateStack('BrowseTab', 'Scanner');
     };

     const search = async () => {
          navigateStack('BrowseTab', 'SearchResults', {
               term: searchTerm,
               type: 'catalog',
               prevRoute: 'DiscoveryScreen',
               scannerSearch: false });
     };

     const getSearchIndexLabel = () => {
          if (currentIndex === 'Title') {
               return getTermFromDictionary(language, 'title');
          } else if (currentIndex === 'StartOfTitle') {
               return getTermFromDictionary(language, 'start_of_title');
          } else if (currentIndex === 'Series') {
               return getTermFromDictionary(language, 'series');
          } else if (currentIndex === 'Author') {
               return getTermFromDictionary(language, 'author');
          } else if (currentIndex === 'Subject') {
               return getTermFromDictionary(language, 'subject');
          } else if (currentIndex === 'LocalCallNumber') {
               return getTermFromDictionary(language, 'local_call_number');
          } else {
               return getTermFromDictionary(language, 'keyword');
          }
     };

     const getSearchSourceLabel = () => {
          if (currentSource === 'events') {
               return getTermFromDictionary(language, 'events');
          } else {
               return getTermFromDictionary(language, 'library_catalog');
          }
     };

     return (
          <ScreenContainer>
               <ScrollView>
                    <Box className="py-5">
                         <VStack space="md">
                              <FormControl>
                                   <Input variant="outline">
                                        <InputSlot>
                                             <MaterialIcons name="search" size={20} className="ml-2" />
                                        </InputSlot>
                                        <InputField returnKeyType="search" autoCapitalize="none" onChangeText={(term) => setSearchTerm(term)} placeholder={getTermFromDictionary(language, 'search')} onSubmitEditing={search} value={searchTerm} />
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
                         </VStack>

                         {!isLoading ? (
                              <>
                                   <Pressable key={0} className="py-5" style={{ borderBottomWidth: 1, borderColor: colorMode === 'light' ? 'rgba(107, 114, 128, 0.25)' : 'rgba(214, 211, 209, 0.25)' }} onPress={() => openSearchIndexes()}>
                                        <VStack style={{ alignContent: 'center' }}>
                                             <HStack style={{ justifyContent: 'space-between', alignItems: 'center', alignContent: 'center', width: '100%' }}>
                                                  <VStack>
                                                       <Text bold>
                                                            {getTermFromDictionary(language, 'search_by')}
                                                       </Text>
                                                       <Text italic>
                                                            {getSearchIndexLabel()}
                                                       </Text>
                                                  </VStack>
                                                  <MaterialIcons name="chevron-right" size={26} color={colorMode === 'light' ? neutralPairs.actionableIndicator.light : neutralPairs.actionableIndicator.dark} />
                                             </HStack>
                                        </VStack>
                                   </Pressable>
                                   <Pressable key={1} className="py-5" style={{ borderBottomWidth: 1, borderColor: colorMode === 'light' ? 'rgba(107, 114, 128, 0.25)' : 'rgba(214, 211, 209, 0.25)' }} onPress={() => openSearchSources()}>
                                        <VStack style={{ alignContent: 'center' }}>
                                             <HStack style={{ justifyContent: 'space-between', alignItems: 'center', alignContent: 'center', width: '100%' }}>
                                                  <VStack>
                                                       <Text bold>
                                                            {getTermFromDictionary(language, 'search_in')}
                                                       </Text>
                                                       <Text italic>
                                                            {getSearchSourceLabel()}
                                                       </Text>
                                                  </VStack>
                                                  <MaterialIcons name="chevron-right" size={26} color={colorMode === 'light' ? neutralPairs.actionableIndicator.light : neutralPairs.actionableIndicator.dark} />
                                             </HStack>
                                        </VStack>
                                   </Pressable>
                              </>
                         ) : null}
                         {!isLoading ? (
                              facets.map((item, index) => renderFilter(item, index))
                         ) : (
                              <Box className="mt-5">
                                   <LoadingSpinner />
                              </Box>
                         )}
                    </Box>
               </ScrollView>
               {actionButtons()}
          </ScreenContainer>
     );
};
