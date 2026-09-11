import React from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useCatalogStatus } from '../../hooks/useLibrarySystemData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { logInfoMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * CatalogOffline component that displays an alert dialog when the catalog is offline, allowing the user to sign out.
 * @returns {React.JSX.Element|null}
 * @constructor
 */
export const CatalogOffline = () => {
      const language = useActiveLanguage();
     const { status: catalogStatus, message: catalogStatusMessage } = useCatalogStatus();
     const { signOut } = React.useContext(AuthContext);
     const [isOpen, setIsOpen] = React.useState(true);
     const onClose = () => setIsOpen(false);
     const cancelRef = React.useRef(null);

     logInfoMessage('CatalogOffline: ' + catalogStatus);

     if (catalogStatus > 0) {
          return (
               <Center>
                    <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
                         <AlertDialogBackdrop />

                         <AlertDialogContent>
                              <AlertDialogHeader>
                                  <Heading>{getTermFromDictionary(language, 'catalog_offline')}</Heading>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                  <Text>{catalogStatusMessage ? catalogStatusMessage : getTermFromDictionary(language, 'catalog_offline_message')}</Text>
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <ButtonGroup space="md">
                                       <Button onPress={signOut} colorScheme="primary" ref={cancelRef}>
                                            <ButtonText>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                   </ButtonGroup>
                              </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
               </Center>
          );
     }

     if (catalogStatus > 0) {
          return (
               <Center>
                    <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
                         <AlertDialogBackdrop />

                         <AlertDialogContent>
                              <AlertDialogHeader>
                                   <Heading>{getTermFromDictionary(language, 'catalog_offline')}</Heading>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                   <Text>{catalogStatusMessage ? catalogStatusMessage : getTermFromDictionary(language, 'catalog_offline_message')}</Text>
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <ButtonGroup space="md">
                                        <Button onPress={signOut} ref={cancelRef}>
                                             <ButtonText>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                   </ButtonGroup>
                              </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
               </Center>
          );
     }

     return null;
};
