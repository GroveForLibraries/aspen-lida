import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import React from 'react';
import { FlatList, Platform } from 'react-native';
import { ThemedAccordion as Accordion, ThemedAccordionContent as AccordionContent, ThemedAccordionHeader as AccordionHeader, ThemedAccordionItem as AccordionItem, ThemedAccordionTrigger as AccordionTrigger, ThemedAccordionTitleText as AccordionTitleText, ThemedAccordionIcon as AccordionIcon } from '@/src/components/themed/ThemedAccordion';
import { ThemedActionsheet as Actionsheet, ThemedActionsheetBackdrop as ActionsheetBackdrop, ThemedActionsheetItem as ActionsheetItem, ThemedActionsheetContent as ActionsheetContent, ThemedActionsheetItemText as ActionsheetItemText } from '@/src/components/themed/ThemedActionsheet';
import { ThemedAlert as Alert, ThemedAlertIcon as AlertIcon, ThemedAlertText as AlertText } from '@/src/components/themed/ThemedAlert';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { Box } from '@/components/ui/box';
import { ScreenContainer, screenContentContainerStyle } from '@/src/components/ScreenContainer';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../../components/themed/ThemedSelect';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { loadError } from '@/src/components/loadError';
import { loadingSpinner } from '@/src/components/loadingSpinner';
import { DisplaySystemMessage } from '@/src/components/Notifications';
import { SystemMessagesContext } from '@/src/context/initialContext';
import { useUserState, useReadingHistory, useUpdateReadingHistory, useUpdateUserProfile } from '@/src/hooks/useUserData';
import { getAuthor, getCleanTitle, getDateLastUsed, getFormat, getTitle } from '@/src/helpers/item';
import { navigateStack } from '@/src/helpers/RootNavigator';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { deleteAllReadingHistory, deleteSelectedReadingHistory, fetchReadingHistory, optIntoReadingHistory, optOutOfReadingHistory, refreshProfile } from '@/src/util/api/user';
import { formatReadingHistory } from '@/src/util/api/userHelper';
import AddToList from '../../Search/AddToList';
import { logDebugMessage, logErrorMessage, getErrorMessage } from '@/src/util/logging';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField } from '@/src/components/themed/ThemedFormControls';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * MyReadingHistory component that displays the user's reading history. It fetches the reading history from the API and renders it in a FlatList. It also handles system messages, loading states, error states, and user actions such as opting in/out of reading history and deleting all history.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MyReadingHistory = () => {
     const navigation = useNavigation();
     const [isLoading, setLoading] = React.useState(false);
     const [fetchError, setFetchError] = React.useState(null);
     const [page, setPage] = React.useState(1);
     const [sort, setSort] = React.useState('checkedOut');
     const [searchTerm, setSearchTerm] = React.useState('');
     const [filter, setFilter] = React.useState('');
     const library = useLibrary();
     const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const { data: readingHistory } = useReadingHistory();
     const updateReadingHistory = useUpdateReadingHistory();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const pageSize = 20;
     const systemMessagesForScreen = React.useMemo(() => {
          if (!Array.isArray(systemMessages)) return [];
          return systemMessages.filter((obj) => obj.showOn === '0');
     }, [systemMessages]);
     const [paginationLabel, setPaginationLabel] = React.useState('Page 1 of 1');
     const { neutralPairs, textColor, neutrals } = useTheme();
     const panelBg = neutrals.surface;
     const borderColor = neutrals.border;
     const dangerColor = neutralPairs.danger;
     const pageHistory = React.useMemo(() => {
          if (!Array.isArray(readingHistory?.history)) return [];
          return readingHistory.history.slice(0, pageSize);
     }, [readingHistory?.history, pageSize]);

     const [sortBy, setSortBy] = React.useState({
          title: 'Sort by Title',
          author: 'Sort by Author',
          format: 'Sort by Format',
          last_used: 'Sort by Last Used' });

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box /> });
     }, [navigation]);

     React.useEffect(() => {
          setSortBy((prev) => ({
               ...prev,
               title: getTermFromDictionary(language, 'sort_by_title').includes('%1%') ? prev.title : getTermFromDictionary(language, 'sort_by_title'),
               author: getTermFromDictionary(language, 'sort_by_author').includes('%1%') ? prev.author : getTermFromDictionary(language, 'sort_by_author'),
               format: getTermFromDictionary(language, 'sort_by_format').includes('%1%') ? prev.format : getTermFromDictionary(language, 'sort_by_format'),
               last_used: getTermFromDictionary(language, 'sort_by_last_used').includes('%1%') ? prev.last_used : getTermFromDictionary(language, 'sort_by_last_used') }));
     }, [language]);

     const [isOpen, setIsOpen] = React.useState(false);
     const onClose = () => setIsOpen(false);
     const cancelRef = React.useRef(null);
     const [optingOut, setOptingOut] = React.useState(false);

     const [deleteAllIsOpen, setDeleteAllIsOpen] = React.useState(false);
     const onCloseDeleteAll = () => setDeleteAllIsOpen(false);
     const deleteAllCancelRef = React.useRef(null);
     const [deleting, setDeleting] = React.useState(false);

     const [optingIn, setOptingIn] = React.useState();

     const refreshAndSaveUserProfile = React.useCallback(async () => {
          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     }, [library.baseUrl, updateUserProfile]);

     const refreshReadingHistory = React.useCallback(async (options = {}) => {
          const targetPage = options.page ?? 1;
          const targetSort = options.sort ?? 'checkedOut';
          const targetSearchTerm = options.searchTerm ?? '';

          setLoading(true);
          setFetchError(null);
          try {
               const data = await fetchReadingHistory(targetPage, pageSize, targetSort, targetSearchTerm, library.baseUrl);
               if (data.ok) {
                    const tmpReadingHistory = formatReadingHistory(data.data.result);
                    tmpReadingHistory.history = Array.isArray(tmpReadingHistory.history)
                         ? tmpReadingHistory.history.slice(0, pageSize)
                         : [];
                    await updateReadingHistory(tmpReadingHistory);
                    let tmp = getTermFromDictionary(language, 'page_of_page');
                    tmp = tmp.replace('%1%', tmpReadingHistory.curPage || targetPage);
                    tmp = tmp.replace('%2%', tmpReadingHistory.totalPages || 1);
                    setPaginationLabel(tmp);
               } else {
                    logDebugMessage('Error fetching reading history for user');
                    logDebugMessage(data);
                    getErrorMessage(data.code, data.problem);
               }
          } catch (error) {
               logDebugMessage('Error fetching reading history for user');
               logErrorMessage(error);
               setFetchError(error);
          } finally {
               setLoading(false);
          }
     }, [pageSize, library.baseUrl, language, updateReadingHistory]);

     React.useEffect(() => {
          if (user.trackReadingHistory !== '1') {
               return;
          }
          refreshReadingHistory({ page, sort, searchTerm });
     }, [user.trackReadingHistory, library.baseUrl, language, refreshReadingHistory]);

     const optIn = async () => {
          setOptingIn(true);
          await optIntoReadingHistory(library.baseUrl);
          await refreshAndSaveUserProfile();
          setPage(1);
          setSort('checkedOut');
          setFilter('');
          setSearchTerm('');
          await refreshReadingHistory({ page: 1, sort: 'checkedOut', searchTerm: '' });
          setOptingIn(false);
     };

     const optOut = async () => {
          setOptingOut(true);
          await optOutOfReadingHistory(library.baseUrl);
          await deleteAllReadingHistory(library.baseUrl);
          await refreshAndSaveUserProfile();
          await updateReadingHistory(formatReadingHistory({}));
          setIsOpen(false);
          setOptingOut(false);
     };

     const deleteAll = async () => {
          setDeleting(true);
          await deleteAllReadingHistory(library.baseUrl);
          await refreshAndSaveUserProfile();
          setPage(1);
          await refreshReadingHistory({ page: 1 });
          setDeleteAllIsOpen(false);
          setDeleting(false);
     };

     const updateSort = async (value) => {
          logDebugMessage('updateSort for reading history: ' + value);
          setSort(value);
          setPage(1);
          await refreshReadingHistory({ page: 1, sort: value, searchTerm });
     };

     const updatePage = async (value) => {
          logDebugMessage('updatePage for reading history: ' + value);
          setPage(value);
          await refreshReadingHistory({ page: value, sort, searchTerm });
     };

     const search = async () => {
          logDebugMessage('updateSearchTerm for reading history: ' + filter);
          setPage(1);
          setSearchTerm(filter);
          await refreshReadingHistory({ page: 1, sort, searchTerm: filter });
     }

     const getDisclaimer = () => {
          return (
               <Accordion type="single" isCollapsible={true}>
                    <AccordionItem value="disclaimer-item" style={{ borderBottomWidth: 0, backgroundColor: panelBg }}>
                         <AccordionHeader style={{ backgroundColor: panelBg }}>
                              <AccordionTrigger className="px-5 py-1">
                                   {({ isExpanded }) => (
                                        <>
                                             <AccordionTitleText size="xs" style={{ flex: 1 }}>
                                                  {getTermFromDictionary(language, 'reading_history_privacy_notice')}
                                             </AccordionTitleText>
                                             <AccordionIcon as={MaterialIcons} name="expand-more" size={20} />
                                        </>
                                   )}
                              </AccordionTrigger>
                         </AccordionHeader>
                         <AccordionContent className="p-0 pt-2 px-5" style={{ backgroundColor: 'transparent' }}>
                              <Alert action="info">
                                   <AlertIcon action="info" className="mr-3" />
                                   <AlertText action="info" size="xs">
                                        {getTermFromDictionary(language, 'reading_history_disclaimer')}
                                   </AlertText>
                              </Alert>
                         </AccordionContent>
                    </AccordionItem>
               </Accordion>
          );
     };

     const getActionButtons = () => {
          const { neutralPairs, textColor, colorMode } = useTheme();

          let sortLength = 8 * sortBy.last_used.length + 80;
          if (sort === 'author') {
               sortLength = 8 * sortBy.author.length + 80;
          } else if (sort === 'format') {
               sortLength = 8 * sortBy.format.length + 80;
          } else if (sort === 'title') {
               sortLength = 8 * sortBy.title.length + 80;
          } else if (sort === 'checkedOut') {
               sortLength = 8 * sortBy.last_used.length + 80;
          }

          const sortLabel = () => {
               switch (sort) {
                    case "author":
                         return sortBy.author;
                    case "format":
                         return sortBy.format;
                    case "checkedOut":
                         return sortBy.last_used;
                    case "title":
                         return sortBy.title;
                    default:
                         return getTermFromDictionary(language, 'select_sort_method');
               }
          };

          return (
               <Box className="px-4 py-2" style={{ backgroundColor: panelBg, borderBottomWidth: 1, borderColor, flexWrap: 'nowrap' }}>
                    <VStack space="sm">
                         <Input>
                              <InputField returnKeyType="search" autoCapitalize="none" onChangeText={(term) => setFilter(term)} inputMode="search" value={filter} placeholder={getTermFromDictionary(language, 'search')} onSubmitEditing={search} />
                         </Input>
                         <ScrollView horizontal>
                              <HStack space="sm">
                                   <Box style={{ width: sortLength }}>
                                        <Select name="sortBy" selectedValue={sort} defaultValue={sort} accessibilityLabel={getTermFromDictionary(language, 'select_sort_method')} onValueChange={(itemValue) => updateSort(itemValue)}>
                                             <SelectTrigger size="sm">
                                                  <SelectInput value={sortLabel()} />
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            <SelectItem label={sortBy.title} value="title" key={0} selectedValue={sort} />
                                                            <SelectItem label={sortBy.author} value="author" key={1} selectedValue={sort} />
                                                            <SelectItem label={sortBy.last_used} value="checkedOut" key={2} selectedValue={sort} />
                                                            <SelectItem label={sortBy.format} value="format" key={3} selectedValue={sort} />
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </Box>
                                   <ButtonGroup size="sm" variant="solid">
                                        <Button style={{ backgroundColor: dangerColor }} onPress={() => setDeleteAllIsOpen(true)}>
                                             <ButtonText style={{ color: neutralPairs.white }}>{getTermFromDictionary(language, 'reading_history_delete_all')}</ButtonText>
                                        </Button>
                                        <Button style={{ backgroundColor: dangerColor }} onPress={() => setIsOpen(true)}>
                                             <ButtonText style={{ color: neutralPairs.white }}>{getTermFromDictionary(language, 'reading_history_opt_out')}</ButtonText>
                                        </Button>
                                   </ButtonGroup>
                              </HStack>
                         </ScrollView>
                    </VStack>

                    <Center>
                         <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
                              <AlertDialogBackdrop />
                              <AlertDialogContent>
                                   <AlertDialogHeader>
                                        <Heading>{getTermFromDictionary(language, 'reading_history_opt_out')}</Heading>
                                   </AlertDialogHeader>
                                   <AlertDialogBody>
                                        <Text>{getTermFromDictionary(language, 'reading_history_opt_out_warning')}</Text>
                                   </AlertDialogBody>
                                   <AlertDialogFooter>
                                        <ButtonGroup space="sm">
                                             <Button style={{ borderColor }} variant="outline" onPress={onClose}>
                                                  <ButtonText style={{ color: textColor }}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                             </Button>
                                             <Button style={{ backgroundColor: dangerColor }} isLoading={optingOut} isLoadingText={getTermFromDictionary(language, 'updating', true)} onPress={optOut} ref={cancelRef}>
                                                  <ButtonText style={{ color: neutralPairs.white }}>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                             </Button>
                                        </ButtonGroup>
                                   </AlertDialogFooter>
                              </AlertDialogContent>
                         </AlertDialog>
                    </Center>

                    <Center>
                         <AlertDialog leastDestructiveRef={deleteAllCancelRef} isOpen={deleteAllIsOpen} onClose={onCloseDeleteAll}>
                              <AlertDialogBackdrop />
                              <AlertDialogContent>
                                   <AlertDialogHeader>
                                        <Heading>{getTermFromDictionary(language, 'reading_history_delete_all')}</Heading>
                                   </AlertDialogHeader>
                                   <AlertDialogBody>
                                        <Text>{getTermFromDictionary(language, 'reading_history_delete_all_warning')}</Text>
                                   </AlertDialogBody>
                                   <AlertDialogFooter>
                                        <ButtonGroup space="sm">
                                             <Button style={{ borderColor }} variant="outline" onPress={onCloseDeleteAll}>
                                                  <ButtonText style={{ color: textColor }}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                             </Button>
                                             <Button style={{ backgroundColor: dangerColor }} isLoading={deleting} isLoadingText={getTermFromDictionary(language, 'deleting', true)} onPress={deleteAll} ref={cancelRef}>
                                                  <ButtonText style={{ color: neutralPairs.white }}>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                             </Button>
                                        </ButtonGroup>
                                   </AlertDialogFooter>
                              </AlertDialogContent>
                         </AlertDialog>
                    </Center>
               </Box>
          );
     };

     const Empty = () => {
          return (
               <Center className="mt-5 mb-5">
                   <Text bold size="lg">
                         {getTermFromDictionary(language, 'reading_history_empty')}
                    </Text>
               </Center>
          );
     };

     const Paging = () => {
          if (readingHistory?.totalResults > 0) {
               return (
                    <Box
                         className="px-4 py-2"
                         style={{ borderTopWidth: 1, borderColor, flexWrap: 'nowrap', alignItems: 'center' }}>
                         <ScrollView horizontal>
                              <ButtonGroup size="sm">
                                   <Button
                                       colorScheme="primary"
                                       onPress={async () => {
                                           if (page > 1) {
                                                await updatePage(page - 1)
                                            }
                                        }}
                                        isDisabled={page === 1}>
                                       <ButtonText>{getTermFromDictionary(language, 'previous')}</ButtonText>
                                   </Button>
                                   <Button
                                       colorScheme="primary"
                                        onPress={async () => {
                                             if (readingHistory?.hasMore) {
                                                  logDebugMessage('Adding to page');
                                                  let newPage = page + 1;
                                                  await updatePage(newPage);
                                             }
                                        }}
                                         isDisabled={!readingHistory?.hasMore || isLoading}>
                                         <ButtonText>{getTermFromDictionary(language, 'next')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ScrollView>
                         <Text size="sm" className="mt-2">
                              {paginationLabel}
                         </Text>
                    </Box>
               );
          }else{
               return null;
          }
     };

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

     const handleItemDelete = React.useCallback(async () => {
          await refreshReadingHistory({ page, sort, searchTerm });
     }, [refreshReadingHistory, page, sort, searchTerm]);

     const renderReadingHistoryItem = React.useCallback(({ item }) => {
          return <Item data={item} onDelete={handleItemDelete} />;
     }, [handleItemDelete]);

     const readingHistoryKeyExtractor = React.useCallback((item, index) => {
          if (item?.id != null) {
               return String(item.id);
          }
          return index.toString();
     }, []);

     return (
          <>
               {user.trackReadingHistory === '1' ? getActionButtons() : null}
               {getDisclaimer()}
               {user.trackReadingHistory !== '1' || isLoading || fetchError ? (
                    <ScreenContainer>
                         {systemMessagesForScreen.length > 0 ? <Box className="p-2">{showSystemMessage()}</Box> : null}
                         {user.trackReadingHistory !== '1' ? (
                             <Box className="py-5">
                                  <Button colorScheme="primary" onPress={optIn} isLoading={optingIn} isLoadingText={getTermFromDictionary(language, 'updating', true)}>
                                       <ButtonText>{getTermFromDictionary(language, 'reading_history_opt_in')}</ButtonText>
                                   </Button>
                              </Box>
                         ) : isLoading ? (
                              loadingSpinner()
                         ) : (
                              loadError('Error', '')
                         )}
                    </ScreenContainer>
               ) : (
                    <>
                         {systemMessagesForScreen.length > 0 ? <Box className="p-2 px-4">{showSystemMessage()}</Box> : null}
                         <FlatList
                              data={pageHistory}
                              ListEmptyComponent={Empty}
                              ListFooterComponent={Paging}
                              renderItem={renderReadingHistoryItem}
                              keyExtractor={readingHistoryKeyExtractor}
                              initialNumToRender={8}
                              maxToRenderPerBatch={8}
                              windowSize={5}
                              removeClippedSubviews={Platform.OS !== 'ios'}
                              contentContainerStyle={{ paddingBottom: 30, ...screenContentContainerStyle }}
                         />
                    </>
               )}
          </>
     );
};

/**
 * Item component that represents a single reading history item. It displays the item's title, author, format, and last used date. It also provides actions to view item details or delete the item from the reading history.
 * @type {React.NamedExoticComponent<{readonly data?: *, readonly onDelete?: *}>}
 */
const Item = React.memo(({ data: item, onDelete }) => {
     const { data: userState2 } = useUserState();
     const user = userState2?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const library = useLibrary();
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const borderColor = neutrals.border;

     const [deleting, setDelete] = React.useState(false);
     const [isOpen, setIsOpen] = React.useState(false);
     const toggle = () => {
          setIsOpen(!isOpen);
     };

     const openGroupedWork = (item, title) => {
          navigateStack('AccountScreenTab', 'ItemDetails', {
               id: item,
               title: getCleanTitle(title),
               url: library.baseUrl,
               userContext: user,
               libraryContext: library });
     };

     const refreshAndSaveUserProfile = React.useCallback(async () => {
          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     }, [library.baseUrl, updateUserProfile]);

     const deleteFromHistory = async (item) => {
          await deleteSelectedReadingHistory(item, library.baseUrl).then(async (result) => {
               if (result) {
                    await refreshAndSaveUserProfile();
                    if (typeof onDelete === 'function') {
                         await onDelete();
                    }
               }
          });
     };

     let url = library.baseUrl + '/bookcover.php?id=' + item.permanentId + '&size=medium';
     if (item.title) {
          return (
              <Pressable onPress={toggle} className="py-2" style={{ borderBottomWidth: 1, borderColor }}>
                    <HStack space="md">
                        <VStack className="max-w-[30%]">
                              <Image
                                   alt={item.title}
                                   source={url}
                                   className="rounded-lg"
                                   style={{ width: 100.0, height: 150.0 }}
                                   placeholder={blurhash}
                                   transition={1000}
                                   contentFit="cover"
                              />
                              <AddToList itemId={item.permanentId} btnStyle="sm" />
                         </VStack>
                         <VStack className="w-[65%]">
                              {getTitle(item.title)}
                              {getAuthor(item.author)}
                              {getFormat(item.format)}
                              {getDateLastUsed(item.checkout, item.checkedOut)}
                         </VStack>
                    </HStack>
                    <Actionsheet isOpen={isOpen} onClose={toggle} size="full">
                         <ActionsheetBackdrop />
                         <ActionsheetContent>
                             <Box className="w-full h-15 px-4 justify-center">
                                   <Text
                                       size="lg"
                                      >
                                        {getTitle(item.title)}
                                   </Text>
                              </Box>
                              {item.existsInCatalog ? (
                                   <ActionsheetItem
                                        onPress={() => {
                                             openGroupedWork(item.permanentId, item.title);
                                             toggle();
                                        }}>
                                        <MaterialIcons name="search" size={18} className="mr-1" />
                                       <ActionsheetItemText>{getTermFromDictionary(language, 'view_item_details')}</ActionsheetItemText>
                                   </ActionsheetItem>
                              ) : null}
                              <ActionsheetItem
                                   isLoading={deleting}
                                   isLoadingText={getTermFromDictionary(language, 'removing', true)}
                                   onPress={async () => {
                                        setDelete(true);
                                        await deleteFromHistory(item.id).then(() => {
                                             setDelete(false);
                                        });
                                        toggle();
                                   }}>
                                   <MaterialIcons name="delete" size={18} className="mr-1" />
                                   <ActionsheetItemText>
                                        {getTermFromDictionary(language, 'reading_history_delete')}
                                   </ActionsheetItemText>
                              </ActionsheetItem>
                         </ActionsheetContent>
                    </Actionsheet>
               </Pressable>
          );
     }else{
          return (
               <Text>Unknown title</Text>
         );
     }
});

Item.displayName = 'ReadingHistoryItem';
