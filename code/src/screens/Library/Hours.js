import { formatTime as formatDisplayTime, isArray, parseTimeOnDate } from '../../helpers/helpers';
import { Box, FlatList, Heading, HStack, Text, VStack } from '@gluestack-ui/themed';
import React from 'react';

// custom components and helper files

import { getTermFromDictionary } from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';

const Hours = (data) => {
     const language = useActiveLanguage();
     const { textColor } = useTheme();
     const location = data.data;

     /* location.hours */

     if (location.showInLocationsAndHoursList === '1' || location.showInLocationsAndHoursList === 1) {
          if (isArray(location.hours)) {
               return (
                    <Box>
                         <Heading color={textColor} mb="$2" mx="$2">{getTermFromDictionary(language, 'library_hours')}</Heading>
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

     function formatHourLabel(time) {
          const parsedTime = parseTimeOnDate(time);
          return parsedTime ? formatDisplayTime(parsedTime) : '';
     }

     return (
          <VStack mb="$2" mx="$4">
               <HStack justifyContent="space-between">
                    <Text color={textColor} bold>
                         {hours.dayName}
                    </Text>
                    {!hours.isClosed ? (
                         <Text color={textColor}>
                              {formatHourLabel(hours.open)} - {formatHourLabel(hours.close)}
                         </Text>
                    ) : (
                         <Text color={textColor}>{getTermFromDictionary(language, 'location_closed')}</Text>
                    )}
               </HStack>
               {hours.notes !== '' ? (
                    <Text color={textColor} fontSize="$xs" italic>
                         {hours.notes}
                    </Text>
               ) : null}
          </VStack>
     );
};

export default Hours;
