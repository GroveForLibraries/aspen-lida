import { isObject } from '../../../helpers/helpers';
import { Box, FormControl, FormControlLabel, FormControlLabelText, Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicatorWrapper, SelectDragIndicator, SelectItem, Icon, ChevronDownIcon, SelectScrollView } from '@gluestack-ui/themed';

import React from 'react';
import { Platform } from 'react-native';

import { getTermFromDictionary } from '../../../translations/TranslationService';

export const SelectExistingHoldSubLocation = (props) => {
     const { locations, sublocations, language, location, activeSublocation, setActiveSublocation} = props;


     const [locationId, locationCode] = location.split("_");
     if (sublocations !== undefined) {
          if (isObject(sublocations)) {
               const objectSize = Object.keys(sublocations).length;
               const validSublocations = [];

               const sublocationValues = Object.values(sublocations);
               let activeSublocationNeedsToChange = true;
               for (index in sublocationValues) {
                    let sublocation = sublocationValues[index];
                    if (sublocation.locationCode == locationCode) {
                         validSublocations.push(sublocation);
                         if (activeSublocation == sublocation.id) {
                              activeSublocationNeedsToChange = false;
                         }
                    }
               }
               const validSublocationSize = validSublocations.length;
               if (validSublocationSize > 0) {
                    validSublocations.sort((a, b) => a.subLocationWeight - b.subLocationWeight);
                    if (activeSublocationNeedsToChange){
                         //todo set the sublocation to change to
                         setActiveSublocation(validSublocations[0].id);
                    }
               }

               if (validSublocationSize > 1) {
                    return (
                         <>
                              <Box pl="$4" pr="$4">
                                   <FormControl>
                                        <FormControlLabel>
                                             <FormControlLabelText>{getTermFromDictionary(language, 'select_new_pickup_area')}</FormControlLabelText>
                                        </FormControlLabel>
                                        <Select
                                             onValueChange={(itemValue) => setActiveSublocation(itemValue)}>
                                             <SelectTrigger variant="outline" size="md">
                                                  <SelectInput py={0} placeholder={getTermFromDictionary(language, 'select_new_pickup_area')} />
                                                  <Icon as={ChevronDownIcon} mr="$3" />
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            {validSublocations.map((item, index) => {
                                                                 return <SelectItem value={item.id} label={item.displayName} key={index} />;
                                                            })}
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              </Box>
                         </>
                    );
               }else{
                    return null;
               }
          }else{
               return null;
          }
     }else{
          return null;
     }
}
