import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import _ from 'lodash';
import { Box } from '@/components/ui/box';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { ThemedSwitch as Switch } from '@/src/components/themed/ThemedSwitch';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { loadingSpinner } from '@/src/components/loadingSpinner';
import { createChannelsAndCategories } from '@/src/components/Notifications';
import { getNotificationPreferences, setNotificationPreference } from '@/src/util/api/user';
import { useUserState, useNotificationSettings, useUpdateUserProfile, useUpdateNotificationSettings } from '@/src/hooks/useUserData';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { refreshProfile } from '@/src/util/api/user';
import { logDebugMessage, logWarnMessage } from '@/src/util/logging';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';

/**
 * Settings_NotificationOptions component that displays notification options for the user. It allows users to enable or disable notifications for saved searches, custom notifications, and account-related notifications. It fetches the user's notification preferences and updates them based on user interactions.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const Settings_NotificationOptions = () => {
     const [isLoading, setLoading] = React.useState(false);
     const [notifySavedSearch, setNotifySavedSearch] = React.useState(false);
     const [notifyCustom, setNotifyCustom] = React.useState(false);
     const [notifyAccount, setNotifyAccount] = React.useState(false);

     const { data: userState } = useUserState();
     const expoToken = userState?.expoToken ?? false;
     const { data: notificationSettings } = useNotificationSettings();
     const library = useLibrary();
     const language = useActiveLanguage();

     const isNotificationsEnabled = Boolean(expoToken);

     const getPreferences = React.useCallback(async () => {
          if (!expoToken || !_.isObject(notificationSettings)) return;

          setLoading(true);
          try {
               const result = await getNotificationPreferences(library.baseUrl, expoToken);
               // noinspection JSUnresolvedReference
               if (result && result.savedPreferences) {
                    setNotifySavedSearch(Boolean(result.savedPreferences.notifySavedSearch));
                    setNotifyCustom(Boolean(result.savedPreferences.notifyCustom));
                    setNotifyAccount(Boolean(result.savedPreferences.notifyAccount));
               }else{
                    logDebugMessage("Loading preferences for expoToken failed");
                    logDebugMessage(result);
               }
          } catch (err) {
               logWarnMessage("Failed to load notification preferences on Android/iOS");
          } finally {
               setLoading(false);
          }
     }, [expoToken, library.baseUrl, notificationSettings]);

     useFocusEffect(
          React.useCallback(() => {
               // noinspection JSIgnoredPromiseFromCall
               createChannelsAndCategories();
               if (expoToken) {
                    // noinspection JSIgnoredPromiseFromCall
                    getPreferences();
               }
          }, [expoToken, getPreferences])
     );

     if (isLoading) {
          return loadingSpinner();
     }

     logDebugMessage("Rendering Notification Options");
     logDebugMessage(notificationSettings);
     return (
          <ScreenContainer safeArea style={{ flex: 1 }}>
               <Box className="flex-1 py-5">
                    <HStack space="sm" className="pb-3 items-center justify-between">
                         <Text bold>{getTermFromDictionary(language, 'notifications_allow')}</Text>
                         <Switch
                              isDisabled={true}
                              value={isNotificationsEnabled}
                         />
                    </HStack>
                    {/* Show options whenever an expoToken is present and settings object exists */}
                    {isNotificationsEnabled && _.isObject(notificationSettings) ? (
                         <VStack space="md" className="flex-1">
                              <EnableAllNotifications
                                   setLoading={setLoading}
                                   notifySavedSearch={notifySavedSearch}
                                   setNotifySavedSearch={setNotifySavedSearch}
                                   notifyCustom={notifyCustom}
                                   setNotifyCustom={setNotifyCustom}
                                   notifyAccount={notifyAccount}
                                   setNotifyAccount={setNotifyAccount}
                              />
                              <FlatList
                                   data={Object.keys(notificationSettings)}
                                   renderItem={({ item }) => (
                                        <DisplayPreference
                                             data={notificationSettings[item]}
                                             notifySavedSearch={notifySavedSearch}
                                             setNotifySavedSearch={setNotifySavedSearch}
                                             notifyCustom={notifyCustom}
                                             setNotifyCustom={setNotifyCustom}
                                             notifyAccount={notifyAccount}
                                             setNotifyAccount={setNotifyAccount}
                                        />
                                   )}
                                   keyExtractor={(item, index) => index.toString()}
                              />
                         </VStack>
                    ) : null}
               </Box>
          </ScreenContainer>
     );
};

/**
 * EnableAllNotifications component that provides a switch to enable or disable all notifications for the user. It updates the user's notification preferences based on the switch state and refreshes the user profile accordingly.
 * @param data
 * @returns {React.JSX.Element}
 * @constructor
 */
const EnableAllNotifications = (data) => {
     const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const updateUserProfile = useUpdateUserProfile();
     const updateNotificationSettings = useUpdateNotificationSettings();
     const expoToken = userState?.expoToken ?? false;
     const library = useLibrary();
     const { notifySavedSearch, setNotifySavedSearch, notifyCustom, setNotifyCustom, notifyAccount, setNotifyAccount, setLoading } = data;

     let defaultToggleState = notifyCustom && notifyAccount && notifySavedSearch;
     const [toggled, setToggle] = React.useState(defaultToggleState);
     const toggleSwitch = () => setToggle((previousState) => !previousState);

     const enableAllNotifications = async (value) => {
          logDebugMessage("Enable/Disable All Notifications");
          logDebugMessage(value);
          setLoading(true);
          let allowAllNotifications = true;
          if (value === 0 || value === 'false' || value === false) {
               allowAllNotifications = false;
          }
          if (expoToken) {
               await setNotificationPreference(library.baseUrl, expoToken, 'notifySavedSearch', allowAllNotifications, false);
               await setNotificationPreference(library.baseUrl, expoToken, 'notifyCustom', allowAllNotifications, false);
               await setNotificationPreference(library.baseUrl, expoToken, 'notifyAccount', allowAllNotifications, false);
               setNotifySavedSearch(allowAllNotifications);
               setNotifyCustom(allowAllNotifications);
               setNotifyAccount(allowAllNotifications);
               logDebugMessage("Reloading profile as part of enableAllNotifications");
               //TODO: Update this to not do a full reload of the profile
               await refreshProfile(library.baseUrl).then(async (data) => {
                    await updateUserProfile(data);
                    updateNotificationSettings(data.notification_preferences, language);
                    setLoading(false);
               });
          }else{
               logDebugMessage("No expoToken in enableAllNotifications");
          }
     };

     logDebugMessage("Rendering enable all notifications switch");
     return (
          <HStack space="sm" className="items-center justify-between pb-1">
               <Text bold>{getTermFromDictionary(language, 'notifications_enable_all')}</Text>
               <Switch
                    onValueChange={() => {
                         toggleSwitch();
                         enableAllNotifications(!toggled).then((r) => {
                              logDebugMessage(r);
                         });
                    }}
                    defaultValue={toggled}
                    value={toggled}
               />
          </HStack>
     );
};

/**
 * DisplayPreference component that renders a single notification preference option with a toggle switch. It updates the user's notification preferences based on the switch state and refreshes the user profile accordingly.
 * @param param0
 * @param param0.data
 * @param param0.notifySavedSearch
 * @param param0.setNotifySavedSearch
 * @param param0.notifyCustom
 * @param param0.setNotifyCustom
 * @param param0.notifyAccount
 * @param param0.setNotifyAccount
 * @returns {React.JSX.Element}
 * @constructor
 */
const DisplayPreference = ({ data, notifySavedSearch, setNotifySavedSearch, notifyCustom, setNotifyCustom, notifyAccount, setNotifyAccount }) => {
     const { data: userState } = useUserState();
     const updateUserProfile = useUpdateUserProfile();
     const expoToken = userState?.expoToken ?? false;
     const library = useLibrary();

     const preference = data;

     // Derive current toggle state directly from parent props
     let isChecked = false;
     if (preference.option === 'notifySavedSearch') {
          isChecked = notifySavedSearch;
     } else if (preference.option === 'notifyCustom') {
          isChecked = notifyCustom;
     } else if (preference.option === 'notifyAccount') {
          isChecked = notifyAccount;
     }

     const updatePreference = async (prefOption, currentValue) => {
          const newValue = !currentValue;

          if (expoToken) {
               logDebugMessage(`Updating Preference ${prefOption} to ${newValue}`);

               // Instantly update parent UI state
               if (prefOption === 'notifySavedSearch') setNotifySavedSearch(newValue);
               if (prefOption === 'notifyCustom') setNotifyCustom(newValue);
               if (prefOption === 'notifyAccount') setNotifyAccount(newValue);

               // Pass `toast` as the 1st parameter to match setNotificationPreference signature
               await setNotificationPreference(library.baseUrl, expoToken, prefOption, newValue);

               logDebugMessage("Reloading Profile as part of updatePreference");
               const result = await refreshProfile(library.baseUrl);
               if (result) {
                    await updateUserProfile(result);
               }
          } else {
               logDebugMessage("No expo token in NotificationOptions->updatePreference");
          }
     };

     logDebugMessage(`Rendering preference toggle for ${preference.label}`);
     return (
          <HStack space="sm" className="items-center justify-between pb-1">
               <Text>{preference.label}</Text>
               <Switch
                    onValueChange={() => updatePreference(preference.option, isChecked)}
                    value={isChecked}
               />
          </HStack>
     );
};
