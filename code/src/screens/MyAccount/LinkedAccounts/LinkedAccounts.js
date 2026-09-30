import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useContext, useLayoutEffect, useState } from 'react';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedDivider as Divider } from '@/src/components/themed/ThemedDivider';
import { FlatList } from '@/components/ui/flat-list';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { screenContentContainerStyle } from '@/src/components/ScreenContainer';
import { DisplayMessage, DisplaySystemMessage } from '@/src/components/Notifications';
import { SystemMessagesContext } from '@/src/context/initialContext';
import { useUserState, useAccounts, useViewers, useUpdateAccounts, useUpdateViewers, useUpdateUserProfile } from '@/src/hooks/useUserData';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { toArray } from '@/src/helpers/helpers';
import { getLinkedAccounts, getViewerAccounts, refreshProfile, removeLinkedAccount, removeViewerAccount } from '@/src/util/api/user';
import { formatLinkedAccounts } from '@/src/util/api/userHelper';
import AddLinkedAccount from './AddLinkedAccount';
import DisableAccountLinking from './DisableAccountLinking';
import EnableAccountLinking from './EnableAccountLinking';
import { logErrorMessage } from '@/src/util/logging';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';

/**
 * MyLinkedAccounts component that displays the user's linked accounts and viewers. It allows users to add, remove, and manage their linked accounts based on their permissions. The component fetches the user's linked accounts and viewers from the API and displays them in a list format. It also handles system messages and provides feedback on actions taken by the user.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MyLinkedAccounts = () => {
     const navigation = useNavigation();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: accounts } = useAccounts();
     const { data: viewers } = useViewers();
     const library = useLibrary();
     const language = useActiveLanguage();
     const {  } = useTheme();
     const queryClient = useQueryClient();
     const { systemMessages, updateSystemMessages } = useContext(SystemMessagesContext);

     let canUserLinkAccounts = true;
     let ptypeDisabledLinking = false;

     if ((user.disableAccountLinking !== '0' && user.disableAccountLinking !== 0) || user.addLinkedAccountRule === 3) {
          canUserLinkAccounts = false;

          if (user.addLinkedAccountRule === 3) {
               ptypeDisabledLinking = true;
          }
     }

     useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box /> });
     }, [navigation]);


     const Empty = () => {
          return (
               <Box className="pt-3 pb-5">
                    <Text bold>{getTermFromDictionary(language, 'none')}</Text>
               </Box>
          );
     };

     const showSystemMessage = () => {
          if (Array.isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0' || obj.showOn === '1') {
                         return (
                              <DisplaySystemMessage
                                   key={obj.id || index}
                                   style={obj.style}
                                   message={obj.message}
                                   dismissable={obj.dismissable}
                                   id={obj.id}
                                   all={systemMessages}
                                   url={library.baseUrl}
                                   updateSystemMessages={updateSystemMessages}
                                   queryClient={queryClient}
                              />
                         );
                    }
                    return null;
               });
          }
          return null;
     };

     if (!canUserLinkAccounts) {
          return (
               <ScrollView contentContainerStyle={{ ...screenContentContainerStyle, paddingVertical: 20, flexGrow: 1 }}>
                    {showSystemMessage()}
                    {ptypeDisabledLinking ? (
                         <DisplayMessage type="info" message={getTermFromDictionary(language, 'linked_account_disabled_by_ptype')} />
                    ) : (
                         <Box>
                              <DisplayMessage type="info" message={getTermFromDictionary(language, 'linked_account_disabled_by_user')} />
                              <EnableAccountLinking />
                         </Box>
                    )}
               </ScrollView>
          );
     }

     return (
          <ScrollView contentContainerStyle={{ ...screenContentContainerStyle, paddingVertical: 8, flexGrow: 1 }}>
               {showSystemMessage()}
               <DisplayMessage type="info" message={getTermFromDictionary(language, 'linked_info_message')} />

               {user.addLinkedAccountRule !== 1 ? (
                    <Box>
                         <Heading size="lg" className="pb-2">
                              {getTermFromDictionary(language, 'linked_additional_accounts')}
                         </Heading>
                         <Text size="sm">
                              {getTermFromDictionary(language, 'linked_following_accounts_can_manage')}
                         </Text>
                         <FlatList
                              data={accounts}
                              renderItem={({ item }) => <Account account={item} type="linked" />}
                              ListEmptyComponent={Empty}
                              keyExtractor={(item, index) => index.toString()}
                         />
                         <AddLinkedAccount />
                         <Divider className="my-4" />
                    </Box>
               ) : null}

               {user.addLinkedAccountRule !== 2 ? (
                    <Box>
                         <Heading size="lg" className="pb-2">
                              {getTermFromDictionary(language, 'linked_other_accounts')}
                         </Heading>
                         <Text size="sm">
                              {getTermFromDictionary(language, 'linked_following_accounts_can_view')}
                         </Text>
                         <FlatList
                              data={viewers}
                              renderItem={({ item }) => <Account account={item} type="viewer" />}
                              ListEmptyComponent={<Empty />}
                              keyExtractor={(item, index) => index.toString()}
                         />
                    </Box>
               ) : null}

               {user.addLinkedAccountRule !== 2 && user.removeLinkedAccountRule !== 0 ? (
                    <Box className="pb-5">
                         <Divider className="my-4" />
                         <DisableAccountLinking />
                    </Box>
               ) : null}
          </ScrollView>
     );
};

/**
 * Account component that displays an individual linked or viewer account with the option to remove it. It handles the removal process and updates the account list accordingly.
 * @param param0
 * @param param0.account
 * @param param0.type
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const Account = ({ account, type }) => {
     const [isRemoving, setIsRemoving] = useState(false);
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateAccounts = useUpdateAccounts();
     const updateViewers = useUpdateViewers();
     const updateUserProfile = useUpdateUserProfile();
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutralPairs } = useTheme();

     const refreshLinkedAccounts = async () => {
          const linkedResponse = await getLinkedAccounts(library.baseUrl, language);
          if (linkedResponse?.ok) {
               const formatted = formatLinkedAccounts(user, [], library.barcodeStyle, linkedResponse.data.result.linkedAccounts);
               await updateAccounts(formatted.accounts);
          }

          const viewerResponse = await getViewerAccounts(library.baseUrl, language);
          if (viewerResponse?.ok) {
               const viewerList = toArray(viewerResponse.data?.result?.viewers ?? []);
               await updateViewers(viewerList);
          }

          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     };

     const removeAccount = async () => {
          setIsRemoving(true);
          try {
               if (type === 'viewer') {
                    await removeViewerAccount(account.id, library.baseUrl, language);
               } else {
                    await removeLinkedAccount(account.id, library.baseUrl, language);
               }
               await refreshLinkedAccounts();
          } catch (error) {
               logErrorMessage(error);
          } finally {
               setIsRemoving(false);
          }
     };

     if (!account) return null;

     return (
          <HStack justifyContent="space-around" className="pt-2 pb-2" style={{ alignItems: 'center', alignContent: 'flex-start' }}>
               <Text bold isTruncated className="w-[60%] max-w-[60%]">
                    {account.displayName ? account.displayName : account.ils_barcode} - {account.homeLocation}
               </Text>
               {type === 'viewer' && user.removeLinkedAccountRule === 0 ? null : (
                    <Button
                        style={{ backgroundColor: neutralPairs.danger }}
                         isLoading={isRemoving}
                         isLoadingText={getTermFromDictionary(language, 'removing', true)}
                         size="sm"
                         onPress={removeAccount}
                    >
                        <ButtonText style={{ color: '#ffffff' }}>{getTermFromDictionary(language, 'remove')}</ButtonText>
                    </Button>
               )}
          </HStack>
     );
};
