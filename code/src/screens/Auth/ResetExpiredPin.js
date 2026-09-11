import { ThemedMaterialIcons as MaterialIcons } from '../../components/themed/ThemedMaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import _ from 'lodash';
import React from 'react';
import { popAlert } from '../../components/feedback';
import { AuthContext } from '../../context/AuthContext';
import { useUpdateLibrary, useUpdateHomeScreenLinks } from '../../hooks/useLibrarySystemData';
import { useUpdateLibraryLocation } from '../../hooks/useLibraryBranchData';
import { useUpdateUserProfile } from '../../hooks/useUserData';
import { useUpdateBrowseCategories } from '../../hooks/useBrowseCategoryData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { getLibraryBranch, getLibrarySystem } from '../../util/api/system';
import { getUserProfile, resetExpiredPin } from '../../util/api/user';
import { getBrowseCategoriesAndHomeLinks } from '../../util/api/search';
import { logDebugMessage, logInfoMessage, getErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlError as FormControlError, ThemedFormControlErrorIcon as FormControlErrorIcon, ThemedFormControlErrorText as FormControlErrorText, ThemedFormControlLabel as FormControlLabel, ThemedInputSlot as InputSlot } from '../../components/themed/ThemedFormControls';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogCloseButton as AlertDialogCloseButton, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { Spinner } from '@/components/ui/spinner';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';

/**
 * ResetExpiredPin component that displays an alert dialog when the user's pin has expired, allowing the user to reset their pin.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const ResetExpiredPin = (props) => {
     const [resetSuccessful, setResetSuccessful] = React.useState(false);
     const [resetMessage, setResetMessage] = React.useState('');
      const { signIn } = React.useContext(AuthContext);
     const updateLibrary = useUpdateLibrary();
     const updateLibraryLocation = useUpdateLibraryLocation();
     const updateHomeScreenLinks = useUpdateHomeScreenLinks();
     const updateUserProfile = useUpdateUserProfile();
     const { neutrals, brand } = useTheme();
     const updateBrowseCategories = useUpdateBrowseCategories();
     const language = useActiveLanguage();
     const { username, resetToken, url, pinValidationRules, setExpiredPin, patronsLibrary } = props;
     const borderColor = neutrals.border;
     const [isOpen, setIsOpen] = React.useState(true);
     const onClose = () => {
          setExpiredPin(false);
          setIsOpen(false);
     };
     const cancelRef = React.useRef(null);

     const [pin, setPin] = React.useState('');
     const [pinConfirmed, setPinConfirmed] = React.useState('');
     const [errors, setErrors] = React.useState({});
     const [hasError, setHasError] = React.useState(false);

     // show:hide data from password fields
     const [showPin, setShowPin] = React.useState(false);
     const [showPinConfirmed, setShowPinConfirmed] = React.useState(false);
     const toggleShowPin = () => setShowPin(!showPin);
     const toggleShowPinConfirmed = () => setShowPinConfirmed(!showPinConfirmed);

     const pinConfirmedRef = React.useRef();

     const valueUser = username;
     const valueSecret = pin;

     const validatePin = () => {
          if (pin === undefined) {
               setErrors({ ...errors, pin: 'Pin is required' });
               return false;
          } else if (_.size(pin) < pinValidationRules.minLength) {
               setErrors({ ...errors, pin: 'Pin should be greater than ' + pinValidationRules.minLength + ' characters' });
               return false;
          } else if (_.size(pin) > pinValidationRules.maxLength) {
               setErrors({ ...errors, pin: 'Pin should be less than ' + pinValidationRules.maxLength + ' characters' });
               return false;
          } else if (pin !== pinConfirmed) {
               setErrors({ ...errors, pin: 'Pins should match.' });
               return false;
          }
          setErrors({});
          return true;
     };

     const validatePinConfirmed = () => {
          if (pinConfirmed === undefined) {
               setErrors({ ...errors, pinConfirmed: 'Pin is required' });
               return false;
          } else if (_.size(pinConfirmed) < pinValidationRules.minLength) {
               setErrors({ ...errors, pinConfirmed: 'Pin should be greater than ' + pinValidationRules.minLength + ' characters' });
               return false;
          } else if (_.size(pinConfirmed) > pinValidationRules.maxLength) {
               setErrors({ ...errors, pinConfirmed: 'Pin should be less than ' + pinValidationRules.maxLength + ' characters' });
               return false;
          } else if (pinConfirmed !== pin) {
               setErrors({ ...errors, pinConfirmed: 'Pins should match.' });
               return false;
          }
          setErrors({});
          return true;
     };

     const updatePIN = async () => {
          if (validatePin() && validatePinConfirmed()) {
               await resetExpiredPin(pin, pinConfirmed, resetToken, url).then(async (result) => {
                    if(result.ok) {
                         if (result.success) {
                              setResetMessage(result.message ?? 'Pin successfully reset.');
                              setResetSuccessful(true);
                              await setAsyncStorage();
                              await setContext();
                              signIn();
                              setExpiredPin(false);
                              setIsOpen(false);
                              setHasError(false);
                         } else {
                              popAlert(getTermFromDictionary('en', 'error'), result.message ?? 'Unable to update pin', 'error');
                         }
                    } else {
                         logDebugMessage("Error resetting expired pin");
                         logDebugMessage(result);
                         const error = getErrorMessage(result.code ?? 0, result.problem);
                         setHasError(true);
                         popAlert(error.title, error.message, 'error');
                    }
               });
          } else {
               logInfoMessage(errors);
          }
     };

       const setContext = async () => {
            const library = await getLibrarySystem({ patronsLibrary });
            await updateLibrary(library);
            const location = await getLibraryBranch({ patronsLibrary });
            await updateLibraryLocation(location);
           const user = await getUserProfile({ patronsLibrary }, { valueUser }, { valueSecret });
           await updateUserProfile(user);
           const homeScreenFeed = await getBrowseCategoriesAndHomeLinks({ patronsLibrary }, { valueUser }, { valueSecret });
           await updateBrowseCategories(homeScreenFeed.browseCategories);
           await updateHomeScreenLinks(homeScreenFeed.homeScreenLinks);
      };

     const setAsyncStorage = async () => {
          await SecureStore.setItemAsync('userKey', username);
          await SecureStore.setItemAsync('secretKey', pin);
          await SecureStore.setItemAsync('library', patronsLibrary['libraryId']);
          await AsyncStorage.setItem('@libraryId', patronsLibrary['libraryId']);
          await SecureStore.setItemAsync('libraryName', patronsLibrary['name']);
          await SecureStore.setItemAsync('locationId', patronsLibrary['locationId']);
          await AsyncStorage.setItem('@locationId', patronsLibrary['locationId']);
          await SecureStore.setItemAsync('solrScope', patronsLibrary['solrScope']);

          await AsyncStorage.setItem('@solrScope', patronsLibrary['solrScope']);
          await AsyncStorage.setItem('@pathUrl', patronsLibrary['baseUrl']);
          await SecureStore.setItemAsync('pathUrl', patronsLibrary['baseUrl']);
          await AsyncStorage.setItem('@lastStoredVersion', Constants.expoConfig.version);
          await AsyncStorage.setItem('@patronLibrary', JSON.stringify(patronsLibrary));
     };

     return (
          <Center>
               <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose} avoidKeyboard>
                    <AlertDialogBackdrop />
                    <AlertDialogContent>
                         <AlertDialogHeader>
                              <Heading>{resetSuccessful ? getTermFromDictionary(language, 'pin_updated') : getTermFromDictionary(language, 'reset_my_pin')}</Heading>
                              <AlertDialogCloseButton>
                                   <CloseIcon />
                              </AlertDialogCloseButton>
                         </AlertDialogHeader>
                         {resetSuccessful ? (
                              <>
                                   <AlertDialogBody>
                                        <Center>
                                             <VStack>
                                                  <Text>{resetMessage}. Logging you in...</Text>
                                                  <Spinner style={{ color: brand.primary[500] }} />
                                             </VStack>
                                        </Center>
                                   </AlertDialogBody>
                              </>
                         ) : (
                              <>
                                   <AlertDialogBody>
                                       <Text>{getTermFromDictionary(language, 'pin_has_expired')}</Text>
                                       <FormControl isRequired isInvalid={'pin' in errors} className="mt-3">
                                             <FormControlLabel>
                                                 <FormControlLabelText>{getTermFromDictionary(language, 'new_pin')}</FormControlLabelText>
                                             </FormControlLabel>
                                            <Input style={{ borderColor }}>
                                                  <InputField
                                                       keyboardType={pinValidationRules.onlyDigitsAllowed === '1' ? 'numeric' : 'default'}
                                                       autoCapitalize="none"
                                                       size="xl"
                                                       autoCorrect={false}
                                                       type={showPin ? 'text' : 'password'}
                                                      id="pin"
                                                      returnKeyType="next"
                                                      enterKeyHint="next"
                                                      textContentType="password"
                                                      onChangeText={(text) => setPin(text)}
                                                      onSubmitEditing={() => pinConfirmedRef.current.focus()}
                                                      blurOnSubmit={false}
                                                  />
                                                 <InputSlot onPress={toggleShowPin}>
                                                      <MaterialIcons name={showPin ? 'visibility' : 'visibility-off'} size={20} className="mr-3" />
                                                 </InputSlot>
                                            </Input>
                                             {'pin' in errors ? (
                                                  <FormControlError>
                                                       <FormControlErrorIcon as={MaterialIcons} name="error" />
                                                       <FormControlErrorText>{errors.pin}</FormControlErrorText>
                                                  </FormControlError>
                                             ) : null}
                                        </FormControl>
                                        <FormControl isRequired isInvalid={'pinConfirmed' in errors} className="mt-3">
                                             <FormControlLabel>
                                                  <FormControlLabelText>{getTermFromDictionary(language, 'new_pin_confirmed')}</FormControlLabelText>
                                             </FormControlLabel>
                                             <Input style={{ borderColor }}>
                                                  <InputField
                                                       keyboardType={pinValidationRules.onlyDigitsAllowed === '1' ? 'numeric' : 'default'}
                                                       autoCapitalize="none"
                                                       size="xl"
                                                       autoCorrect={false}
                                                       type={showPinConfirmed ? 'text' : 'password'}
                                                       id="pinConfirmed"
                                                       enterKeyHint="done"
                                                       returnKeyType="done"
                                                       textContentType="password"
                                                       onChangeText={(text) => setPinConfirmed(text)}
                                                       onSubmitEditing={() => updatePIN()}
                                                       ref={pinConfirmedRef}
                                                  />
                                                  <InputSlot onPress={toggleShowPinConfirmed}>
                                                       <MaterialIcons name={showPinConfirmed ? 'visibility' : 'visibility-off'} size={20} className="mr-3" />
                                                  </InputSlot>
                                             </Input>
                                             {'pinConfirmed' in errors ? (
                                                  <FormControlError>
                                                       <FormControlErrorIcon as={MaterialIcons} name="error" />
                                                       <FormControlErrorText>{errors.pinConfirmed}</FormControlErrorText>
                                                  </FormControlError>
                                             ) : null}
                                        </FormControl>
                                   </AlertDialogBody>

                                   <AlertDialogFooter>
                                       <ButtonGroup space="md">
                                            <Button colorScheme="primary" variant="outline" onPress={onClose}>
                                                 <ButtonText>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                             </Button>
                                            <Button colorScheme="primary" onPress={() => updatePIN()}>
                                                 <ButtonText>{getTermFromDictionary(language, 'update')}</ButtonText>
                                             </Button>
                                        </ButtonGroup>
                                   </AlertDialogFooter>
                              </>
                         )}
                    </AlertDialogContent>
               </AlertDialog>
          </Center>
     );
};
