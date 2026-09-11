import _ from 'lodash';
import React from 'react';
import { HoldsContext } from '../../context/initialContext';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useAccounts, useLocations, useUpdateUserProfile } from '../../hooks/useUserData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { refreshProfile } from '../../util/api/user';
import { completeAction } from '../../util/api/userHelper';
import { SelectVolume } from './SelectVolume';
import { logDebugMessage, logWarnMessage, getErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../components/themed/ThemedSelect';

/**
 * SelectLinkedAccount component that renders a button to select a linked account for placing holds or checking out items. It displays a modal with options to select the pickup location and the linked account, and handles the action of placing a hold or checking out an item for the selected account.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const SelectLinkedAccount = (props) => {
     const { id, action, title, volumeInfo, prevRoute, isEContent, response, setResponse, responseIsOpen, setResponseIsOpen, onResponseClose, cancelResponseRef } = props;
     const [loading, setResponseLoading] = React.useState(false);
     const [showPrompt, setShowPrompt] = React.useState(false);

     const isPlacingHold = action.includes('hold');

     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: accounts } = useAccounts();
     const { data: locations } = useLocations();
     const updateUserProfile = useUpdateUserProfile();
     const library = useLibrary();
     const { updateHolds } = React.useContext(HoldsContext);
     const language = useActiveLanguage();

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
     const [volume, setVolume] = React.useState(null);

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
          <Center>
               <Button
                    size="md"
                    colorScheme="primary"
                    variant="solid"
                    onPress={() => setShowPrompt(true)}>
                    <ButtonText>{title}</ButtonText>
               </Button>
               <Modal isOpen={showPrompt} onClose={() => setShowPrompt(false)} size="lg">
                    <ModalBackdrop />
                    <ModalContent>
                         <ModalHeader style={{ borderBottomWidth: 0 }}>
                              <Heading>{isPlacingHold ? getTermFromDictionary(language, 'hold_options') : getTermFromDictionary(language, 'checkout_options')}</Heading>
                              <ModalCloseButton />
                         </ModalHeader>
                         <ModalBody>
                              {shouldDisplayVolumes ? <SelectVolume language={language} id={id} holdType={holdType} setHoldType={setHoldType} volume={volume} setVolume={setVolume} promptForHoldType={promptForHoldType} /> : null}
                              {_.size(locations) > 1 && !isEContent ? (
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
                              <FormControl className="mb-5">
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
                                                       {availableAccounts.map((item, index) => {
                                                            return <SelectItem label={item.displayName} value={item.id} key={index} />;
                                                       })}
                                                  </SelectScrollView>
                                             </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </FormControl>
                         </ModalBody>
                         <ModalFooter style={{ borderTopWidth: 0 }}>
                              <ButtonGroup space="md" size="md">
                                   <Button
                                        variant="outline"
                                        colorScheme="secondary"
                                        onPress={() => {
                                             setShowPrompt(false);
                                             setResponseLoading(false);
                                        }}>
                                        <ButtonText>{getTermFromDictionary(language, 'close_button')}</ButtonText>
                                   </Button>
                                   <Button
                                        isDisabled={loading}
                                        onPress={async () => {
                                             setResponseLoading(true);
                                             await completeAction(id, action, activeAccount, null, null, location, null, library.baseUrl, volume, holdType).then(async (result) => {
                                                  setResponse(result);
                                                  setShowPrompt(false);
                                                  if (result) {
                                                       setResponseIsOpen(true);
                                                       if (result.success) {
                                                             await refreshProfile(library.baseUrl).then(async (data) => {
                                                                 if(data.ok) {
                                                                      await updateUserProfile(data.data.result.profile);
                                                                 } else {
                                                                      logWarnMessage('Could not refresh profile after placing hold or checkout from linked account');
                                                                      logDebugMessage(data);
                                                                      getErrorMessage(data.code ?? 0, data.problem);
                                                                 }
                                                            });
                                                       }
                                                  }
                                             });
                                             setResponseLoading(false);
                                        }}>
                                        <ButtonText>{loading ? (isPlacingHold ? getTermFromDictionary(language, 'placing_hold', true) : getTermFromDictionary(language, 'checking_out', true)) : title}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </Center>
     );
};

export default SelectLinkedAccount;
