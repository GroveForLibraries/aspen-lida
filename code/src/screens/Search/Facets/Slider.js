import { find } from '../../../helpers/helpers';
import { Box, FormControl, HStack, Input, InputField } from '@gluestack-ui/themed';
import React from 'react';
import { ScrollView } from 'react-native';

// custom components and helper files
import { LoadingSpinner } from '../../../components/loadingSpinner';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { addAppliedFilter } from '../../../util/api/searchHelper';
import { useTheme } from '../../../themes/theme';


export const Facet_Slider = ({ data, category, updater, language }) => {
     const [isLoading, setIsLoading] = React.useState(true);
     const [startValue, setStartValue] = React.useState('*');
     const [endValue, setEndValue] = React.useState('*');
     const {theme, textColor, colorMode } = useTheme();

     React.useEffect(() => {
          appliedStartValue();
          appliedEndValue();
          setIsLoading(false);
     }, []);

     const updateValue = (type, value) => {
          if (type === 'startValue') {
               setStartValue(value);
          } else {
               setEndValue(value);
          }
          updateFacet(type === 'startValue' ? value : startValue, type === 'endValue' ? value : endValue);
     };

     const updateFacet = (start = startValue, end = endValue) => {
          let value = '[' + start + '+TO+' + end + ']';
          if (!start && end) {
               value = '[*+TO+' + end + ']';
          } else if (start && !end) {
               value = '[' + start + '+TO+*]';
          } else if (!start && !end) {
               value = '[*+TO+*]';
          }
          addAppliedFilter(category, value, false);
          updater(category, value);
     };

     const appliedStartValue = () => {
          let value = 0.0;
          if (find(data, ['isApplied', true])) {
               const appliedFilterObj = find(data, ['isApplied', true]);
               value = appliedFilterObj['value'];
          }
          setStartValue(value);
     };

     const appliedEndValue = () => {
          let value = 5.0;
          if (find(data, ['isApplied', true])) {
               const appliedFilterObj = find(data, ['isApplied', true]);
               value = appliedFilterObj['value'];
          }
          setEndValue(value);
     };

     if (isLoading) {
          return <LoadingSpinner />;
     }

     return (
          <ScrollView>
               <Box p="$5">
                    <FormControl mb="$2">
                         <HStack space="sm" justifyContent="center">
                              <Input
                                   size="lg"
                                   flex={1}
                                   borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}
                              >
                                   <InputField
                                        placeholder={getTermFromDictionary(language, 'from')}
                                        accessibilityLabel={getTermFromDictionary(language, 'from')}
                                        defaultValue={startValue}
                                        value={startValue}
                                        onChangeText={(value) => {
                                             updateValue('startValue', value);
                                        }}
                                        color={textColor}
                                   />
                              </Input>
                              <Input
                                   size="lg"
                                   flex={1}
                                   borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}
                              >
                                   <InputField
                                        placeholder={getTermFromDictionary(language, 'to')}
                                        accessibilityLabel={getTermFromDictionary(language, 'to')}
                                        defaultValue={endValue}
                                        value={endValue}
                                        onChangeText={(value) => {
                                             updateValue('endValue', value);
                                        }}
                                        color={textColor}
                                   />
                              </Input>
                         </HStack>
                    </FormControl>
               </Box>
          </ScrollView>
     );
};
