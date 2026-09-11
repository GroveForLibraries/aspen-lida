import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import React, { useState } from 'react';
import { popAlert } from '@/src/components/feedback';
import { useUserState, useListGroups, useUpdateUserProfile, useUpdateLists, useUpdateListGroups } from '@/src/hooks/useUserData';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { createList, getLists, getListGroups } from '@/src/util/api/list';
import { refreshProfile } from '@/src/util/api/user';
import {logDebugMessage, logErrorMessage} from '@/src/util/logging';
import { toArray } from '@/src/helpers/helpers';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useTheme } from '@/src/themes/theme';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '@/src/components/themed/ThemedFormControls';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedRadio as Radio, ThemedRadioGroup as RadioGroup, ThemedRadioIcon as RadioIcon, ThemedRadioIndicator as RadioIndicator, ThemedRadioLabel as RadioLabel } from '../../../components/themed/ThemedRadio';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../../components/themed/ThemedSelect';
import { ThemedTextarea as Textarea, ThemedTextareaInput as TextareaInput } from '@/src/components/themed/ThemedTextarea';

/**
 * CreateList component that allows users to create a new list. It displays a button that opens a modal where users can input the title, description, access level, and optionally add the list to a new or existing list group. The component handles API calls to create the list and provides feedback on the creation process, including refreshing the user's profile and updating the lists and list groups in the local state.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const CreateList = (props) => {
      const { setLoading } = props;
      const { data: userState } = useUserState();
      const user = userState?.user ?? {};
      const updateUserProfile = useUpdateUserProfile();
      const { data: listGroups } = useListGroups();
      const updateLists = useUpdateLists();
      const updateListGroups = useUpdateListGroups();
      const library = useLibrary();
      const language = useActiveLanguage();
      const { textColor, brand, neutrals } = useTheme();
      const [loading, setAdding] = React.useState(false);
      const [showModal, setShowModal] = useState(false);

     const [title, setTitle] = React.useState('');
     const [description, setDescription] = React.useState('');
     const [isPublic, setPublic] = React.useState("false");
     const [addToGroup, setAddToGroup] = React.useState('no');
     const [groupName, setGroupName] = React.useState('');
     const [newGroupName, setNewGroupName] = React.useState('');
     const [nestedGroup, setNestedGroup] = React.useState('');
     const [existingGroupId, setExistingGroupId] = React.useState(user.lastListGroupAdded ? user.lastListGroupAdded : (listGroups?.groups[0] ? listGroups.groups[0].id : 0));
     const borderColor = neutrals.border;

     let hasListGroups = false;
     if(user.numListGroups) {
          hasListGroups = user.numListGroups > 0;
     }

     const toggle = () => {
          setShowModal(!showModal);
          setTitle('');
          setDescription('');
          setPublic("false");
          setAdding(false);
          setAddToGroup('no')
          setGroupName('');
          setNewGroupName('');
          setNestedGroup('');
          setExistingGroupId(user.lastListGroupAdded ? user.lastListGroupAdded : (listGroups?.groups[0] ? listGroups.groups[0].id : 0));
     };

     return (
          <Center>
               <Button onPress={toggle} size="sm" colorScheme="primary">
                   <MaterialIcons name="add" size={18} color={brand.primary['500-text']} className="mr-1" />
                   <ButtonText>{getTermFromDictionary(language, 'create_new_list')}</ButtonText>
               </Button>
               <Modal isOpen={showModal} onClose={toggle} size="full">
                    <ModalBackdrop />
                    <ModalContent className="max-w-[90%]">
                         <ModalHeader>
                              <Heading>
                                   {getTermFromDictionary(language, 'create_new_list')}
                              </Heading>
                              <ModalCloseButton onPress={toggle}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'title')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Input style={{ borderColor }}>
                                        <InputField id="title" onChangeText={(text) => setTitle(text)} returnKeyType="next" defaultValue={title} />
                                   </Input>
                              </FormControl>
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'description')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Textarea id="description" onChangeText={(text) => setDescription(text)} defaultValue={description} returnKeyType="next">
                                        <TextareaInput />
                                   </Textarea>
                              </FormControl>
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'access')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <RadioGroup
                                        name="access"
                                        value={isPublic}
                                        onChange={(nextValue) => {
                                             setPublic(nextValue);
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
                              <FormControl className="pb-3">
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'should_add_to_list_group')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Select name="should_add_to_list_group" selectedValue={addToGroup} accessibilityLabel={getTermFromDictionary(language, 'should_add_to_list_group')} onValueChange={(itemValue) => setAddToGroup(itemValue)}>
                                        <SelectTrigger>
                                             {addToGroup !== '' ? <SelectInput value={addToGroup === 'new' ? getTermFromDictionary(language, 'add_to_list_group_new') : addToGroup === 'existing' ? getTermFromDictionary(language, 'add_to_list_group_existing') : getTermFromDictionary(language, 'add_to_list_group_no')} /> : <SelectInput value={getTermFromDictionary(language, 'add_to_list_group_no')} />}
                                        </SelectTrigger>
                                        <SelectPortal>
                                             <SelectBackdrop />
                                             <SelectContent>
                                                  <SelectDragIndicatorWrapper>
                                                       <SelectDragIndicator />
                                                  </SelectDragIndicatorWrapper>
                                                  <SelectScrollView>
                                                       <SelectItem label={getTermFromDictionary(language, 'add_to_list_group_no')} value="no" key={1} selectedValue={addToGroup} />
                                                       <SelectItem label={getTermFromDictionary(language, 'add_to_list_group_new')} value="new" key={2} selectedValue={addToGroup} />
                                                       {hasListGroups && <SelectItem label={getTermFromDictionary(language, 'add_to_list_group_existing')} value="existing" key={3} selectedValue={addToGroup} />}
                                                  </SelectScrollView>
                                             </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </FormControl>
                              {addToGroup === 'new' && (
                                   <>
                                        <FormControl className="pb-2">
                                             <FormControlLabel>
                                                  <FormControlLabelText>{getTermFromDictionary(language, 'new_list_group_name')}</FormControlLabelText>
                                             </FormControlLabel>
                                             <Input style={{ borderColor }}>
                                                  <InputField id="newGroupName" onChangeText={(text) => setNewGroupName(text)} defaultValue={newGroupName} />
                                             </Input>
                                        </FormControl>
                                        {hasListGroups && (
                                             <FormControl className="pb-2">
                                                  <FormControlLabel>
                                                       <FormControlLabelText>{getTermFromDictionary(language, 'should_nest_list_group')}</FormControlLabelText>
                                                  </FormControlLabel>
                                                  <Select name="should_nest_list_group" selectedValue={nestedGroup} accessibilityLabel={getTermFromDictionary(language, 'should_nest_list_group')} onValueChange={(itemValue) => setNestedGroup(itemValue)}>
                                                       <SelectTrigger>
                                                   {nestedGroup !== 'no' && nestedGroup !== '' ? (
                                                        toArray(listGroups.groups).map((group) => {
                                                             if (group.id === nestedGroup) {
                                                                  return <SelectInput value={group.title} />;
                                                             }
                                                        })
                                                   ) : (
                                                        <SelectInput value={getTermFromDictionary(language, 'nest_within_group_no')} />
                                                   )}
                                                       </SelectTrigger>
                                                       <SelectPortal>
                                                            <SelectBackdrop />
                                                            <SelectContent>
                                                                 <SelectDragIndicatorWrapper>
                                                                      <SelectDragIndicator />
                                                                 </SelectDragIndicatorWrapper>
                                                                  <SelectScrollView>
                                                                       <SelectItem label={getTermFromDictionary(language, 'nest_within_group_no')} value="no" key={1} selectedValue={nestedGroup} />
                                                                       {toArray(listGroups.groups).map((item, index) => {
                                                                            return <SelectItem key={index} value={item.id} label={item.title} selectedValue={nestedGroup} />;
                                                                       })}
                                                                  </SelectScrollView>
                                                            </SelectContent>
                                                       </SelectPortal>
                                                  </Select>
                                             </FormControl>
                                        )}
                                   </>
                              )}
                              {addToGroup === 'existing' && hasListGroups && (
                                   <FormControl>
                                        <FormControlLabel>
                                             <FormControlLabelText>{getTermFromDictionary(language, 'choose_existing_list_group')}</FormControlLabelText>
                                        </FormControlLabel>
                                        <Select
                                             selectedValue={existingGroupId}
                                             defaultValue={existingGroupId}
                                             onValueChange={(itemValue) => {
                                                  setExistingGroupId(itemValue);
                                                  setNestedGroup(itemValue);
                                                  logDebugMessage(itemValue);
                                             }}>
                                             <SelectTrigger>
                                                   {existingGroupId && existingGroupId !== -1 ? (
                                                        toArray(listGroups.groups).map((group) => {
                                                             if (group.id === existingGroupId) {
                                                                  return <SelectInput value={group.title} />;
                                                             }
                                                        })
                                                   ) : (
                                                        <SelectInput value={listGroups.groups[0].id} />
                                                   )}
                                             </SelectTrigger>
                                             <SelectPortal>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                        <SelectDragIndicatorWrapper>
                                                             <SelectDragIndicator />
                                                        </SelectDragIndicatorWrapper>
                                                         <SelectScrollView>
                                                              {toArray(listGroups.groups).map((item, index) => {
                                                                   return <SelectItem key={index} value={item.id} label={item.title} selectedValue={existingGroupId} />;
                                                              })}
                                                         </SelectScrollView>
                                                   </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              )}
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup>
                                   <Button variant="outline" onPress={toggle} style={{ borderColor }}>
                                        <ButtonText style={{ color: textColor }}>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                    <Button
                                         colorScheme="primary"
                                         isLoading={loading}
                                         isLoadingText={getTermFromDictionary(language, 'creating_list', true)}
                                         onPress={async () => {
                                              setAdding(true);
                                              setLoading(true);
                                              try {
                                                   await createList(title, description, isPublic, library.baseUrl, addToGroup, nestedGroup, newGroupName, existingGroupId).then(async (res) => {
                                                        let status = 'success';
                                                        if (!res.success) {
                                                             status = 'danger';
                                                        }
                                                        const profileResponse = await refreshProfile(library.baseUrl);
                                                        if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
                                                             await updateUserProfile(profileResponse.data.result.profile);
                                                        }
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
                                                        toggle();
                                                        popAlert(getTermFromDictionary(language, 'list_created'), res.message, status);
                                                   });
                                              } catch (error) {
                                                   logErrorMessage("Failed to create list: ", error);
                                                   // TODO(translation): Replace hardcoded alert title/body with TranslationService-backed keys.
                                                   popAlert("Error", "Something went wrong while creating the list.", "danger");
                                              } finally {
                                                   setAdding(false);
                                                   setLoading(false);
                                              }
                                         }}>
                                        <ButtonText>{getTermFromDictionary(language, 'create_list')}</ButtonText>
                                    </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </Center>
     );
};

export default CreateList;
