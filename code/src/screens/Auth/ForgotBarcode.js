
import {
     Button,
     ButtonGroup,
     ButtonText,
     Center,
     FormControl,
     FormControlLabel,
     FormControlLabelText,
     Heading,
     Input,
     InputField,
     Modal,
     ModalBackdrop,
     ModalContent,
     ModalHeader,
     ModalBody,
     ModalFooter,
     Text,
     Icon, CloseIcon, ModalCloseButton } from '@gluestack-ui/themed';
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

export const ForgotBarcode = (props) => {
     const isKeyboardOpen = useKeyboard();
     const { theme, textColor, colorMode }= useTheme();
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
                    let term = String(result ?? '');
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
          <Text color={textColor}>{stripHTML(results.message || getTermFromDictionary('en', 'forgot_barcode_error_message'))}</Text>
     ) : hasError ? (
          <Text color={textColor}>{results}</Text>
     ) : showResults ? (
          <Text color={textColor}>{stripHTML(results.message || getTermFromDictionary('en', 'forgot_barcode_success_message'))}</Text>
     ) : (
          <>
               <Text color={textColor}>{modalBody}</Text>
               <FormControl>
                    <FormControlLabel>
                         <FormControlLabelText fontSize="$sm" color={textColor}>{fieldLabel}</FormControlLabelText>
                    </FormControlLabel>
                    <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField id="phoneNumber" variant="filled" size="$xl" returnKeyType="done" enterKeyHint="done" onChangeText={(text) => setPhoneNumber(text)} onSubmitEditing={() => initiateForgotBarcode()} color={textColor} textContentType="telephoneNumber"/></Input>
               </FormControl>
          </>
     );

     const FooterButtons = (showResults && !results.success) || hasError ? (
          <Button bgColor={theme.tokens.colors.primary['500']} onPress={resetWindow}>
               <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary('en', 'try_again')}</ButtonText>
          </Button>
     ) : showResults ? (
          <Button variant="link" onPress={closeWindow}>
               <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
          </Button>
     ) : (
          <>
               <Button variant="link" mr="$4" onPress={closeWindow}>
                    <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
               </Button>
               <Button
                    isLoading={isProcessing}
                    isLoadingText={getTermFromDictionary('en', 'button_processing', true)}
                    bgColor={theme.tokens.colors.primary['500']}
                    onPress={initiateForgotBarcode}>
                    <ButtonText color={theme.tokens.colors.primary['500-text']}>{modalButtonLabel}</ButtonText>
               </Button>
          </>
     );

     return (
          <Center>
               <Button variant="link" onPress={() => setShowForgotBarcodeModal(true)}>
                    <ButtonText color={theme.tokens.colors.primary['500']}>{buttonLabel}</ButtonText>
               </Button>
               <Modal isOpen={showForgotBarcodeModal} size="lg" avoidKeyboard onClose={() => setShowForgotBarcodeModal(false)} pb={Platform.OS === 'android' && isKeyboardOpen ? '50%' : '0'}>
                    <ModalBackdrop />
                    <ModalContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}>
                         <ModalHeader>
                              <Heading size="md" color={textColor}>{modalTitle}</Heading>
                              <ModalCloseButton p="$3" onPress={() => { setShowForgotBarcodeModal(false); }}>
                                   <Icon as={CloseIcon} color={textColor} />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              {ResultsMessage}
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$4">
                                   {FooterButtons}
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </Center>
     );
};
