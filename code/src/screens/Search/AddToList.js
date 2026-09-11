import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { isEmpty, map } from '../../helpers/helpers';
import React, { useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUserState, useLists, useListGroups } from '../../hooks/useUserData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { addTitlesToList, createListFromTitle } from '../../util/api/list';
import { saveLastListUsed } from '../../util/db';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { getListGroups } from '../../util/api/list';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useTheme } from '../../themes/theme';

import {
     Box,
     Center,
     CloseIcon,
     FormControl,
     HStack,
     Icon,
     Input,
     InputField,
     Radio,
     RadioGroup,
     Text,
     Textarea,
     VStack,
     Button,
     ButtonText,
     ButtonGroup,
     ButtonIcon,
     ChevronDownIcon,
     Select,
     SelectBackdrop,
     SelectDragIndicator,
     SelectDragIndicatorWrapper,
     SelectIcon,
     SelectInput,
     SelectScrollView,
     SelectTrigger,
     SelectPortal,
     SelectItem,
     SelectContent,
     FormControlLabel,
     FormControlLabelText,
     RadioIndicator,
     RadioIcon,
     CircleIcon,
     RadioLabel,
     TextareaInput,
     Heading,
     Modal,
     ModalBackdrop,
     ModalContent,
     ModalCloseButton,
     ModalHeader,
     ModalBody,
     ModalFooter } from '@gluestack-ui/themed';

const AddToList = (props) => {
     const item = props.itemId;
     const btnStyle = props.btnStyle;
     const source = props.source ?? 'GroupedWork';
     const btnWidth = props.btnWidth ?? 'auto'; // Fallback value added to prevent undefined references

     const [open, setOpen] = React.useState(false);
     const [screen, setScreen] = React.useState('add-new');
     const [loading, setLoading] = React.useState(false);
     const library = useLibrary();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: userLists } = useLists();
     const { data: listGroups } = useListGroups();
     const language = useActiveLanguage();
     const insets = useSafeAreaInsets();
     const lists = userLists?.lists ?? userLists ?? [];
     const [listId, setListId] = useState();
     const [description, saveDescription] = useState();
     const [title, saveTitle] = useState();
     const [isPublic, saveIsPublic] = useState();
     const queryClient = useQueryClient();
     const { theme, textColor, colorMode } = useTheme();

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

     const toggleModal = () => setOpen(!open);

     // Render helpers that correctly share closure scope context
     const RenderLargeButton = () => (
          <Center>
               <Button mt="$3" onPress={toggleModal} bgColor={theme.tokens.colors.tertiary['500']}>
                    <ButtonIcon color={theme.tokens.colors.tertiary['500-text']} as={MaterialIcons} name="bookmark"/>
                    <ButtonText color={theme.tokens.colors.tertiary['500-text']}>{getTermFromDictionary(language, 'add_to_list')}</ButtonText>
               </Button>
          </Center>
     );

     const RenderSmallButton = () => (
          <Button mt="$1" size="xs" variant="link" onPress={toggleModal}>
               <ButtonIcon color={theme['tokens']['colors']['tertiary']['500']} as={MaterialIcons} name="bookmark"/>
               <ButtonText color={theme['tokens']['colors']['tertiary']['500']}>{getTermFromDictionary(language, 'add_to_list')}</ButtonText>
          </Button>
     );

     const RenderRegularButton = () => (
          <Button width={btnWidth} onPress={toggleModal} bgColor={theme.tokens.colors.primary['500']}>
               <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'add_to_list')}</ButtonText>
          </Button>
     );

     return (
          <>
               <Modal
                    isOpen={open}
                    onBackdropPress={() => {
                         setOpen(false);
                         setScreen('add-new');
                    }}>
                    <ModalBackdrop />
                    <ModalContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}>
                         {isLoading ?
                              <LoadingSpinner/>
                         :
                             ( screen === 'add-new' && !isEmpty(lists)) ? (
                                   <>
                                        <ModalHeader>
                                             <Heading color={textColor}>
                                                  {getTermFromDictionary(language, 'add_to_list')}
                                             </Heading>
                                             <ModalCloseButton p="$3" onPress={() => { setOpen(false); }}>
                                                  <Icon as={CloseIcon} color={textColor} />
                                             </ModalCloseButton>
                                        </ModalHeader>
                                        <ModalBody>
                                             <FormControl>
                                                  <VStack space="md">
                                                       <FormControl>
                                                            <FormControlLabel>
                                                                 <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'choose_a_list')}</FormControlLabelText>
                                                            </FormControlLabel>
                                                            <Select
                                                                 selectedValue={listId}
                                                                 defaultValue={listId}
                                                                 onValueChange={(itemValue) => {
                                                                      setListId(itemValue);
                                                                 }}>
                                                                 <SelectTrigger>
                                                                      <SelectInput py={0} color={textColor} placeholder="Select list" />
                                                                      <SelectIcon mr="$3">
                                                                           <Icon color={textColor} as={ChevronDownIcon} />
                                                                      </SelectIcon>
                                                                 </SelectTrigger>
                                                                 <SelectPortal>
                                                                      <SelectBackdrop />
                                                                      <SelectContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                                                           <SelectDragIndicatorWrapper>
                                                                                <SelectDragIndicator />
                                                                           </SelectDragIndicatorWrapper>
                                                                           <SelectScrollView>
                                                                                {map(lists, function (item, index) {
                                                                                     return <SelectItem key={index} value={item.id} label={item.title} bgColor={listId === item.id ? theme.tokens.colors.tertiary['300'] : ''} color={listId === item.id ? theme.tokens.colors.tertiary['500-text'] : textColor } />;
                                                                                })}
                                                                           </SelectScrollView>
                                                                      </SelectContent>
                                                                 </SelectPortal>
                                                            </Select>
                                                       </FormControl>
                                                       <HStack space="sm" alignItems="center">
                                                            <Text color={textColor}>{getTermFromDictionary(language, 'or')}</Text>
                                                            <Button
                                                                 bgColor={theme.tokens.colors.primary['500']}
                                                                 size="sm"
                                                                 onPress={() => {
                                                                      setScreen('create-new');
                                                                 }}>
                                                                 <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'create_new_list')}</ButtonText>
                                                            </Button>
                                                       </HStack>
                                                  </VStack>
                                             </FormControl>
                                        </ModalBody>
                                        <ModalFooter>
                                             <ButtonGroup p="$4" flexDirection="row" justifyContent="flex-end" flexWrap="wrap">
                                                  <Button
                                                       borderColor={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}
                                                       variant="outline"
                                                       onPress={() => {
                                                            setOpen(false);
                                                            setScreen('add-new');
                                                       }}>
                                                       <ButtonText color={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                                  </Button>
                                                  {!isEmpty(lists) ? (
                                                       <Button
                                                            bgColor={theme.tokens.colors.primary['500']}
                                                            isLoading={loading}
                                                            onPress={() => {
                                                                 setLoading(true);
                                                                 addTitlesToList(listId, item, library.baseUrl, source, language).then(() => {
                                                                      updateLastListUsed(listId);
                                                                      queryClient.invalidateQueries({ queryKey: ['list', listId] });
                                                                      setLoading(false);
                                                                      setOpen(false);
                                                                 });
                                                            }}>
                                                            <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'save_to_list')}</ButtonText>
                                                       </Button>
                                                  ) : (
                                                       <Button bgColor={theme.tokens.colors.primary['500']}>
                                                            <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'create_new_list')}</ButtonText>
                                                       </Button>
                                                  )}
                                             </ButtonGroup>
                                        </ModalFooter>
                                   </>
                             ) : (
                                   <>
                                        <ModalHeader>
                                             <Heading size="md" color={textColor}>
                                                  {getTermFromDictionary(language, 'create_new_list_item')}
                                             </Heading>
                                             <ModalCloseButton p="$3" onPress={() => { setOpen(false); }}>
                                                  <Icon as={CloseIcon} color={textColor} />
                                             </ModalCloseButton>
                                        </ModalHeader>
                                        <ModalBody>
                                             <Box p="$4">
                                                  <VStack space="md">
                                                       <FormControl>
                                                            <FormControlLabel>
                                                                 <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'title')}</FormControlLabelText>
                                                            </FormControlLabel>
                                                            <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                                                 <InputField id="title" onChangeText={(text) => saveTitle(text)} returnKeyType="next" color={textColor} />
                                                            </Input>
                                                       </FormControl>
                                                       <FormControl>
                                                            <FormControlLabel>
                                                                 <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'description')}</FormControlLabelText>
                                                            </FormControlLabel>
                                                            <Textarea id="description" onChangeText={(text) => saveDescription(text)} returnKeyType="next" borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                                                 <TextareaInput color={textColor} />
                                                            </Textarea>
                                                       </FormControl>
                                                       <FormControl>
                                                            <FormControlLabel>
                                                                 <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'access')}</FormControlLabelText>
                                                            </FormControlLabel>
                                                            <RadioGroup
                                                                 defaultValue="1"
                                                                 onChange={(nextValue) => {
                                                                      saveIsPublic(nextValue);
                                                                 }}>
                                                                 <HStack direction="row" alignItems="center" space="md" w="75%" maxW="300px">
                                                                      <Radio value="1" my="$1">
                                                                           <RadioIndicator mr="$2" borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                                                                <RadioIcon as={CircleIcon} color={colorMode === 'light' ? "$coolGray500" : "$warmGray300"} />
                                                                           </RadioIndicator>
                                                                           <RadioLabel color={textColor}>{getTermFromDictionary(language, 'private')}</RadioLabel>
                                                                      </Radio>
                                                                      <Radio value="0" my="$1">
                                                                           <RadioIndicator mr="$2" borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                                                                <RadioIcon as={CircleIcon} color={colorMode === 'light' ? "$coolGray500" : "$warmGray300"} />
                                                                           </RadioIndicator>
                                                                           <RadioLabel color={textColor}>{getTermFromDictionary(language, 'public')}</RadioLabel>
                                                                      </Radio>
                                                                 </HStack>
                                                            </RadioGroup>
                                                       </FormControl>
                                                       <FormControl pb="$3" name="should_add_to_list_group">
                                                            <FormControlLabel>
                                                                 <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'should_add_to_list_group')}</FormControlLabelText>
                                                            </FormControlLabel>
                                                            <Select variant="outline" size="md" selectedValue={addToGroup} accessibilityLabel={getTermFromDictionary(language, 'should_add_to_list_group')} mt="$1" mb="$2" onValueChange={(itemValue) => setAddToGroup(itemValue)}>
                                                                 <SelectTrigger>
                                                                      {addToGroup !== '' ? <SelectInput py={0} color={textColor} value={addToGroup === 'new' ? getTermFromDictionary(language, 'add_to_list_group_new') : addToGroup === 'existing' ? getTermFromDictionary(language, 'add_to_list_group_existing') : getTermFromDictionary(language, 'add_to_list_group_no')} /> : <SelectInput value={getTermFromDictionary(language, 'add_to_list_group_no')} color={textColor} />}
                                                                      <SelectIcon mr="$3" as={ChevronDownIcon} color={textColor} />
                                                                 </SelectTrigger>
                                                                 <SelectPortal>
                                                                      <SelectBackdrop />
                                                                      <SelectContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                                                           <SelectDragIndicatorWrapper>
                                                                                <SelectDragIndicator />
                                                                           </SelectDragIndicatorWrapper>
                                                                           <SelectScrollView>
                                                                                <SelectItem label={getTermFromDictionary(language, 'add_to_list_group_no')} value="no" key={1} bgColor={addToGroup === 'no' ? theme.tokens.colors.tertiary['300'] : ''} color={addToGroup === 'no' ? theme.tokens.colors.tertiary['500-text'] : textColor } />
                                                                                <SelectItem label={getTermFromDictionary(language, 'add_to_list_group_new')} value="new" key={2} bgColor={addToGroup === 'new' ? theme.tokens.colors.tertiary['300'] : ''} color={addToGroup === 'new' ? theme.tokens.colors.tertiary['500-text'] : textColor } />
                                                                                {hasListGroups && <SelectItem label={getTermFromDictionary(language, 'add_to_list_group_existing')} value="existing" key={3} bgColor={addToGroup === 'existing' ? theme.tokens.colors.tertiary['300'] : ''} color={addToGroup === 'existing' ? theme.tokens.colors.tertiary['500-text'] : textColor } />}
                                                                           </SelectScrollView>
                                                                      </SelectContent>
                                                                 </SelectPortal>
                                                            </Select>
                                                       </FormControl>
                                                       {addToGroup === 'new' && (
                                                            <>
                                                                 <FormControl pb="$2">
                                                                      <FormControlLabel>
                                                                           <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'new_list_group_name')}</FormControlLabelText>
                                                                      </FormControlLabel>
                                                                      <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                                                           <InputField id="newGroupName" onChangeText={(text) => setNewGroupName(text)} defaultValue={newGroupName} color={textColor} />
                                                                      </Input>
                                                                 </FormControl>
                                                                 {hasListGroups && (
                                                                      <FormControl pb="$2">
                                                                           <FormControlLabel>
                                                                                <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'should_nest_list_group')}</FormControlLabelText>
                                                                           </FormControlLabel>
                                                                           <Select variant="outline" size="md" name="should_nest_list_group" selectedValue={nestedGroup} accessibilityLabel={getTermFromDictionary(language, 'should_nest_list_group')} mt="$1" mb="$2" onValueChange={(itemValue) => setNestedGroup(itemValue)}>
                                                                                <SelectTrigger>
                                                                                     {nestedGroup !== 'no' && nestedGroup !== '' ? <SelectInput py={0} color={textColor} value={nestedGroup} /> : <SelectInput value={getTermFromDictionary(language, 'nest_within_group_no')} color={textColor} />}
                                                                                     <SelectIcon mr="$3" as={ChevronDownIcon} color={textColor} />
                                                                                </SelectTrigger>
                                                                                <SelectPortal>
                                                                                     <SelectBackdrop />
                                                                                     <SelectContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                                                                          <SelectDragIndicatorWrapper>
                                                                                               <SelectDragIndicator />
                                                                                          </SelectDragIndicatorWrapper>
                                                                                          <SelectScrollView>
                                                                                               <SelectItem label={getTermFromDictionary(language, 'nest_within_group_no')} value="no" key={1} bgColor={nestedGroup === 'no' ? theme.tokens.colors.tertiary['300'] : ''} color={ nestedGroup === 'no' ? theme.tokens.colors.tertiary['500-text'] : textColor } />
                                                                                               {map(Object.values(groups), function (item, index) {
                                                                                                    return <SelectItem key={index} value={item.id} label={item.title} bgColor={nestedGroup === item.id ? theme.tokens.colors.tertiary['300'] : ''} color={nestedGroup === item.id ? theme.tokens.colors.tertiary['500-text'] : textColor } />;
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
                                                            <FormControl pb="$5">
                                                                 <FormControlLabel>
                                                                      <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'choose_existing_list_group')}</FormControlLabelText>
                                                                 </FormControlLabel>
                                                                 <Select
                                                                      variant="outline" size="md"
                                                                      selectedValue={(existingGroupId !== -1) ? existingGroupId : groups[0].id}
                                                                      defaultValue={existingGroupId !== -1 ? existingGroupId : groups[0].id}
                                                                      onValueChange={(itemValue) => {
                                                                           setExistingGroupId(itemValue);
                                                                      }}>
                                                                      <SelectTrigger>
                                                                           {existingGroupId && existingGroupId !== -1 ? (
                                                                                map(Object.values(groups), function (group) {
                                                                                     if (group.id === existingGroupId) {
                                                                                          return <SelectInput py={0} placeholder={group.title} value={group.id} color={textColor} />;
                                                                                     }
                                                                                })
                                                                           ) : (
                                                                                <SelectInput py={0} value={groups[0].id} color={textColor} />
                                                                           )}
                                                                           <SelectIcon mr="$3" as={ChevronDownIcon} color={textColor} />
                                                                      </SelectTrigger>
                                                                      <SelectPortal>
                                                                           <SelectBackdrop />
                                                                           <SelectContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                                                                <SelectDragIndicatorWrapper>
                                                                                     <SelectDragIndicator />
                                                                                </SelectDragIndicatorWrapper>
                                                                                <SelectScrollView>
                                                                                     {map(Object.values(listGroups.groups), function (item, index) {
                                                                                          return <SelectItem key={index} value={item.id} label={item.title} bgColor={existingGroupId === item.id ? theme.tokens.colors.tertiary['300'] : ''} color={existingGroupId === item.id ? theme.tokens.colors.tertiary['500-text'] : textColor } />;
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
                                             <ButtonGroup p="$4" flexDirection="row" justifyContent="flex-end" flexWrap="wrap">
                                                  <Button
                                                       variant="outline"
                                                       borderColor={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}
                                                       onPress={() => {
                                                            setOpen(false);
                                                            setScreen('add-new');
                                                       }}>
                                                       <ButtonText color={colorMode === 'light' ? "$coolGray700" : "$warmGray100"}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                                  </Button>
                                                  <Button
                                                       bgColor={theme.tokens.colors.primary['500']}
                                                       isLoading={loading}
                                                       isLoadingText={getTermFromDictionary(language, 'saving', true)}
                                                       onPress={() => {
                                                            setLoading(true);
                                                            createListFromTitle(title, description, isPublic, item, library.baseUrl, source, addToGroup, nestedGroup, newGroupName).then((res) => {
                                                                 updateLastListUsed(res.listId);
                                                                 queryClient.invalidateQueries({ queryKey: ['lists', user.id, library.baseUrl, language] });
                                                                 queryClient.invalidateQueries({ queryKey: ['list_groups', user.id, library.baseUrl, language] });
                                                                 setOpen(false);
                                                                 setLoading(false);
                                                                 setScreen('add-new');
                                                            });
                                                       }}>
                                                       <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'create_list')}</ButtonText>
                                                  </Button>
                                             </ButtonGroup>
                                        </ModalFooter>
                                   </>
                             )
                         }
                    </ModalContent>
               </Modal>
               {btnStyle === 'lg' ? <RenderLargeButton /> : btnStyle === 'reg' ? <RenderRegularButton /> : <RenderSmallButton />}
          </>
     );
};

export default AddToList;
