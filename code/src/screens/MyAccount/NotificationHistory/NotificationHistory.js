import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { loadError } from '@/src/components/loadError';
import { loadingSpinner } from '@/src/components/loadingSpinner';
import { DisplaySystemMessage } from '@/src/components/Notifications';
import { SystemMessagesContext } from '@/src/context/initialContext';
import { useNotificationHistory, useUpdateNotificationHistory, useInbox, useUpdateInbox } from '@/src/hooks/useUserData';
import { navigate } from '@/src/helpers/RootNavigator';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { stripHTML, truncate } from '@/src/helpers/helpers';
import { fetchNotificationHistory } from '@/src/util/api/user';
import { formatNotificationHistory } from '@/src/util/api/userHelper';
import { logDebugMessage, logErrorMessage, getErrorMessage } from '@/src/util/logging';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { Box } from '@/components/ui/box';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { FlatList } from '@/components/ui/flat-list';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';

/**
 * MyNotificationHistory component that displays a list of notification history for the user. It fetches the notification history from the API and renders them in a FlatList. It also handles system messages, loading states, and error states.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MyNotificationHistory = () => {
     const navigation = useNavigation();
     const [isFetching, setIsFetching] = React.useState(false);
     const [fetchError, setFetchError] = React.useState(null);
     const [page, setPage] = React.useState(1);
     const [paginationLabel, setPaginationLabel] = React.useState('Page 1 of 1');
     const library = useLibrary();
     const language = useActiveLanguage();
     const { colorMode, neutralPairs } = useTheme();
     const { data: notificationHistory } = useNotificationHistory();
     const updateNotificationHistory = useUpdateNotificationHistory();
     const { data: inbox } = useInbox();
     const updateInbox = useUpdateInbox();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const systemMessagesForScreen = React.useMemo(() => {
          if (!Array.isArray(systemMessages)) return [];
          return systemMessages.filter((obj) => obj.showOn === '0' || obj.showOn === '1');
     }, [systemMessages]);

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box /> });
     }, [navigation]);

     React.useEffect(() => {
          const loadHistory = async () => {
               setIsFetching(true);
               setFetchError(null);
               try {
                    const data = await fetchNotificationHistory(page, 20, true, library.baseUrl, language);
                    if (data.ok) {
                         const history = formatNotificationHistory(data.data.result);
                         await updateInbox(history.inbox ?? []);
                         await updateNotificationHistory(history);

                         let tmp = getTermFromDictionary(language, 'page_of_page');
                         tmp = tmp.replace('%1%', history.curPage || page);
                         tmp = tmp.replace('%2%', history.totalPages || 1);
                         setPaginationLabel(tmp);
                    } else {
                         logDebugMessage("Error fetching notification history");
                         logDebugMessage(data);
                         getErrorMessage(data.code ?? 0, data.problem);
                    }
               } catch (error) {
                    logDebugMessage("Error fetching notification history");
                    logErrorMessage(error);
                    setFetchError(error);
               } finally {
                    setIsFetching(false);
               }
          };
          loadHistory();
     }, [library.baseUrl, language, page, updateInbox, updateNotificationHistory]);

     const showSystemMessage = () => {
          if (Array.isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0' || obj.showOn === '1') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} />;
                    }
               });
          }
          return null;
     };

     const Empty = () => {
          return (
               <>
                   {systemMessagesForScreen.length > 0 ? <Box className="p-2">{showSystemMessage()}</Box> : null}
                   <Center className="flex-1 p-5">
                        <Heading className="pt-5">{getTermFromDictionary(language, 'notification_history_empty')}</Heading>
                    </Center>
               </>
          );
     };

     const Paging = () => {
          if (notificationHistory?.totalResults > 0) {
               return (
                    <Box className="px-4 py-2" style={{ borderTopWidth: 1, borderColor: colorMode === 'light' ? neutralPairs.surface.light : neutralPairs.iconMuted.dark, flexWrap: 'nowrap', alignItems: 'center' }}>
                         <ScrollView horizontal>
                              <ButtonGroup>
                                   <Button onPress={() => setPage(page - 1)} isDisabled={page === 1} size="sm" colorScheme="primary">
                                        <ButtonText>{getTermFromDictionary(language, 'previous')}</ButtonText>
                                   </Button>
                                   <Button
                                        colorScheme="primary"
                                        onPress={() => {
                                             const totalPages = notificationHistory?.totalPages ?? 1;
                                             if (page < totalPages) {
                                                  logDebugMessage('Adding to page');
                                                  setPage(page + 1);
                                             }
                                        }}
                                        isDisabled={isFetching || page >= (notificationHistory?.totalPages ?? 1)}
                                        size="sm">
                                       <ButtonText>{getTermFromDictionary(language, 'next')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ScrollView>
                         <Text size="2xs" className="mt-2">
                              {paginationLabel}
                         </Text>
                    </Box>
               );
          }
          return null;
     };

     const handleOpenMyMessage = (item) => {
          navigate('MyNotificationHistoryMessageModal', {
               message: item });
     };

     return (
          <ScreenContainer>
               {systemMessagesForScreen.length > 0 ? <Box className="p-2">{showSystemMessage()}</Box> : null}
               {isFetching && !inbox?.length ? (
                    loadingSpinner()
               ) : fetchError ? (
                    loadError('Error', '')
               ) : (
                    <>
                         <FlatList data={inbox} ListEmptyComponent={Empty} ListFooterComponent={Paging} renderItem={({ item }) => <Item data={item} handleOpenMyMessage={handleOpenMyMessage} />} keyExtractor={(item, index) => index.toString()} contentContainerStyle={{ paddingBottom: 30 }} />
                    </>
               )}
          </ScreenContainer>
     );
};

/**
 * Item component that renders a single notification history item. It displays the title, content, and read status of the message. When pressed, it calls the handleOpenMyMessage function to navigate to the message details.
 * @param data
 * @returns {React.JSX.Element}
 * @constructor
 */
const Item = (data) => {
     const { colorMode, neutralPairs } = useTheme();
     const message = data.data;
     const handleOpenMyMessage = data.handleOpenMyMessage;
     let content = stripHTML(message.content);
     content = truncate(content, 35);
     return (
          <Pressable onPress={() => handleOpenMyMessage(message)} className="pl-4 pr-5 py-2" style={{ borderBottomWidth: 1, borderColor: colorMode === 'light' ? neutralPairs.border.light : neutralPairs.iconMuted.dark }}>
               <HStack className="items-start">
                    {message.isRead === '0' ? (
                         <Box className="w-[7%]">
                              <MaterialIcons name="fiber-manual-record" size={12} />
                         </Box>
                    ) : (
                         <Box className="w-[7%]" />
                    )}
                    <VStack className="w-[86%]">
                         {message.isRead === '0' ? (
                              <Text bold size="sm">
                                   {message.title}
                              </Text>
                         ) : (
                              <Text size="sm">
                                   {message.title}
                              </Text>
                         )}
                         <Text size="xs">
                              {content}
                         </Text>
                    </VStack>
                    <Box className="w-[7%]">
                         <MaterialIcons name="chevron-right" size={20} color={colorMode === 'light' ? neutralPairs.actionableIndicator.light : neutralPairs.actionableIndicator.dark} />
                    </Box>
               </HStack>
          </Pressable>
     );
};
