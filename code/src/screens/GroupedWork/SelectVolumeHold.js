import { useQuery } from '@tanstack/react-query';
import { filter, isEmpty, isNumber, isObject } from '../../helpers/helpers';
import {
     Button,
     ButtonText,
     ButtonGroup,
     CheckIcon,
     FormControl,
     FormControlLabel,
     FormControlLabelText,
     Heading,
     Modal,
     ModalBackdrop,
     ModalContent,
     ModalHeader,
     ModalBody,
     ModalFooter,
     ModalCloseButton,
     Radio,
     RadioGroup,
     RadioIndicator,
     RadioIcon,
     RadioLabel,
     CircleIcon,
     Select,
     SelectTrigger,
     SelectInput,
     SelectPortal,
     SelectBackdrop,
     SelectContent,
     SelectDragIndicatorWrapper,
     SelectDragIndicator,
     SelectItem,
     SelectScrollView,
     Icon,
     ChevronDownIcon
} from '@gluestack-ui/themed';
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
     const availableLocations = Array.isArray(locations) ? locations : [];
     const availableAccounts = Object.values(accounts ?? {});
     const volumeOptions = Object.values(data ?? {});

     const isPlacingHold = action.includes('hold');

     let promptForHoldType = true;
     let typeOfHold = 'item';
     if (volumeInfo.majorityOfItemsHaveVolumes) {
          typeOfHold = 'volume';
     }
     if (isEmpty(volumeInfo.hasItemsWithoutVolumes) || !volumeInfo.hasItemsWithoutVolumes === false) {
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
     const [sublocation, setSublocation] = React.useState(null);

     return (
          <>
               <Button
                    onPress={() => setShowModal(true)}
                    action="primary"
                    size="md">
                    <ButtonText>{title}</ButtonText>
               </Button>
               <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
                    <ModalBackdrop />
                    <ModalContent maxWidth="90%">
                         <ModalHeader borderBottomWidth="$0">
                              <Heading size="$md">{isPlacingHold ? getTermFromDictionary(language, 'hold_options') : getTermFromDictionary(language, 'checkout_options')}</Heading>
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
                                             <FormControl mb="$4">
                                                  <RadioGroup
                                                       value={holdType}
                                                       onChange={(nextValue) => {
                                                            setHoldType(nextValue);
                                                       }}>
                                                       <Radio value="item" size="sm" mb="$2">
                                                            <RadioIndicator mr="$2">
                                                                 <RadioIcon as={CircleIcon} />
                                                            </RadioIndicator>
                                                            <RadioLabel>{getTermFromDictionary(language, 'first_available')}</RadioLabel>
                                                       </Radio>
                                                       <Radio value="volume" size="sm">
                                                            <RadioIndicator mr="$2">
                                                                 <RadioIcon as={CircleIcon} />
                                                            </RadioIndicator>
                                                            <RadioLabel>{getTermFromDictionary(language, 'specific_volume')}</RadioLabel>
                                                       </Radio>
                                                  </RadioGroup>
                                             </FormControl>
                                        ) : null}
                                        {holdType === 'volume' ? (
                                             <FormControl mb="$4">
                                                  <FormControlLabel>
                                                       <FormControlLabelText>{getTermFromDictionary(language, 'select_volume')}</FormControlLabelText>
                                                  </FormControlLabel>
                                                  <Select
                                                       selectedValue={volume}
                                                       onValueChange={(itemValue) => setVolume(itemValue)}>
                                                       <SelectTrigger variant="outline" size="md">
                                                            <SelectInput py={0} placeholder={getTermFromDictionary(language, 'select_volume')} />
                                                            <Icon as={ChevronDownIcon} mr="$3" />
                                                       </SelectTrigger>
                                                       <SelectPortal>
                                                            <SelectBackdrop />
                                                            <SelectContent>
                                                                 <SelectDragIndicatorWrapper>
                                                                      <SelectDragIndicator />
                                                                 </SelectDragIndicatorWrapper>
                                                                 <SelectScrollView>
                                                                      {volumeOptions.map((item, index) => {
                                                                           return <SelectItem label={item.label} value={item.volumeId} key={index} />;
                                                                      })}
                                                                 </SelectScrollView>
                                                            </SelectContent>
                                                       </SelectPortal>
                                                  </Select>
                                             </FormControl>
                                        ) : null}
                                        {availableLocations.length > 1 ? (
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
                                        {availableAccounts.length > 0 ? (
                                             <FormControl mb="$4">
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
                                        ) : null}
                                   </>
                              )}
                         </ModalBody>
                         <ModalFooter borderTopWidth="$0">
                              <ButtonGroup space="md" size="md">
                                   <Button
                                        action="secondary"
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
