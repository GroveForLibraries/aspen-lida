import { useFocusEffect } from '@react-navigation/native';
import { find, formatDateUs, formatFacetDateTime, parseToDate, split, trimEnd, trimStart } from '../../../helpers/helpers';
import { Box, Button, ButtonText, FormControl, HStack, Text } from '@gluestack-ui/themed';
import React from 'react';
import { ScrollView } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { getTermFromDictionary } from '../../../translations/TranslationService';
import { addAppliedFilter } from '../../../util/api/searchHelper';
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useTheme } from '../../../themes/theme';

// custom components and helper files

export const Facet_Date = (props) => {
     const { data, category, updater } = props;
     const language = useActiveLanguage();

     const {theme, textColor, colorMode } = useTheme();

     const today = new Date();
     const [fromValue, setFrom] = React.useState(today);
     const [toValue, setTo] = React.useState(today);
     const [fromFacet, setFromFacet] = React.useState('*');
     const [toFacet, setToFacet] = React.useState('*');
     const [isFromDatePickerVisible, setFromDatePickerVisibility] = React.useState(false);
     const [isToDatePickerVisible, setToDatePickerVisibility] = React.useState(false);

     useFocusEffect(
          React.useCallback(() => {
               if (find(data, ['isApplied', true])) {
                    const appliedFilterObj = find(data, ['isApplied', true]);
                    let value = appliedFilterObj['value'];
                    value = trimStart(value, '[');
                    value = trimEnd(value, ']');
                    const arr = split(value, ' TO ');
                    if (arr[0] !== '*') {
                         const tmp = parseToDate(arr[0]);
                         if (tmp) {
                              setFrom(tmp);
                              setFromFacet(arr[0]);
                         }
                    }

                    if (arr[1] !== '*') {
                         const tmp = parseToDate(arr[1]);
                         if (tmp) {
                              setTo(tmp);
                              setToFacet(arr[1]);
                         }
                    }
               }
          }, [data])
     );

     const toggleFromDatePicker = () => {
          setFromDatePickerVisibility(!isFromDatePickerVisible);
     };

     const onSelectFromDate = (date) => {
          toggleFromDatePicker();
          setFrom(date);
          let tmp = formatFacetDateTime(date);
          tmp = String(tmp) + 'Z';
          setFromFacet(tmp);
          const facet = '[' + tmp + '+TO+' + toFacet + ']';
          addAppliedFilter(category, facet, false);
          addAppliedFilter('sort_by', 'start_date_sort asc', false);
          updater(category, facet);
     };

     const toggleToDatePicker = () => {
          setToDatePickerVisibility(!isToDatePickerVisible);
     };

     const onSelectToDate = (date) => {
          toggleToDatePicker();
          setTo(date);
          let tmp = formatFacetDateTime(date);
          tmp = String(tmp) + 'Z';
          setToFacet(tmp);
          const facet = '[' + fromFacet + '+TO+' + tmp + ']';
          addAppliedFilter(category, facet, false);
          addAppliedFilter('sort_by', 'start_date_sort asc', false);
          updater(category, facet);
     };

     return (
          <ScrollView>
               <Box p="$5">
                    <FormControl mb="$2">
                         <HStack space="sm" alignItems="center" justifyContent="center">
                              <Button variant="outline" onPress={() => toggleFromDatePicker()} borderColor={theme.tokens.colors.primary['500']}>
                                   <ButtonText color={theme.tokens.colors.primary['500']}>{formatDateUs(fromValue)}</ButtonText>
                              </Button>
                              <Text color={textColor}>to</Text>
                              <Button variant="outline" onPress={() => toggleToDatePicker()} borderColor={theme.tokens.colors.primary['500']}>
                                   <ButtonText color={theme.tokens.colors.primary['500']}>{toFacet === '*' ? 'MM/DD/YYYY' : formatDateUs(toValue)}</ButtonText>
                              </Button>
                         </HStack>
                    </FormControl>
                    <DateTimePickerModal
                         isVisible={isFromDatePickerVisible}
                         date={fromValue}
                         mode="date"
                         onConfirm={onSelectFromDate}
                         onCancel={toggleFromDatePicker}
                         isDarkModeEnabled={colorMode === 'dark'}
                         minimumDate={today}
                         confirmTextIOS={getTermFromDictionary(language, 'update')}
                    />
                    <DateTimePickerModal
                         isVisible={isToDatePickerVisible}
                         date={toValue}
                         mode="date"
                         onConfirm={onSelectToDate}
                         onCancel={toggleToDatePicker}
                         isDarkModeEnabled={colorMode === 'dark'}
                         minimumDate={today}
                         confirmTextIOS={getTermFromDictionary(language, 'update')}
                    />
               </Box>
          </ScrollView>
     );
};
