import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Calendar from 'expo-calendar';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import { Platform } from 'react-native';
import { showLocation } from 'react-native-map-link';
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
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedDivider as Divider } from '@/src/components/themed/ThemedDivider';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { Pressable } from '@/components/ui/pressable';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { ThemedCloseIcon as CloseIcon } from '../../components/themed/ThemedFormControls';
import { screenContentContainerStyle } from '@/src/components/ScreenContainer';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * EventScreen component that displays the details of a specific event, including title, description, date, time, location, and options to add to calendar or user events.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const EventScreen = () => {
     const route = useRoute();
     const queryClient = useQueryClient();
     const id = route.params.id;
     const source = route.params.source;
     const library = useLibrary();
     const language = useActiveLanguage();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { textColor, neutralPairs, neutrals } = useTheme();
     const [hasValidImage, setHasValidImage] = React.useState(false);
     const [eventData, setEventData] = React.useState([]);
     const [errorMessage, setErrorMessage] = React.useState('');

     const { status, data, error, isFetching } = useQuery(['event', id, source, language, library.baseUrl], () => getEventDetails(id, source, language, library.baseUrl), {
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
          <ScrollView contentContainerStyle={screenContentContainerStyle}>
               {(eventData.length === 0 || status === 'loading' || isFetching) && errorMessage === ''? (
                    // TODO(translation): Replace hardcoded loading message with TranslationService-backed key.
                    <Box className="pt-[50px]"><LoadingSpinner message="Fetching data..." /></Box>
               ) : status === 'error' ? (
                    <Box className="pt-[50px]">{loadError(error, '')}</Box>
               ) : errorMessage !== '' ? (
                    <Box className="pt-[50px]">{loadError(errorMessage, '')}</Box>
               ) : (
                    <>
                         {_.size(systemMessages) > 0 ? <Box className="p-2">{showSystemMessage()}</Box> : null}
                         <DisplayEvent data={eventData} source={source} hasValidImage={hasValidImage} />
                    </>
               )}
          </ScrollView>
     );
};

/**
 * DisplayEvent component that renders the details of an event, including title, description, date, time, location, and options to add to calendar or user events.
 * @param payload
 * @returns {React.JSX.Element}
 * @constructor
 */
const DisplayEvent = (payload) => {
     const event = payload.data;
     const hasValidImage = payload.hasValidImage;
     const route = useRoute();
     const source = route.params.source;
     const language = useActiveLanguage();
     const { textColor, neutralPairs, neutrals } = useTheme();
     const backgroundColor = neutrals.surface;
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
               {event.cover ? <Box style={{ height: 125, width: '100%', backgroundColor, zIndex: -1, position: 'absolute', left: 0, top: 0 }} /> : null}
               <Box className="py-5 w-full">
                    <Center style={{ marginTop: event.cover ? 20 : 0, width: '100%' }}>
                         {event.cover ? (
                              <Image
                                   alt={event.title}
                                   source={event.cover}
                                   className="rounded-lg"
                                   style={{ width: '100%', height: 150.0 }}
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
                    <HStack space="sm" className="justify-between">
                         {event.canAddToList ? <AddToList source="Events" itemId={event.id} btnStyle="reg" btnWidth="48%" /> : null}
                         <Button style={{ backgroundColor: neutralPairs.surface.light, width: event.canAddToList ? '49%' : '100%' }} onPress={() => openLink()}>
                              <ButtonText style={{ color: neutralPairs.textMain.light }}>{getTermFromDictionary(language, 'more_info')}</ButtonText>
                         </Button>
                    </HStack>
                    <EventDescription description={event.description} />
                    <HStack space="lg" className="justify-between mt-5 flex-wrap">
                         <EventAudiences audiences={event.audiences} />
                         <EventCategories categories={event.categories} />
                         <EventProgramTypes programTypes={event.programTypes} />
                    </HStack>
               </Box>
          </>
     );
};

/**
 * EventTitle component that renders the title of an event, with optional padding based on whether a cover image is present.
 * @param param0
 * @param param0.title
 * @param param0.hasCoverImage
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const EventTitle = ({ title, hasCoverImage }) => {
     const { textColor } = useTheme();
     if (title) {
          return (
               <>
                    <Heading className="pb-3" style={{ paddingTop: hasCoverImage ? 20 : 0, textAlign: 'center' }}>
                         {title}
                    </Heading>
               </>
          );
     } else {
          return null;
     }
};

/**
 * EventDescription component that renders the description of an event, with a heading and optional HTML decoding.
 * @param param0
 * @param param0.description
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const EventDescription = ({ description }) => {
     const { textColor } = useTheme();
     const language = useActiveLanguage();
     if (description) {
          return (
               <Box className="mt-5">
                    <Text size="lg" bold className="text-center">
                         {getTermFromDictionary(language, 'about')}
                    </Text>
                    <Text size="md">
                         {decodeHTML(description)}
                    </Text>
               </Box>
          );
     } else {
          return null;
     }
};

/**
 * EventAudiences component that renders the audiences of an event, with a heading and a list of audience items.
 * @param param0
 * @param param0.audiences
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const EventAudiences = ({ audiences }) => {
     const { textColor } = useTheme();
     const language = useActiveLanguage();
     if (audiences) {
          return (
               <Box>
                    <Text size="lg" bold className="text-center">
                         {getTermFromDictionary(language, 'audiences')}
                    </Text>
                    {_.map(audiences, function (item, index, array) {
                         return <Text key={index}>{item}</Text>;
                    })}
               </Box>
          );
     } else {
          return null;
     }
};

/**
 * EventCategories component that renders the categories of an event, with a heading and a list of category items.
 * @param param0
 * @param param0.categories
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const EventCategories = ({ categories }) => {
     const { textColor } = useTheme();
     const language = useActiveLanguage();
     if (categories) {
          return (
               <Box>
                    <Text size="lg" bold className="text-center">
                         {getTermFromDictionary(language, 'categories')}
                    </Text>
                    {_.map(categories, function (item, index, array) {
                         return <Text key={index}>{item}</Text>;
                    })}
               </Box>
          );
     } else {
          return null;
     }
};

/**
 * EventProgramTypes component that renders the program types of an event, with a heading and a list of program type items.
 * @param param0
 * @param param0.programTypes
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const EventProgramTypes = ({ programTypes }) => {
     const { textColor } = useTheme();
     const language = useActiveLanguage();
     if (programTypes) {
          return (
               <Box>
                    <Text size="lg" bold className="text-center">
                         {getTermFromDictionary(language, 'program_types')}
                    </Text>
                    {_.map(programTypes, function (item, index, array) {
                         return <Text key={index}>{item}</Text>;
                    })}
               </Box>
          );
     } else {
          return null;
     }
};

/**
 * AddToCalendar component that provides functionality to add an event to the user's calendar, including handling permissions and displaying a modal for confirmation.
 * @param param0
 * @param param0.start
 * @param param0.end
 * @param param0.location
 * @param param0.event
 * @returns {React.JSX.Element}
 * @constructor
 */
const AddToCalendar = ({ start, end, location, event }) => {
     const language = useActiveLanguage();
     const [showModal, setShowModal] = React.useState(false);
     const [modalBodyText, setModalBodyText] = React.useState('');
     const [modalBodyHeading, setModalBodyHeading] = React.useState('');
     const [calendarId, setCalendarId] = React.useState();
     const [confirmAdd, setConfirmAdd] = React.useState(false);
     const { neutralPairs, neutrals } = useTheme();

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
               <Pressable className="py-3" onPress={() => handleAddToCalendar()}>
                    <HStack space="sm" className="items-center justify-between">
                         <HStack space="sm" className="items-center">
                              <MaterialIcons name="calendar-today" size={18} />
                              <VStack>
                                   <Text bold>{displayDay}</Text>
                                   <Text>
                                        {displayStartTime} - {displayEndTime}
                                   </Text>
                              </VStack>
                         </HStack>
                         <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} />
                    </HStack>
               </Pressable>
               <Modal isOpen={showModal} onClose={() => setShowModal(false)} closeOnOverlayClick={false} size="md">
                    <ModalBackdrop />
                    <ModalContent style={{ maxWidth: '90%', backgroundColor: neutralPairs.surface.light }}>
                         <ModalHeader>
                              <Heading>{modalBodyHeading}</Heading>
                              <ModalCloseButton onPress={() => { setShowModal(false); }}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody><Text>{modalBodyText}</Text></ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="sm" size="md">
                                   <Button colorScheme="primary"
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
                                            colorScheme="primary"
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

/**
 * Directions component that provides functionality to get directions to an event location, including handling coordinates and opening a map application.
 * @param param0
 * @param param0.location
 * @param param0.room
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const Directions = ({ location, room }) => {
     const { neutrals } = useTheme();
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
               <Pressable className="py-3 mb-5" onPress={() => handleGetDirections()}>
                    <HStack space="sm" className="items-center justify-between">
                         <HStack space="sm" className="items-center">
                              <MaterialIcons name="location-pin" size={18} />
                              <VStack>
                                   {location.name ? <Text bold>{location.name}</Text> : null}
                                   {room ? <Text>{room}</Text> : null}
                                   {location.address ? <Text>{location.address}</Text> : null}
                              </VStack>
                         </HStack>
                         {hasCoordinates ? <MaterialIcons name="chevron-right" size={20} color={neutrals.actionableIndicator} /> : null}
                    </HStack>
               </Pressable>
          );
     }

     return null;
};

/**
 * AddToYourEvents component that provides functionality to add an event to the user's events, including handling API calls and updating the user profile.
 * @param param0
 * @param param0.id
 * @param param0.source
 * @returns {React.JSX.Element}
 * @constructor
 */
const AddToYourEvents = ({ id, source }) => {
     const queryClient = useQueryClient();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const library = useLibrary();
     const language = useActiveLanguage();
     const {  } = useTheme();
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
          <Button colorScheme="tertiary" className="mb-2" onPress={() => addToEvents()} isLoading={isLoading} isLoadingText={getTermFromDictionary(language, 'adding', true)}>
               <ButtonText>{getTermFromDictionary(language, 'add_to_events')}</ButtonText>
          </Button>
     );
};

/**
 * InYourEvents component that provides functionality to navigate to the user's events, allowing them to view events they have added.
 * @returns {React.JSX.Element}
 * @constructor
 */
const InYourEvents = () => {
     const language = useActiveLanguage();
     const {  } = useTheme();
     return (
          <Button colorScheme="tertiary" className="mb-2" onPress={() => navigateStack('AccountScreenTab', 'MyEvents')}>
               <ButtonText>{getTermFromDictionary(language, 'in_your_events')}</ButtonText>
          </Button>
     );
};

/**
 * RegistrationModal component that displays a modal with registration information for an event, including options to close the modal or go to the registration link.
 * @param param0
 * @param param0.event
 * @returns {React.JSX.Element}
 * @constructor
 */
const RegistrationModal = ({ event }) => {
     const language = useActiveLanguage();
     const [showRegistrationModal, setShowRegistrationModal] = React.useState(false);

     const { textColor, neutralPairs, neutrals } = useTheme();
     const backgroundColor= neutrals.surface;

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
               <Button colorScheme="tertiary" className="mb-2" onPress={() => setShowRegistrationModal(true)}>
                   <ButtonText>{getTermFromDictionary(language, 'registration_information')}</ButtonText>
               </Button>
               <Modal isOpen={showRegistrationModal} onClose={() => setShowRegistrationModal(false)} closeOnOverlayClick={false} size="lg">
                    <ModalBackdrop />
                    <ModalContent>
                         <ModalHeader>
                              <Heading>{getTermFromDictionary(language, 'registration_information')}</Heading>
                              <ModalCloseButton onPress={() => { setShowRegistrationModal(false); }}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody><Text>{stripHTML(decodeHTML(event.registrationBody))}</Text></ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="sm" size="md">
                                   <Button
                                        variant="outline"
                                        style={{ borderColor: neutralPairs.border.light, backgroundColor: neutralPairs.surface.light }}
                                        onPress={() => {
                                             setShowRegistrationModal(false);
                                        }}>
                                        <ButtonText style={{ color: neutralPairs.textMain.light }}>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                   <Button colorScheme="primary" onPress={() => openLink()}><ButtonText>{getTermFromDictionary(language, 'go_to_registration')}</ButtonText></Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </>
     );
};

/**
 * checkImageUrl function that checks if an image URL is valid by making a fetch request and checking the response status.
 * @param url
 * @returns {Promise<void>}
 */
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
