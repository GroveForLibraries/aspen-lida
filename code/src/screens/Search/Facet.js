import _ from 'lodash';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import React from 'react';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedCheckboxGroup as CheckboxGroup } from '../../components/themed/ThemedCheckbox';
import { Pressable } from '@/components/ui/pressable';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { ThemedInput as Input, ThemedInputField as InputField } from '../../components/themed/ThemedFormControls';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { useTheme } from '../../themes/theme';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { LIBRARY, SearchGlobal } from '../../util/globals';
import { searchAvailableFacets } from '../../util/api/search';
import { addAppliedFilter, buildParamsForUrl, removeAppliedFilter } from '../../util/api/searchHelper';
import { logDebugMessage } from '../../util/logging.js';
import { Facet_Checkbox } from './Facets/Checkbox';
import { Facet_Date } from './Facets/Date';
import { Facet_RadioGroup } from './Facets/RadioGroup';
import { Facet_Rating } from './Facets/Rating';
import { Facet_Slider } from './Facets/Slider';
import { Facet_Year } from './Facets/Year';
import { UnsavedChangesExit } from './UnsavedChanges';

/**
 * Facet component that displays a list of facets for filtering search results. It handles user interaction to select facets, update the search results, and manage pending changes.
 * @param param0
 * @param param0.route
 * @param param0.navigation
 * @returns {React.JSX.Element}
 * @constructor
 */
export const Facet = ({ route, navigation }) => {
     const _isMounted = React.useRef(false);
     const [isLoading, setIsLoading] = React.useState(true);
     const [title] = React.useState(route.params?.extra['label'] ?? 'Filter');
     const [facets, setFacets] = React.useState(route.params?.facets ?? []);
     const [numFacets, setNumFacets] = React.useState(0);
     const [category] = React.useState(route.params?.extra['field'] ?? '');
     const [multiSelect] = React.useState(Boolean(route.params?.extra?.multiSelect));
     const [filterByQuery, setFilterByQuery] = React.useState('');
     const [isUpdating] = React.useState(false);
     const [values, setValues] = React.useState([]);
     const [valuesDefault, setValuesDefault] = React.useState([]);
     const [language] = React.useState(route.params?.language ?? 'en');
     const { neutrals } = useTheme();
     const headerIconColor = neutrals.actionableIndicator;
     const actionBarBackgroundColor = neutrals.surface;

     const preselectValues = () => {
          let newValues = [];
          const cluster = _.filter(SearchGlobal.pendingFilters, ['field', category]);
          _.map(cluster, function (item) {
               const facets = item['facets'];
               if (_.size(facets) > 0) {
                    _.forEach(facets, function (value) {
                         if (multiSelect) {
                              newValues = _.concat(newValues, value);
                         } else {
                              newValues = value;
                         }
                    });
               }
          });
          setValues(newValues);
          setValuesDefault(newValues);
     };

     React.useEffect(() => {
          _isMounted.current = true;

          const initData = async () => {
               const data = _.filter(SearchGlobal.availableFacets, ['field', category]);
               if (data[0]) {
                    setFacets(data[0]['facets']);
                    setNumFacets(_.size(data[0]['facets']));
               }

               preselectValues();
               setIsLoading(false);
          };

          initData();

          return () => {
               _isMounted.current = false;
          };
     }, []);

     const hasPendingChanges = React.useCallback(() => {
          const normalizedValues = Array.isArray(values) ? [...values].sort() : values;
          const normalizedDefaults = Array.isArray(valuesDefault) ? [...valuesDefault].sort() : valuesDefault;
          const hasLocalPendingChanges = !_.isEqual(normalizedValues, normalizedDefaults);
          return SearchGlobal.hasPendingChanges || hasLocalPendingChanges;
     }, [values, valuesDefault]);

     React.useLayoutEffect(() => {
          const routes = navigation.getState()?.routes;
          const prevRoute = routes[routes.length - 2];
          if (prevRoute) {
               navigation.setOptions({
                    headerBackVisible: false,
                    headerLeft: () => (
                         <Pressable
                              onPress={() => {
                                   updateGlobal();
                                   navigation.goBack();
                              }}
                              className="mr-3 p-1">
                              <Box>
                                   <MaterialIcons name="chevron-left" size={28} color={headerIconColor} />
                              </Box>
                         </Pressable>
                    ),
                    headerRight: () => (
                         <UnsavedChangesExit
                              updateSearch={updateSearch}
                              discardChanges={discardChanges}
                              prevRoute="Filters"
                              language={language}
                              hasPendingChanges={hasPendingChanges}
                         />
                    ),
               });
          } else {
               navigation.setOptions({
                    headerBackVisible: false,
                    headerLeft: () => <Box />,
                    headerRight: () => (
                         <UnsavedChangesExit
                              updateSearch={updateSearch}
                              discardChanges={discardChanges}
                              prevRoute="Filters"
                              language={language}
                              hasPendingChanges={hasPendingChanges}
                         />
                    ),
               });
          }
     }, [navigation, language, headerIconColor, hasPendingChanges]);

     const filterFacets = async () => {
          await searchAvailableFacets(category, title, filterByQuery, LIBRARY.url, language).then((result) => {
               if (result.success === false) {
                    setIsLoading(false);
               } else {
                    setFacets(result['facets']);
                    setNumFacets(_.size(result['facets']));
                    setIsLoading(false);
               }
          });
     };

     const searchBar = numFacets >= 0 ? (
          <Box className="py-5">
               <Input
                    size="lg"
                    variant="outline"
               >
                    <InputField
                         value={filterByQuery}
                         onChangeText={(text) => setFilterByQuery(text)}
                         autoCorrect={false}
                         returnKeyType="search"
                         placeholder={getTermFromDictionary(language, 'search') + ' ' + title}
                         onSubmitEditing={async () => {
                              setIsLoading(true);
                              await filterFacets();
                         }}
                    />
               </Input>
          </Box>
     ) : (
          <Box className="pb-5" />
     );

     const updateSearch = (resetFacetGroup = false, toFilters = false) => {
          const params = buildParamsForUrl();
          SearchGlobal.hasPendingChanges = false;
          SearchGlobal.pendingParams = params;
          if (toFilters) {
               navigation.navigate('Filters', {
                    term: SearchGlobal.term,
               });
          } else {
               navigation.getParent()?.goBack();
          }
     };

     const updateCheckboxFacet = (group, value, newValue) => {
          logDebugMessage('Updating facet ' + group + ' with value ' + value + ' to ' + newValue);
          if (values) {
               logDebugMessage('Existing values are ' + values);
          } else {
               logDebugMessage('No existing values');
          }
          let newValues = values;
          if (newValue) {
               newValues = [...values, value];
          } else {
               newValues = newValues.filter((n) => n !== value);
          }
          logDebugMessage('Updated values are ' + newValues);
          setValues(newValues);
          SearchGlobal.hasPendingChanges = true;
          updateGlobal(group, newValues);
     };

     const updateLocalValues = (group, newValues) => {
          setValues(newValues);
          logDebugMessage('Updating local values for ' + group + ' with values ' + newValues);
          SearchGlobal.hasPendingChanges = true;
          updateGlobal(group, newValues);
     };

     const updateGlobal = (group, newValues) => {
          logDebugMessage('Updating global values for ' + group + ' with values ' + newValues);
          if (group === 'sort_by') {
               SearchGlobal.sortMethod = newValues;
          } else {
               const prevSelections = values;
               addAppliedFilter(group, newValues, multiSelect);
               if (multiSelect) {
                    const difference = _.difference(prevSelections, newValues);
                    if (difference) {
                         removeAppliedFilter(group, difference);
                    }
               }
          }
     };

     const discardChanges = () => {
          SearchGlobal.hasPendingChanges = true;
          const difference = _.difference(values, valuesDefault);
          if (difference) {
               removeAppliedFilter(category, difference);
          }
          setValues([]);
     };

     const resetCluster = () => {
          SearchGlobal.hasPendingChanges = true;
          removeAppliedFilter(category, values);
          setValues([]);
          updateSearch();
     };

     const actionButtons = (
          <Box className="py-3" style={{ backgroundColor: actionBarBackgroundColor, shadowOpacity: 0.1, shadowRadius: 1 }}>
               <Center>
                    <ButtonGroup size="lg">
                         <Button colorScheme="primary" variant="link" onPress={resetCluster}>
                             <ButtonText>
                                   {getTermFromDictionary(language, 'reset')}
                              </ButtonText>
                         </Button>
                         <Button
                             colorScheme="primary"
                              isDisabled={isUpdating}
                              onPress={() => updateSearch()}
                         >
                             <ButtonText>
                                   {isUpdating ? getTermFromDictionary(language, 'updating', true) : getTermFromDictionary(language, 'update')}
                              </ButtonText>
                         </Button>
                    </ButtonGroup>
               </Center>
          </Box>
     );

     if (isLoading) {
          return <LoadingSpinner />;
     }

     if (category === 'publishDate' || category === 'birthYear' || category === 'deathYear' || category === 'publishDateSort') {
          return (
               <ScreenContainer flex={1}>
                    <ScrollView>
                         <Box className="py-5">
                              <Facet_Year category={category} updater={updateLocalValues} data={facets} language={language} />
                         </Box>
                    </ScrollView>
                    {actionButtons}
               </ScreenContainer>
          );
     } else if (category === 'start_date') {
          return (
               <ScreenContainer flex={1}>
                    <ScrollView>
                         <Box className="py-5">
                              <Facet_Date category={category} updater={updateLocalValues} data={facets} />
                         </Box>
                    </ScrollView>
                    {actionButtons}
               </ScreenContainer>
          );
     } else if (category === 'rating_facet') {
          return (
               <ScreenContainer flex={1}>
                    <ScrollView>
                         <Box className="py-5">
                              <Facet_Rating category={category} updater={updateLocalValues} data={facets} />
                         </Box>
                    </ScrollView>
                    {actionButtons}
               </ScreenContainer>
          );
     } else if (category === 'lexile_score' || category === 'accelerated_reader_point_value' || category === 'accelerated_reader_reading_level') {
          return (
               <ScreenContainer flex={1}>
                    <ScrollView>
                         <Box className="py-5">
                              <Facet_Slider category={category} data={facets} updater={updateLocalValues} language={language} />
                         </Box>
                    </ScrollView>
                    {actionButtons}
               </ScreenContainer>
          );
     } else if (multiSelect) {
          return (
               <ScreenContainer flex={1}>
                    {searchBar}
                    <ScrollView>
                         <Box>
                              <CheckboxGroup
                                   value={values}
                                   accessibilityLabel={getTermFromDictionary(language, 'filter_by')}
                              >
                                   {facets.map((item, index) => {
                                        return <Facet_Checkbox
                                             key={index}
                                             data={item}
                                             language={language}
                                             updateCheckboxFacet={updateCheckboxFacet}
                                             category={category}
                                             values={values}
                                        />;
                                   })}
                              </CheckboxGroup>
                         </Box>
                    </ScrollView>
                    {actionButtons}
               </ScreenContainer>
          );
     }

     return (
          <ScreenContainer flex={1}>
               {searchBar}
               <ScrollView>
                    <Box>
                         <Facet_RadioGroup data={facets} category={category} title={title} applied={values} updater={updateLocalValues} language={language} />
                    </Box>
               </ScrollView>
               {actionButtons}
          </ScreenContainer>
     );
};
