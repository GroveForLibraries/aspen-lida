import _ from 'lodash';
import React from 'react';
import { Box } from '@/components/ui/box';
import { ThemedFormControlLabel as FormControlLabel, ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText } from '../../../components/themed/ThemedFormControls';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../../components/themed/ThemedSelect';
import { getTermFromDictionary } from '@/src/translations/TranslationService';

/**
 * SelectExistingHoldSubLocation component that renders a dropdown select input for choosing an existing hold sublocation based on the provided location. It filters the sublocations to only include those that match the given location code and allows the user to select one of them. If there are no valid sublocations or only one, it returns null.
 * @param props
 * @returns {React.JSX.Element|null}
 * @constructor
 */
export const SelectExistingHoldSubLocation = (props) => {
     const { sublocations, language, location, activeSublocation, setActiveSublocation } = props;

     const [locationId, locationCode] = location.split("_");
     if (sublocations !== undefined) {
          if (_.isObject(sublocations)) {
               const validSublocations = [];

               const sublocationValues = Object.values(sublocations);
               let activeSublocationNeedsToChange = true;
               for (const index in sublocationValues) {
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
                              <Box className="pl-4 pr-4">
                                   <FormControl>
                                        <FormControlLabel>
                                             <FormControlLabelText>{getTermFromDictionary(language, 'select_new_pickup_area')}</FormControlLabelText>
                                        </FormControlLabel>
                                        <Select
                                             selectedValue={activeSublocation}
                                             onValueChange={(itemValue) => setActiveSublocation(itemValue)}>
                                             <SelectTrigger>
                                                  <SelectInput placeholder={getTermFromDictionary(language, 'select_new_pickup_area')} />
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
     } else {
          return null;
     }
};
