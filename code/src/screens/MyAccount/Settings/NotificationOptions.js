import React from 'react';

import { useFocusEffect } from '@react-navigation/native';
import { isObject } from '../../../helpers/helpers';
import {Box, FlatList, HStack, Switch, Text, VStack} from '@gluestack-ui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadingSpinner } from '../../../components/loadingSpinner';
import { createChannelsAndCategories } from '../../../components/Notifications';
import { getNotificationPreferences, setNotificationPreference } from '../../../util/api/user';

import { useUserState, useNotificationSettings, useUpdateUserProfile, useUpdateNotificationSettings, useUpdateExpoToken } from '../../../hooks/useUserData';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { refreshProfile } from '../../../util/api/user';

import { logDebugMessage, logWarnMessage } from '../../../util/logging.js';
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useLibrary } from '../../../hooks/useLibrarySystemData';

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
          if (!expoToken || !isObject(notificationSettings)) return;

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
          <SafeAreaView style={{ flex: 1 }}>
               <Box flex={1} safeArea={5}>
                    <HStack space={3} pb={3} alignItems="center" justifyContent="space-between">
                         <Text bold>{getTermFromDictionary(language, 'notifications_allow')}</Text>
                         <Switch
                              isDisabled={true}
                              value={isNotificationsEnabled}
                         />
                    </HStack>
                    {/* Show options whenever an expoToken is present and settings object exists */}
                    {isNotificationsEnabled && isObject(notificationSettings) ? (
                         <VStack space="md" style={{ flex: 1 }}>
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
          </SafeAreaView>
     );
};

const EnableAllNotifications = (data) => {
     const language = useActiveLanguage();
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
          <HStack space={3} alignItems="center" justifyContent="space-between" pb={1}>
               <Text bold>{getTermFromDictionary(language, 'notifications_enable_all')}</Text>
               <Switch
                    onToggle={() => {
                         toggleSwitch();
                         enableAllNotifications(!toggled).then((r) => {
                              logDebugMessage(r);
                         });
                    }}
                    defaultValue={toggled}
                    isChecked={toggled}
               />
          </HStack>
     );
};

const DisplayPreference = ({ data, notifySavedSearch, setNotifySavedSearch, notifyCustom, setNotifyCustom, notifyAccount, setNotifyAccount }) => {
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
          <HStack space={3} alignItems="center" justifyContent="space-between" pb={1}>
               <Text>{preference.label}</Text>
               <Switch
                    onToggle={() => updatePreference(preference.option, isChecked)}
                    isChecked={isChecked}
               />
          </HStack>
     );
};
