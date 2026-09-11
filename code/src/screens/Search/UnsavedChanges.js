import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ThemedAlertDialogContent as AlertDialogContent, ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader } from '@/src/components/themed/ThemedAlertDialog';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedCloseIcon as CloseIcon } from '@/src/components/themed/ThemedFormControls';
import { Pressable } from '@/components/ui/pressable';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { SearchGlobal } from '../../util/globals';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useTheme } from '../../themes/theme';

/**
 * UnsavedChangesExit component that displays a confirmation dialog when the user attempts to exit with unsaved changes. It provides options to save changes, discard changes, or cancel the exit action.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const UnsavedChangesExit = (props) => {
     const { updateSearch, discardChanges, language, hasPendingChanges } = props;
     const { neutralPairs } = useTheme();
     const navigation = useNavigation();
     const [isOpen, setIsOpen] = React.useState(false);
     const onClose = () => setIsOpen(false);
     const cancelRef = React.useRef(null);

     const closeModal = () => {
          navigation.getParent()?.goBack();
     };

     function getStatus() {
          const pendingChanges = typeof hasPendingChanges === 'function' ? hasPendingChanges() : SearchGlobal.hasPendingChanges;
          if (pendingChanges) {
               // if pending changes found, pop alert to confirm close
               setIsOpen(true);
          } else {
               // if no pending changes, just close it
               closeModal();
          }
     }

     // update parameters, then go to search results screen
     const updateClose = () => {
          updateSearch(false);
          SearchGlobal.hasPendingChanges = false;
          setIsOpen(false);
     };

     // remove pending parameters, then go back to original search results screen
     const forceClose = () => {
          discardChanges();
          setIsOpen(false);
          SearchGlobal.hasPendingChanges = false;
          closeModal();
     };

     return (
          <Center>
               <Pressable onPress={() => getStatus()}>
                    <CloseIcon size={20} />
               </Pressable>
               <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose} useRNModal={true}>
                    <AlertDialogBackdrop/>
                    <AlertDialogContent>
                         <AlertDialogHeader>
                              <Heading>{getTermFromDictionary(language, 'discard_changes')}</Heading>
                         </AlertDialogHeader>
                         <AlertDialogBody>
                              <Text>{getTermFromDictionary(language, 'unsaved_changes_warning')}</Text>
                         </AlertDialogBody>
                         <AlertDialogFooter>
                              <ButtonGroup space="sm">
                                   <Button colorScheme="primary" onPress={updateClose} ref={cancelRef}>
                                        <ButtonText>{getTermFromDictionary(language, 'save')}</ButtonText>
                                   </Button>
                                   <Button variant="link" onPress={forceClose}>
                                        <ButtonText style={{ color: neutralPairs.danger }}>{getTermFromDictionary(language, 'discard')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </AlertDialogFooter>
                    </AlertDialogContent>
               </AlertDialog>
          </Center>
     );
};
