import * as Linking from 'expo-linking';
import React from 'react';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from './themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { getTermFromDictionary } from '../translations/TranslationService';
import { useActiveLanguage } from '../hooks/useLanguageData';
import { useTheme } from '../themes/theme';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedCloseIcon as CloseIcon } from '@/src/components/themed/ThemedFormControls';

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
          <Modal leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
               <ModalBackdrop />
               <ModalContent>
                    <ModalHeader>
                         <Heading>{getTermFromDictionary(language, promptTitle)}</Heading>
                         <ModalCloseButton onPress={onClose}>
                              <CloseIcon />
                         </ModalCloseButton>
                    </ModalHeader>
                    <ModalBody>
                         <Text>{getTermFromDictionary(language, promptBody)}</Text>
                    </ModalBody>
                    <ModalFooter>
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
                    </ModalFooter>
               </ModalContent>
          </Modal>
     );
};
