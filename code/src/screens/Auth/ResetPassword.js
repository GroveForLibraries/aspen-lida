
import {
     Button,
     ButtonText,
     ButtonGroup,
     Center,
     FormControl,
     FormControlLabel,
     Input,
     InputField,
     Modal,
     ModalContent,
     ModalBody,
     ModalHeader,
     Heading,
     ModalCloseButton,
     ModalFooter,
     Text,
     ModalBackdrop, Icon, CloseIcon,
     FormControlLabelText
} from '@gluestack-ui/themed';
import React from 'react';
import { loadingSpinner } from '../../components/loadingSpinner';

import { useLibrary } from '../../hooks/useLibrarySystemData';
import { getTermFromDictionary, getTranslationWithValuesText } from '../../translations/TranslationService';
import { normalizeDisplayText, isEmpty, lowerCase } from '../../helpers/helpers';
import { LIBRARY } from '../../util/globals';
import { logDebugMessage, getErrorMessage } from '../../util/logging';
import { resetPassword } from '../../util/api/user';
import { useTheme } from '../../themes/theme';

export const ResetPassword = (props) => {
     const library = useLibrary();
     const { theme, textColor, colorMode } = useTheme();
     const { ils, forgotPasswordType, usernameLabel, passwordLabel, showForgotPasswordModal, setShowForgotPasswordModal } = props;
     const [isProcessing, setIsProcessing] = React.useState(false);
     const [isLoading, setIsLoading] = React.useState(false);

     const language = 'en';
     let libraryUrl = library.baseUrl ?? LIBRARY.url;

     const [buttonLabel, setButtonLabel] = React.useState('Forgot PIN?');
     const [modalTitle, setModalTitle] = React.useState('Forgot PIN');
     const [modalButtonLabel, setModalButtonLabel] = React.useState('Reset My PIN');
     const [resetBody, setResetBody] = React.useState('To reset your PIN, enter your card number or your email address.  You must have an email associated with your account to reset your PIN.  If you do not, please contact the library.');

     React.useEffect(() => {
          setIsLoading(true);

          async function fetchTranslations() {
               setButtonLabel(await getTranslationWithValuesText('forgot_password_link', passwordLabel, language, libraryUrl, true));
               setModalTitle(await getTranslationWithValuesText('forgot_password_title', passwordLabel, language, libraryUrl, true));
               setModalButtonLabel(await getTranslationWithValuesText('reset_my_password', passwordLabel, language, libraryUrl, true));

               if (ils === 'koha') {
                    setResetBody(await getTranslationWithValuesText('koha_password_reset_body', [lowerCase(passwordLabel), lowerCase(usernameLabel)], language, libraryUrl, true));
               } else if (ils === 'sirsi' || ils === 'horizon') {
                    setResetBody(await getTranslationWithValuesText('sirsi_password_reset_body', lowerCase(passwordLabel), language, libraryUrl, true));
               } else if (ils === 'evergreen') {
                    setResetBody(await getTranslationWithValuesText('evergreen_password_reset_body', lowerCase(passwordLabel), language, libraryUrl, true));
               } else if (ils === 'millennium') {
                    setResetBody(await getTranslationWithValuesText('millennium_password_reset_body', [lowerCase(usernameLabel), lowerCase(passwordLabel)], language, libraryUrl, true));
                    setModalButtonLabel(await getTranslationWithValuesText('request_pin_reset', passwordLabel, language, libraryUrl, true));
               } else if (ils === 'symphony') {
                    setResetBody(await getTranslationWithValuesText('symphony_password_reset_body', lowerCase(usernameLabel), language, libraryUrl, true));
               } else {
                    setResetBody(await getTranslationWithValuesText('aspen_password_reset_body', [lowerCase(passwordLabel), lowerCase(usernameLabel)], language, libraryUrl, true));
               }
               setIsLoading(false);
          }

          fetchTranslations();
     }, [language, libraryUrl]);

     const closeWindow = () => {
          setShowForgotPasswordModal(false);
          setIsProcessing(false);
     };

     if (isLoading) {
          return null;
     }

     const KohaResetPasswordComponent = ils === 'koha' && forgotPasswordType === 'emailResetLink' ? (
          <KohaResetPassword libraryUrl={libraryUrl} usernameLabel={usernameLabel} passwordLabel={passwordLabel} modalButtonLabel={modalButtonLabel} resetBody={resetBody} setShowForgotPasswordModal={setShowForgotPasswordModal} isProcessing={isProcessing} setIsProcessing={setIsProcessing} theme={theme} colorMode={colorMode} textColor={textColor}/>
     ) : null;
     const SirsiResetPasswordComponent = ils === 'sirsi' && forgotPasswordType === 'emailResetLink' ? (
          <SirsiResetPassword libraryUrl={libraryUrl} usernameLabel={usernameLabel} passwordLabel={passwordLabel} modalButtonLabel={modalButtonLabel} resetBody={resetBody} setShowForgotPasswordModal={setShowForgotPasswordModal} isProcessing={isProcessing} setIsProcessing={setIsProcessing} theme={theme} colorMode={colorMode} textColor={textColor} />
     ) : null;
     const HorizonResetPasswordComponent = ils === 'horizon' && forgotPasswordType === 'emailResetLink' ? (
          <SirsiResetPassword libraryUrl={libraryUrl} sernameLabel={usernameLabel} passwordLabel={passwordLabel} modalButtonLabel={modalButtonLabel} resetBody={resetBody} setShowForgotPasswordModal={setShowForgotPasswordModal} isProcessing={isProcessing} setIsProcessing={setIsProcessing} theme={theme} colorMode={colorMode} textColor={textColor} />
     ) : null;
     const EvergreenResetPasswordComponent = ils === 'evergreen' && forgotPasswordType === 'emailResetLink' ? (
          <EvergreenResetPassword libraryUrl={libraryUrl} usernameLabel={usernameLabel} passwordLabel={passwordLabel} modalButtonLabel={modalButtonLabel} resetBody={resetBody} setShowForgotPasswordModal={setShowForgotPasswordModal} isProcessing={isProcessing} setIsProcessing={setIsProcessing} theme={theme} colorMode={colorMode} textColor={textColor} />
     ) : null;
     const MillenniumResetPasswordComponent = ils === 'millennium' && forgotPasswordType === 'emailResetLink' ? (
          <MillenniumResetPassword libraryUrl={libraryUrl} usernameLabel={usernameLabel} passwordLabel={passwordLabel} modalButtonLabel={modalButtonLabel} resetBody={resetBody} setShowForgotPasswordModal={setShowForgotPasswordModal} isProcessing={isProcessing} setIsProcessing={setIsProcessing} theme={theme} colorMode={colorMode} textColor={textColor} />
     ) : null;
     const SymphonyResetPasswordComponent = ils === 'symphony' && forgotPasswordType === 'emailResetLink' ? (
          <SymphonyResetPassword libraryUrl={libraryUrl} usernameLabel={usernameLabel} passwordLabel={passwordLabel} modalButtonLabel={modalButtonLabel} resetBody={resetBody} setShowForgotPasswordModal={setShowForgotPasswordModal} isProcessing={isProcessing} setIsProcessing={setIsProcessing} theme={theme} colorMode={colorMode} textColor={textColor} />
     ) : null;
     const AspenResetPasswordComponent = forgotPasswordType === 'emailAspenResetLink' ? (
          <AspenResetPassword libraryUrl={libraryUrl} usernameLabel={usernameLabel} passwordLabel={passwordLabel} modalButtonLabel={modalButtonLabel} resetBody={resetBody} setShowForgotPasswordModal={setShowForgotPasswordModal} isProcessing={isProcessing} setIsProcessing={setIsProcessing} theme={theme} colorMode={colorMode} textColor={textColor} />
     ) : null;

     return (
          <Center>
               <Button variant="link" onPress={() => setShowForgotPasswordModal(true)}>
                    <ButtonText style={ buttonLabel.length > 80 ? {fontSize: "$sm"} : undefined} color={theme.tokens.colors.primary['500']}>{buttonLabel}</ButtonText>
               </Button>
               <Modal isOpen={showForgotPasswordModal} size="lg" avoidKeyboard={true} onClose={() => setShowForgotPasswordModal(false)}>
                    <ModalBackdrop />
                    <ModalContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}>
                         <ModalHeader>
                              <Heading size="md" color={textColor}>{modalTitle}</Heading>
                              <ModalCloseButton p="$3" onPress={() => { setShowForgotPasswordModal(false); }}>
                                   <Icon as={CloseIcon} color={textColor} />
                              </ModalCloseButton>
                         </ModalHeader>

                         {isLoading ? (
                              <ModalBody>{loadingSpinner()}</ModalBody>
                         ) : KohaResetPasswordComponent || SirsiResetPasswordComponent || HorizonResetPasswordComponent || EvergreenResetPasswordComponent || MillenniumResetPasswordComponent || SymphonyResetPasswordComponent || AspenResetPasswordComponent}
                    </ModalContent>
               </Modal>
          </Center>
     );
};

const AspenResetPassword = (props) => {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, theme, colorMode } = props;
     const [username, setUsername] = React.useState('');

     const [showResults, setShowResults] = React.useState(false);
     const [results, setResults] = React.useState('');
     const [hasError, setHasError] = React.useState(false);

     const closeWindow = () => {
          setShowForgotPasswordModal(false);
          setIsProcessing(false);
          setShowResults(false);
          setResults('');
          setHasError(false);
     };
     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, '', false, 'aspen', libraryUrl).then((response) => {
               if(response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage("Error initiating reset password");
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const resetWindow = () => {
          setShowResults(false);
          setResults('');
          setHasError(false);
     };

     if (results && showResults && !hasError) {
          if (isEmpty(results.success) && results.error) {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{normalizeDisplayText(results.error)}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                                   <Button onPress={resetWindow} bgColor={theme.tokens.colors.primary['500']}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary('en', 'try_again')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          } else if (!isEmpty(results.message)) {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{normalizeDisplayText(results.message)}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          } else {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{getTermFromDictionary('en', 'password_reset_success_body_1')}</Text>
                              <Text color={textColor}>{getTermFromDictionary('en', 'password_reset_success_body_2')}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          }
     }

     if(showResults && hasError) {
          return (
               <>
                    <ModalBody>
                         <Text color={textColor}>{normalizeDisplayText(results)}</Text>
                    </ModalBody>
                    <ModalFooter>
                         <ButtonGroup space="$2">
                              <Button variant="link" onPress={closeWindow}>
                                   <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                              </Button>
                         </ButtonGroup>
                    </ModalFooter>
               </>
          );
     }

     return (
          <>
               <ModalBody>
                    <Text color={textColor}>{resetBody}</Text>
                    <FormControl>
                         <FormControlLabel>
                              <FormControlLabelText fontSize="$sm" color={textColor}>{usernameLabel}</FormControlLabelText>
                         </FormControlLabel>
                    </FormControl>
                    <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                         <InputField id="username" variant="filled" autoCorrect={false} autoCapitalize="none" size="$xl" returnKeyType="done" enterKeyHint="done" onChangeText={(text) => setUsername(text)} onSubmitEditing={() => initiateResetPassword()} textContentType="username" color={textColor} />
                    </Input>
               </ModalBody>
               <ModalFooter>
                    <ButtonGroup space="$2">
                         <Button variant="link" onPress={closeWindow}>
                              <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                         </Button>
                         <Button isLoading={isProcessing} isLoadingText={getTermFromDictionary('en', 'button_processing', true)} bgColor={theme.tokens.colors.primary['500']} onPress={initiateResetPassword}>
                              <ButtonText color={theme.tokens.colors.primary['500-text']}>{modalButtonLabel}</ButtonText>
                         </Button>
                    </ButtonGroup>
               </ModalFooter>
          </>
     );
};

const KohaResetPassword = (props) => {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, theme, colorMode } = props;
     const [email, setEmail] = React.useState('');
     const [username, setUsername] = React.useState('');
     const [resend, setResend] = React.useState(false);

     const fieldRef = React.useRef();

     const [showResults, setShowResults] = React.useState(false);
     const [results, setResults] = React.useState('');
     const [hasError, setHasError] = React.useState(false);

     const closeWindow = () => {
          setShowForgotPasswordModal(false);
          setIsProcessing(false);
          setShowResults(false);
          setResults('');
          setHasError(false);
     };
     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, email, resend, 'koha', libraryUrl).then((response) => {
               if(response.ok) {
                    console.log(response.data.result);
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage("Error initiating reset password");
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const resetWindow = () => {
          setShowResults(false);
          setResults('');
          setHasError(false);
     };

     if (results && showResults && !hasError) {
          if (isEmpty(results.success) && results.error) {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{normalizeDisplayText(results.error)}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                                   <Button bgColor={theme.tokens.colors.primary['500']} onPress={resetWindow}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary('en', 'try_again')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          } else if (!isEmpty(results.message)) {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{normalizeDisplayText(results.message)}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          } else {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{getTermFromDictionary('en', 'password_reset_success_body_1')}</Text>
                              <Text color={textColor}>{getTermFromDictionary('en', 'password_reset_success_body_2')}</Text>
                              <Center>
                                   <Button
                                        bgColor={theme.tokens.colors.primary['500']}
                                        size="sm"
                                        onPress={() => {
                                             setResend(true);
                                             initiateResetPassword();
                                        }}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary('en', 'resend_email')}</ButtonText>
                                   </Button>
                              </Center>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          }
     }

     if(showResults && hasError) {
          return (
               <>
                    <ModalBody>
                         <Text color={textColor}>{normalizeDisplayText(results)}</Text>
                    </ModalBody>
                    <ModalFooter>
                         <ButtonGroup space="$2">
                              <Button variant="link" onPress={closeWindow}>
                                   <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                              </Button>
                         </ButtonGroup>
                    </ModalFooter>
               </>
          );
     }

     return (
          <>
               <ModalBody>
                    <Text mb="$2" color={textColor}>{resetBody}</Text>
                    <FormControl mb="$2">
                         <FormControlLabel>
                              <FormControlLabelText fontSize="$sm" color={textColor}>{usernameLabel}</FormControlLabelText>
                         </FormControlLabel>
                         <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField id="username" variant="filled" autoCorrect={false} autoCapitalize="none" size="$xl" returnKeyType="next" enterKeyHint="next" onChangeText={(text) => setUsername(text)} onSubmitEditing={() => fieldRef.current.focus()} blurOnSubmit={false} textContentType="username" color={textColor}/></Input>
                    </FormControl>
                    <FormControl mb="$2">
                         <FormControlLabel>
                              <FormControlLabelText fontSize="$sm" color={textColor}>{getTermFromDictionary('en', 'patron_email')}</FormControlLabelText>
                         </FormControlLabel>
                         <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField id="email" variant="filled" autoCorrect={false} autoCapitalize="none" size="$xl" enterKeyHint="done" returnKeyType="done" onChangeText={(text) => setEmail(text)} textContentType="emailAddress" ref={fieldRef} onSubmitEditing={() => initiateResetPassword()} color={textColor} /></Input>
                    </FormControl>
               </ModalBody>
               <ModalFooter>
                    <ButtonGroup space="$2">
                         <Button variant="link" onPress={closeWindow}>
                              <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                         </Button>
                         <Button isLoading={isProcessing} isLoadingText={getTermFromDictionary('en', 'button_processing', true)} bgColor={theme.tokens.colors.primary['500']} onPress={initiateResetPassword}>
                              <ButtonText color={theme.tokens.colors.primary['500-text']}>{modalButtonLabel}</ButtonText>
                         </Button>
                    </ButtonGroup>
               </ModalFooter>
          </>
     );
};

const SirsiResetPassword = (props) => {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, theme, colorMode } = props;
     const [username, setUsername] = React.useState('');

     const [showResults, setShowResults] = React.useState(false);
     const [results, setResults] = React.useState('');
     const [hasError, setHasError] = React.useState(false);

     const closeWindow = () => {
          setShowForgotPasswordModal(false);
          setIsProcessing(false);
          setShowResults(false);
          setResults('');
          setHasError(false);
     };
     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, '', false, 'sirsi', libraryUrl).then((response) => {
               if(response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage("Error initiating reset password");
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const resetWindow = () => {
          setShowResults(false);
          setResults('');
          setHasError(false);
     };

     if (results && showResults && !hasError) {
          if (isEmpty(results.success) && results.error) {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{normalizeDisplayText(results.error)}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                                   <Button bgColor={theme.tokens.colors.primary['500']} onPress={resetWindow}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary('en', 'try_again')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          } else if (!isEmpty(results.message)) {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{normalizeDisplayText(results.message)}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          } else {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{getTermFromDictionary('en', 'password_reset_success_body_1')}</Text>
                              <Text color={textColor}>{getTermFromDictionary('en', 'password_reset_success_body_2')}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          }
     }

     if(showResults && hasError) {
          return (
               <>
                    <ModalBody>
                         <Text color={textColor}>{normalizeDisplayText(results)}</Text>
                    </ModalBody>
                    <ModalFooter>
                         <ButtonGroup space="$2">
                              <Button variant="link" onPress={closeWindow}>
                                   <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                              </Button>
                         </ButtonGroup>
                    </ModalFooter>
               </>
          );
     }

     return (
          <>
               <ModalBody>
                    <Text color={textColor}>{resetBody}</Text>
                    <FormControl>
                         <FormControlLabel>
                              <FormControlLabelText color={textColor}>{usernameLabel}</FormControlLabelText>
                         </FormControlLabel>
                         <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField id="username" variant="filled" autoCorrect={false} autoCapitalize="none" size="$xl" returnKeyType="done" enterKeyHint="done" onChangeText={(text) => setUsername(text)} onSubmitEditing={() => initiateResetPassword()} textContentType="username" color={textColor} /></Input>
                    </FormControl>
               </ModalBody>
               <ModalFooter>
                    <ButtonGroup space="$2">
                         <Button variant="link" onPress={closeWindow}>
                              <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                         </Button>
                         <Button isLoading={isProcessing} isLoadingText={getTermFromDictionary('en', 'button_processing', true)} bgColor={theme.tokens.colors.primary['500']} onPress={initiateResetPassword}>
                              <ButtonText color={theme.tokens.colors.primary['500-text']}>{modalButtonLabel}</ButtonText>
                         </Button>
                    </ButtonGroup>
               </ModalFooter>
          </>
     );
};

const EvergreenResetPassword = (props) => {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, theme, colorMode } = props;
     const [email, setEmail] = React.useState('');
     const [username, setUsername] = React.useState('');
     const [resend, setResend] = React.useState(false);

     const fieldRef = React.useRef();

     const [showResults, setShowResults] = React.useState(false);
     const [results, setResults] = React.useState('');
     const [hasError, setHasError] = React.useState(false);

     const closeWindow = () => {
          setShowForgotPasswordModal(false);
          setIsProcessing(false);
          setShowResults(false);
          setResults('');
          setHasError(false);
     };
     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, email, resend, 'evergreen', libraryUrl).then((response) => {
               if(response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage("Error initiating reset password");
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const resetWindow = () => {
          setShowResults(false);
          setResults('');
          setHasError(false);
     };

     if (results && showResults && !hasError) {
          if (isEmpty(results.success) && results.error) {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{normalizeDisplayText(results.error)}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                                   <Button bgColor={theme.tokens.colors.primary['500']} onPress={resetWindow}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary('en', 'try_again')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          } else if (!isEmpty(results.message)) {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{normalizeDisplayText(results.message)}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          } else {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{getTermFromDictionary('en', 'password_reset_success_body_1')}</Text>
                              <Text color={textColor}>{getTermFromDictionary('en', 'password_reset_success_body_2')}</Text>
                              <Center>
                                   <Button
                                        bgColor={theme.tokens.colors.primary['500']}
                                        size="sm"
                                        onPress={() => {
                                             setResend(true);
                                             initiateResetPassword();
                                        }}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary('en', 'resend_email')}</ButtonText>
                                   </Button>
                              </Center>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          }
     }

     if(showResults && hasError) {
          return (
               <>
                    <ModalBody>
                         <Text color={textColor}>{normalizeDisplayText(results)}</Text>
                    </ModalBody>
                    <ModalFooter>
                         <ButtonGroup space="$2">
                              <Button variant="link" onPress={closeWindow}>
                                   <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                              </Button>
                         </ButtonGroup>
                    </ModalFooter>
               </>
          );
     }

     return (
          <>
               <ModalBody>
                    <Text color={textColor}>{resetBody}</Text>
                    <FormControl>
                         <FormControlLabel>
                              <FormControlLabelText fontSize="$sm" color={textColor}>{usernameLabel}</FormControlLabelText>
                         </FormControlLabel>
                         <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField id="username" variant="filled" autoCorrect={false} autoCapitalize="none" size="$xl" returnKeyType="next" enterKeyHint="next" onChangeText={(text) => setUsername(text)} onSubmitEditing={() => fieldRef.current.focus()} blurOnSubmit={false} textContentType="username" color={textColor}/></Input>
                    </FormControl>
                    <FormControl>
                         <FormControlLabel>
                              <FormControlLabelText fontSize="$sm" color={textColor}>{getTermFromDictionary('en', 'patron_email')}</FormControlLabelText>
                         </FormControlLabel>
                         <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField  id="email" variant="filled" autoCorrect={false} autoCapitalize="none" size="$xl" enterKeyHint="done" returnKeyType="done" onChangeText={(text) => setEmail(text)} textContentType="emailAddress" ref={fieldRef} onSubmitEditing={() => initiateResetPassword()} color={textColor}/></Input>
                    </FormControl>
               </ModalBody>
               <ModalFooter>
                    <ButtonGroup space="$2">
                         <Button variant="link" onPress={closeWindow}>
                              <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                         </Button>
                         <Button isLoading={isProcessing} isLoadingText={getTermFromDictionary('en', 'button_processing', true)} bgColor={theme.tokens.colors.primary['500']} onPress={initiateResetPassword}>
                              <ButtonText color={theme.tokens.colors.primary['500-text']}>{modalButtonLabel}</ButtonText>
                         </Button>
                    </ButtonGroup>
               </ModalFooter>
          </>
     );
};

const SymphonyResetPassword = (props) => {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, theme, colorMode } = props;
     const [username, setUsername] = React.useState('');

     const [showResults, setShowResults] = React.useState(false);
     const [results, setResults] = React.useState('');
     const [hasError, setHasError] = React.useState(false);

     const closeWindow = () => {
          setShowForgotPasswordModal(false);
          setIsProcessing(false);
          setShowResults(false);
          setResults('');
          setHasError(false);
     };
     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, '', false, 'symphony', libraryUrl).then((response) => {
               if(response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage("Error initiating reset password");
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const resetWindow = () => {
          setShowResults(false);
          setResults('');
          setHasError(false);
     };

     if (results && showResults && !hasError) {
          if (isEmpty(results.success) && results.error) {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{normalizeDisplayText(results.error)}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                                   <Button bgColor={theme.tokens.colors.primary['500']} onPress={resetWindow}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary('en', 'try_again')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          } else if (!isEmpty(results.message)) {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{normalizeDisplayText(results.message)}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          } else {
               return (
                    <>
                         <ModalBody>
                              <Text color={textColor}>{getTermFromDictionary('en', 'password_reset_success_body_1')}</Text>
                              <Text color={textColor}>{getTermFromDictionary('en', 'password_reset_success_body_2')}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="$2">
                                   <Button variant="link" onPress={closeWindow}>
                                        <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </>
               );
          }
     }

     if(showResults && hasError) {
          return (
               <>
                    <ModalBody>
                         <Text color={textColor}>{normalizeDisplayText(results)}</Text>
                    </ModalBody>
                    <ModalFooter>
                         <ButtonGroup space="$2">
                              <Button variant="link" onPress={closeWindow}>
                                   <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                              </Button>
                         </ButtonGroup>
                    </ModalFooter>
               </>
          );
     }

     return (
          <>
               <ModalBody>
                    <Text color={textColor}>{resetBody}</Text>
                    <FormControl>
                         <FormControlLabel>
                              <FormControlLabelText fontSize="$sm" color={textColor}>{usernameLabel}</FormControlLabelText>
                         </FormControlLabel>
                         <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField id="username" variant="filled" autoCorrect={false} autoCapitalize="none" size="$xl" returnKeyType="done" enterKeyHint="done" onChangeText={(text) => setUsername(text)} onSubmitEditing={() => initiateResetPassword()} textContentType="username" color={textColor} /></Input>
                    </FormControl>
               </ModalBody>
               <ModalFooter>
                    <ButtonGroup space="$2">
                         <Button variant="link" onPress={closeWindow}>
                              <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                         </Button>
                         <Button isLoading={isProcessing} isLoadingText={getTermFromDictionary('en', 'button_processing', true)} bgColor={theme.tokens.colors.primary['500']} onPress={initiateResetPassword}>
                              <ButtonText color={theme.tokens.colors.primary['500-text']}>{modalButtonLabel}</ButtonText>
                         </Button>
                    </ButtonGroup>
               </ModalFooter>
          </>
     );
};

const MillenniumResetPassword = (props) => {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, theme, colorMode } = props;
     const [username, setUsername] = React.useState('');

     const [showResults, setShowResults] = React.useState(false);
     const [results, setResults] = React.useState('');
     const [hasError, setHasError] = React.useState(false);

     const closeWindow = () => {
          setShowForgotPasswordModal(false);
          setIsProcessing(false);
          setShowResults(false);
          setResults('');
          setHasError(false);
     };
     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, '', false, 'millennium', libraryUrl).then((response) => {
               if(response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage("Error initiating reset password");
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const resetWindow = () => {
          setShowResults(false);
          setResults('');
          setHasError(false);
     };

     if (results && showResults && !hasError) {
          return (
               <>
                    <ModalBody>
                         <Text color={textColor}>{normalizeDisplayText(results.message)}</Text>
                    </ModalBody>
                    <ModalFooter>
                         <ButtonGroup space="$2">
                              <Button variant="link" onPress={closeWindow}>
                                   <ButtonText color={textColor}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                              </Button>
                              {!isEmpty(results.error) ? (
                                   <Button bgColor={theme.tokens.colors.primary['500']} onPress={resetWindow}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary('en', 'try_again')}</ButtonText>
                                   </Button>
                              ) : null}
                         </ButtonGroup>
                    </ModalFooter>
               </>
          );
     }

     if(showResults && hasError) {
          return (
               <>
                    <ModalBody>
                         <Text color={textColor}>{normalizeDisplayText(results)}</Text>
                    </ModalBody>
                    <ModalFooter>
                         <ButtonGroup space="$2">
                              <Button variant="link" onPress={closeWindow}>
                                   <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                              </Button>
                         </ButtonGroup>
                    </ModalFooter>
               </>
          );
     }

     return (
          <>
               <ModalBody>
                    <Text color={textColor}>{resetBody}</Text>
                    <FormControl>
                         <FormControlLabel>
                              <FormControlLabelText fontSize="$sm" color={textColor}>{usernameLabel}</FormControlLabelText>
                         </FormControlLabel>
                         <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}><InputField id="username" variant="filled" autoCorrect={false} autoCapitalize="none" size="$xl" returnKeyType="done" enterKeyHint="done" onChangeText={(text) => setUsername(text)} onSubmitEditing={() => initiateResetPassword()} textContentType="username"color={textColor}/></Input>
                    </FormControl>
               </ModalBody>
               <ModalFooter>
                    <ButtonGroup space="$2">
                         <Button variant="link" onPress={closeWindow}>
                              <ButtonText color={textColor}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                         </Button>
                         <Button isLoading={isProcessing} isLoadingText={getTermFromDictionary('en', 'button_processing', true)} bgColor={theme.tokens.colors.primary['500']} onPress={initiateResetPassword}>
                              <ButtonText color={theme.tokens.colors.primary['500-text']}>{modalButtonLabel}</ButtonText>
                         </Button>
                    </ButtonGroup>
               </ModalFooter>
          </>
     );
};
