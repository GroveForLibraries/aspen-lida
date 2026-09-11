import 'expo-dev-client';
import '@/global.css';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import Constants from 'expo-constants';
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';
import { LogBox } from 'react-native';
import { enableScreens } from 'react-native-screens';
import * as Sentry from '@sentry/react-native';
import App from './src/components/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { CheckoutsProvider, GroupedWorkProvider, HoldsProvider, SearchProvider, SystemMessagesProvider } from './src/context/initialContext';
import { SplashScreenNative } from './src/screens/Auth/SplashNative';
import { buildThemeForLibrary, runExclusiveThemeInit, THEME_STALE_MS, useThemeForDisplay } from './src/themes/theme';
import { ToastRegistrar } from '@/src/components/feedback';
import { logDebugMessage, logErrorMessage } from './src/util/logging.js';
import { initDatabase } from './src/util/db';
import { loadLibraryUrl, loadThemeState, saveThemeState, isStoredThemeIdMatch } from './src/util/db';
import { GLOBALS } from './src/util/globals';

logDebugMessage("1 Enabling Screens, react-native-screens");
enableScreens();

// react query client instance
const queryClient = new QueryClient({
     defaultOptions: {
          queries: {
               staleTime: 1000 * 60 * 60 * 24,
               cacheTime: 1000 * 60 * 60 * 24,
          },
     },
});

const QUERY_CACHE_STORAGE_KEY = '@react_query_cache_v1';
const PERSISTED_QUERY_ROOT_KEYS = new Set(['system_messages']);

function shouldPersistQuery(query) {
     const queryKey = query?.queryKey;
     if (!Array.isArray(queryKey) || queryKey.length === 0) {
          return false;
     }
     const rootKey = queryKey[0];
     if (!PERSISTED_QUERY_ROOT_KEYS.has(rootKey)) {
          return false;
     }
     return query?.state?.status === 'success';
}

async function restorePersistedQueries() {
     try {
          const raw = await AsyncStorage.getItem(QUERY_CACHE_STORAGE_KEY);
          if (!raw) {
               return;
          }
          const persistedState = JSON.parse(raw);
          hydrate(queryClient, persistedState);
          logDebugMessage('Hydrated persisted React Query cache');
     } catch (error) {
          logErrorMessage('Failed to hydrate persisted React Query cache');
          logErrorMessage(error);
     }
}

async function persistSelectedQueries() {
     try {
          const dehydrated = dehydrate(queryClient, { shouldDehydrateQuery: shouldPersistQuery });
          await AsyncStorage.setItem(QUERY_CACHE_STORAGE_KEY, JSON.stringify(dehydrated));
     } catch (error) {
          logErrorMessage('Failed to persist React Query cache');
          logErrorMessage(error);
     }
}

// Hide log error/warning popups in simulator (useful for demoing)
const IGNORED_LOGS = ['Non-serializable values were found in the navigation state', 'Warning: ...', 'Warn: ...', 'If you do not provide children, you must specify an aria-label for accessibility '];
LogBox.ignoreLogs(IGNORED_LOGS);
LogBox.ignoreAllLogs(); //Ignore all log notifications
// Workaround for Expo 45
if (__DEV__) {
     const withoutIgnored =
          (logger) =>
          (...args) => {
               const output = args.join(' ');

               if (!IGNORED_LOGS.some((log) => output.includes(log))) {
                    logger(...args);
               }
          };

     console.log = withoutIgnored(console.log);
     console.info = withoutIgnored(console.info);
     console.warn = withoutIgnored(console.warn);
     console.error = withoutIgnored(console.error);
}

/**
 * AppContainer is the root component of the application. It initializes the SQLite database, manages theme loading and persistence, and sets up the context providers for authentication, search, checkouts, holds, system messages, and grouped works. It also handles the splash screen display while loading and ensures that persisted queries are saved to AsyncStorage.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function AppContainer() {
     const [isLoading, setLoading] = React.useState(true);
     const { colorMode, themeVars } = useThemeForDisplay();

     const [dbReady, setDbReady] = React.useState(false);
     const persistTimeoutRef = React.useRef(null);

     const schedulePersistedQueryWrite = React.useCallback(() => {
          if (persistTimeoutRef.current) {
               clearTimeout(persistTimeoutRef.current);
          }
          persistTimeoutRef.current = setTimeout(() => {
               persistSelectedQueries();
          }, 250);
     }, []);
     React.useEffect(() => {
          let active = true;

          (async () => {
               const MAX_INIT_ATTEMPTS = 3;

               for (let attempt = 1; attempt <= MAX_INIT_ATTEMPTS; attempt += 1) {
                    try {
                         logDebugMessage(`2 Initializing SQLite (attempt ${attempt}/${MAX_INIT_ATTEMPTS})`);
                         await initDatabase();
                         if (active) {
                              setDbReady(true);
                         }
                         return;
                    } catch (error) {
                         logErrorMessage(`Failed to initialize SQLite on attempt ${attempt}`);
                         logErrorMessage(error);
                         if (attempt < MAX_INIT_ATTEMPTS) {
                              await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
                         }
                    }
               }

               if (active) {
                    logErrorMessage('SQLite failed to initialize after retries; keeping splash screen active');
               }
          })();

          return () => {
               active = false;
          };
     }, []);

     React.useEffect(() => {
          let active = true;
          (async () => {
               if (!dbReady) {
                    return;
               }
               logDebugMessage('3 Running buildThemeForLibrary...');
               try {
                    await restorePersistedQueries();
                    await runExclusiveThemeInit(async () => {
                         const current = await loadThemeState();
                         const mode = current?.colorMode === 'dark' ? 'dark' : 'light';
                         const hasStoredTheme = Boolean(current?.themeColors?.primary && current?.themeColors?.secondary && current?.themeColors?.tertiary);
                         const hasMatchingThemeId = await isStoredThemeIdMatch(GLOBALS.themeId ?? 1);
                         const themeAgeMs = current?.updatedAt ? Date.now() - current.updatedAt : Number.POSITIVE_INFINITY;
                         const isThemeStale = themeAgeMs > THEME_STALE_MS;

                         if (!hasStoredTheme || !hasMatchingThemeId || isThemeStale) {
                              const persistedLibraryUrl = await loadLibraryUrl();
                              const themeUrl = persistedLibraryUrl || GLOBALS.url || Constants.expoConfig.extra.apiUrl;
                              logDebugMessage(`4 Building theme for current themeId using url=${themeUrl ?? 'none'} stale=${isThemeStale} ageMs=${themeAgeMs}`);
                              if (!themeUrl) {
                                   logDebugMessage('4 Skipping startup theme fetch because no library URL is available yet');
                              } else {
                                   const builtTheme = await buildThemeForLibrary(themeUrl);
                                  await saveThemeState({
                                       themeId: builtTheme.themeId,
                                       colorMode: mode,
                                       themeColors: builtTheme.themeColors,
                                  });
                             }
                         } else if (!current?.colorMode) {
                              await saveThemeState({
                                   ...current,
                                   colorMode: mode,
                              });
                         }
                    });
               } catch (e) {
                    logErrorMessage('4 Could not load or build theme ' + e);
               } finally {
                    if (active) {
                         setLoading(false);
                    }
               }
          })();
          return () => {
               active = false;
          };
     }, [dbReady]);

     React.useEffect(() => {
          const unsubscribe = queryClient.getQueryCache().subscribe(() => {
               schedulePersistedQueryWrite();
          });

          return () => {
               if (persistTimeoutRef.current) {
                    clearTimeout(persistTimeoutRef.current);
               }
               unsubscribe();
          };
     }, [schedulePersistedQueryWrite]);

     if (isLoading || !dbReady) {
          logDebugMessage("6 Still loading, showing splash screen");
          return <SplashScreenNative />;
     }else{
          logDebugMessage("7 Loading AppContainer colorMode " + colorMode);
          return (
               <SafeAreaProvider>
                    <QueryClientProvider client={queryClient}>
                          <Sentry.TouchEventBoundary>
                                <GluestackUIProvider mode={colorMode}>
                                      <ToastRegistrar />
                                     <SearchProvider>
                                           <CheckoutsProvider>
                                                <HoldsProvider>
                                                     <SystemMessagesProvider>
                                                          <GroupedWorkProvider>
                                                               <AuthProvider>
                                                                    <StatusBar key={colorMode} style={colorMode === 'light' ? 'dark' : 'light'} />
                                                                    <View style={[{ flex: 1 }, themeVars]}>
                                                                         <App />
                                                                    </View>
                                                               </AuthProvider>
                                                          </GroupedWorkProvider>
                                                     </SystemMessagesProvider>
                                                </HoldsProvider>
                                           </CheckoutsProvider>
                                     </SearchProvider>
                                </GluestackUIProvider>
                          </Sentry.TouchEventBoundary>
                    </QueryClientProvider>
               </SafeAreaProvider>
          );
     }
}
