import React from 'react';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { editListGroup } from '@/src/util/api/list';
import { navigateStack } from '@/src/helpers/RootNavigator';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '@/src/components/themed/ThemedFormControls';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';

/**
 * EditListGroup component that allows users to edit the title of a list group. It displays a button that opens a modal where users can input a new title and save the changes. The component handles API calls to update the list group title and provides feedback on the saving process.
 * @param param0
 * @param param0.currentTitle
 * @param param0.id
 * @param param0.handleUpdate
 * @returns {React.JSX.Element}
 * @constructor
 */
export const EditListGroup = ({currentTitle, id, handleUpdate}) => {
      const library = useLibrary();
      const language = useActiveLanguage();
      const { brand, neutrals } = useTheme();
      const [showModal, setShowModal] = React.useState(false);
      const [loading, setLoading] = React.useState(false);

      const [title, setTitle] = React.useState(currentTitle);
      const borderColor = neutrals.border;

     const toggle = () => {
          setShowModal(!showModal);
     };

     return (
          <Center>
               <Button onPress={toggle} size="xs" colorScheme="primary">
                   <MaterialIcons name="edit" size={18} color={brand.primary['500-text']} className="mr-1" />
                   <ButtonText>{getTermFromDictionary(language, 'rename_list_group')}</ButtonText>
               </Button>
               <Modal isOpen={showModal} onClose={toggle} size="full">
                    <ModalBackdrop />
                    <ModalContent className="max-w-[90%]">
                         <ModalHeader>
                              <Heading>{getTermFromDictionary(language, 'rename_list_group')}</Heading>
                              <ModalCloseButton onPress={toggle}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'rename_list_group_to')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Input style={{ borderColor }}><InputField id="title" defaultValue={currentTitle} autoComplete="off" onChangeText={(text) => setTitle(text)} /></Input>
                              </FormControl>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup>
                                   <Button colorScheme="primary" variant="outline" onPress={toggle}>
                                        <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                    <Button colorScheme="primary"
                                            isLoading={loading}
                                            isLoadingText={getTermFromDictionary(language, 'saving', true)}
                                            onPress={() => {
                                                 setLoading(true);
                                                 editListGroup(id, title, library.baseUrl).then(async () => {
                                                      setLoading(false);
                                                      setShowModal(false);
                                                      handleUpdate(id);
                                                      navigateStack('AccountScreenTab', 'MyLists', {
                                                           libraryUrl: library.baseUrl,
                                                           hasPendingChanges: true });
                                                 });
                                            }}>
                                        <ButtonText>{getTermFromDictionary(language, 'save')}</ButtonText>
                                    </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </Center>
     );
}
