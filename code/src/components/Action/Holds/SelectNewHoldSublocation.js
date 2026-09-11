import React from 'react';
import _ from 'lodash';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { logDebugMessage, logErrorMessage } from '@/src/util/logging';
import { ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../themed/ThemedFormControls';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../themed/ThemedSelect';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * SelectNewHoldSublocation component for selecting a new hold sublocation for a library hold request.
 * @param props
 * @returns {React.JSX.Element|null}
 * @constructor
 */
export const SelectNewHoldSublocation = (props) => {
     const {sublocations, location, activeSublocation, setActiveSublocation, language} = props;

     if (sublocations !== undefined) {
          try {
               if (_.isObject(sublocations)) {
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
                         return (
                              <>
                                   <FormControl>
                                        <FormControlLabel>
                                             <FormControlLabelText size="sm">
                                                  {getTermFromDictionary(language, 'select_pickup_area')}
                                             </FormControlLabelText>
                                        </FormControlLabel>
                                        <Select name="sublocations" selectedValue={activeSublocation} minWidth={200} onValueChange={(itemValue) => setActiveSublocation(itemValue)}>
                                             <SelectTrigger>
                                                  {validSublocations.map((sublocation, index) => {
                                                       if (sublocation.id === activeSublocation) {
                                                            return <SelectInput key={index} value={sublocation.displayName} />;
                                                       }
                                                       return null;
                                                  })}
                                             </SelectTrigger>
                                             <SelectPortal useRNModal={true}>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                      <SelectDragIndicatorWrapper>
                                                           <SelectDragIndicator />
                                                      </SelectDragIndicatorWrapper>
                                                      <SelectScrollView>
                                                            {validSublocations.map((sublocation, index) => {
                                                                 return <SelectItem label={sublocation.displayName} value={sublocation.id} key={index} selectedValue={activeSublocation} />;
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
