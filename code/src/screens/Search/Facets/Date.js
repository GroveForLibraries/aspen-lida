import { useFocusEffect } from '@react-navigation/native';
import { find, formatDateUs, formatFacetDateTime, parseToDate, split, trimEnd, trimStart } from '../../../helpers/helpers';
import React from 'react';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { addAppliedFilter } from '@/src/util/api/searchHelper';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedFormControl as FormControl } from '@/src/components/themed/ThemedFormControls';
import { HStack } from '@/components/ui/hstack';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * Facet_Date component that displays a date range picker for filtering search results based on a date facet. It allows users to select a "from" and "to" date, updates the applied filters accordingly, and triggers an update to the search results.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const Facet_Date = (props) => {
     const { data, category, updater } = props;
     const language = useActiveLanguage();

     const {theme, textColor, colorMode } = useTheme();

     const { colorMode } = useTheme();

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
               <Box className="p-5">
                    <FormControl className="mb-2">
                         <HStack space="sm" className="items-center justify-center">
                              <Button colorScheme="primary" variant="outline" onPress={() => toggleFromDatePicker()}>
                                   <ButtonText>{formatDateUs(fromValue)}</ButtonText>
                              </Button>
                              <Text>to</Text>
                              <Button colorScheme="primary" variant="outline" onPress={() => toggleToDatePicker()}>
                                   <ButtonText>{toFacet === '*' ? 'MM/DD/YYYY' : formatDateUs(toValue)}</ButtonText>
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
