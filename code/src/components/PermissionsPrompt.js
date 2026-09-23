import * as Linking from 'expo-linking';
import React from 'react';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from './themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { getTermFromDictionary } from '../translations/TranslationService';
import { useActiveLanguage } from '../hooks/useLanguageData';
import { useTheme } from '../themes/theme';

/**
 * PermissionsPrompt component for displaying a prompt to the user requesting permissions.
 * @param data
 * @returns {React.JSX.Element}
 * @constructor
 */
export const PermissionsPrompt = (data) => {
     const { promptTitle, promptBody, setShouldRequestPermissions, updateStatus } = data;
     const { neutralPairs } = useTheme();
     const language = useActiveLanguage();
     const [isOpen, setIsOpen] = React.useState(true);
     const onClose = () => {
          updateStatus();
          setShouldRequestPermissions(false);
          setIsOpen(false);
     };
     const cancelRef = React.useRef(null);
     return (
          <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
               <AlertDialogBackdrop />
               <AlertDialogContent>
                    <AlertDialogHeader><Heading>{getTermFromDictionary(language, promptTitle)}</Heading></AlertDialogHeader>
                    <AlertDialogBody><Text>{getTermFromDictionary(language, promptBody)}</Text></AlertDialogBody>
                    <AlertDialogFooter>
                         <ButtonGroup space="md">
                              <Button style={{ backgroundColor: neutralPairs.surface.light }} onPress={onClose} ref={cancelRef}>
                                   <ButtonText style={{ color: neutralPairs.textMain.light }}>{getTermFromDictionary(language, 'permissions_cancel')}</ButtonText>
                              </Button>
                              <Button
                                   style={{ backgroundColor: neutralPairs.danger }}
                                   onPress={() => {
                                        onClose();
                                        Linking.openSettings();
                                   }}>
                                   <ButtonText style={{ color: neutralPairs.white }}>{getTermFromDictionary(language, 'permissions_update_settings')}</ButtonText>
                              </Button>
                         </ButtonGroup>
                    </AlertDialogFooter>
               </AlertDialogContent>
          </AlertDialog>
     );
};
