import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Badge, BadgeText, Box, Button, ButtonText, ButtonGroup, ButtonIcon, Center, FlatList, HStack, Pressable, ScrollView, Text, useToken, VStack } from '@gluestack-ui/themed';
import { useColorModeValue, useTheme } from '../../../themes/theme';
import React from 'react';
import { loadError } from '../../../components/loadError';
import { popAlert, popToast } from '../../../components/feedback';

import { loadingSpinner } from '../../../components/loadingSpinner';
import { DisplaySystemMessage } from '../../../components/Notifications';
import { SystemMessagesContext } from '../../../context/initialContext';
import { useUserState, useSavedEvents, useUpdateSavedEvents, useUpdateUserProfile } from '../../../hooks/useUserData';
import { getCleanTitle } from '../../../helpers/item';
import { navigate } from '../../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { fetchSavedEvents, removeSavedEvent } from '../../../util/api/event';
import { refreshProfile } from '../../../util/api/user';
import { getEventDateDisplayData } from '../../../helpers/helpers';
import {logDebugMessage, logErrorMessage, getErrorMessage, logWarnMessage} from '../../../util/logging';
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useLibrary } from '../../../hooks/useLibrarySystemData';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

export const MyEvents = () => {
     const navigation = useNavigation();
     const queryClient = useQueryClient();
     const [isLoading, setLoading] = React.useState(false);
     const [page, setPage] = React.useState(1);
     const library = useLibrary();
     const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: savedEvents } = useSavedEvents();
     const updateSavedEvents = useUpdateSavedEvents();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { theme, colorMode, textColor} = useTheme();
     const pageSize = 25;
     const systemMessagesForScreen = [];

     const [filterBy, setFilterBy] = React.useState('upcoming');
     const [paginationLabel, setPaginationLabel] = React.useState('Page 1 of 1');
     const [events, updateEvents] = React.useState([]);

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box /> });
     }, [navigation]);

     React.useEffect(() => {
          if (Array.isArray(systemMessages)) {
               systemMessages.map((obj) => {
                    if (obj.showOn === '0' || obj.showOn === '1') {
                         systemMessagesForScreen.push(obj);
                    }
               });
          }
     }, [systemMessages]);

     const { status, data, error, isFetching, isPreviousData } = useQuery(['saved_events', user.id, library.baseUrl, page, filterBy], () => fetchSavedEvents(page, pageSize, filterBy, library.baseUrl, user.language), {
          //initialData: savedEvents,
          keepPreviousData: true,
          staleTime: 1000,
          onSuccess: (data) => {
               if(data.ok) {
                    let morePages = false;

                    if (data.data.result.page_current !== data.data.result.page_total) {
                         morePages = true;
                    }

                    const events = {
                         events: data.data.result.events ?? [],
                         totalResults: data.data.result.totalResults ?? 0,
                         curPage: data.data.result.page_current ?? 0,
                         totalPages: data.data.result.page_total ?? 0,
                         hasMore: morePages,
                         filter: data.data.result.filter ?? filterBy,
                         message: data.data?.result?.message ?? null }

                    updateSavedEvents(events.events);
                    updateEvents(data.data.result ?? []);

                    if (data.data.totalPages) {
                         let tmp = getTermFromDictionary(language, 'page_of_page');
                         tmp = tmp.replace('%1%', page);
                         tmp = tmp.replace('%2%', data.data.totalPages);
                         setPaginationLabel(tmp);
                    }
               } else {
                    logDebugMessage("Error fetching saved events for user");
                    logDebugMessage(data);
                    getErrorMessage(data.code, data.problem)
               }
          },
          onSettle: () => setLoading(false),
          onError: (error) => {
               logDebugMessage("Error fetching saved events");
               logErrorMessage(error);
          }
     });

     const getActionButtons = () => {
          return (
               <Box
                    alignItems="center"
                    p="$2"
                    borderBottomWidth="$1"
                    bgColor={colorMode==='light'?"$coolGray100" : '$coolGray700'}
                    borderColor={colorMode==='light'?"$coolGray200" : '$coolGray600'}
               >
                    <ButtonGroup alignItems="center" space="md" isAttached size="sm" pb="$1">
                         <Button
                              variant={filterBy === 'all' ? 'solid' : 'outline'}
                              onPress={() => setFilterBy('all')}
                              bgColor={filterBy === 'all' ?  theme.tokens.colors.primary['500'] : (colorMode === 'light' ? "$warmGray50" : "$coolGray900")}
                              borderColor={theme.tokens.colors.primary['500']}
                              action="primary">
                              <ButtonText color={filterBy === 'all' ? theme.tokens.colors.primary['500-text'] : theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'all_events')}</ButtonText>
                         </Button>
                         <Button
                              variant={filterBy === 'upcoming' ? 'solid' : 'outline'}
                              action="primary"
                              bgColor={filterBy === 'upcoming' ?  theme.tokens.colors.primary['500'] : (colorMode === 'light' ? "$warmGray50" : "$coolGray900")}
                              borderColor={theme.tokens.colors.primary['500']}
                              onPress={() => setFilterBy('upcoming')}>
                              <ButtonText color={filterBy === 'upcoming' ? theme.tokens.colors.primary['500-text'] : theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'upcoming_events')}</ButtonText>
                         </Button>
                         <Button
                              action="primary"
                              variant={filterBy === 'past' ? 'solid' : 'outline'}
                              bgColor={filterBy === 'past' ?  theme.tokens.colors.primary['500'] : (colorMode === 'light' ? "$warmGray50" : "$coolGray900")}
                              borderColor={theme.tokens.colors.primary['500']}
                              onPress={() => setFilterBy('past')}>
                              <ButtonText color={filterBy === 'past' ? theme.tokens.colors.primary['500-text'] : theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'past_events')}</ButtonText>
                         </Button>
                    </ButtonGroup>
               </Box>
          );
     };

     const Empty = () => {
          return (
               <Center mt={5} mb={5}>
                    <Text bold fontSize="$lg" color={textColor}>
                         {filterBy === 'upcoming' ? getTermFromDictionary(language, 'no_events_upcoming') : filterBy === 'past' ? getTermFromDictionary(language, 'no_events_past') : getTermFromDictionary(language, 'no_events_all')}
                    </Text>
               </Center>
          );
     };

     const Paging = () => {
          if (savedEvents?.totalResults > 0) {
               return (
                    <Box
                         p="$2"
                         backgroundColor="$coolGray100"
                         borderTopWidth="$1"
                         _dark={{
                              borderColor: '$coolGray600',
                              backgroundColor: '$coolGray700' }}
                         borderColor="$coolGray200"
                         flexWrap="nowrap"
                         alignItems="center">
                         <ScrollView horizontal>
                              <ButtonGroup size="sm" space="md">
                                   <Button onPress={() => setPage(page - 1)} isDisabled={page === 1} action="primary">
                                        <ButtonText>{getTermFromDictionary(language, 'previous')}</ButtonText>
                                   </Button>
                                   <Button
                                        action="primary"
                                        onPress={() => {
                                             if (!isPreviousData && data?.hasMore) {
                                                  logDebugMessage('Adding to page');
                                                  setPage(page + 1);
                                             }
                                        }}
                                        isDisabled={isPreviousData || !data?.hasMore}>
                                        <ButtonText>{getTermFromDictionary(language, 'next')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ScrollView>
                         <Text mt="$2" fontSize="$sm" color={textColor}>
                              {paginationLabel}
                         </Text>
                    </Box>
               );
          }
          return null;
     };

     const showSystemMessage = () => {
          if (Array.isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0' || obj.showOn === '1') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
               });
          }
          return null;
     };

     const savedEventKeys = Object.keys(savedEvents ?? {});

     return (
          <Box style={{ flex: 1 }}>
               {systemMessagesForScreen.length > 0 ? <Box safeArea={2}>{showSystemMessage()}</Box> : null}
               {getActionButtons()}
               {events.length === 0 || status === 'loading' || isFetching ? (
                    loadingSpinner()
               ) : status === 'error' ? (
                    loadError('Error', '')
               ) : (
                    <>
                         <FlatList data={savedEventKeys} ListEmptyComponent={Empty} ListFooterComponent={Paging} renderItem={({ item }) => <Item data={savedEvents[item]} filterBy={filterBy} setLoading={setLoading} />} keyExtractor={(item, index) => index.toString()} contentContainerStyle={{ paddingBottom: 30 }} />
                    </>
               )}
          </Box>
     );
};

const Item = (data) => {
     const filterBy = data.filterBy;
     const setLoading = data.setLoading;
     const event = data.data;
     const queryClient = useQueryClient();
     const { data: userState2 } = useUserState();
     const user = userState2?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const language = useActiveLanguage();
     const library = useLibrary();
     const {colorMode} = useTheme();

     const backgroundColor = useToken('colors', useColorModeValue('warmGray.200', 'coolGray.900'));
     const textColor = useToken('colors', useColorModeValue('gray.800', 'coolGray.200'));

     const refreshAndSaveUserProfile = React.useCallback(async () => {
          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     }, [library.baseUrl, updateUserProfile]);

     let coverUrl = event.cover;
     if (event.cover === null) {
          coverUrl = library.baseUrl + '/bookcover.php?size=medium&id=' + event.sourceId;
     }

     let registrationRequired = false;
     if (event.registrationRequired !== undefined) {
          registrationRequired = event.registrationRequired;
     }

     let hasPassed = false;
     if (typeof event.pastEvent !== 'undefined') {
          hasPassed = event.pastEvent;
     }

     const start = event.startDate ?? null;
     const end = event.endDate ?? null;
     let displayDay = false;
     let displayStartTime = false;
     let displayEndTime = false;
     let startTime = null;
     let endTime = null;

     if (start) {
          startTime = start.date;
          const displayData = getEventDateDisplayData(startTime, end?.date);
          displayDay = displayData.displayDay;
          displayStartTime = displayData.displayStartTime;
          displayEndTime = displayData.displayEndTime;
     }

     if (end && !displayEndTime) {
          endTime = end.date;
          displayEndTime = getEventDateDisplayData(start?.date, endTime).displayEndTime;
     }

     const key = 'medium_' + event.sourceId;

     let source = event.source;
     if (event.source === 'lc') {
          source = 'library_calendar';
     }
     if (event.source === 'libcal') {
          source = 'springshare';
     }

     const openEvent = () => {
          if (!event.pastEvent && event.endDate) {
               if (event.bypass) {
                    openURL(event.url);
               } else {
                    navigate('EventDetails', {
                         id: event.sourceId,
                         title: getCleanTitle(event.title),
                         url: library.baseUrl,
                         source: source });
               }
          }
     };

     const openURL = async (url) => {
          const browserParams = {
               enableDefaultShareMenuItem: false,
               presentationStyle: 'automatic',
               showTitle: false,
               toolbarColor: backgroundColor,
               controlsColor: textColor,
               secondaryToolbarColor: backgroundColor };
          await WebBrowser.openBrowserAsync(url, browserParams)
               .then((res) => {
                    logDebugMessage(res);
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
                                        logWarnMessage('Unable to close previous browser session.');
                                   });
                         } catch (error) {
                              logErrorMessage('Really borked.');
                         }
                    } else {
                         popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
                         logErrorMessage(err);
                    }
               });
     };

     const removeEvent = async () => {
          setLoading(true);
          await removeSavedEvent(event.sourceId, language, library.baseUrl).then((result) => {
               setLoading(false);
               queryClient.invalidateQueries({ queryKey: ['saved_events', user.id, library.baseUrl, 1, filterBy] });
               refreshAndSaveUserProfile();
               queryClient.invalidateQueries({ queryKey: ['event', event.sourceId, source, language, library.baseUrl] });
               if (result.success || result.success === 'true') {
                    popAlert(getTermFromDictionary(language, 'removed_successfully'), result.message, 'success');
               } else {
                    popAlert(getTermFromDictionary(language, 'error'), result.message, 'error');
               }
          });
     };

     return (
          <Pressable borderBottomWidth="$1" _dark={{ borderColor: '$coolGray600' }} borderColor="$coolGray200" pl="$4" pr="$5" py="$2" onPress={openEvent}>
               <HStack space="md">
                    {event.cover ? (
                         <VStack maxW="35%">
                              {hasPassed ? (
                                   <Box width="$full" zIndex={1}>
                                        <Badge action="warning" variant="solid" mb="-$3" ml="-$1" borderRadius="$sm">
                                             <BadgeText fontSize="$xs">
                                                  {getTermFromDictionary(language, 'flag_past')}
                                             </BadgeText>
                                        </Badge>
                                   </Box>
                              ) : null}
                              <Image
                                   alt={event.title}
                                   source={coverUrl}
                                   style={{
                                        width: 100,
                                        height: 150,
                                        borderRadius: "$sm" }}
                                   placeholder={blurhash}
                                   transition={1000}
                                   contentFit="cover"
                              />

                              <Button size="sm" variant="ghost" action="negative" onPress={() => removeEvent()}>
                                   <ButtonIcon as={MaterialIcons} name="delete" size="xs" mr="$1" />
                                   <ButtonText>{getTermFromDictionary(language, 'remove')}</ButtonText>
                              </Button>
                         </VStack>
                    ) : null}

                    <VStack w={event.cover ? '65%' : '100%'}>
                         <Text
                              color={colorMode==='light'?"$coolGray800" : "$warmGray50"}
                              fontWeight="$bold"
                              fontSize="$md">
                              {event.title}
                         </Text>
                         {event.startDate && event.endDate ? (
                              <>
                                   <Text color={colorMode==='light'?"$coolGray800" : "$warmGray50"}>
                                        {displayDay}
                                   </Text>
                                   <Text color={colorMode==='light'?"$coolGray800" : "$warmGray50"}>
                                        {displayStartTime} - {displayEndTime}
                                   </Text>
                              </>
                         ) : event.startDate && !event.endDate ? (
                              <>
                                   <Text color={colorMode==='light'?"$coolGray800" : "$warmGray50"}>
                                        {displayDay}
                                   </Text>
                                   <Text color={colorMode==='light'?"$coolGray800" : "$warmGray50"}>
                                        {displayStartTime}
                                   </Text>
                              </>
                         ) : null}
                         {!event.cover ? (
                              <Box alignItems="flex-start" pt="$2">
                                   <Button p="$0" size="sm" variant="ghost" action="negative" onPress={() => removeEvent()}>
                                        <ButtonIcon as={MaterialIcons} name="delete" size="xs" mr="$1" />
                                        <ButtonText>{getTermFromDictionary(language, 'remove')}</ButtonText>
                                   </Button>
                              </Box>
                         ) : null}
                         {registrationRequired ? (
                              <HStack mt="$1.5" space="xs" flexWrap="wrap">
                                   <Badge key={0} action="secondary" mt="$1" variant="outline" borderRadius="$sm">
                                        <BadgeText fontSize="$sm">
                                             {getTermFromDictionary(language, 'registration_required')}
                                        </BadgeText>
                                   </Badge>
                              </HStack>
                         ) : null}
                    </VStack>
               </HStack>
          </Pressable>
     );
};
