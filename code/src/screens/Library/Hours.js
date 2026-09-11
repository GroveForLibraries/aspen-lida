import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import { Box } from '@/components/ui/box';
import { FlatList } from '@/components/ui/flat-list';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';

/**
 * Hours component that displays the library hours for a given location if available.
 * @param data
 * @returns {React.JSX.Element|null}
 * @constructor
 */
const Hours = (data) => {
     const language = useActiveLanguage();
     const { textColor } = useTheme();
     const location = data.data;

     /* location.hours */

     if (location.showInLocationsAndHoursList === '1' || location.showInLocationsAndHoursList === 1) {
          if (_.isArrayLikeObject(location.hours)) {
               return (
                    <Box>
                         <Heading className="mb-2 mx-2">{getTermFromDictionary(language, 'library_hours')}</Heading>
                         <FlatList data={location.hours} renderItem={({ item }) => <Day hours={item} textColor={textColor} />} />
                    </Box>
               );
          }
     }

     return null;
};

const Day = (data) => {
     const language = useActiveLanguage();
     const { hours, textColor } = data;

     function formatTime(time) {
          let arr = time.split(':');
          let timeString = moment().set({ hour: arr[0], minute: arr[1] });
          return moment(timeString).format('h:mm A');
     }

     return (
          <VStack className="mb-2 mx-4">
               <HStack justifyContent="space-between">
                    <Text bold>
                         {hours.dayName}
                    </Text>
                    {!hours.isClosed ? (
                         <Text>
                              {formatTime(hours.open)} - {formatTime(hours.close)}
                         </Text>
                    ) : (
                         <Text>{getTermFromDictionary(language, 'location_closed')}</Text>
                    )}
               </HStack>
               {hours.notes !== '' ? (
                    <Text size="xs" italic>
                         {hours.notes}
                    </Text>
               ) : null}
          </VStack>
     );
};

export default Hours;
