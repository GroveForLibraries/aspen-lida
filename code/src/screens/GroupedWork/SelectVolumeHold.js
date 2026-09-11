import { useQuery } from '@tanstack/react-query';
import _ from 'lodash';
import React, { useState } from 'react';
import { loadError } from '../../components/loadError';
import { loadingSpinner } from '../../components/loadingSpinner';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useAccounts, useLocations, useUpdateUserProfile } from '../../hooks/useUserData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getVolumes } from '../../util/api/item';
import { refreshProfile } from '../../util/api/user';
import { completeAction } from '../../util/api/userHelper';
import { logDebugMessage, logWarnMessage, getErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedMaterialIcons as MaterialIcons } from '../../components/themed/ThemedMaterialIcons';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedRadio as Radio, ThemedRadioGroup as RadioGroup, ThemedRadioIcon as RadioIcon, ThemedRadioIndicator as RadioIndicator, ThemedRadioLabel as RadioLabel } from '../../components/themed/ThemedRadio';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../components/themed/ThemedSelect';

/**
 * SelectVolumeHold component that allows users to select a volume for a specific item and place a hold or checkout. It fetches available volumes from the API and provides options for selecting either the first available item or a specific volume, along with pickup location and account selection.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const SelectVolumeHold = (props) => {
     const { id, title, action, volumeInfo, prevRoute, response, setResponse, responseIsOpen, setResponseIsOpen, onResponseClose, cancelResponseRef } = props;
     const [loading, setLoading] = React.useState(false);
     const [showModal, setShowModal] = useState(false);
     const [volume, setVolume] = React.useState('');

     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: accounts } = useAccounts();
     const { data: locations } = useLocations();
     const updateUserProfile = useUpdateUserProfile();
     const library = useLibrary();
     const language = useActiveLanguage();

     const isPlacingHold = action.includes('hold');

     let promptForHoldType = true;
     let typeOfHold = 'item';
     if (volumeInfo.majorityOfItemsHaveVolumes) {
          typeOfHold = 'volume';
     }
     if (_.isEmpty(volumeInfo.hasItemsWithoutVolumes) || !volumeInfo.hasItemsWithoutVolumes === false) {
          typeOfHold = 'volume';
          promptForHoldType = false;
     }

     const { status, data, error, isFetching } = useQuery({
          queryKey: ['volumes', id, library.baseUrl],
          queryFn: () => getVolumes(id, library.baseUrl),
          enabled: !!showModal,
     });

     const [holdType, setHoldType] = React.useState(typeOfHold);

     const [activeAccount, setActiveAccount] = React.useState(user.id);

     let userPickupLocationId = user.pickupLocationId ?? user.homeLocationId;
     if (_.isNumber(user.pickupLocationId)) {
          userPickupLocationId = _.toString(user.pickupLocationId);
     }

     let pickupLocation = '';
     if (_.size(locations) > 1) {
          const userPickupLocation = _.filter(locations, { locationId: userPickupLocationId });
          if (!_.isUndefined(userPickupLocation && !_.isEmpty(userPickupLocation))) {
               pickupLocation = userPickupLocation[0];
               if (_.isObject(pickupLocation)) {
                    pickupLocation = pickupLocation.code;
               }
          }
     } else {
          pickupLocation = locations[0];
          if (_.isObject(pickupLocation)) {
               pickupLocation = pickupLocation.code;
          }
     }

     const [location, setLocation] = React.useState(pickupLocation);
     const [sublocation, setSublocation] = React.useState(null);

     return (
          <>
               <Button
                    onPress={() => setShowModal(true)}
                    colorScheme="primary"
                    size="md">
                    <ButtonText>{title}</ButtonText>
               </Button>
               <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
                    <ModalBackdrop />
                    <ModalContent>
                         <ModalHeader style={{ borderBottomWidth: 0 }}>
                              <Heading>{isPlacingHold ? getTermFromDictionary(language, 'hold_options') : getTermFromDictionary(language, 'checkout_options')}</Heading>
                              <ModalCloseButton />
                         </ModalHeader>
                         <ModalBody>
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
                                             <FormControl className="mb-4">
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
                                                                 <SelectScrollView>
                                                                      {_.map(data, function (item, index, array) {
                                                                           return <SelectItem label={item.label} value={item.volumeId} key={index} />;
                                                                      })}
                                                                 </SelectScrollView>
                                                            </SelectContent>
                                                       </SelectPortal>
                                                  </Select>
                                             </FormControl>
                                        ) : null}
                                        {_.size(locations) > 1 ? (
                                             <FormControl className="mb-4">
                                                  <FormControlLabel>
                                                       <FormControlLabelText>{getTermFromDictionary(language, 'select_pickup_location')}</FormControlLabelText>
                                                  </FormControlLabel>
                                                  <Select
                                                       selectedValue={location}
                                                       onValueChange={(itemValue) => setLocation(itemValue)}>
                                                       <SelectTrigger>
                                                            <SelectInput placeholder={getTermFromDictionary(language, 'select_pickup_location')} />
                                                       </SelectTrigger>
                                                       <SelectPortal>
                                                            <SelectBackdrop />
                                                            <SelectContent>
                                                                 <SelectDragIndicatorWrapper>
                                                                      <SelectDragIndicator />
                                                                 </SelectDragIndicatorWrapper>
                                                                 <SelectScrollView>
                                                                      {locations.map((location, index) => {
                                                                           return <SelectItem label={location.name} value={location.code} key={index} />;
                                                                      })}
                                                                 </SelectScrollView>
                                                            </SelectContent>
                                                       </SelectPortal>
                                                  </Select>
                                             </FormControl>
                                        ) : null}
                                        {_.size(accounts) > 0 ? (
                                             <FormControl className="mb-4">
                                                  <FormControlLabel>
                                                       <FormControlLabelText>{isPlacingHold ? getTermFromDictionary(language, 'linked_place_hold_for_account') : getTermFromDictionary(language, 'linked_checkout_to_account')}</FormControlLabelText>
                                                  </FormControlLabel>
                                                  <Select
                                                       selectedValue={activeAccount}
                                                       onValueChange={(itemValue) => setActiveAccount(itemValue)}>
                                                       <SelectTrigger>
                                                            <SelectInput placeholder={isPlacingHold ? getTermFromDictionary(language, 'linked_place_hold_for_account') : getTermFromDictionary(language, 'linked_checkout_to_account')} />
                                                       </SelectTrigger>
                                                       <SelectPortal>
                                                            <SelectBackdrop />
                                                            <SelectContent>
                                                                 <SelectDragIndicatorWrapper>
                                                                      <SelectDragIndicator />
                                                                 </SelectDragIndicatorWrapper>
                                                                 <SelectScrollView>
                                                                      <SelectItem label={user.displayName} value={user.id} />
                                                                      {accounts.map((item, index) => {
                                                                           return <SelectItem label={item.displayName} value={item.id} key={index} />;
                                                                      })}
                                                                 </SelectScrollView>
                                                            </SelectContent>
                                                       </SelectPortal>
                                                  </Select>
                                             </FormControl>
                                        ) : null}
                                   </>
                              )}
                         </ModalBody>
                         <ModalFooter style={{ borderTopWidth: 0 }}>
                              <ButtonGroup space="md" size="md">
                                   <Button
                                        colorScheme="secondary"
                                        variant="outline"
                                        onPress={() => {
                                             setShowModal(false);
                                             setLoading(false);
                                        }}>
                                        <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                   <Button
                                        isDisabled={loading}
                                        onPress={async () => {
                                             setLoading(true);
                                             await completeAction(id, action, activeAccount, '', '', location, sublocation, library.baseUrl, volume, holdType).then(async (result) => {
                                                  setResponse(result);
                                                  setShowModal(false);
                                                  if (result) {
                                                       setResponseIsOpen(true);
                                                       if (result.success) {
                                                             await refreshProfile(library.baseUrl).then((data) => {
                                                                 if(data.ok) {
                                                                       updateUserProfile(data.data.result.profile);
                                                                 } else {
                                                                      logWarnMessage('Could not refresh profile after placing hold from volume selection.');
                                                                      logDebugMessage(data);
                                                                      getErrorMessage(data.code ?? 0, data.problem);
                                                                 }
                                                            });
                                                       }
                                                  }
                                             });
                                             setLoading(false);
                                        }}>
                                        <ButtonText>{loading ? (isPlacingHold ? getTermFromDictionary(language, 'placing_hold', true) : getTermFromDictionary(language, 'checking_out', true)) : title}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </>
     );
};

export default SelectVolumeHold;
