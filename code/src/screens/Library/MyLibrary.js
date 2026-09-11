import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { formatTime, getTodaysHoursStatus, isArray, size } from '../../helpers/helpers';
import { Badge, BadgeText, Box, Button, ButtonText, Divider, Heading, HStack, ScrollView, Text, VStack } from '@gluestack-ui/themed';
import { colorMode, useTheme } from '../../themes/theme';
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
// custom components and helper files
import Hours from './Hours';
import { LoadingSpinner } from '../../components/loadingSpinner';
import {logDebugMessage} from "../../util/logging";
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { LinearGradient } from 'expo-linear-gradient';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

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
     const { textColor, theme, colorMode } = useTheme();

     const bgColor = colorMode === 'light' ? '#f5f5f4' : '#111827';

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
                         <LinearGradient height={200} width="100%" locations={[.25, .90]} colors={['transparent', bgColor]} zIndex={0} position="absolute" left={0} top={0} />
                         <Image
                              alt={location.displayName}
                              source={location.locationImage}
                              style={{
                                   width: '100%',
                                   height: 200,
                                   borderRadius: 4,
                                   zIndex: -1,
                                   position: 'absolute',
                                   left: 0,
                                   top: 0,
                              }}
                              placeholder={blurhash}
                              transition={1000}
                              contentFit="cover"
                         />

                    </>
               ) : null}
               <Box safeArea={5} mt={location.locationImage ? "$40" : "$0"} mx="$2" zIndex={200}>
                    {showSystemMessage()}
                    {library.displayName !== location.displayName ? <Heading color={textColor} mb="$2">{location.displayName}</Heading> : <Heading color={textColor} mb="$4">{library.displayName}</Heading>}
                    {location.address ? <Text color={textColor}>{location.address}</Text> : null}
                    {location.phone ? (
                         <Text color={textColor}>{getTermFromDictionary(language, 'phone')}: {location.phone}</Text>
                    ) : null}
                    {hasHours ? (
                         <Text color={textColor} mt="$4" mb="$2">
                              <Badge colorScheme={isClosedToday ? 'error' : 'success'} alignSelf="flex-start">
                                   <BadgeText>
                                        {hoursLabel}
                                   </BadgeText>
                              </Badge>
                         </Text>
                    ) : null}
                    <DisplayMap data={location} />
                    <Box mt="$4">
                         <ContactButtons data={location} />
                         {hasHours ? <Hours data={location} /> : null}
                         <AdditionalInformation data={location} />
                    </Box>
                    {size(locations) > 1 ? (
                         <>
                              <Divider mt="$5" mb="$2" />
                              <Button variant="ghost" size="sm" onPress={selectLocations} bgColor={theme.tokens.colors.primary['500']}>
                                   <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'view_all_locations')}</ButtonText>
                              </Button>
                         </>
                    ) : null}
               </Box>
          </ScrollView>
     );
};
