import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { popAlert } from '@/src/components/feedback';
import { useUserState, useListGroups, useUpdateUserProfile, useUpdateLists } from '@/src/hooks/useUserData';
import { navigateStack } from '@/src/helpers/RootNavigator';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { deleteList, editList, getLists } from '@/src/util/api/list';
import { refreshProfile } from '@/src/util/api/user';
import { toArray } from '@/src/helpers/helpers';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '@/src/components/themed/ThemedFormControls';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogCloseButton as AlertDialogCloseButton, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedCheckbox as Checkbox, ThemedCheckboxIcon as CheckboxIcon, ThemedCheckboxIndicator as CheckboxIndicator, ThemedCheckboxLabel as CheckboxLabel } from '../../../components/themed/ThemedCheckbox';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { Pressable } from '@/components/ui/pressable';
import { ThemedRadio as Radio, ThemedRadioGroup as RadioGroup, ThemedRadioIcon as RadioIcon, ThemedRadioIndicator as RadioIndicator, ThemedRadioLabel as RadioLabel } from '../../../components/themed/ThemedRadio';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../../components/themed/ThemedSelect';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ThemedTextarea as Textarea, ThemedTextareaInput as TextareaInput } from '@/src/components/themed/ThemedTextarea';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';

/**
 * EditList component that allows users to edit the details of a list, including title, description, access level (public/private), and list group. It provides a modal interface for editing and handles API calls to update the list information. It also includes functionality to delete the list with confirmation.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const EditList = (props) => {
      const { data, listId } = props;
      const navigation = useNavigation();
      const { data: userState } = useUserState();
      const updateUserProfile = useUpdateUserProfile();
      const { data: listGroups } = useListGroups();
      const updateLists = useUpdateLists();
      const library = useLibrary();
      const language = useActiveLanguage();
      const [showModal, setShowModal] = React.useState(false);
      const [loading, setLoading] = React.useState(false);
      const [title, setTitle] = React.useState(data.title);
      const [description, setDescription] = React.useState(data.description);
      const [isPublic, setPublic] = React.useState(data.public);
      const [listGroupId, setListGroupId] = React.useState(data.listGroupId);
      const { brand, textColor, neutrals } = useTheme();

      const user = userState?.user ?? {};
      const borderColor = neutrals.border;

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => (
                    <Pressable
                         onPress={() => {
                              navigateStack('AccountScreenTab', 'MyLists', {
                                   hasPendingChanges: true });
                         }}
                        className="mr-3 p-1">
                        <MaterialIcons name="chevron-left" size={20} style={{ color: neutrals.actionableIndicator }} />
                    </Pressable>
               ) });
     }, [navigation]);

     return (
          <>
               <ButtonGroup size="sm" className="justify-center" >
                    <Button onPress={() => setShowModal(true)} colorScheme="primary">
                         <MaterialIcons name="edit" size={18} color={brand.primary['500-text']} className="mr-1" />
                         <ButtonText>{getTermFromDictionary(language, 'edit')}</ButtonText>
                    </Button>
                    <DeleteList listId={listId} />
               </ButtonGroup>
               <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="full">
                    <ModalBackdrop />
                    <ModalContent className="max-w-[90%]">
                         <ModalHeader>
                              <Heading>{getTermFromDictionary(language, 'edit')} {data.title}</Heading>
                              <ModalCloseButton onPress={() => { setShowModal(false); }}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'title')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Input style={{ borderColor }}><InputField id="title" defaultValue={data.title} autoComplete="off" onChangeText={(text) => setTitle(text)} /></Input>
                              </FormControl>
                              <FormControl>
                                   <FormControlLabel><FormControlLabelText>{getTermFromDictionary(language, 'description')}</FormControlLabelText></FormControlLabel>
                                   <Textarea id="description" defaultValue={data.description} autoComplete="off" onChangeText={(text) => setDescription(text)}><TextareaInput /></Textarea>
                              </FormControl>
                              <FormControl>
                                   <FormControlLabel>
                                     <FormControlLabelText>{getTermFromDictionary(language, 'access')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <RadioGroup
                                        value={isPublic ? "true" : "false"}
                                        onChange={(nextValue) => {
                                             setPublic(nextValue === "true");
                                        }}>
                                        <HStack className="flex-row items-center w-[75%] max-w-75" space="md">
                                             <Radio value="false" className="my-1">
                                                  <RadioIndicator className="mr-2" style={{ borderColor }}>
                                                       <RadioIcon as={MaterialIcons} name="circle" style={{ color: borderColor }} />
                                                  </RadioIndicator>
                                                  <RadioLabel>{getTermFromDictionary(language, 'private')}</RadioLabel>
                                             </Radio>
                                             <Radio value="true" className="my-1">
                                                  <RadioIndicator className="mr-2" style={{ borderColor }}>
                                                       <RadioIcon as={MaterialIcons} name="circle" style={{ color: borderColor }} />
                                                  </RadioIndicator>
                                                  <RadioLabel>{getTermFromDictionary(language, 'public')}</RadioLabel>
                                             </Radio>
                                        </HStack>
                                   </RadioGroup>
                              </FormControl>
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'list_group')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Select
                                       name="newListGroupParent"
                                       selectedValue={listGroupId}
                                       accessibilityLabel={getTermFromDictionary(language, 'list_group')}
                                        onValueChange={(itemValue) => setListGroupId(itemValue)}>
                                        <SelectTrigger>
                                              {listGroupId !== -1 ? (
                                                        toArray(listGroups.groups).map((group) => {
                                                             if (group.id === listGroupId) {
                                                                  return <SelectInput value={group.title} />;
                                                             }
                                                        })
                                                   ) :
                                                   <SelectInput placeholder={getTermFromDictionary(language, 'no_list_group')} value={-1} />
                                             }
                                        </SelectTrigger>
                                        <SelectPortal>
                                             <SelectBackdrop />
                                             <SelectContent>
                                                  <SelectDragIndicatorWrapper>
                                                       <SelectDragIndicator />
                                                  </SelectDragIndicatorWrapper>
                                                   <SelectScrollView>
                                                        <SelectItem label={getTermFromDictionary(language, 'no_list_group')} value="-1" key={-1} selectedValue={listGroupId} />
                                                        {toArray(listGroups.groups).map((item, index) => {
                                                             return <SelectItem key={index} value={item.id} label={item.title} selectedValue={listGroupId} />;
                                                        })}
                                                   </SelectScrollView>
                                             </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </FormControl>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup>
                                   <Button colorScheme="primary" variant="outline" onPress={() => setShowModal(false)}>
                                        <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                    <Button
                                         colorScheme="primary"
                                         isLoading={loading}
                                         isLoadingText={getTermFromDictionary(language, 'saving', true)}
                                         onPress={() => {
                                              setLoading(true);
                                              editList(data.id, title, description, isPublic, library.baseUrl, listGroupId).then(async () => {
                                                   setLoading(false);
                                                   if (title !== null) {
                                                        navigation.setOptions({ title: title });
                                                   }
                                                   setShowModal(false);
                                                   // Refresh lists from API and update local database
                                                   const listsResponse = await getLists(library.baseUrl, 1, 20, 1);
                                                   if (listsResponse.ok) {
                                                        await updateLists(listsResponse.data.result);
                                                   }
                                              });
                                         }}>
                                        <ButtonText>{getTermFromDictionary(language, 'save')}</ButtonText>
                                    </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </>
     );
};

/**
 * DeleteList component that provides a button to delete a list. When clicked, it opens a confirmation dialog asking the user to confirm the deletion. It also includes an option for the user to opt out of soft deletion. Upon confirmation, it calls the API to delete the list and refreshes the user's lists and profile.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const DeleteList = (props) => {
      const { listId } = props;
      const {textColor, neutralPairs, neutrals } = useTheme();
      const { data: userState } = useUserState();
      const library = useLibrary();
      const language = useActiveLanguage();
      const updateUserProfile = useUpdateUserProfile();
      const updateLists = useUpdateLists();
      const [isOpen, setIsOpen] = React.useState(false);
      const [loading, setLoading] = useState(false);
      const [optOutOfSoftDeletion, setOptOutOfSoftDeletion] = useState(false);
      const onClose = () => setIsOpen(false);
      const cancelRef = React.useRef(null);
      const user = userState?.user ?? {};

     return (
          <Center>
               <Button style={{ backgroundColor: neutralPairs.danger }} onPress={() => setIsOpen(!isOpen)} size="sm">
                    <MaterialIcons name="delete" size={18} color={neutralPairs.white} className="mr-1" />
                    <ButtonText style={{ color: neutralPairs.white }}>Delete List</ButtonText>
               </Button>
               <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
                    <AlertDialogBackdrop />
                    <AlertDialogContent>
                         <AlertDialogHeader>
                              <Heading>
                                   {getTermFromDictionary(language, 'delete_list')}
                              </Heading>
                              <AlertDialogCloseButton>
                                   <CloseIcon />
                              </AlertDialogCloseButton>
                         </AlertDialogHeader>
                         <AlertDialogBody>
                              <Text>{user.hideSoftDeleteListUI ? getTermFromDictionary(language, 'delete_list_confirmation_no_restore') : getTermFromDictionary(language, 'delete_list_confirmation')}</Text>
                              {!user.hideSoftDeleteListUI && (
                                   <FormControl className="pt-3">
                                        <Checkbox value="optOut" isChecked={optOutOfSoftDeletion} onChange={(isChecked) => setOptOutOfSoftDeletion(isChecked)} alignItems="center">
                                             <CheckboxIndicator>
                                                  <CheckboxIcon />
                                             </CheckboxIndicator>
                                             <CheckboxLabel>{getTermFromDictionary(language, 'opt_out_soft_deletion')}</CheckboxLabel>
                                        </Checkbox>
                                   </FormControl>
                              )}
                         </AlertDialogBody>
                         <AlertDialogFooter>
                              <ButtonGroup space="sm">
                                   <Button variant="link" onPress={onClose} ref={cancelRef}>
                                        <ButtonText style={{ color: textColor }}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                   </Button>
                                   <Button
                                        style={{ backgroundColor: neutralPairs.danger }}
                                        isLoading={loading}
                                        isLoadingText={getTermFromDictionary(language, 'deleting', true)}
                                        onPress={() => {
                                             setLoading(true);
                                             deleteList(listId, library.baseUrl, optOutOfSoftDeletion).then(async (res) => {
                                                  // Refresh lists from API and update local database
                                                  const listsResponse = await getLists(library.baseUrl, 1, 20, 1);
                                                  if (listsResponse.ok) {
                                                       await updateLists(listsResponse.data.result);
                                                  }
                                                  const profileResponse = await refreshProfile(library.baseUrl);
                                                  if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
                                                       await updateUserProfile(profileResponse.data.result.profile);
                                                  }
                                                  setLoading(false);
                                                  let status = 'success';
                                                  setIsOpen(!isOpen);
                                                  if (res.success === false) {
                                                       status = 'error';
                                                       popAlert(res.title, res.message, status);
                                                  } else {
                                                       popAlert(res.title, res.message, status);
                                                       navigateStack('AccountScreenTab', 'MyLists', {
                                                            libraryUrl: library.baseUrl,
                                                            hasPendingChanges: true,
                                                       });
                                                  }
                                             });
                                        }}>
                                        <ButtonText style={{ color: neutralPairs.white }}>{getTermFromDictionary(language, 'delete')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </AlertDialogFooter>
                    </AlertDialogContent>
               </AlertDialog>
          </Center>
     );
};

export default EditList;
