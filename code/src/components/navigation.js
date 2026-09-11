import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import React from 'react';
import { AppState, Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';
import * as Sentry from '@sentry/react-native';
import { CheckoutsProvider, GroupedWorkProvider, HoldsProvider, SearchProvider, SystemMessagesProvider } from '../context/initialContext';
import { navigationRef } from '../helpers/RootNavigator';
import LaunchStackNavigator from '../navigations/LaunchStackNavigator';
import { LoginScreen } from '../screens/Auth/Login';
import { SelfRegistration } from '../screens/Auth/SelfRegistration';
import { evaluateStartupCache, SplashScreen } from '../screens/Auth/Splash';
import { getTermFromDictionary } from '../translations/TranslationService';
import { GLOBALS, LIBRARY } from '../util/globals';
import { checkCachedUrl } from '../util/api/system';
import { RemoveData } from '../helpers/helpers';
import { saveLibraryUrl, isSQLiteMigrationNeeded } from '../util/db';
import LibraryCardScanner from './LibraryCardScanner';
import TitleWithLogo from '../components/TitleWithLogo'
import { useQueryClient } from '@tanstack/react-query';
import { logDebugMessage, logInfoMessage, logWarnMessage, logErrorMessage } from '../util/logging.js';
import { trackAppLaunches, trackAppResume } from '../util/analytics';
const prefix = Linking.createURL('/');
logDebugMessage("Linking prefix is " + prefix);

enableScreens();

const Stack = createNativeStackNavigator();

let routingInstrumentation = null;
try {
     routingInstrumentation = new Sentry.ReactNavigationInstrumentation();
}catch (e) {
     routingInstrumentation = null;
     logWarnMessage("Could not create sentry routing instrumentation " + e);
}


import { AuthContext } from '../context/AuthContext';
import { useActiveLanguage } from '../hooks/useLanguageData';
import { useTheme, TOKENS } from '../themes/theme';
import { Spinner } from '@/components/ui/spinner';
export { AuthContext };

const iOSRelease = Constants.expoConfig.ios.bundleIdentifier;
const androidRelease = Constants.expoConfig.android.package;
const iOSDist = Constants.expoConfig.ios.buildNumber;
const androidDist = Constants.expoConfig.android.versionCode;
const version = Constants.expoConfig.version;

logDebugMessage("iOS Release: " + iOSRelease);
logDebugMessage("iOS Dist: " + iOSDist);
logDebugMessage("Version: " + version);

let releaseCode = Platform.OS === 'android' ? androidRelease + '@' + version + '+' + androidDist : iOSRelease + '@' + version + '+' + iOSDist;
releaseCode = releaseCode.toString();

let distribution = Platform.OS === 'android' ? androidDist : iOSDist;
distribution = distribution.toString();

try {
     logDebugMessage("Initializing sentry");
     let integrations = [];
     if (routingInstrumentation != null) {
          integrations.push(routingInstrumentation);
     }
     Sentry.init({
          dsn: Constants.expoConfig.extra.sentryDSN,
          enableAutoSessionTracking: true,
          sessionTrackingIntervalMillis: 10000,
          debug: false,
          tracesSampleRate: 0.1,
          sampleRate: 0.1,
          environment: Updates.channel ?? Updates.releaseChannel,
          release: releaseCode,
          dist: distribution,
          autoInject: false,
          integrations: integrations });

     Sentry.setTag('patch', GLOBALS.appPatch);
     Sentry.setTag('stage', GLOBALS.appStage);
}catch(e) {
     logErrorMessage("Could not initialize sentry " + e);
}

/**
 * Main App component that manages authentication state and navigation.
 * @returns {React.JSX.Element}
 * @constructor
 */
export function App() {
     const [state, dispatch] = React.useReducer(
          (prevState, action) => {
               switch (action.type) {
                    case 'RESTORE_TOKEN':
                         return {
                              ...prevState,
                              userToken: action.token,
                              isLoading: false,
                              refreshUserData: action.refreshData ?? true,
                              startupCache: action.startupCache ?? null,
                              isSQLiteMigrationNeeded: action.isSQLiteMigrationNeeded ?? false,
                              migrationError: false };
                    case 'SIGN_IN':
                         return {
                              ...prevState,
                              isSignOut: false,
                              userToken: action.token,
                              isLoading: false,
                              refreshUserData: action.refreshData ?? true,
                              startupCache: action.startupCache ?? null,
                              isSQLiteMigrationNeeded: false,
                              migrationError: false };
                    case 'SIGN_OUT':
                         return {
                              ...prevState,
                              isSignOut: true,
                              userToken: null,
                              isLoading: false,
                              refreshUserData: false,
                              startupCache: null,
                              isSQLiteMigrationNeeded: false,
                              migrationError: action.migrationError ?? false };
               }
          },
          {
               isLoading: true,
               isSignOut: false,
               userToken: null,
               refreshUserData: false,
               startupCache: null,
               isSQLiteMigrationNeeded: false,
               migrationError: false }
      );

     React.useEffect(() => {
          const timer = setInterval(async () => {
               if (!__DEV__) {
                    try {
                         const update = await Updates.checkForUpdateAsync();
                         if (update.isAvailable) {
                              logDebugMessage('Found an update...');
                              try {
                                   logDebugMessage('Downloading update...');
                                   await Updates.fetchUpdateAsync().then(async () => {
                                        logInfoMessage('Updating app...');
                                        await Updates.reloadAsync();
                                   });
                              } catch (e) {
                                   logErrorMessage("Error updating app");
                                   logErrorMessage(e);
                              }
                         }
                    } catch (e) {
                         // error checking for updates
                    }
               }
          }, 10000);
          return () => {
               clearInterval(timer);
          };
     }, []);

      React.useEffect(() => {
           const bootstrapAsync = async () => {
                logDebugMessage('Checking existing session...');
                let userToken;
                let libraryUrl;
                let userKey;
                let isMigrationNeeded = false;
                try {
                     // Restore token stored in `AsyncStorage`
                     userToken = await AsyncStorage.getItem('@userToken');
                     libraryUrl = await AsyncStorage.getItem('@pathUrl');
                     userKey = await SecureStore.getItemAsync('userKey');
                } catch (e) {
                     // Restoring token failed
                     logErrorMessage("Error restoring token");
                     logErrorMessage(e);
                     dispatch({ type: 'SIGN_OUT' });
                }

                if (!userKey) {
                     dispatch({ type: 'SIGN_OUT' });
                }

                 if (!libraryUrl) {
                      libraryUrl = LIBRARY.url;
                 }

                 if (userToken) {
                      logDebugMessage('Session found');
                      if (libraryUrl) {
                           logDebugMessage('Trying to connect to: ', libraryUrl);
                           await checkCachedUrl(libraryUrl).then(async (result) => {
                                if (result) {
                                     LIBRARY.url = libraryUrl;
                                     await saveLibraryUrl(libraryUrl);
                                     logDebugMessage('Connection successful. Continuing...');

                                     // Check if SQLite migration is needed
                                     try {
                                          isMigrationNeeded = await isSQLiteMigrationNeeded(userToken);
                                          if (isMigrationNeeded) {
                                               logDebugMessage('SQLite migration detected for existing user');
                                          }
                                     } catch (error) {
                                          logErrorMessage('Error checking SQLite migration status');
                                          logErrorMessage(error);
                                     }

                                     await trackAppLaunches(libraryUrl);
                                } else {
                                    logWarnMessage('Connection failed, logging out.');
                                    userToken = null;
                                    dispatch({ type: 'SIGN_OUT' });
                               }
                          });
                     } else {
                          logWarnMessage('No cached library url, logging out.');
                          dispatch({ type: 'SIGN_OUT' });
                     }
                } else {
                     logDebugMessage('No session found. Starting new.');
                }

                let startupCache = null;
                let refreshData = true;
                if (userToken) {
                     try {
                          startupCache = await evaluateStartupCache();
                          refreshData = !(startupCache?.canBypassLoading ?? false);
                          logDebugMessage({
                               event: 'startupCache:decision',
                               canBypassLoading: startupCache?.canBypassLoading ?? false,
                               refreshData,
                          });
                     } catch (error) {
                          logErrorMessage('Failed startup cache evaluation, using Loading screen fallback');
                          logErrorMessage(error);
                          refreshData = true;
                     }
                }

                dispatch({
                     type: 'RESTORE_TOKEN',
                     token: userToken,
                     refreshData,
                     startupCache,
                     isSQLiteMigrationNeeded: isMigrationNeeded });
           };
           bootstrapAsync();
      }, []);

     React.useEffect(() => {
          const subscription = AppState.addEventListener('change', async (nextAppState) => {
               if (nextAppState === 'active') {
                    logDebugMessage('App resumed from background');

                    try {
                         const libraryUrl = await AsyncStorage.getItem('@pathUrl');
                         if (libraryUrl) {
                              await trackAppResume(libraryUrl);
                         }
                    } catch (error) {
                         logErrorMessage('Failed to track app resume: ', error);
                    }
               }
          });

          return () => {
               subscription.remove();
          };
     }, []);

     const authContext = React.useMemo(
          () => ({
               signIn: async () => {
                    //queryClient.invalidateQueries({});
                    const userToken = GLOBALS.appSessionId;
                    await AsyncStorage.setItem('@userToken', userToken);
                    dispatch({
                         type: 'SIGN_IN',
                         token: userToken,
                         refreshData: true });
               },
               signOut: async () => {
                    logDebugMessage('Session ended.');
                    dispatch({ type: 'SIGN_OUT' });
               } }),
          []
     );

     if (state.isLoading) {
          // We haven't finished checking for the token yet
          return <SplashScreen />;
     }

     return (
          <AuthContext.Provider value={authContext}>
               <SystemMessagesProvider>
                     <SearchProvider>
                          <CheckoutsProvider>
                               <HoldsProvider>
                                    <GroupedWorkProvider>
                                         {/* Pass state safely to the child container */}
                                         <AppContent state={state} />
                                    </GroupedWorkProvider>
                               </HoldsProvider>
                          </CheckoutsProvider>
                     </SearchProvider>
               </SystemMessagesProvider>
          </AuthContext.Provider>
     );
}

/**
 * AppContent component that handles navigation and theming based on the authentication state.
 * @param param0
 * @param param0.state
 * @returns {(function(): void)|*|React.JSX.Element|string}
 * @constructor
 */
function AppContent({state}) {
     const queryClient = useQueryClient();

     React.useEffect(() => {
          if (state.isSignOut) {
               RemoveData(queryClient);
          }
     }, [state.isSignOut]);

     const language = useActiveLanguage();
     const { colorMode } = useTheme();

     const lightTheme = {
          ...DefaultTheme,
          colors: {
               ...DefaultTheme.colors,
               background: TOKENS.semanticTokens.light.canvas,
               card: TOKENS.semanticTokens.light.surface,
               text: TOKENS.semanticTokens.light.textMain,
          },
     };
     const darkTheme = {
          ...DarkTheme,
          colors: {
               ...DarkTheme.colors,
               background: TOKENS.semanticTokens.dark.canvas,
               card: TOKENS.semanticTokens.dark.surface,
               text: TOKENS.semanticTokens.dark.textMain,
          },
     };

     return (
          <NavigationContainer
               theme={colorMode === 'dark' ? darkTheme : lightTheme}
               ref={navigationRef}
               fallback={<Spinner />}
               linking={{
                    prefixes: [prefix],
                    config: {
                         screens: {
                              Login: 'user/login',
                              LaunchStack: {
                                   screens: {
                                        DrawerStack: {
                                             screens: {
                                                  TabsNavigator: {
                                                       screens: {
                                                            AccountScreenTab: {
                                                                 screens: {
                                                                      MySavedSearches: 'user/saved_searches',
                                                                      LoadSavedSearch: 'user/saved_search',
                                                                      MyLists: 'user/lists',
                                                                      MyList: 'user/list',
                                                                      MyLinkedAccounts: 'user/linked_accounts',
                                                                      MyHolds: 'user/holds',
                                                                      MyCheckouts: 'user/checkouts',
                                                                      MyPreferences: 'user/preferences',
                                                                      MyProfile: 'user',
                                                                      MyReadingHistory: 'user/reading_history',
                                                                      MyCampaigns: 'user/campaigns' } },
                                                            LibraryCardTab: {
                                                                 screens: {
                                                                      LibraryCard: 'user/library_card' } },
                                                            SearchTab: {
                                                                 screens: {
                                                                      SearchByCategory: 'search/browse_category',
                                                                      SearchByAuthor: 'search/author',
                                                                      SearchByList: 'search/list' } },
                                                            BrowseTab: {
                                                                 screens: {
                                                                      HomeScreen: 'home',
                                                                      GroupedWorkScreen: 'search/grouped_work',
                                                                      SearchResults: 'search' } } } } } } } } } },
                    async getInitialURL() {
                         let url = await Linking.getInitialURL();

                         if (url != null) {
                              url = decodeURIComponent(url).replace(/\+/g, ' ');
                              url = url.replace('aspen-lida://', prefix);
                              return url;
                         }

                         const response = await Notifications.getLastNotificationResponseAsync();
                         url = decodeURIComponent(response?.notification.request.content.data.url).replace(/\+/g, ' ');
                         url = url.replace('aspen-lida://', prefix);
                         return url;
                    },
                    subscribe(listener) {
                         const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
                              const decodedUrl = decodeURIComponent(url).replace(/\+/g, ' ').replace('aspen-lida://', prefix);
                              listener(decodedUrl);
                         });
                         const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
                              const url = response.notification.request.content.data.url;
                              const decodedUrl = decodeURIComponent(url).replace(/\+/g, ' ').replace('aspen-lida://', prefix);
                              listener(decodedUrl);
                         });

                         return () => {
                              subscription.remove();
                              linkingSubscription.remove();
                         };
                    } }}>
               <Stack.Navigator
                    screenOptions={{
                         headerShown: false }}
                    name="RootNavigator">
                    {state.userToken === null ? (
                         // No token found, user isn't signed in
                         <Stack.Screen
                              name="Login"
                              component={LoginScreen}
                              options={{
                                   headerShown: false,
                                   animationTypeForReplace: state.isSignOut ? 'pop' : 'push' }}
                         />
                     ) : (
                          // User is signed in
                          <Stack.Screen
                               name="LaunchStack"
                               component={LaunchStackNavigator}
                               initialParams={{
                                    refreshUserData: state.refreshUserData ?? false,
                                    startupCache: state.startupCache ?? null,
                                    isSQLiteMigrationNeeded: state.isSQLiteMigrationNeeded ?? false,
                               }}
                          />
                     )}
                    <Stack.Screen
                         name="LibraryCardScanner"
                         component={LibraryCardScanner}
                         options={{
                              presentation: 'modal' }}
                    />
                    <Stack.Screen
                         name="SelfRegistration"
                         component={SelfRegistration}
                         options={{
                              header: () => {
                                   const title = getTermFromDictionary(language, 'register_for_a_library_card');
                                   return <TitleWithLogo title={title} hideBack={true} />;
                              },
                              headerShown: true,
                              presentation: 'card',
                              gestureEnabled: false,
                              headerBackButtonDisplayMode: 'minimal',
                         }}
                    />
               </Stack.Navigator>
          </NavigationContainer>
     );
}

export default Sentry.wrap(App);
