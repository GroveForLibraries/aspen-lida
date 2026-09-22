import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Select, SelectTrigger, SelectInput, SelectIcon, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicatorWrapper, SelectDragIndicator, SelectItem, Icon, ChevronDownIcon, SelectScrollView, FormControl, FormControlLabel, FormControlLabelText, Text } from '@gluestack-ui/themed';
import { isObject } from '../../../helpers/helpers';
import { getTermFromDictionary } from '../../../translations/TranslationService';

import { logDebugMessage, logErrorMessage } from '../../../util/logging.js';

export const SelectNewHoldSublocation = (props) => {
     const {sublocations, location, activeSublocation, setActiveSublocation, language, textColor, theme, colorMode} = props;
     const insets = useSafeAreaInsets();

     if (sublocations !== undefined) {
          try {
               if (isObject(sublocations)) {
                    const objectSize = Object.keys(sublocations).length;
                    const validSublocations = [];

                    const sublocationValues = Object.values(sublocations);
                    let activeSublocationNeedsToChange = true;
                    logDebugMessage("Active sublocation is " + activeSublocation);
                    for (const sublocation of sublocationValues) {
                         if (sublocation.locationCode == location) {
                              validSublocations.push(sublocation);
                              if (activeSublocation === sublocation.id) {
                                   activeSublocationNeedsToChange = false;
                              }
                         }
                    }

                    logDebugMessage("Valid sublocations");
                    logDebugMessage(validSublocations);
                    const validSublocationSize = validSublocations.length;
                    if (validSublocationSize > 0) {
                         validSublocations.sort((a, b) => a.subLocationWeight - b.subLocationWeight);
                         if (activeSublocationNeedsToChange){
                              setActiveSublocation(validSublocations[0].id);
                         }

                    }

                    //sublocations need to convert from an object to an array!
                    if (validSublocationSize > 1) {
                         const bottomPadding = Platform.OS === 'android' ? (insets ? insets.bottom : 0) + 16 : '$4';
                         return (
                              <>
                                   <FormControl>
                                        <FormControlLabel>
                                             <FormControlLabelText size="sm" color={textColor}>
                                                  {getTermFromDictionary(language, 'select_pickup_area')}
                                             </FormControlLabelText>
                                        </FormControlLabel>
                                        <Select name="sublocations" selectedValue={activeSublocation} minWidth={200} mt="$1" mb="$2" onValueChange={(itemValue) => setActiveSublocation(itemValue)}>
                                             <SelectTrigger variant="outline" size="md">
                                                  {validSublocations.map((sublocation, index) => {
                                                       if (sublocation.id === activeSublocation) {
                                                            return <SelectInput py={0} value={sublocation.displayName} color={textColor} />;
                                                       }
                                                  })}
                                                  <SelectIcon mr="$3" as={ChevronDownIcon} color={textColor} />
                                             </SelectTrigger>
                                             <SelectPortal useRNModal={true}>
                                                  <SelectBackdrop />
                                                  <SelectContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'} pb={bottomPadding}>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            {validSublocations.map((sublocation, index) => {
                                                                 if (sublocation.id === activeSublocation) {
                                                                      return <SelectItem label={sublocation.displayName} value={sublocation.id} key={index} bgColor={theme.tokens.colors.tertiary['300']} sx={{ _text: { color: theme.tokens.colors.tertiary['500-text'] } }} />;
                                                                 }
                                                                 return <SelectItem label={sublocation.displayName} value={sublocation.id} key={index} sx={{ _text: { color: textColor } }} />;
                                                            })}
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              </>
                         );
                    }else if (validSublocationSize <= 1) {
                         //No sub locations to choose from
                         logDebugMessage("Do not need to display sublocations, got " + validSublocationSize);
                         return null;
                    }
               }else{
                    logDebugMessage("Sublocations are an array, expected object");
                    return null;
               }
          } catch (e) {
               logErrorMessage("Error loading sublocations");
               logErrorMessage(e);
               return <Text>Oh no, there was an error loading sublocations</Text>;
          }
     }else{
          logDebugMessage("undefined");
          return <Text>Sublocations were undefined</Text>;
     }
};
