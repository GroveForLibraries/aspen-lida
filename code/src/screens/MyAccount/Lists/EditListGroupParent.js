import React from 'react';
import { useListGroups, useUpdateLists, useUpdateListGroups } from '@/src/hooks/useUserData';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { editListGroupParent, getLists, getListGroups } from '@/src/util/api/list';
import { popAlert } from '@/src/components/feedback';
import { navigateStack } from '@/src/helpers/RootNavigator';
import { toArray } from '@/src/helpers/helpers';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '@/src/components/themed/ThemedFormControls';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../../components/themed/ThemedSelect';

/**
 * EditListGroupParent component that allows users to edit the parent group of a list group. It provides a modal interface for selecting a new parent group from existing list groups and updates the backend accordingly.
 * @param param0
 * @param param0.id
 * @param param0.parentId
 * @param param0.handleUpdate
 * @returns {React.JSX.Element}
 * @constructor
 */
export const EditListGroupParent = ({id, parentId, handleUpdate}) => {
      const { data: listGroups } = useListGroups();
      const updateLists = useUpdateLists();
      const updateListGroups = useUpdateListGroups();
      const library = useLibrary();
      const language = useActiveLanguage();
      const { brand } = useTheme();
      const [showModal, setShowModal] = React.useState(false);
      const [loading, setLoading] = React.useState(false);

      const [selectedGroup, setSelectedGroup] = React.useState(null);
      const [newListGroupParentId, setNewListGroupParentId] = React.useState(parentId); // default state is current list group parent id


      React.useEffect(() => {
           if (listGroups && listGroups.groups && parentId != null) {
                const found = toArray(listGroups.groups).find((item) => item.id === parentId) || null;
                setSelectedGroup(found);
           } else {
                setSelectedGroup(null);
           }
      }, [listGroups.groups, parentId]);

      const updateSelectedGroup = (groupId) => {
           const group = toArray(listGroups.groups).find((item) => item.id === groupId);
           setSelectedGroup(group);
           setNewListGroupParentId(groupId);
      }

     const toggle = () => {
          setShowModal(!showModal);
     };

     return (
          <Center>
               <Button onPress={toggle} size="xs" colorScheme="primary">
                   <MaterialIcons name="edit" size={18} color={brand.primary['500-text']} className="mr-1" />
                   <ButtonText>{getTermFromDictionary(language, 'move_list_group')}</ButtonText>
               </Button>
               <Modal isOpen={showModal} onClose={toggle} size="full">
                    <ModalBackdrop />
                    <ModalContent className="max-w-[90%]">
                         <ModalHeader>
                              <Heading>{getTermFromDictionary(language, 'move_list_group')}</Heading>
                              <ModalCloseButton onPress={toggle}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'move_list_group_to')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Select
                                        name="newListGroupParent"
                                        selectedValue={newListGroupParentId}
                                        accessibilityLabel={getTermFromDictionary(language, 'move_list_group_to')}
                                        onValueChange={(itemValue) => updateSelectedGroup(itemValue)}>
                                         <SelectTrigger>
                                              {selectedGroup === null && parentId !== null ? (
                                                        toArray(listGroups.groups).map((group) => {
                                                             if (group.id === parentId) {
                                                                  return <SelectInput value={group.title} />;
                                                             }
                                                        })
                                                   ) :
                                                   (selectedGroup === null && parentId === null ? (
                                                        <SelectInput value={getTermFromDictionary(language, 'choose_existing_list_group')} />
                                                   ) : (
                                                        <SelectInput value={selectedGroup.title} />
                                                   ))
                                              }
                                         </SelectTrigger>
                                        <SelectPortal>
                                             <SelectBackdrop />
                                             <SelectContent>
                                                  <SelectDragIndicatorWrapper>
                                                       <SelectDragIndicator />
                                                  </SelectDragIndicatorWrapper>
                                                   <SelectScrollView>
                                                        {toArray(listGroups.groups).map((item, index) => {
                                                             if(item.id === id || item.id === parentId || item.parentGroupId === id) {
                                                                  return null;
                                                             }
                                                             return <SelectItem key={index} value={item.id} label={item.title} selectedValue={newListGroupParentId} />;
                                                        })}
                                                   </SelectScrollView>
                                             </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </FormControl>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup>
                                   <Button colorScheme="primary" variant="outline" onPress={toggle}>
                                        <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                     <Button colorScheme="primary"
                                             isLoading={loading}
                                             isDisabled={selectedGroup === null}
                                             isLoadingText={getTermFromDictionary(language, 'saving', true)}
                                            onPress={() => {
                                                 setLoading(true);
                                                 editListGroupParent(id, newListGroupParentId, library.baseUrl).then(async (res) => {
                                                      // Refresh lists and list groups from API and update local database
                                                      const listsResponse = await getLists(library.baseUrl, 1, 20, 1);
                                                      if (listsResponse.ok) {
                                                           await updateLists(listsResponse.data.result);
                                                      }
                                                      const groupsResponse = await getListGroups(library.baseUrl);
                                                      if (groupsResponse.ok) {
                                                           await updateListGroups({
                                                                groups: groupsResponse.data?.result?.groups ?? [],
                                                                unassigned: groupsResponse.data?.result?.unassigned ?? 0 });
                                                      }
                                                      setLoading(false);
                                                      let status = 'success';
                                                      setShowModal(false);
                                                      handleUpdate(id);
                                                      if (res.data.result.success === false) {
                                                           status = 'error';
                                                           popAlert(res.data.result.title, res.data.result.message, status);
                                                      } else {
                                                           popAlert(res.data.result.title, res.data.result.message, status);
                                                           navigateStack('AccountScreenTab', 'MyLists', {
                                                                libraryUrl: library.baseUrl,
                                                                hasPendingChanges: true });
                                                      }
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
