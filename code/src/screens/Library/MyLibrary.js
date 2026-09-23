import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useTheme } from '../../themes/theme';
import { formatTime, getTodaysHoursStatus, isArray, size } from '../../helpers/helpers';
import React from 'react';
import { DisplaySystemMessage } from '../../components/Notifications';
import { SystemMessagesContext } from '../../context/initialContext';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useLibraryLocationQuery, useAvailableLocations } from '../../hooks/useLibraryBranchData';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import AdditionalInformation from './AdditionalInformation';
import ContactButtons from './ContactButtons';
import DisplayMap from './DisplayMap';
import Hours from './Hours';
import { LoadingSpinner } from '../../components/loadingSpinner';
import {logDebugMessage} from "../../util/logging";
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedBadge as Badge, ThemedBadgeText as BadgeText } from '../../components/themed/ThemedBadge';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedDivider as Divider } from '@/src/components/themed/ThemedDivider';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ScreenContainer } from '@/src/components/ScreenContainer';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

/**
 * MyLibrary component that displays detailed information about the user's selected library, including its image, address, phone number, hours of operation, map, contact buttons, and additional information. It also handles system messages and navigation to view all locations if applicable.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MyLibrary = () => {
     const library = useLibrary();
     const {
          data: location,
          isLoading: isLoadingLocation,
     } = useLibraryLocationQuery();
     const locations = useAvailableLocations();
     const language = useActiveLanguage();
     const queryClient = useQueryClient();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { neutrals } = useTheme();

     const bgColor = neutrals.canvas;

     if (isLoadingLocation || !location) {
          return <LoadingSpinner />;
     }

     const showSystemMessage = () => {
          if (isArray(systemMessages)) {
               return systemMessages.map((obj, index, collection) => {
                    if (obj.showOn === '0') {
                         return <DisplaySystemMessage key={obj.id || index} style={obj.style} message={obj.message} dismissable={obj.dismissable} id={obj.id} all={systemMessages} url={library.baseUrl} updateSystemMessages={updateSystemMessages} queryClient={queryClient} />;
                    }
               });
          }
          return null;
     };

     let isClosedToday = false;
     let hoursLabel = '';
     let hasHours = false;
     if (location.hours) {
          const hoursStatus = getTodaysHoursStatus(location.hours);
          hasHours = hoursStatus.hasHours;
          isClosedToday = hoursStatus.isClosedToday;

          if (hoursStatus.status === 'closed_until' && hoursStatus.openingTime) {
               hoursLabel = getTermFromDictionary(language, 'closed_until') + ' ' + formatTime(hoursStatus.openingTime);
          } else if (hoursStatus.status === 'open_until' && hoursStatus.closingTime) {
               hoursLabel = getTermFromDictionary(language, 'open_until') + ' ' + formatTime(hoursStatus.closingTime);
          } else {
               hoursLabel = getTermFromDictionary(language, 'location_closed');
          }
     }

     const key = 'location_' + location.locationId;

     logDebugMessage(key + ':' + location.locationImage);

     const selectLocations = () => {
          navigate('AllLocations');
     };

     return (
          <ScrollView>
               {location.locationImage ? (
                    <>
                         <LinearGradient
                              locations={[0.25, 0.9]}
                              colors={['transparent', bgColor]}
                              style={{
                                   width: '100%',
                                   height: 200,
                                   zIndex: 0,
                                   position: 'absolute',
                                   left: 0,
                                   top: 0,
                              }}
                         />
                         <Image
                              alt={location.displayName}
                              source={location.locationImage}
                              style={{
                                   width: '100%',
                                   height: 200,
                                   zIndex: -1,
                                   position: 'absolute',
                                   left: 0,
                                   top: 0,
                              }}
                              className="rounded"
                              placeholder={blurhash}
                              transition={1000}
                              contentFit="cover"
                         />

                    </>
               ) : null}
               <ScreenContainer safeArea>
                    <Box style={{ marginTop: location.locationImage ? 160 : 0, zIndex: 200 }}>
                         {showSystemMessage()}
                         {library.displayName !== location.displayName ? <Heading className="mb-2">{location.displayName}</Heading> : <Heading className="mb-4">{library.displayName}</Heading>}
                         {location.address ? <Text>{location.address}</Text> : null}
                         {location.phone ? (
                              <Text>{getTermFromDictionary(language, 'phone')}: {location.phone}</Text>
                         ) : null}
                         {hasHours ? (
                              <Text className="mt-4 mb-2">
                                   <Badge colorScheme={isClosedToday ? 'error' : 'success'} className="self-start">
                                        <BadgeText colorScheme={isClosedToday ? 'error' : 'success'}>
                                             {hoursLabel}
                                        </BadgeText>
                                   </Badge>
                              </Text>
                         ) : null}
                         <DisplayMap data={location} />
                         <Box className="mt-4">
                              <ContactButtons data={location} />
                              {hasHours ? <Hours data={location} /> : null}
                              <AdditionalInformation data={location} />
                         </Box>
                         {_.size(locations) > 1 ? (
                              <>
                                   <Divider className="mt-5 mb-2" />
                                   <Button variant="ghost" size="sm" onPress={selectLocations} colorScheme="primary">
                                        <ButtonText>{getTermFromDictionary(language, 'view_all_locations')}</ButtonText>
                                   </Button>
                              </>
                         ) : null}
                    </Box>
                    {size(locations) > 1 ? (
                         <>
                              <Divider className="mt-5 mb-2" />
                              <Button variant="ghost" size="sm" onPress={selectLocations} colorScheme="primary">
                                   <ButtonText>{getTermFromDictionary(language, 'view_all_locations')}</ButtonText>
                              </Button>
                         </>
                    ) : null}
               </ScreenContainer>
          </ScrollView>
     );
};
