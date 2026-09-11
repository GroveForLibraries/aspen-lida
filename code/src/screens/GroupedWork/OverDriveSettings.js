import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import React from 'react';
import { updateOverDriveEmail } from '../../util/api/user';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { ThemedCheckbox as Checkbox, ThemedCheckboxIcon as CheckboxIcon, ThemedCheckboxIndicator as CheckboxIndicator, ThemedCheckboxLabel as CheckboxLabel } from '../../components/themed/ThemedCheckbox';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { VStack } from '@/components/ui/vstack';

export const GetOverDriveSettings = (props) => {
     const { promptTitle, promptItemId, promptSource, promptPatronId, promptForOverdriveEmail, libraryUrl, showOverDriveSettings, handleOverDriveSettings, showAlert, setEmail, setRememberPrompt, overdriveEmail, language } = props;

     return (
          <Modal isOpen={showOverDriveSettings} onClose={() => handleOverDriveSettings(false)}>
               <ModalBackdrop />
               <ModalContent>
                    <ModalHeader style={{ borderBottomWidth: 0 }}>
                         <Heading>{promptTitle}</Heading>
                         <ModalCloseButton />
                    </ModalHeader>
                    <ModalBody className="mt-4">
                         <FormControl>
                              <VStack space="md">
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'overdrive_email_field')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Input>
                                        <InputField autoCapitalize="none" autoCorrect={false} onChangeText={(text) => setEmail(text)} />
                                   </Input>
                                   <Checkbox value="yes" onChange={(isSelected) => setRememberPrompt(isSelected)}>
                                        <CheckboxIndicator className="mr-2">
                                             <CheckboxIcon />
                                        </CheckboxIndicator>
                                        <CheckboxLabel>{getTermFromDictionary(language, 'remember_settings')}</CheckboxLabel>
                                   </Checkbox>
                              </VStack>
                         </FormControl>
                    </ModalBody>
                    <ModalFooter style={{ borderTopWidth: 0 }}>
                         <ButtonGroup space="md" size="md">
                              <Button colorScheme="secondary" variant="ghost" onPress={() => handleOverDriveSettings(false)}>
                                   <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                              </Button>
                              <Button
                                   colorScheme="primary"
                                   onPress={async () => {
                                        await updateOverDriveEmail(promptItemId, promptSource, promptPatronId, overdriveEmail, promptForOverdriveEmail, libraryUrl, language).then((response) => {
                                             showAlert(response);
                                        });
                                   }}>
                                   <ButtonText>{getTermFromDictionary(language, 'place_hold')}</ButtonText>
                              </Button>
                         </ButtonGroup>
                    </ModalFooter>
               </ModalContent>
          </Modal>
     );
};
