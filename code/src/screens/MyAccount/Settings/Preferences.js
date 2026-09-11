import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import _ from 'lodash';
import React from 'react';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { ThemedDivider as Divider } from '@/src/components/themed/ThemedDivider';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { useUserState, useUpdateExpoToken } from '@/src/hooks/useUserData';
import { navigate } from '@/src/helpers/RootNavigator';
import { useTheme } from '@/src/themes/theme';
import { UseColorMode } from '@/src/themes/ThemeSwitcher';
import { getTermFromDictionary, LanguageSwitcher } from '@/src/translations/TranslationService';
import { logErrorMessage } from '@/src/util/logging';
import * as Device from "expo-device";
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';

/**
 * PreferencesScreen component that displays user preferences and settings. It allows users to manage browse categories, pickup locations, device permissions, support, language, and appearance settings. It also handles fetching and updating the Expo push notification token when the screen is focused.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const PreferencesScreen = () => {
      const { neutrals } = useTheme();
      const navigation = useNavigation();
      const library = useLibrary();
      const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const expoToken = userState?.expoToken ?? false;
     const updateExpoToken = useUpdateExpoToken();

     React.useEffect(() => {
          const updateTokens = navigation.addListener('focus', async () => {
               try {
                    const token = (!Device.isDevice
                         ? { data: 'ExponentPushToken[testToken' + Device.modelName + ']' }
                         : await Notifications.getExpoPushTokenAsync({
                              projectId: Constants.expoConfig.extra.eas.projectId })).data;
                    if (token) {
                         if (!_.isEmpty(user.notification_preferences)) {
                              const tokenStorage = user.notification_preferences;
                              if (_.find(tokenStorage, _.matchesProperty('token', token))) {
                                   updateExpoToken(token);
                              }
                         }
                    }
               } catch (error) {
                    logErrorMessage('Error fetching Expo push token:', error);
               }
          });
          return updateTokens;
     }, [navigation]);

     return (
         <ScreenContainer className="py-3">
               <VStack space="sm">
                    <VStack space="md">
                         <VStack space="sm">
                              <Pressable className="py-2" onPress={() => navigate('MyPreferences_ManageBrowseCategories', { prevRoute: 'Preferences' })}>
                                   <HStack space="xs" alignItems="center">
                                        <MaterialIcons name="chevron-right" size={24} style={{ color: neutrals.actionableIndicator }} />
                                        <Text className="font-medium">
                                             {getTermFromDictionary(language, 'manage_browse_categories')}
                                        </Text>
                                   </HStack>
                              </Pressable>
                              {library.allowPickupLocationUpdates ? (
                                   <Pressable className="py-2" onPress={() => navigate('MyPreferences_ManagePickupLocations')}>
                                        <HStack space="xs" alignItems="center">
                                             <MaterialIcons name="chevron-right" size={24} style={{ color: neutrals.actionableIndicator }} />
                                             <Text className="font-medium">
                                                  {getTermFromDictionary(language, 'manage_pickup_locations')}
                                             </Text>
                                        </HStack>
                                   </Pressable>
                              ) : null}
                              <Pressable className="py-2" onPress={() => navigate('PermissionDashboard')}>
                                   <HStack space="xs" alignItems="center">
                                        <MaterialIcons name="chevron-right" size={24} style={{ color: neutrals.actionableIndicator }} />
                                        <Text className="font-medium">
                                             {getTermFromDictionary(language, 'device_permissions')}
                                        </Text>
                                   </HStack>
                              </Pressable>
                              <Pressable className="py-2" onPress={() => navigate('MyDevice_Support')}>
                                   <HStack space="xs" alignItems="center">
                                        <MaterialIcons name="chevron-right" size={24} style={{ color: neutrals.actionableIndicator }} />
                                        <Text className="font-medium">
                                             {getTermFromDictionary(language, 'support')}
                                        </Text>
                                   </HStack>
                              </Pressable>
                         </VStack>
                    </VStack>
                    <Divider/>
                    <VStack>
                         <HStack className="justify-between items-center">
                              <Text bold>
                                   {getTermFromDictionary(language, 'language')}
                              </Text>
                              <LanguageSwitcher />
                         </HStack>
                         <HStack className="justify-between items-center">
                              <Text bold>
                                   {getTermFromDictionary(language, 'appearance')}
                              </Text>
                              <UseColorMode showText={true} />
                         </HStack>
                    </VStack>
               </VStack>
          </ScreenContainer>
     );
};
