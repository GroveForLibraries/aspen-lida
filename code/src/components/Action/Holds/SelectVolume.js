import { Icon, ChevronDownIcon, FormControl, FormControlLabel, FormControlLabelText, SelectScrollView, Select, SelectTrigger, SelectInput, SelectIcon, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicatorWrapper, SelectDragIndicator, SelectItem, CheckIcon, Radio, RadioGroup, RadioIndicator, RadioIcon, RadioLabel, CircleIcon } from '@gluestack-ui/themed';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getVolumes } from '../../../util/api/item';
import { loadingSpinner } from '../../loadingSpinner';
import { loadError } from '../../loadError';
import { isEmpty } from '../../../helpers/helpers';
import { getTermFromDictionary } from '../../../translations/TranslationService';

export const SelectVolume = (props) => {
     const { id, volume, setVolume, showModal, promptForHoldType, holdType, setHoldType, language, url, textColor, theme, colorMode } = props;
     const insets = useSafeAreaInsets();

     const { status, data, error, isFetching } = useQuery({
          queryKey: ['volumes', id, url],
          queryFn: () => getVolumes(id, url),
          enabled: !!showModal,
     });
     const volumeOptions = Object.values(data ?? {});

     if (!isFetching && data && isEmpty(volume)) {
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
                                        <Radio value="item" my="$1" size="sm">
                                             <RadioIndicator mr="$1">
                                                  <RadioIcon as={CircleIcon} strokeWidth={1} />
                                             </RadioIndicator>
                                             <RadioLabel color={textColor}>{getTermFromDictionary(language, 'first_available')}</RadioLabel>
                                        </Radio>
                                        <Radio value="volume" my="$1" size="sm">
                                             <RadioIndicator mr="$1">
                                                  <RadioIcon as={CircleIcon} strokeWidth={1} />
                                             </RadioIndicator>
                                             <RadioLabel color={textColor}>{getTermFromDictionary(language, 'specific_volume')}</RadioLabel>
                                        </Radio>
                                   </RadioGroup>
                              </FormControl>
                         ) : null}
                         {holdType === 'volume' ? (
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'select_volume')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Select name="volumeForHold" selectedValue={volume} defaultValue={volume} minWidth="200" accessibilityLabel={getTermFromDictionary(language, 'select_volume')} mt="$1" mb="$2" onValueChange={(itemValue) => setVolume(itemValue)}>
                                        <SelectTrigger variant="outline" size="md">
                                             {volumeOptions.map((item) => {
                                                  if (item.volumeId === volume) {
                                                       return <SelectInput py={0} value={item.label} color={textColor} />;
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
                                                       {volumeOptions.map((item, index) => {
                                                            if (item.volumeId === volume) {
                                                                 return <SelectItem label={item.label} value={item.volumeId} key={index} bgColor={theme.tokens.colors.tertiary['300']} sx={{ _text: { color: theme.tokens.colors.tertiary['500-text'] } }} />;
                                                            }
                                                            return <SelectItem label={item.label} value={item.volumeId} key={index} sx={{ _text: { color: textColor } }} />;
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
