import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import Scanner from '../../components/Scanner';
import TitleWithLogo from '../../components/TitleWithLogo'
import { useTheme } from '../../themes/theme';
import { DiscoverHomeScreen } from '../../screens/Home/Home';
import { EventScreen } from '../../screens/Event/Event';
import { CreateLocalIllRequest } from '../../screens/GroupedWork/CreateLocalIllRequest';
import { CreateLocalIllRequestEmail } from '../../screens/GroupedWork/CreateLocalIllRequestEmail';
import { Editions } from '../../screens/GroupedWork/Editions';
import { GroupedWorkScreen } from '../../screens/GroupedWork/GroupedWork';
import { WhereIsIt } from '../../screens/GroupedWork/WhereIsIt';
import { Facet } from '../../screens/Search/Facet';
import { SearchIndexScreen } from '../../screens/Search/Facets/SearchIndex';
import { SearchSourceScreen } from '../../screens/Search/Facets/SearchSource';
import { FiltersScreen } from '../../screens/Search/Filters';
import { SearchResultsForBrowseCategory } from '../../screens/Search/SearchByCategory';
import { SearchResultsForList } from '../../screens/Search/SearchByList';
import { SearchResultsForSavedSearch } from '../../screens/Search/SearchBySavedSearch';
import { SearchResults } from '../../screens/Search/SearchResults';
import { BackIcon } from '../../themes/ThemeSwitcher';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { ModalHeader } from '../../components/Headers/ModalHeader';

const Stack = createNativeStackNavigator();

/**
 * BrowseStackNavigator component for managing the navigation stack of the Browse tab, including screens for home, grouped work details, search results, and modals.
 * @returns {React.JSX.Element}
 * @constructor
 */
const BrowseStackNavigator = () => {
     const language = useActiveLanguage();
     return (
          <Stack.Navigator
               id="BrowseStack"
               initialRouteName="HomeScreen"
               screenOptions={() => ({
                    headerShown: true,
                    gestureEnabled: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackImage: () => <BackIcon />,
               })}>
               <Stack.Screen
                    name="HomeScreen"
                    component={DiscoverHomeScreen}
                    options={{
                         header: () => {
                              const title = getTermFromDictionary(language, 'nav_discover');
                              return <TitleWithLogo title={title} hideBack={true} />;
                         },
                    }}
               />
               <Stack.Screen
                    name="GroupedWorkScreen"
                    component={GroupedWorkScreen}
                    options={({ route }) => ({
                         header: () => {
                              const title = route.params.title ?? getTermFromDictionary(language, 'item_details');
                              return <TitleWithLogo title={title} />;
                         },
                    })}
                    initialParams={{ prevRoute: 'HomeScreen' }}
               />
               <Stack.Screen
                    name="CopyDetails"
                    component={WhereIsIt}
                    options={({ navigation }) => ({
                         title: getTermFromDictionary(language, 'where_is_it'),
                         headerShown: true,
                         presentation: 'modal',
                         header: () => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'where_is_it')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) {
                                             parent.goBack();
                                        } else if (navigation.canGoBack()) {
                                             navigation.goBack();
                                        }
                                   }}
                                   showBack={false}
                                   showClose={true}
                              />
                         ),
                    })}
               />
               <Stack.Screen
                    name="CreateLocalIllRequest"
                    component={CreateLocalIllRequest}
                    options={({ navigation }) => ({
                         title: getTermFromDictionary(language, 'ill_request_title'),
                         presentation: 'modal',
                         header: () => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'ill_request_title')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) {
                                             parent.goBack();
                                        } else if (navigation.canGoBack()) {
                                             navigation.goBack();
                                        }
                                   }}
                                   showBack={false}
                                   showClose={true}
                              />
                         ),
                    })}
               />
               <Stack.Screen
                    name="CreateLocalIllRequestEmail"
                    component={CreateLocalIllRequestEmail}
                    options={({ navigation }) => ({
                         title: getTermFromDictionary(language, 'ill_request_title'),
                         presentation: 'modal',
                         header: () => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'ill_request_title')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) {
                                             parent.goBack();
                                        } else if (navigation.canGoBack()) {
                                             navigation.goBack();
                                        }
                                   }}
                                   showBack={false}
                                   showClose={true}
                              />
                         ),
                    })}
               />

               <Stack.Screen
                    name="EditionsModal"
                    component={EditionsModal}
                    options={{
                         headerShown: false,
                         presentation: 'modal',
                    }}
               />
               <Stack.Screen
                    name="SearchByCategory"
                    component={SearchResultsForBrowseCategory}
                    options={({ route }) => ({
                         header: () => {
                              const title = getTermFromDictionary(language, 'results_for') + ' ' + route.params.title;
                              return <TitleWithLogo title={title} />;
                         },
                    })}
               />
               <Stack.Screen
                    name="CategoryResultItem"
                    component={GroupedWorkScreen}
                    options={({ route }) => ({
                         header: () => {
                              const title = route.params.title ?? getTermFromDictionary(language, 'item_details');
                              return <TitleWithLogo title={title} />;
                         },
                    })}
                    initialParams={{ prevRoute: 'SearchResults' }}
               />
               <Stack.Screen
                    name="SearchByList"
                    component={SearchResultsForList}
                    options={({ route }) => ({
                         header: () => {
                              const title = route.params?.title ? getTermFromDictionary(language, 'results_for') + ' ' + route.params.title : getTermFromDictionary(language, 'search_results');
                              return <TitleWithLogo title={title} />;
                         },
                    })}
               />
               <Stack.Screen
                    name="ListResults"
                    component={SearchResultsForList}
                    options={({ route }) => ({
                         header: () => {
                              const title = route.params?.title ? getTermFromDictionary(language, 'results_for') + ' ' + route.params.title : getTermFromDictionary(language, 'search_results');
                              return <TitleWithLogo title={title} />;
                         },
                    })}
               />
               <Stack.Screen
                    name="ListResultItem"
                    component={GroupedWorkScreen}
                    options={({ route }) => ({
                         header: () => {
                              const title = route.params?.title ?? getTermFromDictionary(language, 'item_details');
                              return <TitleWithLogo title={title} />;
                         },
                    })}
                    initialParams={{ prevRoute: 'SearchResults' }}
               />

               <Stack.Screen
                    name="SearchBySavedSearch"
                    component={SearchResultsForSavedSearch}
                    options={({ route }) => ({
                         header: () => {
                              const title = getTermFromDictionary(language, 'results_for') + ' ' + route.params.title;
                              return <TitleWithLogo title={title} />;
                         },
                    })}
               />
               <Stack.Screen
                    name="SavedSearchResultItem"
                    component={GroupedWorkScreen}
                    options={({ route }) => ({
                         header: () => {
                              const title = route.params.title ?? getTermFromDictionary(language, 'item_details');
                              return <TitleWithLogo title={title} />;
                         },
                    })}
                    initialParams={{ prevRoute: 'SearchResults' }}
               />
               <Stack.Screen
                    name="SearchResults"
                    component={SearchResults}
                    options={({ route }) => ({
                         header: () => {
                              const title = getTermFromDictionary(language, 'results_for') + ' ' + route.params.term;
                              return <TitleWithLogo title={title} />;
                         },
                         params: {
                              pendingParams: [],
                         },
                    })}
               />
               <Stack.Screen
                    name="modal"
                    component={FilterModal}
                    options={{
                         headerShown: false,
                         presentation: 'modal',
                    }}
               />
               <Stack.Screen
                    name="Scanner"
                    component={Scanner}
                    options={{
                         gestureEnabled: false,
                         presentation: 'modal',
                    }}
               />
               <Stack.Screen
                    name="EventScreen"
                    component={EventScreen}
                    options={({ route }) => ({
                         header: () => {
                              const title = route.params.title ?? getTermFromDictionary(language, 'event_details');
                              return <TitleWithLogo title={title} />;
                         },
                    })}
                    initialParams={{ prevRoute: 'HomeScreen' }}
               />
          </Stack.Navigator>
     );
};

const EditionsStack = createNativeStackNavigator();
/**
 * EditionsModal component for managing the navigation stack of the Editions modal, including screens for editions and where-is-it details.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const EditionsModal = () => {
     const language = useActiveLanguage();
     return (
          <EditionsStack.Navigator
               id="EditionsStack"
               screenOptions={({ navigation, route }) => ({
                    headerShown: false,
                    animationTypeForReplace: 'push',
                    gestureEnabled: false,
               })}>
               <EditionsStack.Screen
                    name="Editions"
                    component={Editions}
                    options={{
                         title: getTermFromDictionary(language, 'editions'),
                         headerShown: true,
                         presentation: 'modal',
                         header: ({ navigation }) => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'editions')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) parent.goBack();
                                        else if (navigation.canGoBack()) navigation.goBack();
                                   }}
                                   showBack={false}
                                   showClose={true}
                              />
                         ),
                    }}
               />
               <EditionsStack.Screen
                    name="WhereIsIt"
                    component={WhereIsIt}
                    options={{
                         title: getTermFromDictionary(language, 'where_is_it'),
                         headerShown: true,
                         presentation: 'modal',
                         header: ({ navigation }) => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'where_is_it')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) parent.goBack();
                                        else if (navigation.canGoBack()) navigation.goBack();
                                   }}
                                   showBack={false}
                                   showClose={true}
                              />
                         ),
                    }}
               />
          </EditionsStack.Navigator>
     );
};

const FilterModalStack = createNativeStackNavigator();
/**
 * FilterModal component for managing the navigation stack of the Filter modal, including screens for filters, facets, and search source/index selection.
 * @returns {React.JSX.Element}
 * @constructor
 */
const FilterModal = () => {
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const iconColor = neutrals.icon;
     return (
          <FilterModalStack.Navigator
               id="SearchFilters"
               screenOptions={({ navigation }) => ({
                    headerShown: true,
                    animation: 'slide_from_right',
                    headerTintColor: iconColor,
                    header: ({ navigation }) => (
                         <ModalHeader
                              onBack={() => navigation.goBack()}
                              onClose={() => {
                                   const parent = navigation.getParent();
                                   if (parent?.canGoBack()) {
                                        parent.goBack();
                                   } else if (navigation.canGoBack()) {
                                        navigation.goBack();
                                   }
                              }}
                              showBack={false}
                              showClose={true}
                         />
                    ),
               })}>
               <FilterModalStack.Screen
                    name="Filters"
                    component={FiltersScreen}
                    options={{
                         title: getTermFromDictionary(language, 'filters'),
                         headerBackVisible: false,
                         headerBackButtonDisplayMode: 'minimal',
                         header: ({ navigation }) => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'filters')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) {
                                             parent.goBack();
                                        } else if (navigation.canGoBack()) {
                                             navigation.goBack();
                                        }
                                   }}
                                   showBack={false}
                                   showClose={true}
                              />
                         ),
                    }}
               />
               <FilterModalStack.Screen
                    name="Facet"
                    component={Facet}
                    options={({ route }) => ({
                         title: route.params.title,
                         headerBackVisible: false,
                         headerBackButtonDisplayMode: 'minimal',
                         header: ({ navigation }) => (
                              <ModalHeader
                                   title={route.params.title}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) {
                                             parent.goBack();
                                        } else if (navigation.canGoBack()) {
                                             navigation.goBack();
                                        }
                                   }}
                                   showBack={true}
                                   showClose={true}
                              />
                         ),
                    })}
               />
               <FilterModalStack.Screen
                    name="SearchSource"
                    component={SearchSourceScreen}
                    options={({ route }) => ({
                         title: getTermFromDictionary(language, 'search_in'),
                         headerBackVisible: true,
                         headerBackButtonDisplayMode: 'minimal',
                         header: ({ navigation }) => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'search_in')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) {
                                             parent.goBack();
                                        } else if (navigation.canGoBack()) {
                                             navigation.goBack();
                                        }
                                   }}
                                   showBack={true}
                                   showClose={true}
                              />
                         ),
                    })}
               />
               <FilterModalStack.Screen
                    name="SearchIndex"
                    component={SearchIndexScreen}
                    options={({ route }) => ({
                         title: getTermFromDictionary(language, 'search_by'),
                         headerBackVisible: true,
                         headerBackButtonDisplayMode: 'minimal',
                         header: ({ navigation }) => (
                              <ModalHeader
                                   title={getTermFromDictionary(language, 'search_by')}
                                   onBack={() => navigation.goBack()}
                                   onClose={() => {
                                        const parent = navigation.getParent();
                                        if (parent?.canGoBack()) {
                                             parent.goBack();
                                        } else if (navigation.canGoBack()) {
                                             navigation.goBack();
                                        }
                                   }}
                                   showBack={true}
                                   showClose={true}
                              />
                         ),
                    })}
               />
          </FilterModalStack.Navigator>
     );
};

export default BrowseStackNavigator;
