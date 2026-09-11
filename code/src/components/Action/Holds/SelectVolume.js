import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVolumes } from '@/src/util/api/item';
import { loadingSpinner } from '../../loadingSpinner';
import { loadError } from '../../loadError';
import _ from 'lodash';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../themed/ThemedFormControls';
import { ThemedMaterialIcons as MaterialIcons } from '../../themed/ThemedMaterialIcons';
import { ThemedRadio as Radio, ThemedRadioGroup as RadioGroup, ThemedRadioIcon as RadioIcon, ThemedRadioIndicator as RadioIndicator, ThemedRadioLabel as RadioLabel } from '../../themed/ThemedRadio';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../themed/ThemedSelect';

/**
 * SelectVolume component for selecting a volume for a library hold request.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SelectVolume = (props) => {
     const { id, volume, setVolume, showModal, promptForHoldType, holdType, setHoldType, language, url, textColor, brand } = props;

     const { status, data, error, isFetching } = useQuery({
          queryKey: ['volumes', id, url],
          queryFn: () => getVolumes(id, url),
          enabled: !!showModal,
     });

     if (!isFetching && data && _.isEmpty(volume)) {
          let volumesKeys = Object.keys(data);
          let key = volumesKeys[0];
          setVolume(data[key].volumeId);
     }

     return (
          <>
               {status === 'loading' || isFetching ? (
                    loadingSpinner()
               ) : status === 'error' ? (
                    loadError('Error', '')
               ) : (
                    <>
                         {promptForHoldType ? (
                              <FormControl>
                                   <RadioGroup
                                        name="holdTypeGroup"
                                        defaultValue={holdType}
                                        value={holdType}
                                        onChange={(nextValue) => {
                                             setHoldType(nextValue);
                                             setVolume('');
                                        }}>
                                        <Radio value="item" size="sm" className="my-1">
                                             <RadioIndicator className="mr-1">
                                                  <RadioIcon as={MaterialIcons} name="circle" />
                                             </RadioIndicator>
                                             <RadioLabel>{getTermFromDictionary(language, 'first_available')}</RadioLabel>
                                        </Radio>
                                        <Radio value="volume" size="sm" className="my-1">
                                             <RadioIndicator className="mr-1">
                                                  <RadioIcon as={MaterialIcons} name="circle" />
                                             </RadioIndicator>
                                             <RadioLabel>{getTermFromDictionary(language, 'specific_volume')}</RadioLabel>
                                        </Radio>
                                   </RadioGroup>
                              </FormControl>
                         ) : null}
                         {holdType === 'volume' ? (
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'select_volume')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Select name="volumeForHold" selectedValue={volume} defaultValue={volume} minWidth="200" accessibilityLabel={getTermFromDictionary(language, 'select_volume')} className="mt-1 mb-2" onValueChange={(itemValue) => setVolume(itemValue)}>
                                        <SelectTrigger>
                                             {_.map(data, function (item, index, array) {
                                                  if (item.volumeId === volume) {
                                                       return <SelectInput value={item.label} />;
                                                  }
                                             })}
                                        </SelectTrigger>
                                        <SelectPortal useRNModal={true}>
                                             <SelectBackdrop />
                                             <SelectContent>
                                                 <SelectDragIndicatorWrapper>
                                                      <SelectDragIndicator />
                                                 </SelectDragIndicatorWrapper>
                                                 <SelectScrollView>
                                                      {_.map(data, function (item, index, array) {
                                                           if (item.volumeId === volume) {
                                                                return <SelectItem label={item.label} value={item.volumeId} key={index} style={{ backgroundColor: brand.tertiary[300] }} textStyle={{ color: brand.tertiary['500-text'] }} />;
                                                            }
                                                            return <SelectItem label={item.label} value={item.volumeId} key={index} textStyle={{ color: textColor }} />;
                                                       })}
                                                 </SelectScrollView>
                                            </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </FormControl>
                         ) : null}
                    </>
               )}
          </>
     );
};
