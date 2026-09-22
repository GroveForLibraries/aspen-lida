import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Calendar from 'expo-calendar';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import _ from 'lodash';
import moment from 'moment';
import {
     Box,
     Divider,
     Pressable,
     ScrollView,
     VStack,
     Text,
     Button,
     ButtonGroup,
     ButtonText,
     Center,
     Heading,
     Icon,
     Modal,
     ModalContent,
     ModalHeader,
     ModalBody,
     ModalFooter,
     HStack,
     CloseIcon, ModalCloseButton, ModalBackdrop } from '@gluestack-ui/themed';
import React from 'react';
import { Platform } from 'react-native';
import { showLocation } from 'react-native-map-link';

// custom components and helper files
import { loadError } from '../../components/loadError';
import { popAlert, popToast } from '../../components/feedback';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { DisplaySystemMessage } from '../../components/Notifications';
import { SystemMessagesContext } from '../../context/initialContext';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useUpdateUserProfile } from '../../hooks/useUserData';
import { navigateStack } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getEventDetails, saveEvent } from '../../util/api/event';
import { refreshProfile } from '../../util/api/user';
import { decodeHTML, stripHTML } from '../../helpers/helpers';
import AddToList from '../Search/AddToList';
import { logDebugMessage, logErrorMessage, logInfoMessage, getErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

export const EventScreen = () => {
     const route = useRoute();
     const queryClient = useQueryClient();
     const id = route.params.id;
     const source = route.params.source;
     const library = useLibrary();
     const language = useActiveLanguage();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const [hasValidImage, setHasValidImage] = React.useState(false);
     const [eventData, setEventData] = React.useState([]);
     const [errorMessage, setErrorMessage] = React.useState('');

     const { status, data, error, isFetching } = useQuery(['event', id, source, language, library.baseUrl], () => getEventDetails(id, source, language, library.baseUrl), {
          refetchOnMount: 'always',
          onSuccess: (data) => {
               if(data.ok) {
                    setEventData(data.data.result);
                    setErrorMessage('');
               } else {
                    logDebugMessage("Error fetching event details");
                    logDebugMessage(data);
                    const error = getErrorMessage(data.code ?? 0, data.problem);
                    setErrorMessage(error.message);
               }
          },
          onError: (error) => {
               logDebugMessage("Error fetching event details");
               logErrorMessage(error);
          }
     });

     React.useEffect(() => {
          if (!_.isEmpty(data) && !_.isUndefined(data.data.results)) {
               const update = async () => {
                    if (!_.isUndefined(data.data.results.cover)) {
                         if (data.data.results.cover) {
                              const urlResult = checkImageUrl(data.data.results.cover);
                              setHasValidImage(urlResult);
                         }
                    }
               };
               update();
          }
     }, [data]);

     const showSystemMessage = () => {
          if (_.isArray(systemMessages)) {
               return systemMessages.map((obj, index, collection) => {
                    if (obj.showOn === '0') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
                    return null;
               });
          }
          return null;
     };

     return (
          <ScrollView>
               {(eventData.length === 0 || status === 'loading' || isFetching) && errorMessage === ''? (
                    <Box pt={50}><LoadingSpinner message="Fetching data..." /></Box>
               ) : status === 'error' ? (
                    <Box pt={50}>{loadError(error, '')}</Box>
               ) : errorMessage !== '' ? (
                    <Box pt={50}>{loadError(errorMessage, '')}</Box>
               ) : (
                    <>
                         {_.size(systemMessages) > 0 ? <Box safeArea={2}>{showSystemMessage()}</Box> : null}
                         <DisplayEvent data={eventData} source={source} hasValidImage={hasValidImage} />
                    </>
               )}
          </ScrollView>
     );
};

const DisplayEvent = (payload) => {
     const event = payload.data;
     const hasValidImage = payload.hasValidImage;
     const route = useRoute();
     const source = route.params.source;
     const language = useActiveLanguage();
     const { textColor, theme, colorMode } = useTheme();
     const backgroundColor = colorMode === 'light' ? "$warmGray200" : "$coolGray900";
     const openLink = async () => {
          const browserParams = {
               enableDefaultShareMenuItem: false,
               presentationStyle: 'automatic',
               showTitle: false,
               toolbarColor: backgroundColor,
               controlsColor: textColor,
               secondaryToolbarColor: backgroundColor };

          await WebBrowser.openBrowserAsync(event.url, browserParams)
               .then((res) => {
                    if (res.type === 'cancel' || res.type === 'dismiss') {
                         logInfoMessage('User closed or dismissed window.');
                         WebBrowser.dismissBrowser();
                         WebBrowser.coolDownAsync();
                    }
               })
               .catch(async (err) => {
                    if (err.message === 'Another WebBrowser is already being presented.') {
                         try {
                              WebBrowser.dismissBrowser();
                              WebBrowser.coolDownAsync();
                              await WebBrowser.openBrowserAsync(event.url, browserParams)
                                   .then((response) => {
                                        if (response.type === 'cancel') {
                                             logInfoMessage('User closed window.');
                                        }
                                   })
                                   .catch(async (error) => {
                                        logDebugMessage('Unable to close previous browser session.');
                                        logDebugMessage(error);
                                   });
                         } catch (error) {
                              logDebugMessage(error);
                         }
                    } else {
                         popToast(getTermFromDictionary('en', 'error_no_open_resource'), getTermFromDictionary('en', 'error_device_block_browser'), 'error');
                    }
               });
     };

     return (
          <>
               {event.cover ? <Box h={{ base: 125, lg: 200 }} width="$full" bgColor="warmGray.200" _dark={{ bgColor: 'coolGray.900' }} zIndex={-1} position="absolute" left={0} top={0} /> : null}
               <Box p="$5" width="$full">
                    <Center mt={event.cover ? 5 : 0} width="100%">
                         {event.cover ? (
                              <Image
                                   alt={event.title}
                                   source={event.cover}
                                   style={{
                                        width: '100%',
                                        height: 150,
                                        borderRadius: "$sm" }}
                                   placeholder={blurhash}
                                   transition={1000}
                                   contentFit="cover"
                              />
                         ) : null}
                         <EventTitle title={event.title} hasCoverImage={hasValidImage} />
                    </Center>
                    <VStack divider={<Divider />}>
                         <AddToCalendar start={event.startDate} end={event.endDate} location={event.location} event={event} />
                         <Directions location={event.location} room={event.room ?? false} />
                    </VStack>
                    {event.registrationRequired && event.registrationBody ? <RegistrationModal event={event} /> : null}
                    {event.inUserEvents ? <InYourEvents /> : <AddToYourEvents id={event.id} source={source} />}
                    <HStack justifyContent="space-between" space="sm">
                         {event.canAddToList ? <AddToList source="Events" itemId={event.id} btnStyle="reg" btnWidth="48%" /> : null}
                         <Button bgColor={"$coolGray200"} w={event.canAddToList ? '49%' : '100%'} onPress={() => openLink()}>
                              <ButtonText color={"$coolGray800"}>{getTermFromDictionary(language, 'more_info')}</ButtonText>
                         </Button>
                    </HStack>
                    <EventDescription description={event.description} />
                    <HStack justifyContent="space-between" space="lg" mt="$5" flexWrap="wrap">
                         <EventAudiences audiences={event.audiences} />
                         <EventCategories categories={event.categories} />
                         <EventProgramTypes programTypes={event.programTypes} />
                    </HStack>
               </Box>
          </>
     );
};

const EventTitle = ({ title, hasCoverImage }) => {
     const { textColor } = useTheme();
     if (title) {
          return (
               <>
                    <Heading pt={hasCoverImage ? 5 : 0} pb={3} alignText="center" color={textColor}>
                         {title}
                    </Heading>
               </>
          );
     } else {
          return null;
     }
};

const EventDescription = ({ description }) => {
     const { textColor } = useTheme();
     const language = useActiveLanguage();
     if (description) {
          return (
               <Box mt={5}>
                    <Text size="lg" fontWeight="$bold" textAlign="center" color={textColor}>
                         {getTermFromDictionary(language, 'about')}
                    </Text>
                    <Text size="md" color={textColor}>
                         {decodeHTML(description)}
                    </Text>
               </Box>
          );
     } else {
          return null;
     }
};

const EventAudiences = ({ audiences }) => {
     const { textColor } = useTheme();
     const language = useActiveLanguage();
     if (audiences) {
          return (
               <Box>
                    <Text size="lg" fontWeight="$bold" textAlign="center" color={textColor}>
                         {getTermFromDictionary(language, 'audiences')}
                    </Text>
                    {_.map(audiences, function (item, index, array) {
                         return <Text key={index} color={textColor}>{item}</Text>;
                    })}
               </Box>
          );
     } else {
          return null;
     }
};

const EventCategories = ({ categories }) => {
     const { textColor } = useTheme();
     const language = useActiveLanguage();
     if (categories) {
          return (
               <Box>
                    <Text size="lg" fontWeight="$bold" textAlign="center" color={textColor}>
                         {getTermFromDictionary(language, 'categories')}
                    </Text>
                    {_.map(categories, function (item, index, array) {
                         return <Text key={index} color={textColor}>{item}</Text>;
                    })}
               </Box>
          );
     } else {
          return null;
     }
};

const EventProgramTypes = ({ programTypes }) => {
     const { textColor } = useTheme();
     const language = useActiveLanguage();
     if (programTypes) {
          return (
               <Box>
                    <Text size="lg" fontWeight="$bold" textAlign="center" color={textColor}>
                         {getTermFromDictionary(language, 'program_types')}
                    </Text>
                    {_.map(programTypes, function (item, index, array) {
                         return <Text key={index} color={textColor}>{item}</Text>;
                    })}
               </Box>
          );
     } else {
          return null;
     }
};

const AddToCalendar = ({ start, end, location, event }) => {
     const language = useActiveLanguage();
     const [showModal, setShowModal] = React.useState(false);
     const [modalBodyText, setModalBodyText] = React.useState('');
     const [modalBodyHeading, setModalBodyHeading] = React.useState('');
     const [calendarId, setCalendarId] = React.useState();
     const [confirmAdd, setConfirmAdd] = React.useState(false);
     const { textColor } = useTheme();

     let displayDay = false;
     let displayStartTime = false;
     let displayEndTime = false;
     let day = '';
     let time1arr = '';
     let time2arr = '';
     let startTime = null;
     let endTime = null;

     if (start) {
          startTime = start.date;
          let time1 = startTime.split(' ');
          day = time1[0];
          time1arr = time1[1].split(':');
          displayDay = moment(day);
          displayStartTime = moment().set({ hour: time1arr[0], minute: time1arr[1] });
          displayDay = moment(displayDay).format('dddd, MMMM D, YYYY');
          displayStartTime = moment(displayStartTime).format('h:mm A');
     }

     if (end) {
          endTime = end.date;
          let time2 = endTime.split(' ');
          time2arr = time2[1].split(':');
          displayEndTime = moment().set({ hour: time2arr[0], minute: time2arr[1] });
          displayEndTime = moment(displayEndTime).format('h:mm A');
     }

     const handleAddToCalendar = async () => {
          const { status } = await Calendar.requestCalendarPermissionsAsync();
          if (status === 'granted') {
               const defaultCalendarSource =
                    Platform.OS !== 'android'
                         ? await Calendar.getDefaultCalendarAsync()
                         : {
                                isLocalAccount: true,
                                name: location.name + ' Events' };

               const calendars = await Calendar.getCalendarsAsync();

               let id = null;
               if (_.find(calendars, _.matchesProperty('title', location.name + ' Events'))) {
                    const deviceCalendar = _.find(calendars, _.matchesProperty('title', location.name + ' Events'));
                    id = deviceCalendar.id;
               } else {
                    id = await Calendar.createCalendarAsync({
                         title: location.name + ' Events',
                         color: 'yellow',
                         entityType: Calendar.EntityTypes.EVENT,
                         sourceId: defaultCalendarSource?.source?.id,
                         source: defaultCalendarSource,
                         name: 'libraryCalendarEvents',
                         ownerAccount: 'personal',
                         accessLevel: Calendar.CalendarAccessLevel.OWNER });
               }

               logInfoMessage('calendarId: ' + calendarId);
               setCalendarId(id);
               setConfirmAdd(true);
               setModalBodyHeading(getTermFromDictionary(language, 'add_to_calendar'));
               setModalBodyText(getTermFromDictionary(language, 'add_to_calendar_body'));
               setShowModal(true);
          } else {
               setModalBodyHeading(getTermFromDictionary(language, 'error'));
               setModalBodyText(getTermFromDictionary(language, 'event_no_permissions'));
               setShowModal(true);
          }
     };

     const createCalendarEvent = async () => {
          const starts = moment(day).set({ hour: time1arr[0], minute: time1arr[1] });
          const ends = moment(day).set({ hour: time2arr[0], minute: time2arr[1] });
          let eventLocation = location.name;
          if (location.address) {
               eventLocation = eventLocation + ' ' + location.address;
          }
          if (calendarId) {
               try {
                    await Calendar.createEventAsync(calendarId, {
                         title: event.title,
                         startDate: moment(starts, "YYYY-MM-DD'T'HH:mm:ss.sssZ").toDate(),
                         endDate: moment(ends, "YYYY-MM-DD'T'HH:mm:ss.sssZ").toDate(),
                         id: event.id,
                         location: eventLocation,
                         allDay: event.isAllDay ?? false,
                         url: event.url }).then(async () => {
                         return popAlert(
                              getTermFromDictionary(language, 'added_successfully'),
                              getTermFromDictionary(language, 'event_added_to_calendar'),
                              'success'
                         );
                    });
               } catch (e) {
                   logDebugMessage(e);
               }
          }
     };

     return (
          <>
               <Pressable py="$3" onPress={() => handleAddToCalendar()}>
                    <HStack space="sm" alignItems="center" justifyContent="space-between">
                         <HStack space="sm" alignItems="center">
                              <Icon as={MaterialIcons} name="calendar-today" size="md" color={textColor}/>
                              <VStack>
                                   <Text bold color={textColor}>{displayDay}</Text>
                                   <Text color={textColor}>
                                        {displayStartTime} - {displayEndTime}
                                   </Text>
                              </VStack>
                         </HStack>
                         <Icon as={MaterialIcons} name="chevron-right" size="lg" color={textColor}/>
                    </HStack>
               </Pressable>
               <Modal isOpen={showModal} onClose={() => setShowModal(false)} closeOnOverlayClick={false} size="md">
                    <ModalBackdrop />
                    <ModalContent maxWidth="90%" bg="white" _dark={{ bg: 'coolGray.800' }}>
                         <ModalHeader>
                              <Heading size="$md">{modalBodyHeading}</Heading>
                              <ModalCloseButton p="$3" onPress={() => { setShowModal(false); }}>
                                   <Icon as={CloseIcon} color={textColor} />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody><Text>{modalBodyText}</Text></ModalBody>
                         <ModalFooter>
                              <ButtonGroup space={2} size="md">
                                   <Button
                                        colorScheme="muted"
                                        variant="outline"
                                        onPress={() => {
                                             setShowModal(false);
                                             setConfirmAdd(false);
                                             setModalBodyText('');
                                             setModalBodyHeading('');
                                        }}>
                                        <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                   {confirmAdd ? (
                                        <Button
                                             onPress={() =>
                                                  createCalendarEvent().then((result) => {
                                                       setShowModal(false);
                                                       setConfirmAdd(false);
                                                       setModalBodyText('');
                                                       setModalBodyHeading('');
                                                  })
                                             }>
                                             <ButtonText>{getTermFromDictionary(language, 'add_event')}</ButtonText>
                                        </Button>
                                   ) : null}
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </>
     );
};

const Directions = ({ location, room }) => {
     const { textColor } = useTheme();
     let hasCoordinates = false;
     if (location) {
          if (!_.isUndefined(location.coordinates) && _.isObject(location.coordinates)) {
               if (location.coordinates.latitude !== 0 && location.coordinates.longitude !== 0) {
                    hasCoordinates = true;
               }
          }
     }

     const handleGetDirections = async () => {
          if (hasCoordinates) {
               const sourceLatitude = await SecureStore.getItemAsync('latitude');
               const sourceLongitude = await SecureStore.getItemAsync('longitude');
               if (sourceLatitude && sourceLongitude && sourceLatitude !== '0' && sourceLongitude !== '0') {
                    showLocation({
                         latitude: location.coordinates.latitude,
                         longitude: location.coordinates.longitude,
                         sourceLatitude,
                         sourceLongitude,
                         googleForceLatLon: true });
               } else {
                    showLocation({
                         latitude: location.coordinates.latitude,
                         longitude: location.coordinates.longitude,
                         googleForceLatLon: true });
               }
          }
     };

     if (location) {
          return (
               <Pressable py="$3" mb="$5" onPress={() => handleGetDirections()}>
                    <HStack space="sm" alignItems="center" justifyContent="space-between">
                         <HStack space="sm" alignItems="center">
                              <Icon as={MaterialIcons} name="location-pin" size="md" color={textColor}/>
                              <VStack>
                                   {location.name ? <Text bold color={textColor}>{location.name}</Text> : null}
                                   {room ? <Text color={textColor}>{room}</Text> : null}
                                   {location.address ? <Text color={textColor}>{location.address}</Text> : null}
                              </VStack>
                         </HStack>
                         {hasCoordinates ? <Icon as={MaterialIcons} name="chevron-right" size="lg" color={textColor} /> : null}
                    </HStack>
               </Pressable>
          );
     }

     return null;
};

const AddToYourEvents = ({ id, source }) => {
     const queryClient = useQueryClient();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const library = useLibrary();
     const language = useActiveLanguage();
     const { theme } = useTheme();
     const [isLoading, setIsLoading] = React.useState(false);

     const addToEvents = async () => {
          setIsLoading(true);
          await saveEvent(id, language, library.baseUrl).then(async (result) => {
               setIsLoading(false);
               queryClient.invalidateQueries({ queryKey: ['saved_events', user.id, library.baseUrl, 1, 'upcoming'] });
               queryClient.invalidateQueries({ queryKey: ['saved_events', user.id, library.baseUrl, 1, 'all'] });
               queryClient.invalidateQueries({ queryKey: ['saved_events', user.id, library.baseUrl, 1, 'past'] });
               queryClient.invalidateQueries({ queryKey: ['event', id, source, language, library.baseUrl] });
               const profileResponse = await refreshProfile(library.baseUrl);
               if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
                    await updateUserProfile(profileResponse.data.result.profile);
               }
               if (result.success || result.success === 'true') {
                    popAlert(getTermFromDictionary(language, 'added_successfully'), result.message, 'success');
               } else {
                    popAlert(getTermFromDictionary(language, 'error'), result.message, 'error');
               }
          });
     };

     return (
          <Button bgColor={theme['tokens']['colors']['tertiary']['500']} onPress={() => addToEvents()} mb="$2" isLoading={isLoading} isLoadingText={getTermFromDictionary(language, 'adding', true)}>
               <ButtonText color={theme.tokens.colors.tertiary['500-text']}>{getTermFromDictionary(language, 'add_to_events')}</ButtonText>
          </Button>
     );
};

const InYourEvents = () => {
     const language = useActiveLanguage();
     const { theme } = useTheme();
     return (
          <Button mb="$2" bgColor={theme['tokens']['colors']['tertiary']['500']} onPress={() => navigateStack('AccountScreenTab', 'MyEvents')}>
               <ButtonText color={theme.tokens.colors.tertiary['500-text']}>{getTermFromDictionary(language, 'in_your_events')}</ButtonText>
          </Button>
     );
};

const RegistrationModal = ({ event }) => {
     const language = useActiveLanguage();
     const [showRegistrationModal, setShowRegistrationModal] = React.useState(false);

     const { textColor, theme, colorMode } = useTheme();
     const backgroundColor= colorMode === 'light' ? "$warmGray200" : "$coolGray900";

     const openLink = async () => {
          /* location.homeLink */

          const browserParams = {
               enableDefaultShareMenuItem: false,
               presentationStyle: 'automatic',
               showTitle: false,
               toolbarColor: backgroundColor,
               controlsColor: textColor,
               secondaryToolbarColor: backgroundColor };

          setShowRegistrationModal(false);
          WebBrowser.openBrowserAsync(event.url, browserParams);
     };

     return (
          <>
               <Button bgColor={theme['tokens']['colors']['tertiary']['500']} onPress={() => setShowRegistrationModal(true)} mb="$2">
                    <ButtonText color={theme.tokens.colors.tertiary['500-text']}>{getTermFromDictionary(language, 'registration_information')}</ButtonText>
               </Button>
               <Modal isOpen={showRegistrationModal} onClose={() => setShowRegistrationModal(false)} closeOnOverlayClick={false} size="lg">
                    <ModalBackdrop />
                    <ModalContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"} maxWidth="90%">
                         <ModalHeader>
                              <Heading size="$md" color={textColor}>{getTermFromDictionary(language, 'registration_information')}</Heading>
                              <ModalCloseButton p="$3" onPress={() => { setShowRegistrationModal(false); }}>
                                   <Icon as={CloseIcon} color={textColor} />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody><Text color={textColor}>{stripHTML(decodeHTML(event.registrationBody))}</Text></ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="sm" size="md">
                                   <Button
                                        bgColor={"$coolGray200"}
                                        variant="outline"
                                        onPress={() => {
                                             setShowRegistrationModal(false);
                                        }}>
                                        <ButtonText color={"$coolGray800"}>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                   <Button bgColor={theme.tokens.colors.primary['500']} onPress={() => openLink()}><ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'go_to_registration')}</ButtonText></Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </>
     );
};

async function checkImageUrl(url) {
     fetch(url).then((response) => {
          if (!_.isUndefined(response.status)) {
               if (response.status === 200 || response.status === 201) {
                    return true;
               }
          }
          return false;
     });
}
