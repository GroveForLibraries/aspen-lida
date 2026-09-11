import _ from 'lodash';
import React, { useState } from 'react';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useAccounts, useLocations, useUpdateUserProfile } from '../../hooks/useUserData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { refreshProfile } from '../../util/api/user';
import { completeAction } from '../../util/api/userHelper';
import { SelectVolume } from './SelectVolume';
import { logDebugMessage, logWarnMessage, getErrorMessage } from '../../util/logging';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectTrigger as SelectTrigger } from '../../components/themed/ThemedSelect';

/**
 * SelectPickupLocation component that renders a button to select a pickup location for placing holds or checking out items. It displays a modal with options for selecting volumes, accounts, and pickup locations, and handles the completion of the action based on user selections.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const SelectPickupLocation = (props) => {
     const { id, action, title, volumeInfo, prevRoute, response, setResponse, responseIsOpen, setResponseIsOpen, onResponseClose, cancelResponseRef, language } = props;
     const [loading, setLoading] = React.useState(false);
     const [showModal, setShowModal] = useState(false);
     const [volume, setVolume] = React.useState(null);
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: accounts } = useAccounts();
     const { data: locations } = useLocations();
     const updateUserProfile = useUpdateUserProfile();
     const library = useLibrary();

     const isPlacingHold = action.includes('hold');

     let shouldDisplayVolumes = false;
     let typeOfHold = 'default';
     let promptForHoldType = false;

     if (volumeInfo.numItemsWithVolumes > 0) {
          typeOfHold = 'item';
          shouldDisplayVolumes = true;
          promptForHoldType = true;

          if (volumeInfo.majorityOfItemsHaveVolumes) {
               typeOfHold = 'volume';
          }

          if (_.isEmpty(volumeInfo.hasItemsWithoutVolumes) || !volumeInfo.hasItemsWithoutVolumes === false) {
               typeOfHold = 'volume';
               promptForHoldType = false;
          }
     }

     const [holdType, setHoldType] = React.useState(typeOfHold);

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

     const [activeAccount, setActiveAccount] = React.useState(user.id);

     let availableAccounts = [];
     if (_.size(accounts) > 0) {
          availableAccounts = Object.values(accounts);
     }

     return (
          <>
               <Button
                    variant="solid"
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
                              {shouldDisplayVolumes ? <SelectVolume language={language} id={id} holdType={holdType} setHoldType={setHoldType} volume={volume} setVolume={setVolume} promptForHoldType={promptForHoldType} /> : null}
                              {_.size(accounts) > 1 ? (
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
                                                       <SelectItem label={user.displayName} value={user.id} />
                                                       {availableAccounts.map((account, index) => {
                                                            return <SelectItem label={account.displayName} value={account.id} key={index} />;
                                                       })}
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              ) : null}
                              <FormControl className="mb-2">
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
                                                  {locations.map((location, index) => {
                                                       return <SelectItem label={location.name} value={location.code} key={index} />;
                                                  })}
                                             </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </FormControl>
                         </ModalBody>
                         <ModalFooter style={{ borderTopWidth: 0 }}>
                              <ButtonGroup space="md" size="md">
                                   <Button variant="outline" colorScheme="secondary" onPress={() => setShowModal(false)}>
                                        <ButtonText>{getTermFromDictionary(language, 'close_button')}</ButtonText>
                                   </Button>
                                   <Button
                                        isDisabled={loading}
                                        onPress={async () => {
                                             setLoading(true);
                                             await completeAction(id, action, activeAccount, null, null, location, null, library.baseUrl, volume, holdType).then(async (result) => {
                                                  setResponse(result);
                                                  setShowModal(false);
                                                  if (result) {
                                                       setResponseIsOpen(true);
                                                       if (result.success) {
                                                            await refreshProfile(library.baseUrl).then(async (data) => {
                                                                 if(data.ok) {
                                                                      await updateUserProfile(data.data.result.profile);
                                                                 } else {
                                                                      logWarnMessage('Could not refresh profile after placing hold from pickup location selection.');
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

export default SelectPickupLocation;
