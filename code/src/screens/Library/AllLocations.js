import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedDivider as Divider } from '@/src/components/themed/ThemedDivider';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { loadError } from '../../components/loadError';
import { loadingSpinner } from '../../components/loadingSpinner';
import { DisplaySystemMessage } from '../../components/Notifications';
import { SystemMessagesContext } from '../../context/initialContext';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useAvailableLocations, useUpdateAvailableLocations } from '../../hooks/useLibraryBranchData';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getLocations } from '../../util/api/system';
import { logDebugMessage, logErrorMessage, getErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * AllLocations component that displays a list of all available library locations. It fetches location data from the API, handles sorting by distance or alphabetical order, and displays system messages if any are present.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const AllLocations = () => {
     const library = useLibrary();
     const locations = useAvailableLocations();
     const { colorMode, neutralPairs, neutrals } = useTheme();
     const updateAvailableLocations = useUpdateAvailableLocations();
     const language = useActiveLanguage();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const queryClient = useQueryClient();

     const [sort, setSort] = React.useState('alphabetical');
     const [isCoordinatesLoaded, setIsCoordinatesLoaded] = React.useState(false);
     const [userLatitude, setUserLatitude] = React.useState(0);
     const [userLongitude, setUserLongitude] = React.useState(0);

     // Fetch coordinates on focus
     useFocusEffect(
          React.useCallback(() => {
               let isMounted = true;

               const updateCoordinates = async () => {
                    logDebugMessage("Getting location information in AllLocations");
                    let latitude = await SecureStore.getItemAsync('latitude');
                    let longitude = await SecureStore.getItemAsync('longitude');

                    if (sort === 'distance') {
                         const { status } = await Location.requestForegroundPermissionsAsync();
                         if (status === 'granted') {
                              let location = await Location.getLastKnownPositionAsync({});
                              if (location != null) {
                                   latitude = JSON.stringify(location.coords.latitude);
                                   longitude = JSON.stringify(location.coords.longitude);
                                   await SecureStore.setItemAsync('latitude', latitude);
                                   await SecureStore.setItemAsync('longitude', longitude);
                              }
                         }
                    }

                    if (isMounted) {
                         setUserLatitude(latitude || 0);
                         setUserLongitude(longitude || 0);
                         setIsCoordinatesLoaded(true);
                    }
               };

               updateCoordinates();

               return () => {
                    isMounted = false;
               };
          }, [sort])
     );

     // Query location data
     const { status, isFetching, data: queryData } = useQuery(
          ['locations', library.baseUrl, language, userLatitude, userLongitude],
          () => getLocations(library.baseUrl, language, userLatitude, userLongitude),
          {
               enabled: isCoordinatesLoaded,
               onError: (error) => {
                    logDebugMessage("Error fetching locations");
                    logErrorMessage(error);
               } }
     );

      // Sync API query response to global Context
      React.useEffect(() => {
           const syncLocations = async () => {
                if (queryData?.ok && queryData?.data?.result?.locations) {
                     await updateAvailableLocations(queryData.data.result.locations ?? []);
                } else if (queryData && !queryData.ok) {
                     getErrorMessage(queryData.code, queryData.problem);
                }
           };
           syncLocations();
      }, [queryData, updateAvailableLocations]);

     // Derive sorted locations automatically from context state
     const sortedLocations = React.useMemo(() => {
          if (!locations) return [];
          return sort === 'distance'
               ? _.sortBy(locations, ['distance', 'displayName'])
               : _.sortBy(locations, ['displayName']);
     }, [locations, sort]);

     const showSystemMessage = () => {
          if (_.isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
                    if (obj.showOn === '0' || obj.showOn === '1') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
               });
          }
          return null;
     };

     const getActionButtons = () => {
          return (
               <Box style={{ alignItems: 'center', backgroundColor: neutrals.surface, borderBottomWidth: 1, borderColor: neutrals.border }} className="p-2">
                    <ButtonGroup alignItems="center" isAttached>
                         <Button variant={sort === 'alphabetical' ? 'solid' : 'outline'} colorScheme="primary" onPress={() => setSort('alphabetical')}>
                              <ButtonText>{getTermFromDictionary(language, 'a_to_z')}</ButtonText>
                         </Button>
                         <Button variant={sort === 'distance' ? 'solid' : 'outline'} colorScheme="primary" onPress={() => setSort('distance')}>
                              <ButtonText>{getTermFromDictionary(language, 'distance')}</ButtonText>
                         </Button>
                    </ButtonGroup>
               </Box>
          );
     };

     const isLoadingState = status === 'loading' || isFetching || !isCoordinatesLoaded;

     return (
          <>
               {isLoadingState ? (
                    loadingSpinner()
               ) : status === 'error' ? (
                    loadError('Error', '')
               ) : (
                    <FlatList
                         ListHeaderComponent={
                              <>
                                   {_.size(systemMessages) > 0 ? <Box className="p-2">{showSystemMessage()}</Box> : null}
                                   {getActionButtons()}
                              </>
                         }
                         data={sortedLocations}
                         renderItem={({ item }) => (
                              <DisplayLocation data={item} />
                         )}
                         keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                         contentContainerStyle={{ paddingBottom: 30 }}
                    />
               )}
          </>
     );
};

/**
 * DisplayLocation component that renders the details of a specific library location, including its name, address, distance, and hours of operation. It also handles navigation to the location's detail screen when pressed.
 * @param data
 * @returns {React.JSX.Element}
 * @constructor
 */
const DisplayLocation = (data) => {
     const language = useActiveLanguage();
     const { neutrals } = useTheme();
     const location = data.data;

     let units = false;
     if (location.unit === 'Mi') {
          units = 'miles';
     } else if (location.unit === 'Km') {
          units = 'kilometers';
     }

     let distanceText = false;
     if (units && location.distance) {
          distanceText = location.distance + ' ' + units + ' away';
     }

     let hoursLabel = '';
     let hasHours = false;
     if (location.hours) {
          if (_.size(location.hours) > 0) {
               hasHours = true;
          }
          const day = moment().day();
          if (_.find(location.hours, _.matchesProperty('day', day))) {
               let todaysHours = _.filter(location.hours, { day: day });
               if (todaysHours[0]) {
                    todaysHours = todaysHours[0];
                    if (todaysHours.isClosed) {
                         hoursLabel = getTermFromDictionary(language, 'location_closed');
                    } else {
                         const closingText = todaysHours.close;
                         const time1 = closingText.split(':');
                         const openingText = todaysHours.open;
                         const time2 = openingText.split(':');
                         const closeTime = moment().set({ hour: time1[0], minute: time1[1] });
                         const openTime = moment().set({ hour: time2[0], minute: time2[1] });
                         const nowTime = moment();
                         const stillOpen = moment(nowTime).isBefore(closeTime);
                         const stillClosed = moment(openTime).isBefore(nowTime);
                         if (!stillOpen) {
                              hoursLabel = getTermFromDictionary(language, 'location_closed');
                         }
                         if (!stillClosed) {
                              let openingTime = moment(openTime).format('h:mm A');
                              hoursLabel = 'Closed until ' + openingTime;
                         } else {
                              let closingTime = moment(closeTime).format('h:mm A');
                              hoursLabel = 'Open until ' + closingTime;
                         }
                    }
               }
          } else {
               hoursLabel = getTermFromDictionary(language, 'location_closed');
          }
     }

     const goToLocation = () => {
          navigate('Location', {
               data: location,
               title: location.displayName });
     };

     return (
          <>
               <Pressable onPress={goToLocation}>
                    <HStack className="justify-between items-center py-4 px-2">
                         {location.locationImage ? (
                              <Box className="w-[30%] mr-2">
                                   <Image alt={location.displayName} source={location.locationImage} style={{ width: '100%', height: 90.0 }} className="rounded" placeholder={blurhash} transition={1000} contentFit="cover" />
                              </Box>
                         ) : null}
                         <VStack style={{ width: location.locationImage ? '60%' : '85%' }}>
                              <Text size="md" bold>{location.displayName}</Text>
                              <Text size="xs" className="mb-2">
                                   {location.address}
                              </Text>
                              {hasHours ? (
                                   <HStack alignItems="center" space="xs">
                                        <MaterialIcons name="access-time" size={16} />
                                        <Text size="xs">{hoursLabel}</Text>
                                   </HStack>
                              ) : null}
                              {distanceText ? (
                                   <HStack alignItems="center" space="xs">
                                        <MaterialIcons name="pin-drop" size={16} />
                                        <Text size="xs">{distanceText}</Text>
                                   </HStack>
                              ) : null}
                         </VStack>
                         <MaterialIcons name="chevron-right" size={24} color={neutrals.actionableIndicator} />
                    </HStack>
               </Pressable>
               <Divider className="mt-3 mb-3" />
          </>
     );
};
