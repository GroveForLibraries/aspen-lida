import { Icon, ChevronDownIcon, FormControl, SelectScrollView, FormControlLabel, FormControlLabelText, Select, SelectTrigger, SelectInput, SelectIcon, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicatorWrapper, SelectDragIndicator, SelectItem, CheckIcon, Radio, RadioGroup, RadioIndicator, RadioIcon, RadioLabel, CircleIcon } from '@gluestack-ui/themed';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTermFromDictionary } from '../../../translations/TranslationService';

export const SelectItemHold = (props) => {
     const { id, data, item, setItem, setHoldType, showModal, holdTypeForFormat, language, url, textColor, theme, colorMode } = props;
     const insets = useSafeAreaInsets();

     let holdType = props.holdType;
     let copies = data.copies;
     let copyKeys = Object.keys(copies);
     let key = copyKeys[0];
     let defaultItem = copies[key].id;

     if (holdType === 'either') {
          holdType = 'default';
     }

     if (item) {
          defaultItem = item;
     }

     return (
          <>
               {holdTypeForFormat === 'either' ? (
                    <FormControl>
                         <RadioGroup
                              name="holdTypeGroup"
                              value={holdType}
                              onChange={(nextValue) => {
                                   setHoldType(nextValue);
                                   setItem('');
                              }}
                              accessibilityLabel="">
                              <Radio value="default" my="$1" size="sm">
                                   <RadioIndicator mr="$1">
                                        <RadioIcon as={CircleIcon} strokeWidth={1} />
                                   </RadioIndicator>
                                   <RadioLabel color={textColor}>{getTermFromDictionary(language, 'first_available')}</RadioLabel>
                              </Radio>
                              <Radio value="item" my="$1" size="sm">
                                   <RadioIndicator mr="$1">
                                        <RadioIcon as={CircleIcon} strokeWidth={1} />
                                   </RadioIndicator>
                                   <RadioLabel color={textColor}>{getTermFromDictionary(language, 'specific_item')}</RadioLabel>
                              </Radio>
                         </RadioGroup>
                    </FormControl>
               ) : null}
               {holdTypeForFormat === 'item' || holdType === 'item' ? (
                    <FormControl>
                         <FormControlLabel>
                              <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'select_item')}</FormControlLabelText>
                         </FormControlLabel>
                         <Select name="itemForHold" selectedValue={defaultItem} minWidth={200} accessibilityLabel={getTermFromDictionary(language, 'select_item')} mt="$1" mb="$2" onValueChange={(itemValue) => setItem(itemValue)}>
                              <SelectTrigger variant="outline" size="md">
                                   {Object.keys(copies).map((item) => {
                                        let copy = copies[item];
                                        if (copy.id === defaultItem) {
                                             setItem(defaultItem);
                                             return <SelectInput py={0} value={copy.location} color={textColor} />;
                                        }
                                   })}
                                   <SelectIcon mr="$3">
                                        <Icon as={ChevronDownIcon} color={textColor} />
                                   </SelectIcon>
                              </SelectTrigger>
                              <SelectPortal useRNModal={true}>
                                   <SelectBackdrop />
                                   <SelectContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                        <SelectDragIndicatorWrapper>
                                             <SelectDragIndicator />
                                        </SelectDragIndicatorWrapper>
                                        <SelectScrollView>
                                             {Object.keys(copies).map((item) => {
                                                  let copy = copies[item];
                                                  if (copy.id === defaultItem) {
                                                       return <SelectItem label={copy.location} value={copy.id} key={copy.id} bgColor={theme.tokens.colors.tertiary['300']} sx={{ _text: { color: theme.tokens.colors.tertiary['500-text'] } }} />;
                                                  }
                                                  return <SelectItem label={copy.location} value={copy.id} key={copy.id} sx={{ _text: { color: textColor } }} />;
                                             })}
                                        </SelectScrollView>
                                   </SelectContent>
                              </SelectPortal>
                         </Select>
                    </FormControl>
               ) : null}
          </>
     );
};
