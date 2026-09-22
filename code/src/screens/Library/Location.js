import { useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { formatTime, getTodaysHoursStatus, isArray, size } from '../../helpers/helpers';
import { Badge, BadgeText, Box, Button, ButtonText, Divider, Heading, ScrollView, Text, VStack } from '@gluestack-ui/themed';
import React from 'react';
import { DisplaySystemMessage } from '../../components/Notifications';
import { SystemMessagesContext } from '../../context/initialContext';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useAvailableLocations } from '../../hooks/useLibraryBranchData';
import { navigate } from '../../helpers/RootNavigator';
import { getTermFromDictionary } from '../../translations/TranslationService';
import AdditionalInformation from './AdditionalInformation';
import ContactButtons from './ContactButtons';
import DisplayMap from './DisplayMap';
// custom components and helper files
import Hours from './Hours';
import {logDebugMessage} from "../../util/logging";
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';

const blurhash = 'MHPZ}tt7*0WC5S-;ayWBofj[K5RjM{ofM_';

export const Location = () => {
     const route = useRoute();
     const location = route.params?.data ?? false;
     const library = useLibrary();
     const locations = useAvailableLocations();
     const language = useActiveLanguage();
     const queryClient = useQueryClient();
     const { systemMessages, updateSystemMessages } = React.useContext(SystemMessagesContext);
     const { textColor, theme } = useTheme();
     const showSystemMessage = () => {
          if (isArray(systemMessages)) {
               return systemMessages.map((obj, index) => {
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
               hoursLabel = 'Closed until ' + formatTime(hoursStatus.openingTime);
          } else if (hoursStatus.status === 'open_until' && hoursStatus.closingTime) {
               hoursLabel = 'Open until ' + formatTime(hoursStatus.closingTime);
          } else {
               hoursLabel = getTermFromDictionary(language, 'location_closed');
          }
     }

     const key = 'location_' + location.locationId;
     logDebugMessage(key + ':' + location.locationImage);

     const selectLocations = () => {
          navigate('AllLocations');
     };

     if (!location) {
          return null;
     }

     return (
          <ScrollView>
               <Box>
                    <VStack space="md">
                         {location.locationImage ? (
                              <>
                                   <Image
                                        alt={location.displayName}
                                        source={location.locationImage}
                                        style={{
                                             width: '100%',
                                             height: 200,
                                             borderRadius: "$sm",
                                             zIndex: -1 }}
                                        placeholder={blurhash}
                                        transition={1000}
                                        contentFit="cover"
                                   />
                              </>
                         ) : null}
                         <Box safeArea={5} mx="$4" zIndex={200}>
                              {showSystemMessage()}
                              {library.displayName !== location.displayName ? <Heading mb={2} color={textColor}>{location.displayName}</Heading> : <Heading mb={1} color={textColor}>{library.displayName}</Heading>}
                              {location.address ? <Text color={textColor}>{location.address}</Text> : null}
                              {location.phone ? (
                                   <Text color={textColor}>
                                        {getTermFromDictionary(language, 'phone')}: {location.phone}
                                   </Text>
                              ) : null}
                              {hasHours ? (
                                   <Badge colorScheme={isClosedToday ? 'error' : 'success'} alignSelf="flex-start">
                                        <BadgeText color={textColor}>
                                             {hoursLabel}
                                        </BadgeText>
                                   </Badge>
                              ) : null}
                         </Box>
                         <DisplayMap data={location} />
                         <Box safeArea={5} mx={4} >
                              <ContactButtons data={location} />
                              {hasHours ? <Hours data={location} /> : null}
                              <AdditionalInformation data={location} />
                              {size(locations) > 1 ? (
                                   <>
                                        <Divider mt={5} mb={2} />
                                        <Button variant="ghost" size="sm" onPress={selectLocations} bgColor={theme.tokens.colors.primary['500']}>
                                             <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'view_all_locations')}</ButtonText>
                                        </Button>
                                   </>
                              ) : null}
                         </Box>
                    </VStack>
               </Box>
          </ScrollView>
     );
};
