import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { formatTime, getTodaysHoursStatus, isArray, size, sortBy } from '../../helpers/helpers';
import { Box, ButtonGroup, Button, ButtonText, Divider, FlatList, HStack, Icon, Pressable, Text, VStack } from '@gluestack-ui/themed';
import React from 'react';
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

export const AllLocations = () => {
     const library = useLibrary();
     const locations = useAvailableLocations();
     const { textColor, colorMode, theme } = useTheme();
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
               ? sortBy(locations, ['distance', 'displayName'])
               : sortBy(locations, ['displayName']);
     }, [locations, sort]);

     const showSystemMessage = () => {
          if (isArray(systemMessages)) {
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
               <Box
                    alignItems="center"
                    p="$2"
                    bgColor={colorMode === 'light' ? '$coolGray100' : '$coolGray700'}
                    borderBottomWidth="$1"
                    borderColor={colorMode === 'light' ? '$coolGray200' : '$coolGray600'}>
                    <ButtonGroup alignItems="center" isAttached>
                         <Button variant={sort === 'alphabetical' ? 'solid' : 'outline'} action="secondary" onPress={() => setSort('alphabetical')}>
                              <ButtonText>{getTermFromDictionary(language, 'a_to_z')}</ButtonText>
                         </Button>
                         <Button variant={sort === 'distance' ? 'solid' : 'outline'} action="secondary" onPress={() => setSort('distance')}>
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
                                   {size(systemMessages) > 0 ? <Box p="$2">{showSystemMessage()}</Box> : null}
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

const DisplayLocation = (data) => {
     const language = useActiveLanguage();
     const {textColor} = useTheme();
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
          const hoursStatus = getTodaysHoursStatus(location.hours);
          hasHours = hoursStatus.hasHours;

          if (hoursStatus.status === 'closed_until' && hoursStatus.openingTime) {
               hoursLabel = 'Closed until ' + formatTime(hoursStatus.openingTime);
          } else if (hoursStatus.status === 'open_until' && hoursStatus.closingTime) {
               hoursLabel = 'Open until ' + formatTime(hoursStatus.closingTime);
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
                    <HStack justifyContent="space-between" alignItems="center" p="$4">
                         {location.locationImage ? (
                              <Box width="30%" mr="$2">
                                   <Image alt={location.displayName} source={location.locationImage} style={{ width: '100%', height: 90, borderRadius: 4 }} placeholder={blurhash} transition={1000} contentFit="cover" />
                              </Box>
                         ) : null}
                         <VStack width={location.locationImage ? '60%' : '85%'}>
                              <Text size="md" bold color={textColor}>{location.displayName}</Text>
                              <Text size="xs" mb="$2" color={textColor}>
                                   {location.address}
                              </Text>
                              {hasHours ? (
                                   <HStack alignItems="center" space="xs">
                                        <Icon as={MaterialIcons} name="access-time" size="sm"  color={textColor}/>
                                        <Text size="xs" color={textColor}>{hoursLabel}</Text>
                                   </HStack>
                              ) : null}
                              {distanceText ? (
                                   <HStack alignItems="center" space="xs">
                                        <Icon as={MaterialIcons} name="pin-drop" size="sm" color={textColor} />
                                        <Text size="xs" color={textColor}>{distanceText}</Text>
                                   </HStack>
                              ) : null}
                         </VStack>
                         <Icon as={MaterialIcons} name="chevron-right" size="xl" color={textColor} />
                    </HStack>
               </Pressable>
               <Divider mt="$3" mb="$3" />
          </>
     );
};
