import 'expo-dev-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';

import { LogBox } from 'react-native';

import { enableScreens } from 'react-native-screens';
import * as Sentry from '@sentry/react-native';
import App from './src/components/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { CheckoutsProvider, GroupedWorkProvider, HoldsProvider, SearchProvider, SystemMessagesProvider } from './src/context/initialContext';

import { SplashScreenNative } from './src/screens/Auth/SplashNative';
import { buildThemeForLibrary, THEME_STALE_MS, useThemeForDisplay } from './src/themes/theme';
import { ToastRegistrar } from './src/components/feedback';

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

export default function AppContainer() {
     const [isLoading, setLoading] = React.useState(true);
     const { colorMode, theme } = useThemeForDisplay();

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
                    const current = await loadThemeState();
                    await restorePersistedQueries();
                    const mode = current?.colorMode === 'dark' ? 'dark' : 'light';
                    const textColor = mode === 'dark' ? '$coolGray200' : '$warmGray600';
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
                                   textColor,
                                   themeColors: builtTheme.themeColors,
                              });
                         }
                    } else if (!current?.textColor || !current?.colorMode) {
                         await saveThemeState({
                              ...current,
                              colorMode: mode,
                              textColor,
                         });
                    }
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
                                <GluestackUIProvider config={theme} colorMode={colorMode}>
                                      <ToastRegistrar />
                                     <SearchProvider>
                                           <CheckoutsProvider>
                                                <HoldsProvider>
                                                     <SystemMessagesProvider>
                                                          <GroupedWorkProvider>
                                                               <AuthProvider>
                                                                    <StatusBar key={colorMode} style={colorMode === 'light' ? 'dark' : 'light'} backgroundColor={colorMode === 'light' ? '#FFFFFF' : '#000000'} translucent={false}/>
                                                                    <App />
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
