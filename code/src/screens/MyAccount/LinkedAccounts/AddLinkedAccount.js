import { ThemedMaterialCommunityIcons as MaterialCommunityIcons } from '../../../components/themed/ThemedMaterialIcons';
import React, { useState, useRef } from 'react';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { useUserState, useUpdateUserProfile, useUpdateAccounts, useUpdateViewers } from '@/src/hooks/useUserData';
import { addLinkedAccount, refreshProfile, getLinkedAccounts, getViewerAccounts } from '@/src/util/api/user';
import { formatLinkedAccounts } from '@/src/util/api/userHelper';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import {logErrorMessage} from '@/src/util/logging';
import { toArray } from '@/src/helpers/helpers';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel, ThemedInputSlot as InputSlot } from '@/src/components/themed/ThemedFormControls';
/**
 * AddLinkedAccount component that allows users to add a linked account. It displays a button that opens a modal where users can input the username and password of the account they want to link. The component handles API calls to add the linked account and refreshes the linked accounts, viewer accounts, and user profile upon successful completion.
 * @returns {React.JSX.Element}
 * @constructor
 */
const AddLinkedAccount = () => {
     const library = useLibrary();
     const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const updateAccounts = useUpdateAccounts();
     const updateViewers = useUpdateViewers();
     const { neutrals } = useTheme();
     const [loading, setLoading] = useState(false);
     const [showModal, setShowModal] = useState(false);
     const [showPassword, setShowPassword] = useState(false);
     const [newUser, setNewUser] = useState('');
     const [password, setPassword] = useState('');

     const passwordRef = useRef();
     const inputBorderColor = neutrals.border;

     const toggle = () => {
          setShowModal(!showModal);
          setNewUser('');
          setPassword('');
          setLoading(false);
     };

     const refreshLinkedAccounts = async () => {
          const linkedResponse = await getLinkedAccounts(library.baseUrl, language);
          if (linkedResponse?.ok) {
               const formatted = formatLinkedAccounts(user, [], library.barcodeStyle, linkedResponse.data.result.linkedAccounts);
               await updateAccounts(formatted.accounts);
          }

          const viewerResponse = await getViewerAccounts(library.baseUrl, language);
          if (viewerResponse?.ok) {
               const viewerList = toArray(viewerResponse.data?.result?.viewers ?? []);
               await updateViewers(viewerList);
          }

          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     };

     return (
          <Center>
               <Button onPress={toggle} colorScheme="primary">
                    <ButtonText>{getTermFromDictionary(language, 'linked_add_an_account')}</ButtonText>
               </Button>
               <Modal isOpen={showModal} onClose={toggle} size="full">
                    <ModalBackdrop />
                    <ModalContent className="max-w-[95%]">
                         <ModalHeader>
                              <Heading>{getTermFromDictionary(language, 'linked_account_to_manage')}</Heading>
                              <ModalCloseButton onPress={toggle}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              <FormControl>
                                   <FormControlLabel><FormControlLabelText>{getTermFromDictionary(language, 'username')}</FormControlLabelText></FormControlLabel>
                                   <Input style={{ borderColor: inputBorderColor }}>
                                        <InputField onChangeText={(text) => setNewUser(text)}
                                                      autoCorrect={false}
                                                      autoCapitalize="none"
                                                      id="username"
                                                      returnKeyType="next"
                                                      textContentType="username"
                                                      required
                                                     onSubmitEditing={() => {
                                                          passwordRef.current.focus();
                                                      }}
                                                     value={newUser}/>
                                   </Input>
                              </FormControl>
                              <FormControl className="mt-3">
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'password')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Input style={{ borderColor: inputBorderColor }}>
                                        <InputField onChangeText={(text) => setPassword(text)} value={password} autoCorrect={false}
                                                    autoCapitalize="none" id="password" returnKeyType="next"
                                                    textContentType="password" required type={showPassword ? 'text' : 'password'} ref={passwordRef}
                                        />
                                        <InputSlot onPress={() => setShowPassword(!showPassword)}>
                                             <MaterialCommunityIcons name={showPassword ? 'eye' : 'eye-off'} size={20} className="mr-2" />
                                        </InputSlot>
                                   </Input>
                              </FormControl>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup>
                                   <Button colorScheme="primary" variant="link" onPress={toggle}>
                                       <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                   <Button
                                       colorScheme="primary"
                                        isLoading={loading}
                                        isLoadingText={getTermFromDictionary(language, 'adding', true)}
                                        onPress={async () => {
                                             setLoading(true);
                                             try {
                                                  await addLinkedAccount(newUser, password, library.baseUrl);
                                                  await refreshLinkedAccounts();
                                             }catch (e) {
                                                  logErrorMessage("Error adding linked account");
                                                  logErrorMessage(e);
                                             }finally {
                                                  toggle();
                                             }
                                        }}>
                                      <ButtonText>{getTermFromDictionary(language, 'linked_add_account')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </Center>
     );
};

export default AddLinkedAccount;
