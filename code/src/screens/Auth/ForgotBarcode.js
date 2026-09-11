import _ from 'lodash';
import React from 'react';
import { Platform } from 'react-native';
import { getTermFromDictionary, getTranslation, getTranslationWithValuesText } from '../../translations/TranslationService';
import { stripHTML } from '../../helpers/helpers';
import { LIBRARY } from '../../util/globals';
import { useKeyboard } from '../../hooks/hooks';
import { logDebugMessage, getErrorMessage } from '../../util/logging';
import { forgotBarcode } from '../../util/api/user';
import { useTheme } from '../../themes/theme';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * ForgotBarcode component that displays a modal for users to request their forgotten barcode by entering their phone number.
 * @param props
 * @returns {React.JSX.Element|null}
 * @constructor
 */
export const ForgotBarcode = (props) => {
     const isKeyboardOpen = useKeyboard();
     const { neutrals, textColor } = useTheme();
     const borderColor = neutrals.border;
     const library = useLibrary();
     const { usernameLabel, showForgotBarcodeModal, setShowForgotBarcodeModal } = props;
     const [isProcessing, setIsProcessing] = React.useState(false);
     const language = 'en';
     const [isLoading, setIsLoading] = React.useState(false);

     let libraryUrl = library.baseUrl ?? LIBRARY.url;

     const [phoneNumber, setPhoneNumber] = React.useState('');
     const [showResults, setShowResults] = React.useState(false);
     const [results, setResults] = React.useState('');
     const [hasError, setHasError] = React.useState(false);

     const [buttonLabel, setButtonLabel] = React.useState('Forgot Barcode?');
     const [modalTitle, setModalTitle] = React.useState('Forgot Barcode');
     const [fieldLabel, setFieldLabel] = React.useState('Phone Number');
     const [modalBody, setModalBody] = React.useState('');
     const [modalButtonLabel, setModalButtonLabel] = React.useState('Send My Barcode');

     React.useEffect(() => {
          setIsLoading(true);

          async function fetchTranslations() {
               setButtonLabel(await getTranslationWithValuesText('forgot_barcode_link', usernameLabel, language, libraryUrl, true));
               setModalTitle(await getTranslationWithValuesText('forgot_barcode_title', usernameLabel, language, libraryUrl, true));
               await getTranslation('Phone Number', language, libraryUrl).then((result) => {
                    let term = _.toString(result);
                    if (!term.includes('%')) {
                         setModalButtonLabel(term);
                    }
               });
               setModalButtonLabel(await getTranslationWithValuesText('send_my_barcode', usernameLabel, language, libraryUrl, true));
               setModalBody(await getTranslationWithValuesText('forgot_barcode_body', usernameLabel, language, libraryUrl, true));
               setIsLoading(false);
          }

          fetchTranslations();
     }, [language, libraryUrl]);

     const closeWindow = () => {
          setShowForgotBarcodeModal(false);
          setIsProcessing(false);
          setShowResults(false);
          setResults('');
     };

     const initiateForgotBarcode = async () => {
          setIsProcessing(true);
          await forgotBarcode(phoneNumber, libraryUrl).then((response) => {
               if(response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage("Error initiating forgot barcode");
                    logDebugMessage(response);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
                    setHasError(true);
               }
          });
          setIsProcessing(false);
     };

     const resetWindow = () => {
          setShowResults(false);
          setResults('');
          setHasError(false);
     };

     if (isLoading) {
          return null;
     }

     const ResultsMessage = showResults && !results.success ? (
          <Text>{stripHTML(results.message || getTermFromDictionary('en', 'forgot_barcode_error_message'))}</Text>
     ) : hasError ? (
          <Text>{results}</Text>
     ) : showResults ? (
          <Text>{stripHTML(results.message || getTermFromDictionary('en', 'forgot_barcode_success_message'))}</Text>
     ) : (
          <>
               <Text>{modalBody}</Text>
               <FormControl>
                    <FormControlLabel>
                         <FormControlLabelText size="sm">{fieldLabel}</FormControlLabelText>
                    </FormControlLabel>
                    <Input style={{ borderColor }}>
                         <InputField id="phoneNumber" size="xl" returnKeyType="done" enterKeyHint="done" onChangeText={(text) => setPhoneNumber(text)} onSubmitEditing={() => initiateForgotBarcode()} textContentType="telephoneNumber"/>
                    </Input>
               </FormControl>
          </>
     );

     const FooterButtons = (showResults && !results.success) || hasError ? (
          <Button colorScheme="primary" onPress={resetWindow}>
               <ButtonText>{getTermFromDictionary('en', 'try_again')}</ButtonText>
          </Button>
     ) : showResults ? (
          <Button variant="link" onPress={closeWindow}>
               <ButtonText style={{ color: textColor }}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
          </Button>
     ) : (
          <>
               <Button variant="link" className="mr-4" onPress={closeWindow}>
                    <ButtonText style={{ color: textColor }}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
               </Button>
               <Button
                    isLoading={isProcessing}
                    isLoadingText={getTermFromDictionary('en', 'button_processing', true)}
                    colorScheme="primary"
                    onPress={initiateForgotBarcode}>
                    <ButtonText>{modalButtonLabel}</ButtonText>
               </Button>
          </>
     );

     return (
          <Center>
               <Button colorScheme="primary" variant="link" onPress={() => setShowForgotBarcodeModal(true)}>
                   <ButtonText>{buttonLabel}</ButtonText>
               </Button>
               <Modal isOpen={showForgotBarcodeModal} size="lg" onClose={() => setShowForgotBarcodeModal(false)} style={Platform.OS === 'android' && isKeyboardOpen ? { paddingBottom: '50%' } : undefined}>
                    <ModalBackdrop />
                    <ModalContent>
                         <ModalHeader>
                              <Heading>{modalTitle}</Heading>
                              <ModalCloseButton onPress={() => { setShowForgotBarcodeModal(false); }}>
                                  <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              {ResultsMessage}
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="lg">
                                   {FooterButtons}
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </Center>
     );
};
