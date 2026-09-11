import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import {
     VStack,
     Icon,
     Center,
     AlertDialog,
     AlertDialogCloseButton,
     AlertDialogBackdrop,
     AlertDialogContent,
     AlertDialogHeader,
     AlertDialogBody,
     AlertDialogFooter,
     Button,
     ButtonGroup,
     ButtonText,
     Heading,
     Text,
     Input,
     InputField,
     FormControl,
     FormControlLabel,
     FormControlLabelText,
     FormControlError,
     FormControlErrorIcon,
     FormControlErrorText,
     CloseIcon,
     AlertCircleIcon,
     Spinner
} from '@gluestack-ui/themed';

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

export const ResetExpiredPin = (props) => {
     const [resetSuccessful, setResetSuccessful] = React.useState(false);
     const [resetMessage, setResetMessage] = React.useState('');
      const { signIn } = React.useContext(AuthContext);
     const updateLibrary = useUpdateLibrary();
     const updateLibraryLocation = useUpdateLibraryLocation();
     const updateHomeScreenLinks = useUpdateHomeScreenLinks();
     const updateUserProfile = useUpdateUserProfile();
     const { theme, colorMode, textColor } = useTheme();
     const updateBrowseCategories = useUpdateBrowseCategories();
     const language = useActiveLanguage();
     const { username, resetToken, url, pinValidationRules, setExpiredPin, patronsLibrary } = props;
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
          } else if (pin.length < pinValidationRules.minLength) {
               setErrors({ ...errors, pin: 'Pin should be greater than ' + pinValidationRules.minLength + ' characters' });
               return false;
          } else if (pin.length > pinValidationRules.maxLength) {
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
          } else if (pinConfirmed.length < pinValidationRules.minLength) {
               setErrors({ ...errors, pinConfirmed: 'Pin should be greater than ' + pinValidationRules.minLength + ' characters' });
               return false;
          } else if (pinConfirmed.length > pinValidationRules.maxLength) {
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
                    <AlertDialogContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}>
                         <AlertDialogHeader>
                              <Heading color={textColor}>{resetSuccessful ? getTermFromDictionary(language, 'pin_updated') : getTermFromDictionary(language, 'reset_my_pin')}</Heading>
                              <AlertDialogCloseButton>
                                   <Icon as={CloseIcon} color={textColor} />
                              </AlertDialogCloseButton>
                         </AlertDialogHeader>
                         {resetSuccessful ? (
                              <>
                                   <AlertDialogBody>
                                        <Center>
                                             <VStack>
                                                  <Text color={textColor}>{resetMessage}. Logging you in...</Text>
                                                  <Spinner color={theme.tokens.colors.primary['500']} />
                                             </VStack>
                                        </Center>
                                   </AlertDialogBody>
                              </>
                         ) : (
                              <>
                                   <AlertDialogBody>
                                        <Text color={textColor}>{getTermFromDictionary(language, 'pin_has_expired')}</Text>
                                        <FormControl isRequired isInvalid={'pin' in errors} mt="$3">
                                             <FormControlLabel>
                                                  <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'new_pin')}</FormControlLabelText>
                                             </FormControlLabel>
                                             <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                                  <InputField
                                                       keyboardType={pinValidationRules.onlyDigitsAllowed === '1' ? 'numeric' : 'default'}
                                                       autoCapitalize="none"
                                                       size="xl"
                                                       color={textColor}
                                                       autoCorrect={false}
                                                       type={showPin ? 'text' : 'password'}
                                                       variant="filled"
                                                       id="pin"
                                                       returnKeyType="next"
                                                       enterKeyHint="next"
                                                       textContentType="password"
                                                       onChangeText={(text) => setPin(text)}
                                                       InputRightElement={<Icon as={<Ionicons name={showPin ? 'eye-outline' : 'eye-off-outline'} />} size="md" ml={1} mr={3} onPress={toggleShowPin} roundedLeft={0} roundedRight="md" />}
                                                       onSubmitEditing={() => pinConfirmedRef.current.focus()}
                                                       blurOnSubmit={false}
                                                  />
                                             </Input>
                                             {'pin' in errors ? (
                                                  <FormControlError>
                                                       <FormControlErrorIcon as={AlertCircleIcon} />
                                                       <FormControlErrorText>{errors.pin}</FormControlErrorText>
                                                  </FormControlError>
                                             ) : null}
                                        </FormControl>
                                        <FormControl isRequired isInvalid={'pinConfirmed' in errors} mt="$3">
                                             <FormControlLabel>
                                                  <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'new_pin_confirmed')}</FormControlLabelText>
                                             </FormControlLabel>
                                             <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                                  <InputField
                                                       keyboardType={pinValidationRules.onlyDigitsAllowed === '1' ? 'numeric' : 'default'}
                                                       autoCapitalize="none"
                                                       color={textColor}
                                                       size="xl"
                                                       autoCorrect={false}
                                                       type={showPinConfirmed ? 'text' : 'password'}
                                                       variant="filled"
                                                       id="pinConfirmed"
                                                       enterKeyHint="done"
                                                       returnKeyType="done"
                                                       textContentType="password"
                                                       onChangeText={(text) => setPinConfirmed(text)}
                                                       InputRightElement={<Icon as={<Ionicons name={showPinConfirmed ? 'eye-outline' : 'eye-off-outline'} />} size="md" ml={1} mr={3} onPress={toggleShowPinConfirmed} roundedLeft={0} roundedRight="md" />}
                                                       onSubmitEditing={() => updatePIN()}
                                                       ref={pinConfirmedRef}
                                                  />
                                             </Input>
                                             {'pinConfirmed' in errors ? (
                                                  <FormControlError>
                                                       <FormControlErrorIcon as={AlertCircleIcon} />
                                                       <FormControlErrorText>{errors.pinConfirmed}</FormControlErrorText>
                                                  </FormControlError>
                                             ) : null}
                                        </FormControl>
                                   </AlertDialogBody>

                                   <AlertDialogFooter>
                                        <ButtonGroup space="$3">
                                             <Button variant="outline" onPress={onClose} borderColor={theme.tokens.colors.primary['500']}>
                                                  <ButtonText color={theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                             </Button>
                                             <Button bgColor={theme.tokens.colors.primary['500']} onPress={() => updatePIN()}>
                                                  <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'update')}</ButtonText>
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
