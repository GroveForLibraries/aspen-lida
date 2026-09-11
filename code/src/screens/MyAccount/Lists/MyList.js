import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
     Badge,
     BadgeText,
     Box,
     Button,
     ButtonGroup,
     ButtonIcon,
     ButtonText,
     ChevronDownIcon,
     FlatList,
     FormControl,
     HStack,
     Icon,
     Pressable,
     ScrollView,
     Select,
     SelectBackdrop,
     SelectContent, SelectDragIndicator,
     SelectDragIndicatorWrapper,
     SelectIcon,
     SelectInput, SelectItem,
     SelectPortal,
     SelectScrollView,
     SelectTrigger,
     Text,
     VStack } from '@gluestack-ui/themed';
import React from 'react';
import { Platform } from 'react-native';
import { loadError } from '../../../components/loadError';
import { popToast } from '../../../components/feedback';

// custom components and helper files
import { loadingSpinner } from '../../../components/loadingSpinner';
import { DisplaySystemMessage } from '../../../components/Notifications';
import { SystemMessagesContext } from '../../../context/initialContext';
import { parseEventDateTime } from '../../../helpers/helpers';
import { getCleanTitle } from '../../../helpers/item';
import { navigateStack } from '../../../helpers/RootNavigator';
import { getTermFromDictionary as getTermFromDictionaryHelper } from '../../../translations/TranslationHelper';
import { getListTitles, removeTitlesFromList } from '../../../util/api/list';
import EditList from './EditList';
import {logDebugMessage, logErrorMessage, logInfoMessage} from '../../../util/logging';
import { useActiveLanguage, useDictionary } from '../../../hooks/useLanguageData';
import { useTheme } from '../../../themes/theme';
import { useLibrary } from '../../../hooks/useLibrarySystemData';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

export const MyList = ({ route }) => {
     const providedList = route?.params?.details ?? {};
     const id = providedList.id;
     const [page, setPage] = React.useState(1);
     const [sort, setSort] = React.useState('dateAdded');
     const [pageSize, setPageSize] = React.useState(20);
     const library = useLibrary();
     const [list] = React.useState(providedList);
     const language = useActiveLanguage();
     const dictionary = useDictionary();
     const insets = useSafeAreaInsets();
     const [sortBy, setSortBy] = React.useState({
          title: 'Sort By Title',
          dateAdded: 'Sort By Date Added',
          recentlyAdded: 'Sort By Recently Added',
          custom: 'Sort By User Defined' });
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { textColor, theme, colorMode } = useTheme();
     const [paginationLabel, setPaginationLabel] = React.useState('Page 1 of 1');
     const [isLoading, setIsLoading] = React.useState(true);
     const [fetchError, setFetchError] = React.useState(null);
     const [listData, setListData] = React.useState({
          listTitles: [],
          totalResults: 0,
          curPage: 1,
          totalPages: 1,
          hasMore: false,
          sort,
          message: null });
     const hasAppliedDefaultSort = React.useRef(false);
     const browserBackgroundColor = colorMode === 'light' ? '#ffffff' : '#111827';
     const t = React.useCallback((key, ellipsis = false, forcedLanguage) => {
          const lang = forcedLanguage || language;
          return getTermFromDictionaryHelper(lang, key, ellipsis, dictionary);
     }, [language, dictionary]);
     const dayFormatter = React.useMemo(
          () => new Intl.DateTimeFormat(language || undefined, {
               weekday: 'long',
               month: 'long',
               day: 'numeric',
               year: 'numeric' }),
          [language]
     );
     const timeFormatter = React.useMemo(
          () => new Intl.DateTimeFormat(language || undefined, {
               hour: 'numeric',
               minute: '2-digit' }),
          [language]
     );

     const systemMessagesForScreen = React.useMemo(() => {
          if (!Array.isArray(systemMessages)) return [];
          return systemMessages.filter((obj) => obj.showOn === '0');
     }, [systemMessages]);

     React.useEffect(() => {
          setSortBy((prev) => {
               const next = { ...prev };

               const title = t('sort_by_title');
               if (!title.includes('%1%')) next.title = title;

               const dateAdded = t('sort_by_date_added');
               if (!dateAdded.includes('%1%')) next.dateAdded = dateAdded;

               const recentlyAdded = t('sort_by_recently_added');
               if (!recentlyAdded.includes('%1%')) next.recentlyAdded = recentlyAdded;

               const custom = t('sort_by_user_defined');
               if (!custom.includes('%1%')) next.custom = custom;

               return next;
          });
     }, [t]);

     const loadListDetails = React.useCallback(async (targetPage, targetSort) => {
          setIsLoading(true);
          setFetchError(null);
          try {
               const data = await getListTitles(id, library.baseUrl, targetPage, pageSize, pageSize, targetSort);
               setListData(data);
               let tmp = t('page_of_page');
               tmp = tmp.replace('%1%', data.curPage ?? targetPage);
               tmp = tmp.replace('%2%', data.totalPages ?? 1);
               setPaginationLabel(tmp);
          } catch (error) {
               logDebugMessage('Error fetching user list titles for list ' + id);
               logErrorMessage(error);
               setFetchError(error);
          } finally {
               setIsLoading(false);
          }
     }, [id, library.baseUrl, pageSize, t]);

     React.useEffect(() => {
          loadListDetails(page, sort);
     }, [page, sort, loadListDetails]);

     const handleOpenItem = (id, title) => {
          navigateStack('AccountScreenTab', 'ListItem', {
               id: id,
               url: library.baseUrl,
               title: getCleanTitle(title) });
     };

     const handleOpenEvent = (item) => {
          if (item.bypass) {
               openURL(item.url);
          } else {
               navigateStack('AccountScreenTab', 'ListItemEvent', {
                    id: item.id,
                    url: library.baseUrl,
                    title: getCleanTitle(item.title),
                    source: item.source });
          }
     };

     const openURL = async (url) => {
          const browserParams = {
               enableDefaultShareMenuItem: false,
               presentationStyle: 'automatic',
               showTitle: false,
               toolbarColor: browserBackgroundColor,
               controlsColor: textColor,
               secondaryToolbarColor: browserBackgroundColor };
          await WebBrowser.openBrowserAsync(url, browserParams)
               .then((res) => {
                    if (res.type === 'cancel' || res.type === 'dismiss') {
                         logDebugMessage('User closed or dismissed window.');
                         WebBrowser.dismissBrowser();
                         WebBrowser.coolDownAsync();
                    }
               })
               .catch(async (err) => {
                    if (err.message === 'Another WebBrowser is already being presented.') {
                         try {
                              WebBrowser.dismissBrowser();
                              WebBrowser.coolDownAsync();
                              await WebBrowser.openBrowserAsync(url, browserParams)
                                   .then((response) => {
                                        logDebugMessage(response);
                                        if (response.type === 'cancel') {
                                             logDebugMessage('User closed window.');
                                        }
                                   })
                                   .catch(async (error) => {
                                        logInfoMessage('Unable to close previous browser session.');
                                   });
                         } catch (error) {
                              logErrorMessage('Really borked.');
                         }
                    } else {
                         popToast(t('error_no_open_resource', false, 'en'), t('error_device_block_browser', false, 'en'), 'error');
                         logErrorMessage(err);
                    }
               });
     };

     React.useEffect(() => {
          if (!hasAppliedDefaultSort.current && listData?.sort && listData.sort !== sort) {
               hasAppliedDefaultSort.current = true;
               setSort(listData.sort);
          }
     }, [listData?.sort, sort]);

     const renderItem = (item) => {
          const imageUrl = item.image;

          if (item.recordType === 'event') {
               let registrationRequired = false;
               if (item.registration_required !== undefined) {
                    registrationRequired = item.registration_required;
               }

               const startTime = item.start_date.date;
               const endTime = item.end_date.date;
               const startDate = parseEventDateTime(startTime);
               const endDate = parseEventDateTime(endTime);
               const displayDay = startDate ? dayFormatter.format(startDate) : '';
               const displayStartTime = startDate ? timeFormatter.format(startDate) : '';
               const displayEndTime = endDate ? timeFormatter.format(endDate) : '';

               return (
                    <Pressable borderBottomWidth="$1" _dark={{ borderColor: 'gray.600' }} borderColor="coolGray.200" pl="$4" pr="$5" py="$2" onPress={() => handleOpenEvent(item)}>
                         <HStack space="sm">
                              <VStack maxW="35%">
                                   <Image
                                        alt={item.title}
                                        source={imageUrl}
                                        style={{
                                             width: 100,
                                             height: 150,
                                             borderRadius: "$sm" }}
                                        placeholder={blurhash}
                                        transition={1000}
                                        contentFit="cover"
                                   />
                                   <Button
                                        onPress={() => {
                                             removeTitlesFromList(id, item.id, library.baseUrl, 'Events').then(async () => {
                                                       await loadListDetails(page, sort);
                                             });
                                        }}
                                        size="$sm"
                                        variant="link">
                                        <ButtonIcon color="$warning500" as={MaterialIcons} name="delete" />
                                        <ButtonText color="$warning500">{t('delete')}</ButtonText>
                                   </Button>
                              </VStack>
                              <VStack w="65%">
                                   <Text
                                        color={textColor}
                                        bold
                                        fontSize="$sm"
                                        >
                                        {item.title}
                                   </Text>
                                   {item.start_date && item.end_date ? (
                                        <>
                                             <Text color={textColor} fontSize="$xs">{displayDay}</Text>
                                             <Text color={textColor} fontSize="$xs">
                                                  {displayStartTime} - {displayEndTime}
                                             </Text>
                                        </>
                                   ) : null}
                                   {registrationRequired ? (
                                        <HStack mt="$1" direction="row" space="sm" flexWrap="wrap">
                                             <Badge key={0} colorScheme="secondary" mt="$1" variant="outline" borderRadius="$sm" fontSize="$xs">
                                                  <BadgeText>{t('registration_required')}</BadgeText>
                                             </Badge>
                                        </HStack>
                                   ) : null}
                              </VStack>
                         </HStack>
                    </Pressable>
               );
          }

          return (
               <Pressable borderBottomWidth="$1" borderColor={colorMode === 'light' ? "$coolGray200" : "$warmGray600"} pl="$4" pr="$5" py="$2" onPress={() => handleOpenItem(item.id, item.title)}>
                    <HStack space="sm">
                         <VStack maxW="35%">
                              <Image
                                   alt={item.title}
                                   source={imageUrl}
                                   style={{
                                        width: 100,
                                        height: 150,
                                        borderRadius: "$sm"
                                   }}
                                   placeholder={blurhash}
                                   transition={1000}
                                   contentFit="cover"
                              />
                              <Button
                                   onPress={() => {
                                        removeTitlesFromList(id, item.id, library.baseUrl, 'GroupedWork').then(async () => {
                                             await loadListDetails(page, sort);
                                        });
                                   }}
                                   size="sm"
                                   variant="link">
                                   <ButtonIcon color="$warning500" as={MaterialIcons} name="delete" mr="$1" />
                                   <ButtonText color="$warning500">{t('delete')}</ButtonText>
                              </Button>
                         </VStack>
                         <VStack w="65%">
                              <Text
                                   color={textColor}
                                   bold
                                   fontSize="$sm"
                                   >
                                   {item.title}
                              </Text>
                              {item.author ? (
                                   <Text color={textColor} fontSize="$xs">
                                        {t('by')} {item.author}
                                   </Text>
                              ) : null}
                         </VStack>
                    </HStack>
               </Pressable>
          );
     };

     const Paging = () => {
          return (
               <Box
                    p="$2"
                    bgColor={colorMode === 'light' ? "$coolGray100" : "$coolGray700"}
                    borderBottomWidth="$1"
                    borderColor={colorMode === 'light' ? "$coolGray200" : "$warmGray600"}
                    flexWrap="nowrap"
                    alignItems="center">
                    <ScrollView horizontal>
                         <ButtonGroup size="sm">
                              <Button bgColor={theme.tokens.colors.primary['500']} onPress={() => setPage(page - 1)} isDisabled={page === 1}>
                                   <ButtonText color={theme.tokens.colors.primary['500-text']}>{t('previous')}</ButtonText>
                              </Button>
                              <Button
                                   bgColor={theme.tokens.colors.primary['500']}
                                   onPress={() => {
                                        if (listData?.hasMore) {
                                             logDebugMessage('Adding to page');
                                             setPage(page + 1);
                                        }
                                   }}
                                   isDisabled={isLoading || !listData?.hasMore}>
                                   <ButtonText color={theme.tokens.colors.primary['500-text']}>{t('next')}</ButtonText>
                              </Button>
                         </ButtonGroup>
                    </ScrollView>
                    <Text mt="$2" fontSize="$sm" color={textColor}>
                         {paginationLabel}
                    </Text>
               </Box>
          );
     };

     const getActionButtons = () => {
          let sortLength = 8 * sortBy.dateAdded.length + 80;
          if (sort === 'title') {
               sortLength = 8 * sortBy.title.length + 80;
          } else if (sort === 'recentlyAdded') {
               sortLength = 8 * sortBy.recentlyAdded.length + 80;
          } else if (sort === 'custom') {
               sortLength = 8 * sortBy.custom.length + 80;
          } else if (sort === 'dateAdded') {
               sortLength = 8 * sortBy.dateAdded.length + 80;
          }

          const sortLabel = () => {
               switch (sort) {
                    case "recentlyAdded":
                         return sortBy.recentlyAdded;
                    case "custom":
                         return sortBy.custom;
                    case "title":
                         return sortBy.title;
                    case "dateAdded":
                         return sortBy.dateAdded;
                    default:
                         return t('select_sort_method');
               }
          };

          return (
               <Box
                    p="$2"
                    bgColor={colorMode === 'light' ? "$coolGray100" : "$coolGray700"}
                    borderBottomWidth="$1"
                    borderColor={colorMode === 'light' ? "$coolGray200" : "$warmGray600"}
                    flexWrap="nowrap">
                    <ScrollView horizontal>
                         <HStack space="sm">
                              <FormControl w={sortLength}>
                                   <Select
                                        name="sortBy"
                                        selectedValue={sort}
                                        defaultValue={sort}
                                        accessibilityLabel={t('select_sort_method')}
                                        onValueChange={(itemValue) => setSort(itemValue)}>
                                        <SelectTrigger variant="outline" size="sm">
                                             <SelectInput py={0} color={textColor} value={sortLabel()} />
                                             <SelectIcon mr="$3">
                                                  <Icon color={textColor} as={ChevronDownIcon} />
                                             </SelectIcon>
                                        </SelectTrigger>
                                        <SelectPortal>
                                             <SelectBackdrop />
                                             <SelectContent
                                                  bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}
                                                  pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}
                                             >
                                                  <SelectDragIndicatorWrapper>
                                                       <SelectDragIndicator />
                                                  </SelectDragIndicatorWrapper>
                                                  <SelectScrollView>
                                                       <SelectItem label={sortBy.title} value="title" key={0} bgColor={sort == "title" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: sort == "title" ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>
                                                       <SelectItem label={sortBy.dateAdded} value="dateAdded" key={1} bgColor={sort == "dateAdded" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: sort == "dateAdded" ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>
                                                       <SelectItem label={sortBy.recentlyAdded} value="recentlyAdded" key={2} bgColor={sort == "recentlyAdded" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: sort == "recentlyAdded" ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>
                                                       <SelectItem label={sortBy.custom} value="custom" key={3} bgColor={sort == "custom" ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: sort == "custom" ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>
                                                  </SelectScrollView>
                                             </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </FormControl>
                              <EditList data={list} listId={id} />
                         </HStack>
                    </ScrollView>
               </Box>
          );
     };

     const showSystemMessage = () => {
          if (Array.isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} />;
                    }
                    return null;
               });
          }
          return null;
     };

     return (
          <Box style={{ flex: 1 }}>
               {systemMessagesForScreen.length > 0 ? <Box safeArea={2}>{showSystemMessage()}</Box> : null}
               {isLoading ? (
                    loadingSpinner()
               ) : fetchError ? (
                    loadError('Error', '')
               ) : (
                    <>
                         <Box style={{ paddingBottom: 100 }}>
                              {getActionButtons()}
                              <FlatList data={listData.listTitles} ListFooterComponent={Paging} renderItem={({ item }) => renderItem(item, library.baseUrl)} keyExtractor={(item, index) => index.toString()} />
                         </Box>
                    </>
               )}
          </Box>
     );
};
