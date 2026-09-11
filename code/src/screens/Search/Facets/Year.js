import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { LoadingSpinner } from '@/src/components/loadingSpinner';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { addAppliedFilter } from '@/src/util/api/searchHelper';
import { useTheme } from '@/src/themes/theme';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { HStack } from '@/components/ui/hstack';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField } from '@/src/components/themed/ThemedFormControls';

/**
 * Facet_Slider component that renders a slider input for filtering search results based on a numeric range facet. It manages the start and end values of the range, updates the applied filters, and triggers an update to the parent component when the values change.
 * @param param0
 * @param param0.data
 * @param param0.category
 * @param param0.updater
 * @param param0.language
 * @returns {React.JSX.Element}
 * @constructor
 */
export const Facet_Year = ({ data, category, updater, language }) => {
     const [isLoading, setIsLoading] = React.useState(true);
     const [yearFrom, setYearFrom] = React.useState('');
     const [yearTo, setYearTo] = React.useState('');
     const [value, setValue] = React.useState('');
     const {  } = useTheme();

     React.useEffect(() => {
          setIsLoading(false);
     }, []);

     const _updateYearTo = (jump) => {
          const jumpTo = moment().subtract(jump, 'years');
          const year = moment(jumpTo).format('YYYY');
          setYearFrom(year);
          setYearTo('*');
          const years = '[' + year + '+TO+*]';
          setValue(years);
          addAppliedFilter(category, years, false);
          updater(category, years);
     };

     const updateValue = (type, newValue) => {
          if (type === 'yearFrom') {
               setYearFrom(newValue);
          } else {
               setYearTo(newValue);
          }

          if (_.size(newValue) === 4) {
               updateFacet(type === 'yearFrom' ? newValue : yearFrom, type === 'yearTo' ? newValue : yearTo);
          }
     };

     const updateFacet = (from = yearFrom, to = yearTo) => {
          let fromValue = from;
          let toValue = to;
          if (_.isEmpty(from)) {
               fromValue = '*';
          }
          if (_.isEmpty(to)) {
               toValue = '*';
          }
          const years = '[' + fromValue + '+TO+' + toValue + ']';
          addAppliedFilter(category, years, false);
          updater(category, years);
     };

     if (isLoading) {
          return <LoadingSpinner />;
     }

     return (
          <ScrollView>
               <Box className="p-5">
                    <FormControl className="mb-2">
                         <HStack space="sm" className="justify-center">
                              <Input
                                   size="lg"
                                   className="flex-1"
                              >
                                   <InputField
                                        placeholder={getTermFromDictionary(language, 'year_from')}
                                        accessibilityLabel={getTermFromDictionary(language, 'year_from')}
                                        value={yearFrom}
                                        onChangeText={(value) => {
                                             updateValue('yearFrom', value);
                                        }}
                                   />
                              </Input>
                              <Input
                                   size="lg"
                                   className="flex-1"
                              >
                                   <InputField
                                        placeholder={getTermFromDictionary(language, 'year_to')}
                                        accessibilityLabel={getTermFromDictionary(language, 'year_to')}
                                        onChangeText={(value) => {
                                             updateValue('yearTo', value);
                                        }}
                                   />
                              </Input>
                         </HStack>
                    </FormControl>
                    {category === 'publishDate' || category === 'publishDateSort' ? (
                         <VStack space="sm">
                              <Text>
                                   {getTermFromDictionary(language, 'published_in_the_last')}
                              </Text>
                              <ButtonGroup>
                                   <Button colorScheme="primary" variant="outline" onPress={() => _updateYearTo(1)}>
                                       <ButtonText>{getTermFromDictionary(language, 'year')}</ButtonText>
                                   </Button>
                                   <Button colorScheme="primary" variant="outline" onPress={() => _updateYearTo(5)}>
                                       <ButtonText>5 {getTermFromDictionary(language, 'years')}</ButtonText>
                                   </Button>
                                   <Button colorScheme="primary" variant="outline" onPress={() => _updateYearTo(10)}>
                                       <ButtonText>10 {getTermFromDictionary(language, 'years')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </VStack>
                    ) : null}
               </Box>
          </ScrollView>
     );
};
