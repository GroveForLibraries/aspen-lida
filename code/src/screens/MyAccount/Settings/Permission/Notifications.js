import { ThemedMaterialIcons as MaterialIcons } from '../../../../components/themed/ThemedMaterialIcons';
import React from 'react';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { loadingSpinner } from '@/src/components/loadingSpinner';
import { ThemedAccordion as Accordion, ThemedAccordionContent as AccordionContent, ThemedAccordionHeader as AccordionHeader, ThemedAccordionItem as AccordionItem, ThemedAccordionTrigger as AccordionTrigger, ThemedAccordionTitleText as AccordionTitleText, ThemedAccordionContentText as AccordionContentText, ThemedAccordionIcon as AccordionIcon } from '@/src/components/themed/ThemedAccordion';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonIcon as ButtonIcon, ThemedButtonText as ButtonText } from '../../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedSwitch as Switch } from '@/src/components/themed/ThemedSwitch';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { useUserState, useNotificationSettings, useUpdateExpoToken, useAddDebugMessage } from '@/src/hooks/useUserData';
import { navigate } from '@/src/helpers/RootNavigator';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import Constants from 'expo-constants';
import { useNotificationPermissions, useNotificationPreferences } from '@/src/hooks/useNotifications';
import {logDebugMessage, logErrorMessage} from '@/src/util/logging';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { screenContentContainerStyle } from '@/src/components/ScreenContainer';

/**
 * NotificationPermissionStatus component that displays the current notification permission status and allows users to navigate to the permission description screen. It checks and updates the notification permissions on mount, when the screen comes into focus, and when the Expo token changes.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const NotificationPermissionStatus = () => {
    const { neutrals } = useTheme();
    const language = useActiveLanguage();
    const library = useLibrary();
    const { data: userState } = useUserState();
    const expoToken = userState?.expoToken ?? false;
    const updateExpoToken = useUpdateExpoToken();
    const addDebugMessage = useAddDebugMessage();
    const navigation = useNavigation();

    const { permissionStatus, checkAndUpdatePermissions } = useNotificationPermissions(library, updateExpoToken, addDebugMessage);

    // Check permissions on mount
    React.useEffect(() => {
        const checkStatus = async () => {
            await checkAndUpdatePermissions('Notifications Mount');
        };
        checkStatus();
    }, []);

    // Check permissions when screen comes into focus
    React.useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            checkAndUpdatePermissions('Notifications focus listener');
        });

        return () => unsubscribe?.();
    }, [navigation, checkAndUpdatePermissions]);

    // Check permissions when tokens change
    React.useEffect(() => {
        checkAndUpdatePermissions('Token change effect');
    }, [expoToken]);

    return (
        <Pressable onPress={() => navigate('PermissionNotificationDescription', { permissionStatus })} className="pb-3">
            <HStack space="md" justifyContent="space-between" alignItems="center">
                <Text bold>
                    {getTermFromDictionary(language, 'notification_permission')}
                </Text>
                <HStack alignItems="center">
                    <Text>
                        {permissionStatus ? getTermFromDictionary(language, 'allowed') : getTermFromDictionary(language, 'not_allowed')}
                    </Text>
                    <MaterialIcons name="chevron-right" size={20} className="ml-1" style={{ color: neutrals.actionableIndicator }} />
                </HStack>
            </HStack>
        </Pressable>
    );
};

export const NotificationPermissionDescription = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const prevRoute = route.params?.prevRoute ?? null;

    const { brand, textColor } = useTheme();
    const language = useActiveLanguage();
    const library = useLibrary();
    const { data: notifSettings } = useNotificationSettings();
    const notificationSettings = notifSettings;
    const { data: userState } = useUserState();
    const expoToken = userState?.expoToken ?? false;
    const updateExpoToken = useUpdateExpoToken();
    const addDebugMessage = useAddDebugMessage();

    const {
        permissionStatus,
        isLoading,
        addNotificationPermissions,
        revokeNotificationPermissions
    } = useNotificationPermissions(library, updateExpoToken, addDebugMessage);

    const {
        preferences,
        updatePreference,
        loadPreferences
    } = useNotificationPreferences(library, expoToken);

    React.useLayoutEffect(() => {
        if (prevRoute === 'notifications_onboard') {
            navigation.setOptions({
                headerLeft: () => (
                    <Button
                        className="mr-3 p-1"
                        style={{ backgroundColor: 'transparent' }}
                        onPress={() => {
                            navigation.goBack();
                        }}
                    >
                        <ButtonIcon
                            size="lg"
                            variant="outline"
                            style={{ borderWidth: 0, color: brand.primary.baseContrast }}
                            as={MaterialIcons}
                            name="chevron-left"
                        />
                    </Button>
                ) });
        }
    }, [navigation, prevRoute]);



     React.useEffect(() => {
          // Refetch preferences when permission status or expoToken changes
          if (permissionStatus && expoToken) {
               logDebugMessage("Fetching Preferences because permission status or expoToken changed")
               loadPreferences(expoToken);
          }
     }, [permissionStatus, expoToken]);

     const defaultSettings = {
          notifySavedSearch: { option: 'notifySavedSearch', label: getTermFromDictionary(language, 'saved_searches') },
          notifyCustom: { option: 'notifyCustom', label: getTermFromDictionary(language, 'library_updates') },
          notifyAccount: { option: 'notifyAccount', label: getTermFromDictionary(language, 'account_updates') }
     };

     // Use default settings if notificationSettings is not available
     const settings = notificationSettings || defaultSettings;

     /*React.useEffect(() => {
          const checkCurrentPermissions = async () => {
               const { status } = await Notifications.getPermissionsAsync();
               if (status === 'granted') {
                    // Always try to load preferences when permissions are granted
                    if (expoToken) {
                         logDebugMessage("Loading Preferences as part of checkCurrentPermissions " + expoToken);
                         await loadPreferences(expoToken);
                    } else {
                         // If we don't have a token but permissions are granted, try to get one
                         logDebugMessage("Do not have a valid expoToken in checkCurrentPermissions, getting a token");
                         await handlePermissionUpdate();
                    }
               }
          };

          checkCurrentPermissions();
     }, []);*/

     const handlePermissionUpdate = async () => {
          //Will return either false or the expoToken that was added
          const result = await addNotificationPermissions();
          if (result) {
               // Force a preference refresh after permissions are granted
               logDebugMessage("Loading preferences as pert of handlePermissionUpdate");
               await loadPreferences(result);
          }
     };

    // Add effect to check permissions when screen is focused
    React.useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            checkAndUpdatePermissions('Notifications focus effect');
        });

        return () => unsubscribe?.();
    }, [navigation, checkAndUpdatePermissions]);

    const checkAndUpdatePermissions = async () => {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== permissionStatus) {
            // Permission status has changed, update the state
            logDebugMessage('Permission status has changed, updating state, status is "' + status + '"');
            updatePermissionStatus(status === 'granted');
        }
    };

     const updatePermissionStatus = (status) => {
          // This function will update the permission status in the context and trigger a reload of preferences if needed
          if (status) {
               // If permissions are granted, load preferences
               logDebugMessage("Loading preferences as part of updatePermissionStatus")
               loadPreferences();
          } else {
               // If permissions are revoked, you might want to clear preferences or handle it accordingly
               // For now, we'll just log out the user as an example
               logDebugMessage('Permissions revoked, status is ' + status + ' (handling accordingly...)');
          }
     };

     if (isLoading) {
          return loadingSpinner();
     }

    return (
        <ScrollView contentContainerStyle={{ paddingVertical: 20, ...screenContentContainerStyle }}>
            <VStack alignItems="stretch">
                <Box>
                    <Text>{getTermFromDictionary(language, 'device_set_to')}</Text>
                    <Heading className="mb-1">
                        {permissionStatus ? getTermFromDictionary(language, 'allowed') : getTermFromDictionary(language, 'not_allowed')}
                    </Heading>
                    <Text>
                        {Constants.expoConfig.name} {permissionStatus ?
                            getTermFromDictionary(language, 'allowed_notification') :
                            getTermFromDictionary(language, 'not_allowed_notification')
                        }
                    </Text>

                    <Text className="mt-5">
                        {getTermFromDictionary(language, 'to_update_settings')}
                    </Text>

                    <NotificationPermissionUsage />

                    {permissionStatus && (
                        <Box className="mb-5">
                            <NotificationPreferencesSection
                                preferences={preferences}
                                updatePreference={updatePreference}
                                notificationSettings={settings}
                            />
                        </Box>
                    )}
                </Box>
                <NotificationPermissionUpdate
                    permissionStatus={permissionStatus}
                    addNotificationPermissions={handlePermissionUpdate}
                    revokeNotificationPermissions={revokeNotificationPermissions}
                />
            </VStack>
        </ScrollView>
    );
};

const NotificationPreferencesSection = ({ preferences, updatePreference, notificationSettings }) => {
    const { textColor } = useTheme();
    logDebugMessage(notificationSettings);
    return (
        <>
            {Object.entries(notificationSettings).map(([key, setting]) => (
                <HStack key={key} space="md" justifyContent="space-between" alignItems="center" className="my-2">
                    <Text>{setting.label}</Text>
                    <Switch
                        value={preferences[setting.option]}
                        onValueChange={(value) => updatePreference(setting.option, value)}
                    />
                </HStack>
            ))}
        </>
    );
};

const NotificationPermissionUsage = () => {
    const language = useActiveLanguage();

    return (
        <Accordion variant="unfilled" width="$full" size="sm">
            <AccordionItem value="description">
                <AccordionHeader>
                    <AccordionTrigger className="px-0">
                        {({ isExpanded }) => (
                            <>
                                <AccordionTitleText>
                                    {getTermFromDictionary(language, 'how_we_use_notification_title')}
                                </AccordionTitleText>
                                {isExpanded ?
                                    <AccordionIcon as={MaterialIcons} name="keyboard-arrow-up" className="ml-3" /> :
                                    <AccordionIcon as={MaterialIcons} name="keyboard-arrow-down" className="ml-3" />
                                }
                            </>
                        )}
                    </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent className="px-0">
                    <AccordionContentText>
                        {Constants.expoConfig.name} {getTermFromDictionary(language, 'how_we_use_notification_body')}
                    </AccordionContentText>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};

const NotificationPermissionUpdate = ({ permissionStatus, addNotificationPermissions, revokeNotificationPermissions }) => {
    const { neutrals, brand, textColor } = useTheme();
    const language = useActiveLanguage();
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [showAlertDialog, setShowAlertDialog] = React.useState(false);

    const handleUpdatePermissions = async () => {
        try {
            setIsUpdating(true);

            if (permissionStatus) {
                await revokeNotificationPermissions();
            } else {
                // First request permissions without any options
                const granted = await addNotificationPermissions();
                if (!granted) {
                    setShowAlertDialog(true);
                }
            }
        } catch (error) {
            logErrorMessage('Error updating permissions:');
            logErrorMessage(error);
            setShowAlertDialog(true);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Center>
            <Button
                onPress={handleUpdatePermissions}
                colorScheme="primary"
                isDisabled={isUpdating}
            >
                <ButtonText>
                    {permissionStatus ?
                        getTermFromDictionary(language, 'revoke_device_settings') :
                        getTermFromDictionary(language, 'update_device_settings')}
                </ButtonText>
            </Button>

            <AlertDialog
                isOpen={showAlertDialog}
                onClose={() => setShowAlertDialog(false)}
            >
                <AlertDialogBackdrop />
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <Heading>
                            {getTermFromDictionary(language, 'update_device_settings')}
                        </Heading>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        <Text>
                            {Platform.OS === 'android' ?
                                getTermFromDictionary(language, 'update_notification_android') :
                                getTermFromDictionary(language, 'update_notification_ios')}
                        </Text>
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <ButtonGroup className="flex-col items-stretch w-full">
                            <Button
                                onPress={() => {
                                    Linking.openSettings();
                                    setShowAlertDialog(false);
                                }}
                                colorScheme="primary"
                            >
                                <ButtonText>
                                    {getTermFromDictionary(language, 'open_device_settings')}
                                </ButtonText>
                            </Button>
                            <Button
                                variant="link"
                                onPress={() => setShowAlertDialog(false)}
                            >
                                <ButtonText style={{ color: textColor }}>
                                    {getTermFromDictionary(language, 'not_now')}
                                </ButtonText>
                            </Button>
                        </ButtonGroup>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Center>
    );
};
