import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { find, isEmpty, matchesProperty } from '../../../helpers/helpers';
import { Box, Divider, HStack, Icon, Pressable, Text, VStack, ChevronRightIcon } from '@gluestack-ui/themed';
import React from 'react';

import { useUserState, useUpdateExpoToken } from '../../../hooks/useUserData';

// custom components and helper files
import { navigate } from '../../../helpers/RootNavigator';
import { UseColorMode, useTheme } from '../../../themes/theme';
import { getTermFromDictionary, LanguageSwitcher } from '../../../translations/TranslationService';
import { logErrorMessage } from '../../../util/logging';
import * as Device from "expo-device";
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useLibrary } from '../../../hooks/useLibrarySystemData';
import { ThemeRefreshButton } from '../../../components/ThemeRefreshButton';

export const PreferencesScreen = () => {
      const navigation = useNavigation();
      const library = useLibrary();
      const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const expoToken = userState?.expoToken ?? false;
     const updateExpoToken = useUpdateExpoToken();
     const { textColor, theme } = useTheme();

     React.useEffect(() => {
          const updateTokens = navigation.addListener('focus', async () => {
               try {
                    const token = (!Device.isDevice
                         ? { data: 'ExponentPushToken[testToken' + Device.modelName + ']' }
                         : await Notifications.getExpoPushTokenAsync({
                              projectId: Constants.expoConfig.extra.eas.projectId })).data;
                    if (token) {
                         if (!isEmpty(user.notification_preferences)) {
                              const tokenStorage = user.notification_preferences;
                              if (find(tokenStorage, matchesProperty('token', token))) {
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
          <Box p="$3">
               <VStack space="sm">
                    <VStack space="md">
                         <VStack space="sm">
                              <Pressable py="$2" onPress={() => navigate('MyPreferences_ManageBrowseCategories', { prevRoute: 'Preferences' })}>
                                   <HStack space="xs" alignItems="center">
                                        <Icon as={MaterialIcons} name="chevron-right" size="xl" color={textColor} />
                                        <Text color={textColor} fontWeight="$medium">
                                             {getTermFromDictionary(language, 'manage_browse_categories')}
                                        </Text>
                                   </HStack>
                              </Pressable>
                              {library.allowPickupLocationUpdates ? (
                                   <Pressable py="$2" onPress={() => navigate('MyPreferences_ManagePickupLocations')}>
                                        <HStack space="xs" alignItems="center">
                                             <Icon as={MaterialIcons} name="chevron-right" size="xl" color={textColor} />
                                             <Text color={textColor} fontWeight="$medium">
                                                  {getTermFromDictionary(language, 'manage_pickup_locations')}
                                             </Text>
                                        </HStack>
                                   </Pressable>
                              ) : null}
                              <Pressable py="$2" onPress={() => navigate('PermissionDashboard')}>
                                   <HStack space="xs" alignItems="center">
                                        <Icon as={MaterialIcons} name="chevron-right" size="xl" color={textColor} />
                                        <Text color={textColor} fontWeight="$medium">
                                             {getTermFromDictionary(language, 'device_permissions')}
                                        </Text>
                                   </HStack>
                              </Pressable>
                              <Pressable py="$2" onPress={() => navigate('MyDevice_Support')}>
                                   <HStack space="xs" alignItems="center">
                                        <Icon as={MaterialIcons} name="chevron-right" size="xl" color={textColor} />
                                        <Text color={textColor} fontWeight="$medium">
                                             {getTermFromDictionary(language, 'support')}
                                        </Text>
                                   </HStack>
                              </Pressable>
                         </VStack>
                    </VStack>
                    <Divider/>
                    <VStack>
                         <HStack justifyContent="space-between" alignItems="center">
                              <Text color={textColor} bold>
                                   {getTermFromDictionary(language, 'language')}
                              </Text>
                              <LanguageSwitcher />
                         </HStack>
                         <HStack justifyContent="space-between" alignItems="center">
                              <Text color={textColor} bold>
                                   {getTermFromDictionary(language, 'appearance')}
                              </Text>
                              <UseColorMode showText={true} />
                         </HStack>
                    </VStack>
               </VStack>
          </Box>
     );
};
