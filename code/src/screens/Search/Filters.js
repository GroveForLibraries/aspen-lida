import { useNavigation, useNavigationState, StackActions } from '@react-navigation/native';
import { filter, forEach, isEmpty, isObjectLike } from '../../helpers/helpers';
import React from 'react';
import {
    Box,
    Button,
    ButtonText,
    ButtonGroup,
    Center,
    FormControl,
    HStack,
    Icon,
    Input,
    InputField,
    InputIcon,
    InputSlot,
    Pressable,
    ScrollView,
    Text,
    View,
    VStack,
    ChevronRightIcon
} from '@gluestack-ui/themed';
import { LoadingSpinner } from '../../components/loadingSpinner';

import { SearchContext } from '../../context/initialContext';
import { useLibraryLocation } from '../../hooks/useLibraryBranchData';
import { navigateStack } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';

// custom components and helper files
import { SearchGlobal } from '../../util/globals';
import { buildParamsForUrl } from '../../util/api/searchHelper';
import { UnsavedChangesExit } from './UnsavedChanges';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { ScanBarcode, SearchIcon, XIcon } from 'lucide-react-native';

export const FiltersScreen = () => {
     const [isLoading, setIsLoading] = React.useState(false);
     const navigation = useNavigation();
     const [loading, setLoading] = React.useState(false);
     const library = useLibrary();
     const location = useLibraryLocation();
     const language = useActiveLanguage();
     const { currentIndex, currentSource } = React.useContext(SearchContext);
     const {theme, textColor, colorMode } = useTheme();
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
               <Pressable key={index} borderBottomWidth="$1" borderColor={colorMode === 'light' ? "$coolGray200" : "$warmGray600"} py="$5" onPress={() => openCluster(label)}>
                    <VStack alignContent="center">
                         <HStack justifyContent="space-between" alignItems="center" alignContent="center">
                              <VStack>
                                   <Text bold color={textColor}>{label}</Text>
                                   {appliedFacet(label)}
                              </VStack>
                              <ChevronRightIcon color={textColor} />
                         </HStack>
                    </VStack>
               </Pressable>
          );
     };

     const appliedFacet = (cluster) => {
          const facetData = filter(SearchGlobal.availableFacets, ['label', cluster]);
          const pendingFacets = filter(pendingFilters, ['field', facetData[0]['field']]);
          let text = '';
          if (isObjectLike(SearchGlobal.appliedFilters) && SearchGlobal.appliedFilters[cluster] !== undefined) {
               const facet = SearchGlobal.appliedFilters[cluster];
               forEach(facet, function (item, key) {
                    if (text.length === 0) {
                         text = text.concat(String(item['display'] ?? ''));
                    } else {
                         text = text.concat(', ', String(item['display'] ?? ''));
                    }
               });
          }

          let pendingText = '';
          if (pendingFacets[0] !== undefined) {
               const obj = pendingFacets[0]['facets'];
               forEach(obj, function (value, key) {
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
                         if (locationGroupedWorkDisplaySettings.superScopeLabel || isEmpty(locationGroupedWorkDisplaySettings.superScopeLabel)) {
                              value = locationGroupedWorkDisplaySettings.superScopeLabel;
                         } else if (libraryGroupedWorkDisplaySettings.superScopeLabel || isEmpty(libraryGroupedWorkDisplaySettings.superScopeLabel)) {
                              value = libraryGroupedWorkDisplaySettings.superScopeLabel;
                         }
                    } else if (value === 'local') {
                         if (locationGroupedWorkDisplaySettings.localLabel || isEmpty(locationGroupedWorkDisplaySettings.localLabel)) {
                              value = locationGroupedWorkDisplaySettings.localLabel;
                         } else if (libraryGroupedWorkDisplaySettings.localLabel || isEmpty(libraryGroupedWorkDisplaySettings.localLabel)) {
                              value = libraryGroupedWorkDisplaySettings.localLabel;
                         }
                    } else if (value === 'available') {
                         if (locationGroupedWorkDisplaySettings.availableLabel || isEmpty(locationGroupedWorkDisplaySettings.availableLabel)) {
                              value = locationGroupedWorkDisplaySettings.availableLabel;
                         } else if (libraryGroupedWorkDisplaySettings.availableLabel || isEmpty(libraryGroupedWorkDisplaySettings.availableLabel)) {
                              value = libraryGroupedWorkDisplaySettings.availableLabel;
                         }
                    } else if (value === 'available_online') {
                         if (locationGroupedWorkDisplaySettings.availableOnlineLabel || isEmpty(locationGroupedWorkDisplaySettings.availableOnlineLabel)) {
                              value = locationGroupedWorkDisplaySettings.availableOnlineLabel;
                         } else if (libraryGroupedWorkDisplaySettings.availableOnlineLabel || isEmpty(libraryGroupedWorkDisplaySettings.availableOnlineLabel)) {
                              value = libraryGroupedWorkDisplaySettings.availableOnlineLabel;
                         }
                    } else {
                         // do nothing
                    }
                    if (pendingText.length === 0) {
                         pendingText = pendingText.concat(String(value ?? ''));
                    } else {
                         pendingText = pendingText.concat(', ', String(value ?? ''));
                    }
               });
          }

          if (!isEmpty(text) || !isEmpty(pendingText)) {
               if (!isEmpty(pendingText) && isEmpty(text)) {
                    return <Text italic color={textColor}>{pendingText}</Text>;
               } else if (!isEmpty(pendingText) && !isEmpty(text)) {
                    return <Text italic color={textColor}>{pendingText}</Text>;
               } else {
                    return <Text color={textColor}>{text}</Text>;
               }
          } else {
               return null;
          }
     };

     const actionButtons = () => {
          return (
               <Box p="$3" bgColor={colorMode === 'light' ? "$coolGray50" : "$coolGray700"}  shadowOpacity={0.2} shadowRadius={1}>
                    <Center>
                         <ButtonGroup size="lg">
                              <Button variant="link" onPress={() => clearSelections()}>
                                   <ButtonText color={theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'reset_all')}</ButtonText>
                              </Button>
                              <Button
                                   bgColor={theme.tokens.colors.primary['500']}
                                   isDisabled={loading}
                                   onPress={() => {
                                        setLoading(true);
                                        updateSearch();
                                   }}>
                                   <ButtonText color={theme.tokens.colors.primary['500-text']}>{loading ? getTermFromDictionary(language, 'updating', true) : getTermFromDictionary(language, 'update')}</ButtonText>
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
          <View style={{ flex: 1 }}>
               <ScrollView>
                    <Box p="$5">
                         <VStack space="md">
                              <FormControl>
                                   <Input borderColor={colorMode === 'light' ? '$coolGray500' : '$warmGray300'} color={textColor} variant="outline">
                                        <InputSlot>
                                             <InputIcon as={SearchIcon} name="search" color={textColor} ml="$2" />
                                        </InputSlot>
                                        <InputField returnKeyType="search" autoCapitalize="none" onChangeText={(term) => setSearchTerm(term)} placeholder={getTermFromDictionary(language, 'search')} onSubmitEditing={search} value={searchTerm} color={textColor} />
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
                         </VStack>

                         {!isLoading ? (
                              <>
                                   <Pressable key={0} borderBottomWidth="$1" borderColor={colorMode === 'light' ? '$coolGray200' : '$warmGray600'} py="$5" onPress={() => openSearchIndexes()}>
                                        <VStack alignContent="center">
                                             <HStack justifyContent="space-between" alignItems="center" alignContent="center">
                                                  <VStack>
                                                       <Text bold color={textColor}>
                                                            {getTermFromDictionary(language, 'search_by')}
                                                       </Text>
                                                       <Text italic color={textColor}>
                                                            {getSearchIndexLabel()}
                                                       </Text>
                                                  </VStack>
                                                  <ChevronRightIcon color={textColor} />
                                             </HStack>
                                        </VStack>
                                   </Pressable>
                                   <Pressable key={1} borderBottomWidth="$1" borderColor={colorMode === 'light' ? '$coolGray200' : '$warmGray600'} py="$5" onPress={() => openSearchSources()}>
                                        <VStack alignContent="center">
                                             <HStack justifyContent="space-between" alignItems="center" alignContent="center">
                                                  <VStack>
                                                       <Text bold color={textColor}>
                                                            {getTermFromDictionary(language, 'search_in')}
                                                       </Text>
                                                       <Text italic color={textColor}>
                                                            {getSearchSourceLabel()}
                                                       </Text>
                                                  </VStack>
                                                  <ChevronRightIcon color={textColor} />
                                             </HStack>
                                        </VStack>
                                   </Pressable>
                              </>
                         ) : null}
                         {!isLoading ? (
                              facets.map((item, index, array) => renderFilter(item, index))
                         ) : (
                              <Box mt="$5">
                                   <LoadingSpinner />
                              </Box>
                         )}
                    </Box>
               </ScrollView>
               {actionButtons()}
          </View>
     );
};
