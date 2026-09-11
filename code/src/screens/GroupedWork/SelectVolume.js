import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { getVolumes } from '../../util/api/item';
import { loadingSpinner } from '../../components/loadingSpinner';
import { loadError } from '../../components/loadError';
import _ from 'lodash';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedMaterialIcons as MaterialIcons } from '../../components/themed/ThemedMaterialIcons';
import { ThemedRadio as Radio, ThemedRadioGroup as RadioGroup, ThemedRadioIcon as RadioIcon, ThemedRadioIndicator as RadioIndicator, ThemedRadioLabel as RadioLabel } from '../../components/themed/ThemedRadio';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectTrigger as SelectTrigger } from '../../components/themed/ThemedSelect';

/**
 * SelectVolume component that allows users to select a volume for a specific item. It fetches available volumes from the API and provides options for selecting either the first available item or a specific volume.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SelectVolume = (props) => {
     const { language, id, holdType, setHoldType, volume, setVolume, shouldLoad, promptForHoldType } = props;
     const library = useLibrary();

     const { status, data, error, isFetching } = useQuery({
          queryKey: ['volumes', id, library.baseUrl],
          queryFn: () => getVolumes(id, library.baseUrl),
          enabled: !!shouldLoad,
     });

     return (
          <>
               {status === 'loading' || isFetching ? (
                    loadingSpinner()
               ) : status === 'error' ? (
                    loadError('Error', '')
               ) : (
                    <>
                         {promptForHoldType ? (
                              <FormControl className="mb-4">
                                   <RadioGroup
                                        value={holdType}
                                        onChange={(nextValue) => {
                                             setHoldType(nextValue);
                                        }}>
                                        <Radio value="item" size="sm" className="mb-2">
                                             <RadioIndicator className="mr-2">
                                                  <RadioIcon as={MaterialIcons} name="circle" />
                                             </RadioIndicator>
                                             <RadioLabel>{getTermFromDictionary(language, 'first_available')}</RadioLabel>
                                        </Radio>
                                        <Radio value="volume" size="sm">
                                             <RadioIndicator className="mr-2">
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
                                   <Select
                                        selectedValue={volume}
                                        onValueChange={(itemValue) => setVolume(itemValue)}>
                                        <SelectTrigger>
                                             <SelectInput placeholder={getTermFromDictionary(language, 'select_volume')} />
                                        </SelectTrigger>
                                        <SelectPortal>
                                             <SelectBackdrop />
                                             <SelectContent>
                                                  <SelectDragIndicatorWrapper>
                                                       <SelectDragIndicator />
                                                  </SelectDragIndicatorWrapper>
                                                  {_.map(data, function (item, index, array) {
                                                       return <SelectItem label={item.label} value={item.volumeId} key={index} />;
                                                  })}
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
