import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { CheckoutsContext, HoldsContext, SearchContext, SystemMessagesContext } from '../context/initialContext';
import { useCatalogStatus, useLibrary, useLibraryMenu, useLibraryUrl, useLibraryVersion } from '../hooks/useLibrarySystemData';
import { useActiveLanguage, useAvailableLanguages, useDictionary, useLanguageDisplayName, useUpdateActiveLanguage, useUpdateAvailableLanguages, useUpdateDictionary, useUpdateLanguageDisplayName } from '../hooks/useLanguageData';
import { LoadingScreen } from '../screens/Auth/Loading';
import AccountDrawer from './drawer/DrawerNavigator';
import { useTheme } from '../themes/theme';

const Stack = createNativeStackNavigator();

/**
 * LaunchStackNavigator component that sets up a stack navigator for the initial launch of the app, including a loading screen and the main account drawer.
 * @returns {React.JSX.Element}
 * @constructor
 */
const LaunchStackNavigator = () => {
     const route = useRoute();
     const refreshUserData = route.params?.refreshUserData ?? false;
     const startupCache = route.params?.startupCache ?? null;

     const { colorMode: mode, updateColorMode } = useTheme();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const language = useActiveLanguage();
     const updateLanguage = useUpdateActiveLanguage();
     const languages = useAvailableLanguages();
     const updateLanguages = useUpdateAvailableLanguages();
     const dictionary = useDictionary();
     const updateDictionary = useUpdateDictionary();
     const languageDisplayName = useLanguageDisplayName();
     const updateLanguageDisplayName = useUpdateLanguageDisplayName();
     const { checkouts } = React.useContext(CheckoutsContext);
     const { holds } = React.useContext(HoldsContext);
     const {
          currentIndex,
          updateCurrentIndex,
          currentSource,
          updateCurrentSource,
          indexes,
          updateIndexes,
          sources,
          updateSources,
          facets,
          updateFacets,
          query,
          updateQuery,
          sort,
          updateSort,
          resetSearch } = React.useContext(SearchContext);

     const library = useLibrary();
     const version = useLibraryVersion();
     const url = useLibraryUrl();
     const menu = useLibraryMenu();
     const { status: catalogStatus, message: catalogStatusMessage } = useCatalogStatus();

     return (
          <Stack.Navigator
               initialRouteName={refreshUserData ? 'LoadingScreen' : 'DrawerStack'}
               screenOptions={{
                    headerShown: false,
                    headerBackTitleVisible: false,
                    gestureEnabled: false }}>
               {refreshUserData ? (
                    <Stack.Screen
                         name="LoadingScreen"
                         component={LoadingScreen}
                         options={{
                              animationEnabled: false,
                              header: () => null }}
                    />
               ) : null}
               <Stack.Screen
                    name="DrawerStack"
                    component={AccountDrawer}
                    initialParams={{ startupCache }}
                    options={{
                         libraryContext: {
                              library,
                              version,
                              url,
                              menu,
                              catalogStatus,
                              catalogStatusMessage },
                         checkoutsContext: { checkouts },
                         holdsContext: { holds },
                         languageContext: {
                              language,
                              updateLanguage,
                              languages,
                              updateLanguages,
                              dictionary,
                              updateDictionary,
                              languageDisplayName,
                              updateLanguageDisplayName },
                         systemMessagesContext: { systemMessages, updateSystemMessages },
                         themeContext: { mode, updateColorMode },
                         searchContext: {
                              currentIndex,
                              updateCurrentIndex,
                              currentSource,
                              updateCurrentSource,
                              indexes,
                              updateIndexes,
                              sources,
                              updateSources,
                              facets,
                              updateFacets,
                              query,
                              updateQuery,
                              sort,
                              updateSort,
                              resetSearch } }}
               />
          </Stack.Navigator>
     );
};

export default LaunchStackNavigator;
