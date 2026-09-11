import React from 'react';
import { AuthContext } from '../../context/AuthContext';
import {getTermFromDictionary} from '../../translations/TranslationService';
import { logDebugMessage } from '../../util/logging.js';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * InvalidCredentials component that displays an alert dialog when the user has entered invalid credentials, allowing the user to sign out.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const InvalidCredentials = () => {
     const language = useActiveLanguage();
     const { signOut } = React.useContext(AuthContext);
     const [isOpen, setIsOpen] = React.useState(true);
     const onClose = () => setIsOpen(false);
     const cancelRef = React.useRef(null);
     logDebugMessage('Showing Invalid Credentials Alert');

     return (
          <Center>
               <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
                    <AlertDialogBackdrop/>
                    <AlertDialogContent>
                         <AlertDialogHeader><Heading>{getTermFromDictionary(language, 'error')}</Heading></AlertDialogHeader>
                         <AlertDialogBody><Text>{getTermFromDictionary(language, 'error_invalid_credentials')}</Text></AlertDialogBody>
                         <AlertDialogFooter>
                              <ButtonGroup space="sm">
                                   <Button colorScheme="primary" onPress={signOut} ref={cancelRef}>
                                        <ButtonText>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </AlertDialogFooter>
                    </AlertDialogContent>
               </AlertDialog>
          </Center>
     );
};
