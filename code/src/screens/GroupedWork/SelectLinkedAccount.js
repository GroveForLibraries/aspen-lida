import { filter, isEmpty, isNumber, isObject } from '../../helpers/helpers';
import { Button, ButtonText, ButtonGroup, Center, CheckIcon, FormControl, FormControlLabel, FormControlLabelText, Heading, Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicatorWrapper, SelectDragIndicator, SelectItem, SelectScrollView, Icon, ChevronDownIcon } from '@gluestack-ui/themed';
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
     const availableLocations = Array.isArray(locations) ? locations : [];
     const availableAccounts = Object.values(accounts ?? {});

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

          if (isEmpty(volumeInfo.hasItemsWithoutVolumes) || !volumeInfo.hasItemsWithoutVolumes === false) {
               typeOfHold = 'volume';
               promptForHoldType = false;
          }
     }

     const [holdType, setHoldType] = React.useState(typeOfHold);
     const [volume, setVolume] = React.useState(null);

     let userPickupLocationId = user.pickupLocationId ?? user.homeLocationId;
     if (isNumber(user.pickupLocationId)) {
          userPickupLocationId = String(user.pickupLocationId);
     }

     let pickupLocation = '';
     if (availableLocations.length > 1) {
          const userPickupLocation = filter(availableLocations, { locationId: userPickupLocationId });
          if (userPickupLocation.length > 0) {
               pickupLocation = userPickupLocation[0];
               if (isObject(pickupLocation)) {
                    pickupLocation = pickupLocation.code;
               }
          }
     } else {
          pickupLocation = availableLocations[0];
          if (isObject(pickupLocation)) {
               pickupLocation = pickupLocation.code;
          }
     }

     const [location, setLocation] = React.useState(pickupLocation);

     const [activeAccount, setActiveAccount] = React.useState(user.id);

     return (
          <Center>
               <Button
                    size="md"
                    action="primary"
                    variant="solid"
                    onPress={() => setShowPrompt(true)}>
                    <ButtonText>{title}</ButtonText>
               </Button>
               <Modal isOpen={showPrompt} onClose={() => setShowPrompt(false)} size="lg">
                    <ModalBackdrop />
                    <ModalContent maxWidth="90%">
                         <ModalHeader borderBottomWidth="$0">
                              <Heading size="$md">{isPlacingHold ? getTermFromDictionary(language, 'hold_options') : getTermFromDictionary(language, 'checkout_options')}</Heading>
                              <ModalCloseButton />
                         </ModalHeader>
                         <ModalBody>
                              {shouldDisplayVolumes ? <SelectVolume language={language} id={id} holdType={holdType} setHoldType={setHoldType} volume={volume} setVolume={setVolume} promptForHoldType={promptForHoldType} /> : null}
                              {availableLocations.length > 1 && !isEContent ? (
                                   <FormControl mb="$4">
                                        <FormControlLabel>
                                             <FormControlLabelText>{getTermFromDictionary(language, 'select_pickup_location')}</FormControlLabelText>
                                        </FormControlLabel>
                                        <Select
                                             selectedValue={location}
                                             onValueChange={(itemValue) => setLocation(itemValue)}>
                                             <SelectTrigger variant="outline" size="md">
                                                  <SelectInput py={0} placeholder={getTermFromDictionary(language, 'select_pickup_location')} />
                                                  <Icon as={ChevronDownIcon} mr="$3" />
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            {availableLocations.map((location, index) => {
                                                                 return <SelectItem label={location.name} value={location.code} key={index} />;
                                                            })}
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              ) : null}
                              <FormControl mb="$5">
                                   <FormControlLabel>
                                        <FormControlLabelText>{isPlacingHold ? getTermFromDictionary(language, 'linked_place_hold_for_account') : getTermFromDictionary(language, 'linked_checkout_to_account')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Select
                                        selectedValue={activeAccount}
                                        onValueChange={(itemValue) => setActiveAccount(itemValue)}>
                                        <SelectTrigger variant="outline" size="md">
                                             <SelectInput py={0} placeholder={isPlacingHold ? getTermFromDictionary(language, 'linked_place_hold_for_account') : getTermFromDictionary(language, 'linked_checkout_to_account')} />
                                             <Icon as={ChevronDownIcon} mr="$3" />
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
                         <ModalFooter borderTopWidth="$0">
                              <ButtonGroup space="md" size="md">
                                   <Button
                                        variant="outline"
                                        action="secondary"
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
