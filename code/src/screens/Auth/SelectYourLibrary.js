import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { filter, isEmpty, sortBy } from '../../helpers/helpers';
import {
     Box,
     Button,
     ButtonText,
     ButtonIcon,
     Center,
     FlatList,
     HStack,
     Icon,
     Image,
     Input,
     InputField,
     Modal,
     ModalContent,
     ModalHeader,
     ModalCloseButton,
     Pressable,
     Text,
     Heading,
     VStack, ModalBackdrop, CloseIcon, ModalBody, InputIcon, InputSlot } from '@gluestack-ui/themed';
import React from 'react';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PermissionsPrompt } from '../../components/PermissionsPrompt';

// custom components and helper files
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useKeyboard } from '../../hooks/hooks';

import { logDebugMessage, getErrorMessage } from '../../util/logging';
import { useTheme } from '../../themes/theme';

export const SelectYourLibrary = (payload) => {
     const isKeyboardOpen = useKeyboard();
     const { theme, textColor, colorMode } = useTheme();
     const { isCommunity, showModal, setShowModal, updateSelectedLibrary, selectedLibrary, shouldRequestPermissions, permissionRequested, libraries, allLibraries, setShouldRequestPermissions } = payload;
     const [query, setQuery] = React.useState('');
     const screenHeight = Dimensions.get('window').height;
     const insets = useSafeAreaInsets();

     const updateStatus = async () => {};

     const clearSearch = () => {
          setQuery('');
     };

     function FilteredLibraries() {
          let haystack = libraries;

          if (!isEmpty(query) && query !== ' ') {
               haystack = allLibraries;

               if (!isCommunity) {
                    haystack = libraries;
               }
          }

          if (!isCommunity) {
               haystack = filter(haystack, function (branch) {
                    return branch.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
               });
               if (!isEmpty(query) && query !== ' ') {
                    return sortBy(haystack, ['name', 'librarySystem']);
               }else{
                    return haystack;
               }
          }

          return filter(haystack, function (branch) {
               return branch.name.toLowerCase().indexOf(query.toLowerCase()) > -1 || branch.librarySystem.toLowerCase().indexOf(query.toLowerCase()) > -1;
          });
     }

     const filteredLibraries = FilteredLibraries(libraries);

     if (libraries.length == 0 && allLibraries.length == 0)
     {
	     return <Center><Text>{getTermFromDictionary('en', 'error_no_library_connection')}</Text></Center>
     }

     if (shouldRequestPermissions && showModal) {
          return <PermissionsPrompt promptTitle="permissions_location_title" promptBody="permissions_location_body" setShouldRequestPermissions={setShouldRequestPermissions} updateStatus={updateStatus} />;
     }

     return (
          <Center>
               <Button onPress={() => setShowModal(true)} m="$5" size="md" bgColor={theme.tokens.colors.primary['500']}>
                    <ButtonIcon as={MaterialIcons} name="place" mr="$1" color={theme.tokens.colors.primary['500-text']} />
                    <ButtonText color={theme.tokens.colors.primary['500-text']}>{selectedLibrary?.name ? selectedLibrary.name : getTermFromDictionary('en', 'select_your_library')}</ButtonText>
               </Button>
               <Modal isOpen={showModal} size="lg" avoidKeyboard onClose={() => setShowModal(false)}>
                    <ModalBackdrop />
                    <ModalContent
                         bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}
                         h={filteredLibraries.length === 0 ? "auto" : isKeyboardOpen ? "65%" : "80%"}
                         maxH={filteredLibraries.length === 0 ? "400" : isKeyboardOpen ? "65%" : "80%"}
                         marginTop={isKeyboardOpen ? insets.top + 16 : "auto"}
                         marginBottom={isKeyboardOpen ? "auto" : "auto"}
                    >
                         <ModalHeader borderBottomWidth="$1" borderBottomColor={colorMode === 'light' ? "$warmGray300" : "$coolGray500"}>
                              <Heading size="md" color={textColor}>{getTermFromDictionary('en', 'find_your_library')}</Heading>
                              <ModalCloseButton p="$3" onPress={() => { setShowModal(false); }}>
                                   <Icon as={CloseIcon} color={textColor} />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              <Box bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"} p="$2" pb={query ? 0 : 5}>
                                   <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                        <InputField variant="filled"
                                             size="$lg"
                                             autoCorrect={false}
                                             status="info"
                                             placeholder={getTermFromDictionary('en', 'search')}
                                             value={query}
                                             onChangeText={(text) => setQuery(text)}
                                             color={textColor}
                                        />
                                        {query ? <InputSlot onPress={() => clearSearch()}>
                                             <InputIcon as={MaterialCommunityIcons} name="close-circle" mr="$2" color={textColor} />
                                        </InputSlot> : null}
                                   </Input>
                              </Box>
                              <VStack>
                                   {filteredLibraries.map((item, index) => (
                                        <Item
                                             key={index}
                                             data={item}
                                             isCommunity={isCommunity}
                                             setShowModal={setShowModal}
                                             updateSelectedLibrary={updateSelectedLibrary}
                                             textColor={textColor}
                                             colorMode={colorMode}
                                             theme={theme}
                                        />
                                   ))}
                              </VStack>
                         </ModalBody>
                    </ModalContent>
                </Modal>
          </Center>
     );
};

const Item = (data) => {
     const library = data.data;
     const libraryIcon = library.favicon;
     const { isCommunity, setShowModal, updateSelectedLibrary, textColor, colorMode, theme } = data;

     const handleSelect = () => {
          updateSelectedLibrary(library);
          setShowModal(false);
     };

     return (
          <Pressable borderBottomWidth="$1" borderBottomColor={colorMode === 'light' ? "$warmGray300" : "$coolGray500"} onPress={handleSelect} pl="$4" pr="$5" py="$2">
               <HStack space="$5" alignItems="center">
                    {libraryIcon ? (
                         <Image
                              key={library.name}
                              source={{ uri: libraryIcon }}
                              fallbackSource={require('../../themes/default/aspenLogo.png')}
                              alt={library.name}
                              size="xs"
                              borderRadius="$full"
                         />
                    ) : (
                         <Box
                              borderRadius="$full"
                              size="xs"
                         />
                    )}
                    <VStack ml="$3">
                         <Text bold size="sm" color={textColor}>
                              {library.name}
                         </Text>
                         {isCommunity ? (
                              <Text size="sm" color={textColor}>
                                   {library.librarySystem}
                              </Text>
                         ) : null}
                    </VStack>
               </HStack>
          </Pressable>
     );
};
