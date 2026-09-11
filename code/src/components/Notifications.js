import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import _ from 'lodash';
import React from 'react';
import { Platform } from 'react-native';
import { ThemedAlert as Alert, ThemedAlertIcon as AlertIcon, ThemedAlertText as AlertText } from './themed/ThemedAlert';
import { ThemedButton as Button, ThemedButtonIcon as ButtonIcon } from './themed/ThemedButton';
import { ThemedCloseIcon as CloseIcon } from './themed/ThemedFormControls';
import { ThemedMaterialIcons as MaterialIcons } from './themed/ThemedMaterialIcons';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Pressable } from '@/components/ui/pressable';
import { getTermFromDictionary } from '../translations/TranslationService';
import { dismissSystemMessage } from '../util/api/system';
import { normalizeDisplayText, stripHTML } from '../helpers/helpers';
import { logDebugMessage, logErrorMessage } from '../util/logging.js';
import { useTheme } from '../themes/theme';

/**
 * Registers the device for push notifications and returns the Expo push token.
 * @param updateUserDebugMessage
 * @returns {Promise<string|boolean>}
 */
export async function registerForPushNotificationsAsync(updateUserDebugMessage) {
     try {
          updateUserDebugMessage("Registering for push notifications async");

          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;

          // Only ask for permissions if not already granted
          if (existingStatus !== 'granted') {
               updateUserDebugMessage("Requesting notification permissions...");
               // Call requestPermissionsAsync without any parameters
               const { status } = await Notifications.requestPermissionsAsync();
               finalStatus = status;
          }

          if (finalStatus !== 'granted') {
               logErrorMessage('Failed to get push notification permissions');
               return false;
          }

          // Create notification channels for Android
          if (Platform.OS === 'android') {
               await createChannelsAndCategories();
          }

          // Get the token
          if (!Device.isDevice) {
               // For simulator
               updateUserDebugMessage("Running on simulator - using development notification setup");
               logDebugMessage("created simulator push token");
               return 'ExponentPushToken[testToken' + Device.modelName + ']';
          }else{
               //Real devices
               const response = await Notifications.getExpoPushTokenAsync({
                    projectId: Constants.expoConfig.extra.eas.projectId });

               logDebugMessage('Got push token:' + response.data);
               return response.data;
          }
     } catch (error) {
          logErrorMessage("Error in registerForPushNotificationsAsync:", error);
          updateUserDebugMessage("Error in registerForPushNotificationsAsync");
          updateUserDebugMessage(error);
          return false;
     }
}

async function createNotificationChannelGroup(id, name, description = null) {
     if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelGroupAsync(`${id}`, {
               name: `${name}`,
               description: `${description}` });
     }
}

async function getNotificationChannelGroup(group) {
     if (Platform.OS === 'android') {
          return Notifications.getNotificationChannelGroupAsync(`${group}`);
     }
     return false;
}

async function createNotificationChannel(id, name, groupId) {
     if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(`${id}`, {
               name: `${name}`,
               importance: Notifications.AndroidImportance.MAX,
               vibrationPattern: [0, 250, 250, 250],
               lightColor: '#FF231F7C',
               groupId: `${groupId}`,
               showBadge: true });
     }
}

async function getNotificationChannel(channel) {
     if (Platform.OS === 'android') {
          return Notifications.getNotificationChannelAsync(`${channel}`);
     }
     return false;
}

async function createNotificationCategory(id, name, button) {
     await Notifications.setNotificationCategoryAsync(`${id}`, [
          {
               identifier: `${name}`,
               buttonTitle: `${button}` },
     ]);
}

async function getNotificationCategories() {
     return Notifications.getNotificationCategoriesAsync();
}

export async function createChannelsAndCategories() {
     logDebugMessage('Creating channels and categories for notifications...');
     const updatesChannelGroup = await getNotificationChannelGroup('updates');
     if (!updatesChannelGroup) {
          await createNotificationChannelGroup('updates', 'Updates');
     }

     const savedSearchChannel = await getNotificationChannel('savedSearch');
     if (!savedSearchChannel) {
          await createNotificationChannel('savedSearch', 'Saved Searches', 'updates');
     }

     const libraryAlertChannel = await getNotificationChannel('libraryAlert');
     if (!libraryAlertChannel) {
          await createNotificationChannel('libraryAlert', 'Library Alert', 'updates');
     }

     const accountAlertChannel = await getNotificationChannel('accountAlert');
     if (!accountAlertChannel) {
          await createNotificationChannel('accountAlert', 'Account Alert', 'updates');
     }

     const existingCategories = await getNotificationCategories('savedSearch');

     const hasCategory = (identifier) =>
          existingCategories.some((cat) => cat.identifier === identifier);
     if (!hasCategory('savedSearch')) {
          await createNotificationCategory('savedSearch', 'Saved Searches', 'View');
     }

     if (!hasCategory('libraryAlert')) {
          await createNotificationCategory('libraryAlert', 'Library Alert', 'Read More');
     }

     if (!hasCategory('accountAlert')) {
          await createNotificationCategory('accountAlert', 'Account Alert', 'View');
     }
}

/** status/colorScheme options: success, error, info, warning **/
export function showILSMessage(type, message, index = 0) {
     const formattedMessage = stripHTML(message);
     logDebugMessage("Showing ILS Message");
     return (
          <Alert action={type} key={index} className="mx-2 mb-1">
               <AlertIcon action={type} className="mr-3" />
               <AlertText action={type} size="xs" bold>
                    {formattedMessage}
               </AlertText>
          </Alert>
     );
}

/** status/colorScheme options: success, error, info, warning **/
export const DisplayMessage = (props) => {
     const safeMessage = normalizeDisplayText(props.message);
     const fallbackMessage = getTermFromDictionary('en', 'unknown_error') || 'An unknown error occurred.';
     const displayMessage = safeMessage || fallbackMessage;

     return (
          <Alert action={props.type} variant="solid" className="mb-2 py-3 px-3 items-start min-h-0 h-[auto]">
               <AlertText action={props.type} variant="solid" size="sm" bold>
                    {displayMessage}
               </AlertText>
          </Alert>
     );
};

async function hideSystemMessage(allSystemMessages, currentMessageId, isDismissible, url) {
     let messages = allSystemMessages;
     // remove it from the array to hide it for the session
     messages = _.reject(messages, { id: currentMessageId });

     if (isDismissible === 1 || isDismissible === '1') {
          // send request to dismiss it with Discovery
          await dismissSystemMessage(currentMessageId, url);
     }

     return messages;
}

export const DisplayAndroidEndOfSupportMessage = (props) => {
     const setIsOpen = props.setIsOpen;
     const language = props.language;
     return (
          <Alert action="error" className="mb-3">
               <VStack space="xs" className="w-full">
                    <HStack alignItems="flex-start" justifyContent="space-between">
                         <AlertText action="error" size="sm">
                              {getTermFromDictionary(language, 'android_end_of_life')}
                         </AlertText>
                         <Button
                              variant="link"
                              onPress={() => setIsOpen(false)}>
                              <ButtonIcon as={MaterialIcons} name="close" size="md" />
                         </Button>
                    </HStack>
               </VStack>
          </Alert>
     );
};
/** status/colorScheme options: success, error, info, warning **/
export const DisplaySystemMessage = (props) => {
     const { neutrals } = useTheme();
     const queryClient = props.queryClient;
     const updateSystemMessages = props.updateSystemMessages;
     let style = props.style;
     if (style === '') {
          style = 'none';
     }else if (style === 'danger') {
          style = 'error';
     }
     logDebugMessage("System Message Style is " + style);

     return (
          <Alert action={style} variant="solid" className="min-h-50 mb-2 rounded">
               <VStack space="sm" className="w-full p-3">
                    <HStack alignItems="flex-start" justifyContent="space-between">
                         <AlertText action={style} variant="solid" className="mr-2">{props.message}</AlertText>
                         <Pressable
                              onPress={async () => {
                                   await hideSystemMessage(props.all, props.id, props.dismissable, props.url).then((result) => {
                                        queryClient.setQueryData(['system_messages', props.url], result);
                                        updateSystemMessages(result);
                                   });
                              }}>
                              <CloseIcon color={neutrals.icon} />
                         </Pressable>
                    </HStack>
               </VStack>
          </Alert>
     );
};
