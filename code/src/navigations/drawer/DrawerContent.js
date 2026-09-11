import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../../themes/theme';
import { UseColorMode } from '../../themes/ThemeSwitcher';
import React from 'react';
import { AuthContext } from '../../context/AuthContext';
import { AppState, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedBadge as Badge, ThemedBadgeText as BadgeText } from '../../components/themed/ThemedBadge';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedDivider as Divider } from '@/src/components/themed/ThemedDivider';
import { HStack } from '@/components/ui/hstack';
import { Image } from 'expo-image';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { showILSMessage } from '../../components/Notifications';
import { CheckoutsContext, HoldsContext, SystemMessagesContext } from '../../context/initialContext';
import {
     useCatalogStatus,
     useLibrary,
     useUpdateCatalogStatus,
} from '../../hooks/useLibrarySystemData';
import { useUpdateAvailableLocations, useLibraryLocation } from '../../hooks/useLibraryBranchData';
import { useUserState, useCards,
     useUpdateUserProfile, useUpdatePickupLocationPrefs,
     useUpdateAccounts, useUpdateCards, useUpdateLists, useUpdateListGroups } from '../../hooks/useUserData';
import { navigateStack } from '../../helpers/RootNavigator';
import { CatalogOffline } from '../../screens/Auth/CatalogOffline';
import { InvalidCredentials } from '../../screens/Auth/InvalidCredentials';
import { getTermFromDictionary, LanguageSwitcher } from '../../translations/TranslationService';
import { formatLists } from '../../util/api/listHelper';
import { getLocations, getCatalogStatus, getSystemMessages } from '../../util/api/system';
import { getILSMessages, refreshProfile, reloadProfile, validateSession, passUserToDiscovery, getPickupSublocations, getPatronHolds, getPatronCheckedOutItems, getPickupLocations, getLinkedAccounts } from '../../util/api/user';
import { sortCheckouts, sortHolds, formatLinkedAccounts, formatHolds, formatPickupLocations } from '../../util/api/userHelper';
import { getListGroups, getLists } from '../../util/api/list';
import { GLOBALS } from '../../util/globals';
import { stripHTML } from '../../helpers/helpers';
import { loadUserState } from '../../util/db';
import { logDebugMessage, logWarnMessage, logErrorMessage, getErrorMessage } from '../../util/logging.js';
import { useActiveLanguage, useDictionaryQuery } from '../../hooks/useLanguageData';
import { useTranslationWithValues } from '../../hooks/useTranslationWithValues';

Notifications.setNotificationHandler({
     handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false }) });

const USER_DATA_STALE_MS = 3 * 60 * 60 * 1000; // 3 hours — drawer background refresh

/**
 * Custom hook to manage a query with callbacks for success and error handling.
 * @param queryOptions
 * @param callbacks
 * @returns {{data, error: null, isLoading: boolean, isSuccess: boolean, isError: boolean, dataUpdatedAt: number, errorUpdatedAt: number, refetch: (function(): Promise<null|*|undefined>)|*}}
 */
const useQueryWithCallbacks = (queryOptions, callbacks = {}) => {
     const {
          queryKey = [],
          queryFn,
          enabled = true,
          refetchInterval,
          refetchIntervalInBackground = false,
          refetchOnWindowFocus,
          initialData,
          placeholderData,
          retry = 0,
          runOnMount = false } = queryOptions;

     const { onSuccess, onError } = callbacks;
     const onSuccessRef = React.useRef(onSuccess);
     const onErrorRef = React.useRef(onError);
     const queryFnRef = React.useRef(queryFn);
     const appStateRef = React.useRef(AppState.currentState);
     const requestInFlightRef = React.useRef(false);

     const queryKeySignature = React.useMemo(() => JSON.stringify(queryKey), [queryKey]);

     const executeQuery = React.useCallback(async () => {
          if (!enabled || typeof queryFnRef.current !== 'function' || requestInFlightRef.current) {
               return null;
          }
          requestInFlightRef.current = true;

          const maxAttempts = Math.max(1, Number(retry) + 1);
          let attempt = 0;
          let lastThrownError = null;

          try {
               while (attempt < maxAttempts) {
                    attempt += 1;
                    try {
                         const result = await queryFnRef.current();
                         if (onSuccessRef.current) {
                              await onSuccessRef.current(result);
                         }
                         return result;
                    } catch (thrownError) {
                         lastThrownError = thrownError;
                    }
               }

               if (onErrorRef.current) {
                    onErrorRef.current(lastThrownError);
               }
               return null;
          } finally {
               requestInFlightRef.current = false;
          }
     }, [enabled, retry]);

     React.useEffect(() => {
          onSuccessRef.current = onSuccess;
          onErrorRef.current = onError;
     }, [onSuccess, onError]);

     React.useEffect(() => {
          queryFnRef.current = queryFn;
     }, [queryFn]);

     React.useEffect(() => {
          if (!enabled || !runOnMount) {
               return;
          }

          executeQuery();
     }, [enabled, runOnMount, queryKeySignature, executeQuery]);

     React.useEffect(() => {
          if (!enabled || !refetchInterval) {
               return undefined;
          }

          const intervalId = setInterval(() => {
               const appIsActive = appStateRef.current === 'active';
               if (refetchIntervalInBackground || appIsActive || Platform.OS === 'web') {
                    executeQuery();
               }
          }, refetchInterval);

          return () => clearInterval(intervalId);
     }, [enabled, refetchInterval, refetchIntervalInBackground, executeQuery]);

     React.useEffect(() => {
          const subscription = AppState.addEventListener('change', (nextState) => {
               appStateRef.current = nextState;
               if (refetchOnWindowFocus === 'always' && nextState === 'active' && enabled) {
                    executeQuery();
               }
          });

          return () => subscription.remove();
     }, [enabled, refetchOnWindowFocus, executeQuery]);

     return {
          data: initialData ?? placeholderData,
          error: null,
          isLoading: false,
          isSuccess: false,
          isError: false,
          dataUpdatedAt: 0,
          errorUpdatedAt: 0,
          refetch: executeQuery };
};

/**
 * DrawerContent component that manages user data, notifications, and system messages, and handles various API calls to fetch and update user-related information.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const DrawerContent = (props) => {
     const [userLatitude, setUserLatitude] = React.useState(0);
     const [userLongitude, setUserLongitude] = React.useState(0);
     const insets = useSafeAreaInsets();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const userHoldPendingSortMethod = userState?.userHoldPendingSortMethod ?? 'sortTitle';
     const userHoldReadySortMethod = userState?.userHoldReadySortMethod ?? 'expire';
     const userCheckoutSortMethod = userState?.userCheckoutSortMethod ?? 'dueAsc';
     const { data: cards } = useCards();

     const updateUserProfile = useUpdateUserProfile();
     const updatePickupLocationPrefs = useUpdatePickupLocationPrefs();
     const updateAccounts = useUpdateAccounts();
      const updateCards = useUpdateCards();
      const updateLists = useUpdateLists();
      const updateListGroups = useUpdateListGroups();
      const updateAvailableLocations = useUpdateAvailableLocations();
      const library = useLibrary();
      const location = useLibraryLocation();
      const { status: catalogStatus } = useCatalogStatus();
       const updateCatalogStatus = useUpdateCatalogStatus();
      // noinspection JSUnusedLocalSymbols
      const [ notifications, setNotifications] = React.useState([]);
      const [messages, setILSMessages] = React.useState([]);
      const { updateCheckouts } = React.useContext(CheckoutsContext);
      const { updateHolds } = React.useContext(HoldsContext);
      const { updateSystemMessages } = React.useContext(SystemMessagesContext);
       const language = useActiveLanguage();
       const { dataUpdatedAt: dictionaryUpdatedAt } = useDictionaryQuery();
       const [invalidSession, setInvalidSession] = React.useState(false);


     React.useEffect(() => {
          const subscription = Notifications.addNotificationReceivedListener((notification) => {
               handleNewNotification(notification);
          });
          return () => subscription.remove();
     }, []);

     React.useEffect(() => {
          const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
               // noinspection JSIgnoredPromiseFromCall
               handleNewNotificationResponse(response);
          });
          return () => {
               subscription.remove();
          };
     }, []);

     useQueryWithCallbacks({
          queryKey: ['catalog_status', library.baseUrl],
          queryFn: () => getCatalogStatus(library.baseUrl),
          enabled: !!library.baseUrl,
          refetchInterval: 60 * 1000 * 5,
          refetchIntervalInBackground: true,
          refetchOnWindowFocus: 'always' }, {
          onSuccess: (data) => {
               if(data.ok) {
                    let catalogMessage = null;
                    if (data.data.result?.api?.message) {
                         catalogMessage = stripHTML(data.data.result.api.message);
                    }

                    let status = data.data.result?.catalogStatus ?? 0;
                    updateCatalogStatus(status, catalogMessage);
               } else {
                    logDebugMessage("Error fetching catalog status");
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onError: (error) => {
               logDebugMessage("Error fetching catalog status");
               logErrorMessage(error);
          }
     });


     useQueryWithCallbacks({
          queryKey: ['user', library.baseUrl, language],
          queryFn: () => refreshProfile(library.baseUrl),
          refetchInterval: 60 * 60 * 1000, // 1 hour
          refetchIntervalInBackground: true,
          refetchOnWindowFocus: 'always' }, {
          onSuccess: async (data) => {
               if(data.ok) {
                    logDebugMessage("Refreshed user in Drawer Content");
                    const validProfile = data.data.result.success ?? true;
                    if (validProfile) {
                         setInvalidSession(false);
                         const profile = data.data.result.profile;
                         // Only write to SQLite (and trigger re-renders) when the profile actually changed
                         if (JSON.stringify(userRef.current) !== JSON.stringify(profile)) {
                              await updateUserProfile(profile);
                         }
                    } else {
                         let errorFetching = data.errorFetching ?? false;
                         if (errorFetching === false) {
                              logWarnMessage("Session was invalid after reloading profile");
                              logWarnMessage(data);
                              setInvalidSession(true);
                         }
                         logErrorMessage(data);
                    }
               } else {
                    logDebugMessage("Error reloading user profile");
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onError: (error) => {
               logDebugMessage("Error reloading user profile");
               logErrorMessage(error);
          }
      });


      useQueryWithCallbacks({
          queryKey: ['holds', user.id, library.baseUrl, language],
          queryFn: () => getPatronHolds(userHoldReadySortMethod, userHoldPendingSortMethod, 'all', library.baseUrl, false, language),
          refetchInterval: 60 * 1000 * 15,
          refetchIntervalInBackground: true,
          refetchOnWindowFocus: 'always',
          placeholderData: [] }, {
          onSuccess: (data) => {
               if(data.ok) {
                    let holds = formatHolds(data.data.result.holds ?? []);
                    holds = sortHolds(holds, userHoldPendingSortMethod, userHoldReadySortMethod);
                    updateHolds(holds);
               } else {
                    logDebugMessage("Error fetching user holds");
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onError: (error) => {
               logDebugMessage("Error fetching user holds");
               logErrorMessage(error);
          }
     });

     useQueryWithCallbacks({
          queryKey: ['checkouts', user.id, library.baseUrl, language],
          queryFn: () => getPatronCheckedOutItems('all', library.baseUrl, false, language),
          refetchInterval: 60 * 1000 * 15,
          refetchIntervalInBackground: true,
          refetchOnWindowFocus: 'always' }, {
          onSuccess: (data) => {
               if(data.ok) {
                    let checkouts = data.data.result.checkedOutItems ?? [];
                    checkouts = sortCheckouts(checkouts, userCheckoutSortMethod);
                    updateCheckouts(checkouts);
               } else {
                    logDebugMessage("Error fetching user checkouts");
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onError: (error) => {
               logDebugMessage("Error fetching user checkouts");
               logErrorMessage(error);
          }
     });

     useQueryWithCallbacks({
          queryKey: ['lists', user.id, library.baseUrl, language],
          queryFn: () => getLists(library.baseUrl, 1, 20, 1),
          refetchInterval: 60 * 1000 * 15,
          refetchIntervalInBackground: true,
          notifyOnChangeProps: ['data'],
          refetchOnWindowFocus: 'always',
          placeholderData: [] }, {
          onSuccess: async (data) => {
               if(data.ok) {
                    await updateLists(data.data.result);
               } else {
                    logDebugMessage("Error fetching user lists");
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onError: (error) => {
               logDebugMessage("Error fetching user lists");
               logErrorMessage(error);
          }
     });

     useQueryWithCallbacks({
          queryKey: ['all_lists', user.id, library.baseUrl, language],
          queryFn: () => getLists(library.baseUrl, 1, 20, 0),
          refetchInterval: 60 * 1000 * 60,
          refetchIntervalInBackground: true,
          notifyOnChangeProps: ['data'],
          refetchOnWindowFocus: 'always',
          placeholderData: [] }, {
          onSuccess: async (data) => {
               if (data.ok) {
                    await updateLists({ ...data.data.result, lists: formatLists(data.data.result) });
               } else {
                    logDebugMessage('Error fetching all user lists');
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onError: (error) => {
               logDebugMessage('Error fetching all user lists');
               logErrorMessage(error);
          } });

     useQueryWithCallbacks({
          queryKey: ['list_groups', user.id, library.baseUrl, language],
          queryFn: () => getListGroups(library.baseUrl),
          refetchInterval: 60 * 1000 * 15,
          refetchIntervalInBackground: true,
          notifyOnChangeProps: ['data'],
          refetchOnWindowFocus: 'always',
          placeholderData: [] }, {
          onSuccess: async (data) => {
               if(data.ok) {
                    const groups = {
                         groups: data.data?.result?.groups ?? [],
                         unassigned: data.data?.result?.unassigned ?? 0
                    };
                    await updateListGroups(groups);
               } else {
                    logDebugMessage("Error fetching user list groups");
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onError: (error) => {
               logDebugMessage("Error fetching user list groups");
               logErrorMessage(error);
          }
     });

     useQueryWithCallbacks({
          queryKey: ['linked_accounts', user.id, library.baseUrl, language],
          queryFn: () => getLinkedAccounts(library.baseUrl, language),
          refetchInterval: 60 * 1000 * 15,
          refetchIntervalInBackground: true,
          notifyOnChangeProps: ['data'],
          refetchOnWindowFocus: 'always' }, {
          onSuccess: async (data) => {
               if(data.ok) {
                    const linkedAccounts = formatLinkedAccounts(user, cards ?? [], library.barcodeStyle, data.data.result.linkedAccounts);
                    await updateAccounts(linkedAccounts.accounts);
                    await updateCards(linkedAccounts.cards);
               } else {
                    logDebugMessage("Error fetching linked accounts (response was not ok)");
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onError: (error) => {
               logErrorMessage("Error fetching linked accounts");
               logErrorMessage(error);
          }
     });

     useQueryWithCallbacks({
          queryKey: ['pickup_locations', library.baseUrl, language],
          queryFn: () => getPickupLocations(library.baseUrl),
          refetchInterval: 60 * 1000 * 30,
          refetchIntervalInBackground: true,
          placeholderData: [] }, {
          onSuccess: async (data) => {
               logDebugMessage("Finished pickup_locations query, setting data");
               if(data.ok) {
                    const pickupLocations = formatPickupLocations(data.data.result);
                    await updatePickupLocationPrefs(
                         pickupLocations.preferredPickupLocationIsValid,
                         pickupLocations.preferredPickupLocationWarning
                    );
                    logDebugMessage("Finished pickup_locations query, done setting data");
               } else {
                    logDebugMessage("Error with pickup_locations query");
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onError: (error) => {
               logDebugMessage("Error fetching pickup locations");
               logErrorMessage(error);
          }
     });

     useQueryWithCallbacks({
          queryKey: ['pickup_sub_locations', library.baseUrl, language],
          queryFn: () => getPickupSublocations(library.baseUrl),
          refetchInterval: 60 * 1000 * 30,
          refetchIntervalInBackground: true,
          placeholderData: [] }, {
          onSuccess: (data) => {
               logDebugMessage('Finished pickup_sub_locations query, setting data');
               if (data) {
                    logDebugMessage('Finished pickup_sub_locations query, done setting data');
               } else {
                    logDebugMessage('Error with pickup_sub_locations query');
                    logDebugMessage(data);
                    getErrorMessage(data.code ?? 0, data.problem);
               }
          },
          onError: (error) => {
               logDebugMessage('Error fetching pickup sublocations');
               logErrorMessage(error);
          } });

     useQueryWithCallbacks({
          queryKey: ['locations', library.baseUrl, language, userLatitude, userLongitude],
          queryFn: () => getLocations(library.baseUrl, language, userLatitude, userLongitude),
          runOnMount: true,
          refetchInterval: 60 * 1000 * 30,
          refetchIntervalInBackground: true,
          refetchOnWindowFocus: 'always',
          placeholderData: [],
          enabled: !!library.baseUrl }, {
           onSuccess: (data) => {
                if(data.ok){
                     logDebugMessage("Updating locations");
                     //logDebugMessage(data);
                     updateAvailableLocations(data?.data?.result?.locations ?? []);
               } else {
                    logDebugMessage("Error fetching locations");
                    logDebugMessage(data);
                    getErrorMessage(data.code, data.problem)
               }
          },
          onError: (error) => {
               logDebugMessage("Error fetching locations");
               logErrorMessage(error);
          } });


      useQueryWithCallbacks({
           queryKey: ['session', library.baseUrl, user.id],
           queryFn: () => validateSession(library.baseUrl),
           initialData: GLOBALS.appSessionId,
           refetchInterval: 86400000,
           refetchIntervalInBackground: true,
           retry: 5 }, {
           onSuccess: (data) => {
                if(data.ok) {
                     if (typeof data.data.result?.session !== 'undefined') {
                          logDebugMessage("Got session data");
                          GLOBALS.appSessionId = data.data.result.session;
                     } else {
                          logWarnMessage("No session returned when validating session");
                     }
                } else {
                     logDebugMessage("Error validating session");
                     logDebugMessage(data);
                     getErrorMessage(data.code, data.problem)
                }
           },
           onError: (error) => {
                logDebugMessage("Error validating session");
                logErrorMessage(error);
           }
      });

      useQueryWithCallbacks({
           queryKey: ['system_messages', library.baseUrl],
           queryFn: () => getSystemMessages(library.libraryId ?? null, location?.locationId ?? null, library.baseUrl),
           enabled: !!library.baseUrl,
           runOnMount: true,
           refetchInterval: 60 * 1000 * 30,
           refetchIntervalInBackground: true,
           refetchOnWindowFocus: 'always' }, {
           onSuccess: (data) => {
                if (data.ok) {
                     logDebugMessage("Loaded System Messages in DrawerContent");
                     const rawMessages = data.data.result?.systemMessages;
                     const parsedMessages = Array.isArray(rawMessages)
                          ? rawMessages
                          : rawMessages
                               ? [rawMessages]
                               : [];
                     updateSystemMessages(parsedMessages);
                } else {
                     logDebugMessage("Error loading system messages in DrawerContent");
                     logDebugMessage(data);
                     getErrorMessage(data.code ?? 0, data.problem);
                }
           },
           onError: (error) => {
                logDebugMessage("Error fetching system messages in DrawerContent");
                logErrorMessage(error);
           }
      });

     const reloadProfileStartedRef = React.useRef(false);
     const userRef = React.useRef(user);
     const messagesRef = React.useRef(messages);
     const baseUrlRef = React.useRef(library.baseUrl);
     const updateUserProfileRef = React.useRef(updateUserProfile);

     React.useEffect(() => {
          userRef.current = user;
     }, [user]);

     React.useEffect(() => {
          messagesRef.current = messages;
     }, [messages]);

     React.useEffect(() => {
          baseUrlRef.current = library.baseUrl;
     }, [library.baseUrl]);

     React.useEffect(() => {
          updateUserProfileRef.current = updateUserProfile;
     }, [updateUserProfile]);

     useFocusEffect(
          React.useCallback(() => {
               let isMounted = true;
               const update = async () => {
                    if (!isMounted) {
                         logDebugMessage("Skipping DrawerContent useFocusEffect because component is unmounted");
                         return;
                    }

                    if (reloadProfileStartedRef.current) {
                         logDebugMessage("Skipping DrawerContent profile reload, already in progress");
                         return;
                    }
                    reloadProfileStartedRef.current = true;

                    try {
                         logDebugMessage("Starting DrawerContent useFocusEffect");

                         const cachedUserState = await loadUserState();
                         const isUserDataStale = !cachedUserState?.updatedAt || (Date.now() - cachedUserState.updatedAt > USER_DATA_STALE_MS);
                         if (!isUserDataStale) {
                              logDebugMessage('Skipping DrawerContent focus sync because cached user data is fresh');
                              return;
                         }

                         let latitude = await SecureStore.getItemAsync('latitude');
                         let longitude = await SecureStore.getItemAsync('longitude');
                         setUserLatitude(prev => (prev === latitude ? prev : latitude));
                         setUserLongitude(prev => (prev === longitude ? prev : longitude));

                         logDebugMessage("reloading profile as part of Drawer Content focus effect Base URL is " + baseUrlRef.current);
                         const result = await reloadProfile(baseUrlRef.current);
                         if (!isMounted) {
                              logDebugMessage("Drawer Content unmounted after reloading profile, stopping");
                              return;
                         }

                          if (JSON.stringify(userRef.current) !== JSON.stringify(result)) {
                              logDebugMessage("Updating user as part of Drawer Content focus effect")
                              await updateUserProfileRef.current(result);
                         } else {
                              logDebugMessage("No change needed because the profile was unchanged");
                         }

                         logDebugMessage("Fetching ILS Messages");
                         const response = await getILSMessages(baseUrlRef.current);
                         if (!isMounted) {
                              logDebugMessage("Drawer Content unmounted after fetching ILS Messages,")
                              return;
                         }

                         if (response.ok) {
                              let updatedMessages = response.data?.result?.messages ?? [];
                               if (JSON.stringify(messagesRef.current) !== JSON.stringify(updatedMessages)) {
                                   logDebugMessage("Updating ILS Messages");
                                   setILSMessages(response.data?.result?.messages ?? []);
                              }else{
                                   logDebugMessage("ILS Messages did not change");
                              }
                         } else {
                              logDebugMessage("Error fetching ILS messages");
                              logDebugMessage(response);
                              getErrorMessage(response.code, response.problem);
                         }
                    } catch (error) {
                         logErrorMessage("Error in DrawerContent useFocusEffect: " + error.message);
                    } finally {
                          reloadProfileStartedRef.current = false;
                    }
               };
               update();

               return () => {
                    isMounted = false;
               };
          }, [])
     );

     const handleNewNotification = (notification) => {
          logDebugMessage("Setting notifications");
          setNotifications(notification);
     };

     const handleNewNotificationResponse = async (response) => {
          logDebugMessage("Handling new notification response");
          await addStoredNotification(response);
     };

     const displayILSMessages = () => {
          if (messages) {
               if (Array.isArray(messages)) {
                    return messages.map((obj, index) => {
                         if (obj.message) {
                              return showILSMessage(obj.messageStyle, obj.message, index);
                         }
                    });
               }
          }

          return null;
     };

     if (catalogStatus > 0) {
          return <CatalogOffline key="catalog-offline-screen" />;
     }

     if (invalidSession === true || invalidSession === 'true') {
          return <InvalidCredentials key="invalid-credentials-screen" />;
     }

     return (
          <View className="flex-1">
               <DrawerContentScrollView
                    {...props}
                    contentContainerStyle={{
                         flexGrow: 1,
                         paddingTop: insets.top,
                         paddingBottom: insets.bottom }}
               >
                    <VStack className="flex-1 mx-3 gap-4">
                         <UserProfileOverview />

                         {displayILSMessages()}

                         <Divider className="my-3" />

                         <VStack key={`drawer-menu-${language}-${dictionaryUpdatedAt}`} className="flex-1">
                              <Checkouts />
                              <Holds />
                              <UserLists />
                              <SavedSearches />
                              <ReadingHistory />
                              <YearInReview />
                              <Fines />
                              <NotificationHistory />
                              <Events />
                              <Campaigns />

                              <Divider className="my-2" />

                              <UserProfile />
                              <LinkedAccounts />
                              <AlternateLibraryCard />
                         </VStack>

                         <VStack className="items-center pt-4 gap-3">
                              <HStack space={2}>
                                   <LogOutButton />
                              </HStack>
                              <HStack space={2} className="mt-2">
                                   <UseColorMode showText={false}/>
                                   <LanguageSwitcher />
                              </HStack>
                         </VStack>
                    </VStack>
               </DrawerContentScrollView>
          </View>
     );
};

const UserProfileOverview = () => {
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const textColor = neutrals.textMain;

     const icon = library.logoApp ?? library.favicon ?? Constants.expoConfig.ios.icon;

     return (
          <Box className="px-3">
               <HStack space="md" alignItems="center">
                    <Image source={icon} alt={getTermFromDictionary(language, 'library_card')} className="rounded-md" style={{ width: 42, height: 42 }} />
                    <Box className="ml-3">
                         {user.displayName ? (
                              <Text numberOfLines={1} className="max-w-[175px] font-bold" size="md">
                                   {user.displayName}
                              </Text>
                         ) : null}

                         {library && library.displayName ? (
                              <Text numberOfLines={1} className="max-w-[175px] font-medium" size="sm">
                                   {library.displayName}
                              </Text>
                         ) : null}
                         <HStack space="sm" alignItems="center">
                              <MaterialIcons name="credit-card" size={14} />
                              {(user.ils_barcode || user.cat_username) ? (
                                   <Text numberOfLines={1} className="max-w-[175px] font-medium" size="sm">
                                        {user.ils_barcode ?? user.cat_username}
                                   </Text>
                              ) : null}
                         </HStack>
                    </Box>
               </HStack>
          </Box>
     );
};

const Checkouts = () => {
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const textColor = neutrals.textMain;

     return (
          <Pressable
               className="px-2 py-2 rounded-md"
               onPress={() => {
                    navigateStack('AccountScreenTab', 'MyCheckouts', {
                         libraryUrl: library.baseUrl,
                         hasPendingChanges: false });
               }}>
               <HStack space="xs" alignItems="center">
                    <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                    <VStack>
                         <HStack space="xs" alignItems="center">
                              <Text className="font-medium">
                                   {getTermFromDictionary(language, 'checked_out_titles')}
                              </Text>
                              <Text className="font-bold"> ({user.numCheckedOut ?? 0})</Text>
                         </HStack>
                         {user.numOverdue > 0 ? (
                              <Badge colorScheme="error" className="mt-1 rounded self-start">
                                   <BadgeText colorScheme="error" className="text-xs">{getTermFromDictionary(language, 'checkouts_overdue_summary').replace("%1%", user.numOverdue)}</BadgeText>
                              </Badge>
                         ) : null}
                    </VStack>
               </HStack>
          </Pressable>
     );
};

const Holds = () => {
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { neutrals } = useTheme();
     const textColor = neutrals.textMain;
     const library = useLibrary();
     const language = useActiveLanguage();

     return (
          <Pressable
               className="px-2 py-2 rounded-md"
               onPress={() => {
                    navigateStack('AccountScreenTab', 'MyHolds', {
                         libraryUrl: library.baseUrl,
                         hasPendingChanges: false });
               }}>
               <HStack space="xs" alignItems="center">
                    <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                    <VStack>
                         <HStack space="xs" alignItems="center">
                              <Text className="font-medium">
                                   {getTermFromDictionary(language, 'titles_on_hold')}
                              </Text>
                              <Text className="font-bold"> ({user.numHolds ?? 0})</Text>
                         </HStack>
                         {user.numHoldsAvailable > 0 ? (
                              <Badge colorScheme="success" className="mt-1 rounded self-start">
                                   <BadgeText colorScheme="success" className="text-xs">{getTermFromDictionary(language, 'num_holds_ready_for_pickup', false).replace('%1%', user.numHoldsAvailable)}</BadgeText>
                              </Badge>
                         ) : null}
                    </VStack>
               </HStack>
          </Pressable>
     );
};

const UserLists = () => {
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const textColor = neutrals.textMain;

     return (
          <Pressable
               className="px-2 py-2 rounded-md"
               onPress={() => {
                    navigateStack('AccountScreenTab', 'MyLists', {
                         libraryUrl: library.baseUrl,
                         hasPendingChanges: false });
               }}>
               <HStack space="xs" alignItems="center">
                    <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                    <VStack>
                         <HStack space="xs" alignItems="center">
                              <Text className="font-medium">
                                   {getTermFromDictionary(language, 'my_lists')}
                              </Text>
                              <Text className="font-bold"> ({user.numLists ?? 0})</Text>
                         </HStack>
                    </VStack>
               </HStack>
          </Pressable>
     );
};

const SavedSearches = () => {
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const textColor = neutrals.textMain;
     const updatesCount = user.numSavedSearchesNew ?? 0;
     const { text: savedSearchSummary } = useTranslationWithValues('num_saved_searches_with_updates', updatesCount, { enabled: updatesCount > 0, addToDictionary: true });

     return (
          <Pressable
               className="px-2 py-2 rounded-md"
               onPress={() => {
                    navigateStack('AccountScreenTab', 'MySavedSearches', {
                         libraryUrl: library.baseUrl,
                         hasPendingChanges: false });
               }}>
               <HStack space="xs" alignItems="center">
                    <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                    <VStack>
                         <HStack space="xs" alignItems="center">
                              <Text className="font-medium">
                                   {getTermFromDictionary(language, 'saved_searches')}
                              </Text>
                              <Text className="font-bold"> ({user.numSavedSearches ?? 0})</Text>
                         </HStack>
                         {user.numSavedSearchesNew > 0 ? (
                              <Badge colorScheme="warning" className="mt-1 rounded self-start">
                                   <BadgeText colorScheme="warning" className="text-xs">{savedSearchSummary}</BadgeText>
                              </Badge>
                         ) : null}
                    </VStack>
               </HStack>
          </Pressable>
     );
};

const ReadingHistory = () => {
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const textColor = neutrals.textMain;

     return (
          <Pressable
               className="px-2 py-2 rounded-md"
               onPress={() => {
                    navigateStack('AccountScreenTab', 'MyReadingHistory', {
                         libraryUrl: library.baseUrl,
                         hasPendingChanges: false });
               }}>
               <HStack space="xs" alignItems="center">
                    <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                    <VStack>
                         <HStack space="xs" alignItems="center">
                              <Text className="font-medium">
                                   {getTermFromDictionary(language, 'reading_history')}
                              </Text>
                              <Text className="font-bold"> ({user.numReadingHistory ?? 0})</Text>
                         </HStack>
                    </VStack>
               </HStack>
          </Pressable>
     );
};

const UserProfile = () => {
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const textColor = neutrals.textMain;

     return (
          <Pressable
               className="px-2 py-2"
               onPress={() => {
                    navigateStack('AccountScreenTab', 'MyProfile', {
                         libraryUrl: library.baseUrl,
                         hasPendingChanges: false });
               }}>
               <HStack space="xs" alignItems="center">
                    <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                    <Text className="font-medium">{getTermFromDictionary(language, 'contact_information')}</Text>
               </HStack>
          </Pressable>
     );
};

const NotificationHistory = () => {
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const textColor = neutrals.textMain;

     if (library.displayIlsInbox === '1' || library.displayIlsInbox === 1 || library.displayIlsInbox === true) {
          return (
               <Pressable
                    className="px-2 py-2"
                    onPress={() => {
                         navigateStack('AccountScreenTab', 'MyNotificationHistory', {
                              hasPendingChanges: false });
                    }}>
                    <HStack space="xs" alignItems="center">
                         <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                         <Text className="font-medium">{getTermFromDictionary(language, 'notification_history')}</Text>
                    </HStack>
               </Pressable>
          );
     }else{
          return null;
     }
};

const LinkedAccounts = () => {
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const textColor = neutrals.textMain;

     if (library.allowLinkedAccounts === '1') {
          return (
               <Pressable
                    className="px-2 py-2"
                    onPress={() =>
                         navigateStack('AccountScreenTab', 'MyLinkedAccounts', {
                              libraryUrl: library.baseUrl,
                              hasPendingChanges: false })
                    }>
                    <HStack space="xs" alignItems="center">
                         <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                         <Text className="font-medium">
                              {getTermFromDictionary(language, 'linked_accounts')}
                         </Text>
                         <Text className="font-bold"> ({user.numLinkedAccounts ?? 0})</Text>
                    </HStack>
               </Pressable>
          );
     }

     return null;
};

const AlternateLibraryCard = () => {
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const textColor = neutrals.textMain;

     const shouldShowAlternateLibraryCard = library.showAlternateLibraryCard ?? false;

     if (shouldShowAlternateLibraryCard === '1' || shouldShowAlternateLibraryCard === 1) {
          return (
               <Pressable
                    className="px-2 py-2 rounded-md"
                    onPress={() => {
                         navigateStack('LibraryCardTab', 'MyAlternateLibraryCard', {
                              prevRoute: 'AccountDrawer',
                              hasPendingChanges: false });
                    }}>
                    <HStack space="xs" alignItems="center">
                         <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                         <Text className="font-medium">{getTermFromDictionary(language, 'alternate_library_card')}</Text>
                    </HStack>
               </Pressable>
          );
     }

     return null;
};

const Fines = () => {
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const backgroundColor = neutrals.surface;
     const textColor = neutrals.textMain;

     const shouldShowFines = library.showFines ?? true;

     let userFineAmount = user.fines ?? '$0.00';
     let hasFines = false;
     if (user.fines) {
          userFineAmount = userFineAmount.substring(1);
          userFineAmount = Number(userFineAmount);
          if (userFineAmount > 0) {
               hasFines = true;
          }
     }

     if (shouldShowFines) {
          return (
               <Pressable className="px-2 py-2 rounded-md" onPress={async () => await passUserToDiscovery(library.baseUrl, 'Fines', user.id, backgroundColor, textColor)}>
                    <HStack space="xs" alignItems="center">
                         <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                         <VStack>
                              <Text className="font-medium">{getTermFromDictionary(language, 'fines')}</Text>
                              <Badge colorScheme={hasFines ? 'error' : 'info'} className="mt-1 rounded self-start">
                                   <BadgeText colorScheme={hasFines ? 'error' : 'info'} className="text-xs">
                                        {user.fines ?? '$0.00'}
                                   </BadgeText>
                              </Badge>
                         </VStack>
                    </HStack>
               </Pressable>
          );
     }

     return null;
};

const Events = () => {
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();

     if (library.hasEventSettings) {
          return (
               <Pressable
                    className="px-2 py-2 rounded-md"
                    onPress={() => {
                         navigateStack('AccountScreenTab', 'MyEvents', {
                              libraryUrl: library.baseUrl,
                              hasPendingChanges: false });
                    }}>
                    <HStack space="xs" alignItems="center">
                         <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                         <VStack>
                              <Text className="font-medium">
                                   {getTermFromDictionary(language, 'events')}
                              </Text>
                              {user.numSavedEventsUpcoming > 0 ? (
                                   <Badge colorScheme="info" className="mt-1 rounded self-start">
                                        <BadgeText colorScheme="info" className="text-xs">{getTermFromDictionary(language, 'num_saved_events_upcoming').replace('%1%', user.numSavedEventsUpcoming)}</BadgeText>
                                   </Badge>
                              ) : null}
                         </VStack>
                    </HStack>
               </Pressable>
          );
     }

     return null;
};

const YearInReview = () => {
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const backgroundColor = neutrals.surface;
     const textColor = neutrals.textMain;
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const yearInReviewLabel = getTermFromDictionary(language, 'year_in_review');
     const viewNowLabel = getTermFromDictionary(language, 'view_now');

     const shouldShowYearInReview = user.hasYearInReview ?? false;

     if (shouldShowYearInReview) {
          return (
               <Pressable className="px-2 py-2 rounded-md" onPress={async () => await passUserToDiscovery(library.baseUrl, 'YearInReview', user.id, backgroundColor, textColor)}>
                    <HStack space="xs" alignItems="center">
                         <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                         <VStack>
                              <Text className="font-medium">{user.yearInReviewName ?? yearInReviewLabel}</Text>
                              <Badge colorScheme="info" className="mt-1 rounded self-start">
                                   <BadgeText colorScheme="info" className="text-xs">
                                        {viewNowLabel}
                                   </BadgeText>
                              </Badge>
                         </VStack>
                    </HStack>
               </Pressable>
          );
     }

     return null;
};

const Campaigns = () => {
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     if (library.hasCommunityEngagementEnabled) {
          return(
               <Pressable
                    className="px-2 py-2 rounded-md"
                    onPress={() =>
                         navigateStack('AccountScreenTab', 'MyCampaigns', {
                              libraryUrl: library.baseUrl,
                              hasPendingChanges: false })
                    }>
                    <HStack space="xs" alignItems="center">
                         <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                         <VStack>
                              <Text className="font-medium">
                                   {getTermFromDictionary(language, 'campaigns')}
                              </Text>
                         </VStack>
                    </HStack>
               </Pressable>
          );
     }else{
          return null;
     }
}

async function getStoredNotifications() {
     try {
          const notifications = await AsyncStorage.getItem('@notifications');
          return notifications != null ? JSON.parse(notifications) : null;
     } catch (e) {
          logErrorMessage(e);
     }
}

async function createNotificationStorage(message) {
     try {
          const array = [];
          array.push(message);
          const notification = JSON.stringify(array);
          await AsyncStorage.setItem('@notifications', notification);
     } catch (e) {
          logErrorMessage(e);
     }
}

async function addStoredNotification(message) {
     await getStoredNotifications().then(async (response) => {
          if (response) {
               response.push(message);
               try {
                    await AsyncStorage.setItem('@notifications', JSON.stringify(response));
               } catch (e) {
                    logErrorMessage(e);
               }
          } else {
               await createNotificationStorage(message);
          }
     });
}

function LogOutButton() {
     const language = useActiveLanguage();
     const { signOut } = React.useContext(AuthContext);
     const { brand } = useTheme();

     return (
          <Button size="md" onPress={signOut} colorScheme="primary">
               <MaterialIcons name="logout" size={14} color={brand.primary['500-text']} className="mr-1" />
               <ButtonText> {getTermFromDictionary(language, 'logout')}</ButtonText>
          </Button>
     );
}
