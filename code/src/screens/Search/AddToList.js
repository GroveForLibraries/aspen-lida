import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import _ from 'lodash';
import React, { useState } from 'react';
import { useUserState, useLists, useListGroups } from '../../hooks/useUserData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { addTitlesToList, createListFromTitle } from '../../util/api/list';
import { saveLastListUsed } from '../../util/db';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { getListGroups } from '../../util/api/list';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useTheme } from '../../themes/theme';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedRadio as Radio, ThemedRadioGroup as RadioGroup, ThemedRadioIcon as RadioIcon, ThemedRadioIndicator as RadioIndicator, ThemedRadioLabel as RadioLabel } from '../../components/themed/ThemedRadio';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../components/themed/ThemedSelect';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ThemedTextarea as Textarea, ThemedTextareaInput as TextareaInput } from '@/src/components/themed/ThemedTextarea';
import { VStack } from '@/components/ui/vstack';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
/**
 * AddToList component that displays a button to add an item to a list. When clicked, it opens a modal that allows the user to select an existing list or create a new one, and optionally add the list to a group. It handles the state of the modal, form fields, and API calls for adding items to lists and creating new lists.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const AddToList = (props) => {
     const item = props.itemId;
     const btnStyle = props.btnStyle;
     const source = props.source ?? 'GroupedWork';
     const btnWidth = props.btnWidth ?? 'auto';

     const [open, setOpen] = React.useState(false);
     const [screen, setScreen] = React.useState('add-new');
     const [loading, setLoading] = React.useState(false);
     const library = useLibrary();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: userLists } = useLists();
     const { data: listGroups } = useListGroups();
     const language = useActiveLanguage();
     const lists = userLists?.lists ?? userLists ?? [];
     const [listId, setListId] = useState();
     const [description, saveDescription] = useState();
     const [title, saveTitle] = useState();
     const [isPublic, saveIsPublic] = useState('1');
     const queryClient = useQueryClient();
     const { neutrals, brand } = useTheme();
     const borderColor = neutrals.border;
     const cancelColor = neutrals.textMain;

     const [addToGroup, setAddToGroup] = React.useState('no');
     const [newGroupName, setNewGroupName] = React.useState('');
     const [nestedGroup, setNestedGroup] = React.useState('');
     const [existingGroupId, setExistingGroupId] = React.useState(user.lastListGroupAdded ? user.lastListGroupAdded : (listGroups?.groups[0] ? listGroups.groups[0].id : 0));

     const { data, isLoading } = useQuery(
          ['list_groups', user.id, library.baseUrl, language],
          () => getListGroups(library.baseUrl),
          {
               refetchInterval: 60 * 1000 * 15,
               refetchOnWindowFocus: 'always' }
     );

     const groups = data?.ok ? (data.data?.result?.groups ?? []) : [];
     const listGroupItems = listGroups?.groups ? Object.values(listGroups.groups) : [];

     let hasListGroups = false;
     if(user.numListGroups) {
          hasListGroups = user.numListGroups > 0;
     }

     const updateLastListUsed = async (itemId) => {
          queryClient.invalidateQueries({ queryKey: ['list', itemId] });
          queryClient.invalidateQueries({ queryKey: ['lists', user.id, library.baseUrl, language] });
          await saveLastListUsed(itemId);
          setListId(itemId);
     };

     const closeModal = () => {
          setOpen(false);
          setScreen('add-new');
          setLoading(false);
     };

     const toggleModal = () => {
          if (open) {
               closeModal();
               return;
          }
          setOpen(true);
     };

     const RenderLargeButton = () => (
          <Center>
               <Button colorScheme="tertiary" className="mt-3" onPress={toggleModal}>
                    <MaterialIcons name="bookmark" size={18} color={brand.tertiary['500-text']} className="mr-1" />
                    <ButtonText>{getTermFromDictionary(language, 'add_to_list')}</ButtonText>
               </Button>
          </Center>
     );

     const RenderSmallButton = () => (
          <Button colorScheme="tertiary" size="xs" variant="link" className="mt-1" onPress={toggleModal}>
               <MaterialIcons name="bookmark" size={18} color={brand.tertiary[500]} className="mr-1" />
               <ButtonText>{getTermFromDictionary(language, 'add_to_list')}</ButtonText>
          </Button>
     );

     const RenderRegularButton = () => (
          <Button colorScheme="primary" style={{ width: btnWidth }} onPress={toggleModal}>
               <ButtonText>{getTermFromDictionary(language, 'add_to_list')}</ButtonText>
          </Button>
     );

     return (
          <>
               <Modal
                    isOpen={open}
                    onClose={closeModal}
                    onBackdropPress={closeModal}
                    size="full"
               >
                    <ModalBackdrop />
                    <ModalContent>
                         {isLoading ? (
                              <LoadingSpinner />
                         ) : screen === 'add-new' && !_.isEmpty(lists) ? (
                              <>
                                   <ModalHeader>
                                        <Heading>
                                             {getTermFromDictionary(language, 'add_to_list')}
                                        </Heading>
                                        <ModalCloseButton onPress={closeModal}>
                                             <CloseIcon />
                                        </ModalCloseButton>
                                   </ModalHeader>
                                   <ModalBody>
                                        <FormControl>
                                             <VStack space="md">
                                                  <FormControl>
                                                       <FormControlLabel>
                                                            <FormControlLabelText>{getTermFromDictionary(language, 'choose_a_list')}</FormControlLabelText>
                                                       </FormControlLabel>
                                                       <Select
                                                            selectedValue={listId}
                                                            defaultValue={listId}
                                                            onValueChange={(itemValue) => {
                                                                 setListId(itemValue);
                                                            }}>
                                                            <SelectTrigger>
                                                                 {/* TODO(translation): Replace hardcoded placeholder with TranslationService-backed key. */}
                                                                 <SelectInput placeholder="Select list" />
                                                            </SelectTrigger>
                                                            <SelectPortal>
                                                                 <SelectBackdrop />
                                                                 <SelectContent>
                                                                      <SelectDragIndicatorWrapper>
                                                                           <SelectDragIndicator />
                                                                      </SelectDragIndicatorWrapper>
                                                                      <SelectScrollView>
                                                                           {_.map(lists, function (item, index) {
                                                                                return <SelectItem key={index} value={item.id} label={item.title} selectedValue={listId} />;
                                                                           })}
                                                                      </SelectScrollView>
                                                                 </SelectContent>
                                                            </SelectPortal>
                                                       </Select>
                                                  </FormControl>
                                                  <HStack space="sm" className="items-center">
                                                       <Text>{getTermFromDictionary(language, 'or')}</Text>
                                                       <Button
                                                            size="sm"
                                                            colorScheme="primary"
                                                            onPress={() => {
                                                                 setScreen('create-new');
                                                            }}>
                                                            <ButtonText>{getTermFromDictionary(language, 'create_new_list')}</ButtonText>
                                                       </Button>
                                                  </HStack>
                                             </VStack>
                                        </FormControl>
                                   </ModalBody>
                                   <ModalFooter>
                                        <ButtonGroup className="p-4 flex-row justify-end flex-wrap">
                                             <Button
                                                  variant="outline"
                                                  style={{ borderColor: cancelColor }}
                                                  onPress={closeModal}>
                                                  <ButtonText style={{ color: cancelColor }}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                             </Button>
                                             {!_.isEmpty(lists) ? (
                                                  <Button
                                                       colorScheme="primary"
                                                       isLoading={loading}
                                                       onPress={() => {
                                                            setLoading(true);
                                                            addTitlesToList(listId, item, library.baseUrl, source, language).then(() => {
                                                                 updateLastListUsed(listId);
                                                                 queryClient.invalidateQueries({ queryKey: ['list', listId] });
                                                                 closeModal();
                                                            });
                                                       }}>
                                                       <ButtonText>{getTermFromDictionary(language, 'save_to_list')}</ButtonText>
                                                  </Button>
                                             ) : (
                                                  <Button colorScheme="primary">
                                                       <ButtonText>{getTermFromDictionary(language, 'create_new_list')}</ButtonText>
                                                  </Button>
                                             )}
                                        </ButtonGroup>
                                   </ModalFooter>
                              </>
                         ) : (
                              <>
                                   <ModalHeader>
                                        <Heading>
                                             {getTermFromDictionary(language, 'create_new_list_item')}
                                        </Heading>
                                        <ModalCloseButton onPress={closeModal}>
                                             <CloseIcon />
                                        </ModalCloseButton>
                                   </ModalHeader>
                                   <ModalBody>
                                        <Box className="p-4">
                                             <VStack space="md">
                                                  <FormControl>
                                                       <FormControlLabel>
                                                            <FormControlLabelText>{getTermFromDictionary(language, 'title')}</FormControlLabelText>
                                                       </FormControlLabel>
                                                       <Input style={{ borderColor }}>
                                                            <InputField id="title" onChangeText={(text) => saveTitle(text)} returnKeyType="next" />
                                                       </Input>
                                                  </FormControl>
                                                  <FormControl>
                                                       <FormControlLabel>
                                                            <FormControlLabelText>{getTermFromDictionary(language, 'description')}</FormControlLabelText>
                                                       </FormControlLabel>
                                                       <Textarea id="description" onChangeText={(text) => saveDescription(text)} returnKeyType="next">
                                                            <TextareaInput />
                                                       </Textarea>
                                                  </FormControl>
                                                  <FormControl>
                                                       <FormControlLabel>
                                                            <FormControlLabelText>{getTermFromDictionary(language, 'access')}</FormControlLabelText>
                                                       </FormControlLabel>
                                                       <RadioGroup
                                                            value={isPublic}
                                                            onChange={(nextValue) => {
                                                                 saveIsPublic(nextValue);
                                                            }}>
                                                            <HStack space="md" className="flex-row items-center w-[75%] max-w-75">
                                                                 <Radio value="1" className="my-1">
                                                                      <RadioIndicator className="mr-2" style={{ borderColor }}>
                                                                           <RadioIcon as={MaterialIcons} name="circle" style={{ color: borderColor }} />
                                                                      </RadioIndicator>
                                                                      <RadioLabel>{getTermFromDictionary(language, 'private')}</RadioLabel>
                                                                 </Radio>
                                                                 <Radio value="0" className="my-1">
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
                                                       <Select selectedValue={addToGroup} accessibilityLabel={getTermFromDictionary(language, 'should_add_to_list_group')} onValueChange={(itemValue) => setAddToGroup(itemValue)}>
                                                            <SelectTrigger>
                                                                 {addToGroup !== '' ? (
                                                                      <SelectInput
                                                                           value={addToGroup === 'new' ? getTermFromDictionary(language, 'add_to_list_group_new') : addToGroup === 'existing' ? getTermFromDictionary(language, 'add_to_list_group_existing') : getTermFromDictionary(language, 'add_to_list_group_no')}
                                                                      />
                                                                 ) : (
                                                                      <SelectInput value={getTermFromDictionary(language, 'add_to_list_group_no')} />
                                                                 )}
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
                                                                      <Select selectedValue={nestedGroup} accessibilityLabel={getTermFromDictionary(language, 'should_nest_list_group')} onValueChange={(itemValue) => setNestedGroup(itemValue)}>
                                                                           <SelectTrigger>
                                                                                {nestedGroup !== 'no' && nestedGroup !== '' ? (
                                                                                     listGroupItems.map((group) => {
                                                                                          if (group.id === nestedGroup) {
                                                                                               return <SelectInput key={group.id} value={group.title} />;
                                                                                          }
                                                                                          return null;
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
                                                                                          {_.map(Object.values(groups), function (item, index) {
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
                                                                 selectedValue={existingGroupId !== -1 ? existingGroupId : groups[0]?.id}
                                                                 defaultValue={existingGroupId !== -1 ? existingGroupId : groups[0]?.id}
                                                                 onValueChange={(itemValue) => {
                                                                      setExistingGroupId(itemValue);
                                                                 }}>
                                                                 <SelectTrigger>
                                                                      {existingGroupId && existingGroupId !== -1 ? (
                                                                           _.map(Object.values(groups), function (group) {
                                                                                if (group.id === existingGroupId) {
                                                                                     return <SelectInput key={group.id} value={group.title} />;
                                                                                }
                                                                                return null;
                                                                           })
                                                                      ) : (
                                                                           <SelectInput value={groups[0]?.title} />
                                                                      )}
                                                                      </SelectTrigger>
                                                                 <SelectPortal>
                                                                      <SelectBackdrop />
                                                                      <SelectContent>
                                                                           <SelectDragIndicatorWrapper>
                                                                                <SelectDragIndicator />
                                                                           </SelectDragIndicatorWrapper>
                                                                           <SelectScrollView>
                                                                                {listGroupItems.map((item, index) => {
                                                                                     return <SelectItem key={index} value={item.id} label={item.title} selectedValue={existingGroupId} />;
                                                                                })}
                                                                           </SelectScrollView>
                                                                      </SelectContent>
                                                                 </SelectPortal>
                                                            </Select>
                                                       </FormControl>
                                                  )}
                                             </VStack>
                                        </Box>
                                   </ModalBody>
                                   <ModalFooter>
                                        <ButtonGroup className="p-4 flex-row justify-end flex-wrap">
                                             <Button
                                                  variant="outline"
                                                  style={{ borderColor: cancelColor }}
                                                  onPress={closeModal}>
                                                  <ButtonText style={{ color: cancelColor }}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                             </Button>
                                             <Button
                                                  colorScheme="primary"
                                                  isLoading={loading}
                                                  isLoadingText={getTermFromDictionary(language, 'saving', true)}
                                                  onPress={() => {
                                                       setLoading(true);
                                                       createListFromTitle(title, description, isPublic, item, library.baseUrl, source, addToGroup, nestedGroup, newGroupName).then((res) => {
                                                            updateLastListUsed(res.listId);
                                                            queryClient.invalidateQueries({ queryKey: ['lists', user.id, library.baseUrl, language] });
                                                            queryClient.invalidateQueries({ queryKey: ['list_groups', user.id, library.baseUrl, language] });
                                                            closeModal();
                                                       });
                                                  }}>
                                                  <ButtonText>{getTermFromDictionary(language, 'create_list')}</ButtonText>
                                             </Button>
                                        </ButtonGroup>
                                   </ModalFooter>
                              </>
                         )}
                    </ModalContent>
               </Modal>
               {btnStyle === 'lg' ? <RenderLargeButton /> : btnStyle === 'reg' ? <RenderRegularButton /> : <RenderSmallButton />}
          </>
     );
};

export default AddToList;
