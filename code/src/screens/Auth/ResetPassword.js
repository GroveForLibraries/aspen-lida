import _ from 'lodash';
import React from 'react';
import { loadingSpinner } from '../../components/loadingSpinner';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { getTermFromDictionary, getTranslationWithValuesText } from '../../translations/TranslationService';
import { normalizeDisplayText } from '../../helpers/helpers';
import { LIBRARY } from '../../util/globals';
import { logDebugMessage, getErrorMessage } from '../../util/logging';
import { resetPassword } from '../../util/api/user';
import { useTheme, TOKENS } from '../../themes/theme';
import { ThemedCloseIcon as CloseIcon, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField } from '../../components/themed/ThemedFormControls';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * ResetPassword component that displays a modal for resetting the user's password or PIN, depending on the ILS and configuration.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const ResetPassword = (props) => {
     const library = useLibrary();
     const { neutralPairs, brand, textColor, colorMode } = useTheme();
     const surfaceBg = colorMode === 'light' ? (neutralPairs?.surface?.light ?? TOKENS.semanticTokens.light.surface) : (neutralPairs?.surface?.dark ?? TOKENS.semanticTokens.dark.surface);
     const borderColor = colorMode === 'light' ? (neutralPairs?.border?.light ?? TOKENS.semanticTokens.light.border) : (neutralPairs?.border?.dark ?? TOKENS.semanticTokens.dark.border);
     const { ils, forgotPasswordType, usernameLabel, passwordLabel, showForgotPasswordModal, setShowForgotPasswordModal } = props;
     const [isProcessing, setIsProcessing] = React.useState(false);
     const [isLoading, setIsLoading] = React.useState(false);

     const language = 'en';
     const libraryUrl = library.baseUrl ?? LIBRARY.url;

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
                    setResetBody(await getTranslationWithValuesText('koha_password_reset_body', [_.lowerCase(passwordLabel), _.lowerCase(usernameLabel)], language, libraryUrl, true));
               } else if (ils === 'sirsi' || ils === 'horizon') {
                    setResetBody(await getTranslationWithValuesText('sirsi_password_reset_body', _.lowerCase(passwordLabel), language, libraryUrl, true));
               } else if (ils === 'evergreen') {
                    setResetBody(await getTranslationWithValuesText('evergreen_password_reset_body', _.lowerCase(passwordLabel), language, libraryUrl, true));
               } else if (ils === 'millennium') {
                    setResetBody(await getTranslationWithValuesText('millennium_password_reset_body', [_.lowerCase(usernameLabel), _.lowerCase(passwordLabel)], language, libraryUrl, true));
                    setModalButtonLabel(await getTranslationWithValuesText('request_pin_reset', passwordLabel, language, libraryUrl, true));
               } else if (ils === 'symphony') {
                    setResetBody(await getTranslationWithValuesText('symphony_password_reset_body', _.lowerCase(usernameLabel), language, libraryUrl, true));
               } else {
                    setResetBody(await getTranslationWithValuesText('aspen_password_reset_body', [_.lowerCase(passwordLabel), _.lowerCase(usernameLabel)], language, libraryUrl, true));
               }
               setIsLoading(false);
          }

          fetchTranslations();
     }, [ils, language, libraryUrl, passwordLabel, usernameLabel]);

     const sharedProps = {
          libraryUrl,
          usernameLabel,
          passwordLabel,
          modalButtonLabel,
          resetBody,
          setShowForgotPasswordModal,
          isProcessing,
          setIsProcessing,
          brand,
          textColor,
          borderColor,
          colorMode,
     };

     const resetPasswordComponent =
          (ils === 'koha' && forgotPasswordType === 'emailResetLink' && <KohaResetPassword {...sharedProps} />) ||
          (ils === 'sirsi' && forgotPasswordType === 'emailResetLink' && <SirsiResetPassword {...sharedProps} />) ||
          (ils === 'horizon' && forgotPasswordType === 'emailResetLink' && <HorizonResetPassword {...sharedProps} />) ||
          (ils === 'evergreen' && forgotPasswordType === 'emailResetLink' && <EvergreenResetPassword {...sharedProps} />) ||
          (ils === 'millennium' && forgotPasswordType === 'emailResetLink' && <MillenniumResetPassword {...sharedProps} />) ||
          (ils === 'symphony' && forgotPasswordType === 'emailResetLink' && <SymphonyResetPassword {...sharedProps} />) ||
          (forgotPasswordType === 'emailAspenResetLink' && <AspenResetPassword {...sharedProps} />) ||
          null;

     return (
          <Center>
               <Button colorScheme="primary" variant="link" onPress={() => setShowForgotPasswordModal(true)}>
                    <ButtonText size={buttonLabel.length > 80 ? 'sm' : undefined}>{buttonLabel}</ButtonText>
               </Button>
               <Modal isOpen={showForgotPasswordModal} size="lg" onClose={() => setShowForgotPasswordModal(false)}>
                    <ModalBackdrop />
                    <ModalContent style={{ backgroundColor: surfaceBg }}>
                         <ModalHeader>
                              <Heading>{modalTitle}</Heading>
                              <ModalCloseButton onPress={() => { setShowForgotPasswordModal(false); }}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>

                         {isLoading ? (
                              <ModalBody>{loadingSpinner()}</ModalBody>
                         ) : (
                              resetPasswordComponent
                         )}
                    </ModalContent>
               </Modal>
          </Center>
     );
};

/**
 * ResultFooter component that displays the footer of the reset password modal, including buttons for closing the modal and retrying the reset password process.
 * @param param0
 * @param param0.textColor
 * @param param0.onClose
 * @param param0.onRetry
 * @param param0.retryLabel
 * @param param0.showRetry
 * @param param0.primaryColor
 * @param param0.primaryTextColor
 * @param param0.okLabel
 * @returns {React.JSX.Element}
 * @constructor
 */
function ResultFooter({ textColor, onClose, onRetry, retryLabel = 'try_again', showRetry = false, primaryColor, primaryTextColor, okLabel = 'button_ok' }) {
     return (
          <ModalFooter>
               <ButtonGroup space="sm">
                    <Button variant="link" onPress={onClose}>
                         <ButtonText style={{ color: textColor }}>{getTermFromDictionary('en', okLabel)}</ButtonText>
                    </Button>
                    {showRetry ? (
                         <Button style={{ backgroundColor: primaryColor }} onPress={onRetry}>
                              <ButtonText style={{ color: primaryTextColor }}>{getTermFromDictionary('en', retryLabel)}</ButtonText>
                         </Button>
                    ) : null}
               </ButtonGroup>
          </ModalFooter>
     );
}

/**
 * ResetForm component that displays the form for resetting the user's password or PIN, including input fields for the username and email, and a submit button.
 * @param param0
 * @param param0.resetBody
 * @param param0.usernameLabel
 * @param param0.emailLabel
 * @param param0.username
 * @param param0.setUsername
 * @param param0.email
 * @param param0.setEmail
 * @param param0.onSubmit
 * @param param0.fieldRef
 * @param param0.textColor
 * @param param0.borderColor
 * @param param0.submitLabel
 * @param param0.isProcessing
 * @param param0.primaryColor
 * @param param0.primaryTextColor
 * @param param0.onClose
 * @returns {React.JSX.Element}
 * @constructor
 */
function ResetForm({ resetBody, usernameLabel, emailLabel, username, setUsername, email, setEmail, onSubmit, fieldRef, textColor, borderColor, submitLabel, isProcessing, primaryColor, primaryTextColor, onClose }) {
     return (
          <>
               <ModalBody>
                    <Text className="mb-2">{resetBody}</Text>
                    <FormControl style={{ marginBottom: emailLabel ? 8 : 0 }}>
                         <FormControlLabel>
                              <FormControlLabelText size="sm">
                                   {usernameLabel}
                              </FormControlLabelText>
                         </FormControlLabel>
                         <Input style={{ borderColor }}>
                              <InputField
                                   id="username"
                                   autoCorrect={false}
                                   autoCapitalize="none"
                                   size="xl"
                                   returnKeyType={emailLabel ? 'next' : 'done'}
                                   enterKeyHint={emailLabel ? 'next' : 'done'}
                                   onChangeText={(text) => setUsername(text)}
                                   onSubmitEditing={() => {
                                        if (fieldRef?.current) {
                                             fieldRef.current.focus();
                                        } else {
                                             onSubmit();
                                        }
                                   }}
                                   blurOnSubmit={!emailLabel}
                                   textContentType="username"
                                   value={username}
                              />
                         </Input>
                    </FormControl>
                    {emailLabel ? (
                         <FormControl>
                              <FormControlLabel>
                                   <FormControlLabelText size="sm">
                                        {emailLabel}
                                   </FormControlLabelText>
                              </FormControlLabel>
                              <Input style={{ borderColor }}>
                                   <InputField id="email" autoCorrect={false} autoCapitalize="none" size="xl" enterKeyHint="done" returnKeyType="done" onChangeText={(text) => setEmail(text)} textContentType="emailAddress" ref={fieldRef} onSubmitEditing={onSubmit} value={email} />
                              </Input>
                         </FormControl>
                    ) : null}
               </ModalBody>
               <ModalFooter>
                    <ButtonGroup space="sm">
                         <Button variant="link" onPress={onClose}>
                              <ButtonText style={{ color: textColor }}>{getTermFromDictionary('en', 'cancel')}</ButtonText>
                         </Button>
                         <Button isLoading={isProcessing} isLoadingText={getTermFromDictionary('en', 'button_processing', true)} style={{ backgroundColor: primaryColor }} onPress={onSubmit}>
                              <ButtonText style={{ color: primaryTextColor }}>{submitLabel}</ButtonText>
                         </Button>
                    </ButtonGroup>
               </ModalFooter>
          </>
     );
}

/**
 * useResetPasswordState hook that manages the state of the reset password modal, including the results of the reset password process and whether there was an error.
 * @param setShowForgotPasswordModal
 * @param setIsProcessing
 * @returns {{showResults: boolean, setShowResults: (value: (((prevState: boolean) => boolean) | boolean)) => void, results: string, setResults: (value: (((prevState: string) => string) | string)) => void, hasError: boolean, setHasError: (value: (((prevState: boolean) => boolean) | boolean)) => void, closeWindow: closeWindow, resetWindow: resetWindow}}
 */
function useResetPasswordState(setShowForgotPasswordModal, setIsProcessing) {
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

     const resetWindow = () => {
          setShowResults(false);
          setResults('');
          setHasError(false);
     };

     return {
          showResults,
          setShowResults,
          results,
          setResults,
          hasError,
          setHasError,
          closeWindow,
          resetWindow,
     };
}

/**
 * renderStandardResults function that renders the results of the reset password process, including success and error messages, and buttons for closing the modal and retrying the reset password process.
 * @param param0
 * @param param0.results
 * @param param0.showResults
 * @param param0.hasError
 * @param param0.textColor
 * @param param0.closeWindow
 * @param param0.resetWindow
 * @param param0.primaryColor
 * @param param0.primaryTextColor
 * @param param0.successHasResend
 * @param param0.onResend
 * @returns {React.JSX.Element|null}
 */
function renderStandardResults({ results, showResults, hasError, textColor, closeWindow, resetWindow, primaryColor, primaryTextColor, successHasResend = false, onResend }) {
     if (results && showResults && !hasError) {
          if (_.isEmpty(results.success) && results.error) {
               return (
                    <>
                         <ModalBody>
                              <Text>{normalizeDisplayText(results.error)}</Text>
                         </ModalBody>
                         <ResultFooter textColor={textColor} onClose={closeWindow} onRetry={resetWindow} showRetry primaryColor={primaryColor} primaryTextColor={primaryTextColor} />
                    </>
               );
          }

          if (!_.isEmpty(results.message)) {
               return (
                    <>
                         <ModalBody>
                              <Text>{normalizeDisplayText(results.message)}</Text>
                              {successHasResend ? (
                                   <Center>
                                        <Button size="sm" className="mt-3" style={{ backgroundColor: primaryColor }} onPress={onResend}>
                                             <ButtonText style={{ color: primaryTextColor }}>{getTermFromDictionary('en', 'resend_email')}</ButtonText>
                                        </Button>
                                   </Center>
                              ) : null}
                         </ModalBody>
                         <ResultFooter textColor={textColor} onClose={closeWindow} primaryColor={primaryColor} primaryTextColor={primaryTextColor} />
                    </>
               );
          }

          return (
               <>
                    <ModalBody>
                         <Text>{getTermFromDictionary('en', 'password_reset_success_body_1')}</Text>
                         <Text>{getTermFromDictionary('en', 'password_reset_success_body_2')}</Text>
                         {successHasResend ? (
                              <Center>
                                   <Button size="sm" className="mt-3" style={{ backgroundColor: primaryColor }} onPress={onResend}>
                                        <ButtonText style={{ color: primaryTextColor }}>{getTermFromDictionary('en', 'resend_email')}</ButtonText>
                                   </Button>
                              </Center>
                         ) : null}
                    </ModalBody>
                    <ResultFooter textColor={textColor} onClose={closeWindow} primaryColor={primaryColor} primaryTextColor={primaryTextColor} />
               </>
          );
     }

     if (showResults && hasError) {
          return (
               <>
                    <ModalBody>
                         <Text>{normalizeDisplayText(results)}</Text>
                    </ModalBody>
                    <ResultFooter textColor={textColor} onClose={closeWindow} okLabel="cancel" primaryColor={primaryColor} primaryTextColor={primaryTextColor} />
               </>
          );
     }

     return null;
}

/**
 * AspenResetPassword component that handles the reset password process for Aspen Discovery, including input fields for the username and a submit button.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
function AspenResetPassword(props) {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, brand, borderColor } = props;
     const [username, setUsername] = React.useState('');
     const { showResults, setShowResults, results, setResults, hasError, setHasError, closeWindow, resetWindow } = useResetPasswordState(setShowForgotPasswordModal, setIsProcessing);

     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, '', false, 'aspen', libraryUrl).then((response) => {
               if (response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage('Error initiating reset password');
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const renderedResults = renderStandardResults({
          results,
          showResults,
          hasError,
          textColor,
          closeWindow,
          resetWindow,
          primaryColor: brand.primary[500],
          primaryTextColor: brand.primary['500-text'],
     });

     if (renderedResults) {
          return renderedResults;
     }

     return <ResetForm resetBody={resetBody} usernameLabel={usernameLabel} username={username} setUsername={setUsername} onSubmit={initiateResetPassword} textColor={textColor} borderColor={borderColor} submitLabel={modalButtonLabel} isProcessing={isProcessing} primaryColor={brand.primary[500]} primaryTextColor={brand.primary['500-text']} onClose={closeWindow} />;
}

/**
 * KohaResetPassword component that handles the reset password process for Koha, including input fields for the username and email, and a submit button.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
function KohaResetPassword(props) {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, brand, borderColor } = props;
     const [email, setEmail] = React.useState('');
     const [username, setUsername] = React.useState('');
     const [resend, setResend] = React.useState(false);
     const fieldRef = React.useRef();
     const { showResults, setShowResults, results, setResults, hasError, setHasError, closeWindow, resetWindow } = useResetPasswordState(setShowForgotPasswordModal, setIsProcessing);

     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, email, resend, 'koha', libraryUrl).then((response) => {
               if (response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage('Error initiating reset password');
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const renderedResults = renderStandardResults({
          results,
          showResults,
          hasError,
          textColor,
          closeWindow,
          resetWindow,
          primaryColor: brand.primary[500],
          primaryTextColor: brand.primary['500-text'],
          successHasResend: true,
          onResend: () => {
               setResend(true);
               initiateResetPassword();
          },
     });

     if (renderedResults) {
          return renderedResults;
     }

     return <ResetForm resetBody={resetBody} usernameLabel={usernameLabel} emailLabel={getTermFromDictionary('en', 'patron_email')} username={username} setUsername={setUsername} email={email} setEmail={setEmail} onSubmit={initiateResetPassword} fieldRef={fieldRef} textColor={textColor} borderColor={borderColor} submitLabel={modalButtonLabel} isProcessing={isProcessing} primaryColor={brand.primary[500]} primaryTextColor={brand.primary['500-text']} onClose={closeWindow} />;
}

/**
 * SirsiResetPassword component that handles the reset password process for Sirsi, including input fields for the username and a submit button.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
function SirsiResetPassword(props) {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, brand, borderColor } = props;
     const [username, setUsername] = React.useState('');
     const { showResults, setShowResults, results, setResults, hasError, setHasError, closeWindow, resetWindow } = useResetPasswordState(setShowForgotPasswordModal, setIsProcessing);

     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, '', false, 'sirsi', libraryUrl).then((response) => {
               if (response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage('Error initiating reset password');
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const renderedResults = renderStandardResults({
          results,
          showResults,
          hasError,
          textColor,
          closeWindow,
          resetWindow,
          primaryColor: brand.primary[500],
          primaryTextColor: brand.primary['500-text'],
     });

     if (renderedResults) {
          return renderedResults;
     }

     return <ResetForm resetBody={resetBody} usernameLabel={usernameLabel} username={username} setUsername={setUsername} onSubmit={initiateResetPassword} textColor={textColor} borderColor={borderColor} submitLabel={modalButtonLabel} isProcessing={isProcessing} primaryColor={brand.primary[500]} primaryTextColor={brand.primary['500-text']} onClose={closeWindow} />;
}

/**
 * HorizonResetPassword component that handles the reset password process for Horizon, including input fields for the username and a submit button.
 * This component is an alias for the SirsiResetPassword component, as both systems share similar reset password functionality.
 * @param props
 * @returns {React.JSX.Element}
 * @type {(function(*): React.JSX.Element)|*}
 */
const HorizonResetPassword = SirsiResetPassword;

/**
 * EvergreenResetPassword component that handles the reset password process for Evergreen, including input fields for the username and a submit button.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
function EvergreenResetPassword(props) {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, brand, borderColor } = props;
     const [email, setEmail] = React.useState('');
     const [username, setUsername] = React.useState('');
     const [resend, setResend] = React.useState(false);
     const fieldRef = React.useRef();
     const { showResults, setShowResults, results, setResults, hasError, setHasError, closeWindow, resetWindow } = useResetPasswordState(setShowForgotPasswordModal, setIsProcessing);

     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, email, resend, 'evergreen', libraryUrl).then((response) => {
               if (response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage('Error initiating reset password');
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const renderedResults = renderStandardResults({
          results,
          showResults,
          hasError,
          textColor,
          closeWindow,
          resetWindow,
          primaryColor: brand.primary[500],
          primaryTextColor: brand.primary['500-text'],
          successHasResend: true,
          onResend: () => {
               setResend(true);
               initiateResetPassword();
          },
     });

     if (renderedResults) {
          return renderedResults;
     }

     return <ResetForm resetBody={resetBody} usernameLabel={usernameLabel} emailLabel={getTermFromDictionary('en', 'patron_email')} username={username} setUsername={setUsername} email={email} setEmail={setEmail} onSubmit={initiateResetPassword} fieldRef={fieldRef} textColor={textColor} borderColor={borderColor} submitLabel={modalButtonLabel} isProcessing={isProcessing} primaryColor={brand.primary[500]} primaryTextColor={brand.primary['500-text']} onClose={closeWindow} />;
}

/**
 * MillenniumResetPassword component that handles the reset password process for Millennium, including input fields for the username and a submit button.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
function SymphonyResetPassword(props) {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, brand, borderColor } = props;
     const [username, setUsername] = React.useState('');
     const { showResults, setShowResults, results, setResults, hasError, setHasError, closeWindow, resetWindow } = useResetPasswordState(setShowForgotPasswordModal, setIsProcessing);

     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, '', false, 'symphony', libraryUrl).then((response) => {
               if (response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage('Error initiating reset password');
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     const renderedResults = renderStandardResults({
          results,
          showResults,
          hasError,
          textColor,
          closeWindow,
          resetWindow,
          primaryColor: brand.primary[500],
          primaryTextColor: brand.primary['500-text'],
     });

     if (renderedResults) {
          return renderedResults;
     }

     return <ResetForm resetBody={resetBody} usernameLabel={usernameLabel} username={username} setUsername={setUsername} onSubmit={initiateResetPassword} textColor={textColor} borderColor={borderColor} submitLabel={modalButtonLabel} isProcessing={isProcessing} primaryColor={brand.primary[500]} primaryTextColor={brand.primary['500-text']} onClose={closeWindow} />;
}

/**
 * AspenResetPassword component that handles the reset password process for Aspen Discovery, including input fields for the username and a submit button.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
function MillenniumResetPassword(props) {
     const { usernameLabel, setShowForgotPasswordModal, isProcessing, setIsProcessing, modalButtonLabel, resetBody, libraryUrl, textColor, brand, borderColor } = props;
     const [username, setUsername] = React.useState('');
     const { showResults, setShowResults, results, setResults, hasError, setHasError, closeWindow, resetWindow } = useResetPasswordState(setShowForgotPasswordModal, setIsProcessing);

     const initiateResetPassword = async () => {
          setIsProcessing(true);
          await resetPassword(username, '', false, 'millennium', libraryUrl).then((response) => {
               if (response.ok) {
                    setResults(response.data.result);
                    setShowResults(true);
                    setHasError(false);
               } else {
                    logDebugMessage('Error initiating reset password');
                    logDebugMessage(response);
                    setHasError(true);
                    const error = getErrorMessage(response.code ?? 0, response.problem);
                    setResults(error.message);
                    setShowResults(true);
               }
          });
          setIsProcessing(false);
     };

     if (results && showResults && !hasError) {
          return (
               <>
                    <ModalBody>
                         <Text>{normalizeDisplayText(results.message)}</Text>
                    </ModalBody>
                    <ModalFooter>
                         <ButtonGroup space="sm">
                              <Button variant="link" onPress={closeWindow}>
                                   <ButtonText style={{ color: textColor }}>{getTermFromDictionary('en', 'button_ok')}</ButtonText>
                              </Button>
                              {!_.isEmpty(results.error) ? (
                                   <Button colorScheme="primary" onPress={resetWindow}>
                                        <ButtonText>{getTermFromDictionary('en', 'try_again')}</ButtonText>
                                   </Button>
                              ) : null}
                         </ButtonGroup>
                    </ModalFooter>
               </>
          );
     }

     if (showResults && hasError) {
          return (
               <>
                    <ModalBody>
                         <Text>{normalizeDisplayText(results)}</Text>
                    </ModalBody>
                    <ResultFooter textColor={textColor} onClose={closeWindow} okLabel="cancel" primaryColor={brand.primary[500]} primaryTextColor={brand.primary['500-text']} />
               </>
          );
     }

     return <ResetForm resetBody={resetBody} usernameLabel={usernameLabel} username={username} setUsername={setUsername} onSubmit={initiateResetPassword} textColor={textColor} borderColor={borderColor} submitLabel={modalButtonLabel} isProcessing={isProcessing} primaryColor={brand.primary[500]} primaryTextColor={brand.primary['500-text']} onClose={closeWindow} />;
}
