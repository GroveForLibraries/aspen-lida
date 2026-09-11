import { getCurrentDate, isEmpty, subtractYears, size } from '../../../helpers/helpers';
import { Box, Button, ButtonGroup, ButtonText, FormControl, HStack, Input, InputField, Text, VStack } from '@gluestack-ui/themed';
import React from 'react';
import { ScrollView } from 'react-native';

// custom components and helper files
import { LoadingSpinner } from '../../../components/loadingSpinner';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { addAppliedFilter } from '../../../util/api/searchHelper';
import { useTheme } from '../../../themes/theme';


export const Facet_Year = ({ data, category, updater, language }) => {
     const [isLoading, setIsLoading] = React.useState(true);
     const [yearFrom, setYearFrom] = React.useState('');
     const [yearTo, setYearTo] = React.useState('');
     const [value, setValue] = React.useState('');
     const {theme, textColor, colorMode } = useTheme();

     React.useEffect(() => {
          setIsLoading(false);
     }, []);

     const _updateYearTo = (jump) => {
          const jumpTo = subtractYears(getCurrentDate(), jump);
          const year = jumpTo ? String(jumpTo.getFullYear()) : '';
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

          if (size(newValue) === 4) {
               updateFacet(type === 'yearFrom' ? newValue : yearFrom, type === 'yearTo' ? newValue : yearTo);
          }
     };

     const updateFacet = (from = yearFrom, to = yearTo) => {
          let fromValue = from;
          let toValue = to;
          if (isEmpty(from)) {
               fromValue = '*';
          }
          if (isEmpty(to)) {
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
               <Box p="$5">
                    <FormControl mb="$2">
                         <HStack space="sm" justifyContent="center">
                              <Input
                                   size="lg"
                                   flex={1}
                                   borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}
                              >
                                   <InputField
                                        color={textColor}
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
                                   flex={1}
                                   borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}
                              >
                                   <InputField
                                        color={textColor}
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
                              <Text color={textColor}>
                                   {getTermFromDictionary(language, 'published_in_the_last')}
                              </Text>
                              <ButtonGroup>
                                   <Button variant="outline" onPress={() => _updateYearTo(1)} borderColor={theme.tokens.colors.primary['500']}>
                                        <ButtonText color={theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'year')}</ButtonText>
                                   </Button>
                                   <Button variant="outline" onPress={() => _updateYearTo(5)} borderColor={theme.tokens.colors.primary['500']}>
                                        <ButtonText color={theme.tokens.colors.primary['500']}>5 {getTermFromDictionary(language, 'years')}</ButtonText>
                                   </Button>
                                   <Button variant="outline" onPress={() => _updateYearTo(10)} borderColor={theme.tokens.colors.primary['500']}>
                                        <ButtonText color={theme.tokens.colors.primary['500']}>10 {getTermFromDictionary(language, 'years')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </VStack>
                    ) : null}
               </Box>
          </ScrollView>
     );
};
