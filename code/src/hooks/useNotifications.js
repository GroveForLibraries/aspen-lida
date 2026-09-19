import React from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { createChannelsAndCategories, registerForPushNotificationsAsync } from '../components/Notifications';
import { deletePushToken, getNotificationPreferences, savePushToken, setNotificationPreference } from '../util/api/user';
import {logSentryMessage, logDebugMessage, logWarnMessage} from '../util/logging';

// Configure default notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const useNotificationPermissions = (library, updateExpoToken, updateUserDebugMessage) => {
     const [permissionStatus, setPermissionStatus] = React.useState(false);
     const [isLoading, setLoading] = React.useState(false);
     const appState = React.useRef(AppState.currentState);
     const lastCheckedStatus = React.useRef(false);

     const pendingPromise = React.useRef(null);
     const checkAndUpdatePermissions = async (source, force = false) => {
          if (pendingPromise.current) {
               return pendingPromise.current;
          }
          const runCheck = async () => {
               updateUserDebugMessage("Checking and updating permissions from " + source + " force is " + (force ? 'true' : 'false'));
               try {
                    const { status } = await Notifications.getPermissionsAsync();
                    const isGranted = status === 'granted';
                    updateUserDebugMessage("Got permission async, status is " + status);


                    // Only update if status has changed or force update is requested
                    if (force || lastCheckedStatus.current !== isGranted) {
                         lastCheckedStatus.current = isGranted;
                         setPermissionStatus(isGranted);

                         // Clear tokens if permissions are revoked
                         if (!isGranted) {
                              updateUserDebugMessage("Clearing tokens because permissions are not granted in checkAndUpdatePermissions");
                              updateExpoToken(null);
                         }else{
                              await handlePermissionGranted();
                         }
                    }
                    return isGranted;
               } catch (error) {
                  logSentryMessage('Error checking permissions:', 'error', error);
                  return false;
               }
          };

          pendingPromise.current = runCheck();
          return pendingPromise.current;
     };

    React.useEffect(() => {
        const checkPermissions = async () => {
            const isGranted = await checkAndUpdatePermissions('checkPermissions Effect', true);
            if (!isGranted) {
                // If permissions are not granted, ensure tokens are cleared
                updateUserDebugMessage("Clearing tokens because permissions are not granted in checkPermissions");
                updateExpoToken(null);
            }
        };

        checkPermissions();

        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
                await checkAndUpdatePermissions('change subscription', true);
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const handlePermissionGranted = async () => {
        updateUserDebugMessage("Handling Permission Granted Project ID is " + Constants.expoConfig.extra.eas.projectId);
        try {
           const token = (!Device.isDevice
                  ? { data: 'ExponentPushToken[testToken' + Device.modelName + ']' }
                  : await Notifications.getExpoPushTokenAsync({
                       projectId: Constants.expoConfig.extra.eas.projectId,
                  })).data;

           logDebugMessage("Fetched expo push token " + token);
           updateUserDebugMessage("Fetched expo push token " + token.slice(-5));
           if (token) {
               updateUserDebugMessage("Saving Expo Token " + token.slice(-5));
               updateExpoToken(token);
           }else{
               updateUserDebugMessage("Not updating token because token is empty");
           }
        } catch (error) {
           updateUserDebugMessage("Error getting expo push token");
           updateUserDebugMessage(error);
        }

    };

     const addNotificationPermissions = async () => {
          updateUserDebugMessage("Adding Notification Permissions");

          try {
               setLoading(true);
               logDebugMessage("Creating Channels and Categories");
               await createChannelsAndCategories();
               updateUserDebugMessage("Calling Register for push notifications async");
               const result = await registerForPushNotificationsAsync(updateUserDebugMessage);

               if (result) {
                    updateUserDebugMessage("registerForPushNotificationsAsync succeeded, saving push token");
                    updateExpoToken(result);
                    updateUserDebugMessage("finished saving push token");

                    lastCheckedStatus.current = true;
                    setPermissionStatus(true);

                    await savePushToken(library.baseUrl, result, updateUserDebugMessage);
                    await checkAndUpdatePermissions('Add Notification Permissions'); // Update permission status after successful registration
                    return result;
               }else{
                    updateUserDebugMessage("registerForPushNotificationsAsync failed");
               }
               return false;
          } catch (error) {
               logSentryMessage('Error adding notification permissions:', 'error', error);
               return false;
          } finally {
               setLoading(false);
          }
     };

    const revokeNotificationPermissions = async () => {
        updateUserDebugMessage("Revoking Notification Permissions");
        try {
            setLoading(true);

            // Get current token before revoking
            const tokenData = !Device.isDevice
                ? { data: 'ExponentPushToken[testToken' + Device.modelName + ']' }
                : await Notifications.getExpoPushTokenAsync({
                    projectId: Constants.expoConfig.extra.eas.projectId,
                });

            if (tokenData?.data) {
                // Delete the token from the server first
                await deletePushToken(library.baseUrl, tokenData.data);

                // Clear preferences
                await setNotificationPreference(library.baseUrl, tokenData.data, 'notifySavedSearch', false, false);
                await setNotificationPreference(library.baseUrl, tokenData.data, 'notifyCustom', false, false);
                await setNotificationPreference(library.baseUrl, tokenData.data, 'notifyAccount', false, false);
            }

            // Update local state
            updateExpoToken(null);
            lastCheckedStatus.current = false;
            setPermissionStatus(false);

            // Clear badges
            await Notifications.setBadgeCountAsync(0);

            // Handle platform-specific settings navigation
            if (Platform.OS === 'android') {
                try {
                    // Try to open app settings directly first
                    await Linking.openSettings();
                } catch (err) {
                     logSentryMessage('Error opening Android settings:', 'error', err);
                    // If that fails, try opening through the system settings
                    try {
                        await Linking.openURL('android-settings://');
                    } catch (secondErr) {
                         logSentryMessage('Failed to open settings through alternative method:', 'error', secondErr);
                    }
                }
            } else if (Platform.OS === 'ios') {
                await Linking.openSettings();
            }

            // Set up a listener for when the app comes back to foreground
            const subscription = AppState.addEventListener('change', async (nextAppState) => {
                if (nextAppState === 'active') {
                    // Small delay to ensure Android has time to update permission state
                    setTimeout(async () => {
                         logDebugMessage("App was just reactivated, checking permissions again");
                        await checkAndUpdatePermissions('App Activation', true);
                        subscription.remove();
                    }, 1000);
                }
            });
        } catch (error) {
            logSentryMessage('Error revoking notification permissions:', 'error', error);
            await checkAndUpdatePermissions('revoke notifications error', true);
        } finally {
            setLoading(false);
        }
    };

    // Add an effect to check permissions status on mount and when app comes to foreground
    React.useEffect(() => {
        checkAndUpdatePermissions('Permissions status effect');

        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
                await checkAndUpdatePermissions('App activation event');
            }
        });

        return () => subscription.remove();
    }, []);

    return {
        permissionStatus,
        isLoading,
        addNotificationPermissions,
        revokeNotificationPermissions,
        checkAndUpdatePermissions
    };
};

export const useNotificationPreferences = (library, expoToken) => {
     const [preferences, setPreferences] = React.useState({
          notifySavedSearch: false,
          notifyCustom: false,
          notifyAccount: false,
     });

     const updatePreference = async (option, value) => {
          try {
               let optionChanged = false;
               if (option === 'notifySavedSearch') {
                    optionChanged = value !== preferences.notifySavedSearch;
               }else if (option === 'notifyCustom') {
                    optionChanged = value !== preferences.notifyCustom;
               }else{
                    optionChanged = value !== preferences.notifyAccount
               }
               if (optionChanged) {
                    logDebugMessage("Changing notification preference for " + option);
                    await setNotificationPreference(library.baseUrl, expoToken, option, value);
                    setPreferences(prev => ({...prev, [option]: value}));
               }
          } catch (error) {
               logSentryMessage(`Error updating ${option} preference:`, 'error', error);
          }
     };

     const loadPreferences = async (overrideToken = null) => {
          try {
               const tokenToUse = overrideToken || expoToken;
               logDebugMessage("Loading preferences for expoToken " + tokenToUse);
               const preferences = await getNotificationPreferences(library.baseUrl, tokenToUse);
               if (preferences !== false) {
                    logDebugMessage(preferences);
                    setPreferences({
                         notifySavedSearch: Boolean(preferences.savedPreferences?.notifySavedSearch) ?? false,
                         notifyCustom: Boolean(preferences.savedPreferences?.notifyCustom) ?? false,
                         notifyAccount: Boolean(preferences.savedPreferences?.notifyAccount) ?? false,
                    });
               }else{
                    logWarnMessage("Did not get preferences for the expoToken");
               }
          } catch (error) {
               logSentryMessage('Error loading notification preferences:', 'error', error);
          }
     };

     return {
          preferences,
          updatePreference,
          loadPreferences,
     };
};
