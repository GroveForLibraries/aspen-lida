import { ThemedMaterialCommunityIcons as MaterialCommunityIcons, ThemedMaterialIcons as MaterialIcons } from '../../components/themed/ThemedMaterialIcons';
import { filter, isEmpty, sortBy } from '../../helpers/helpers';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PermissionsPrompt } from '../../components/PermissionsPrompt';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useKeyboard } from '../../hooks/hooks';
import { useTheme, TOKENS } from '../../themes/theme';
import { ThemedCloseIcon as CloseIcon, ThemedInput as Input, ThemedInputField as InputField, ThemedInputSlot as InputSlot } from '../../components/themed/ThemedFormControls';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { Image } from 'expo-image';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';

/**
 * SelectYourLibrary component that displays a button to select a library and a modal with a searchable list of libraries.
 * @param payload
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SelectYourLibrary = (payload) => {
     const isKeyboardOpen = useKeyboard();
     const { neutralPairs, brand, textColor, colorMode } = useTheme();
     const surfaceBg = colorMode === 'light' ? (neutralPairs?.surface?.light ?? TOKENS.semanticTokens.light.surface) : (neutralPairs?.surface?.dark ?? TOKENS.semanticTokens.dark.surface);
     const surfaceMutedBg = colorMode === 'light' ? (neutralPairs?.surfaceMuted?.light ?? TOKENS.semanticTokens.light.surfaceMuted) : (neutralPairs?.surfaceMuted?.dark ?? TOKENS.semanticTokens.dark.surfaceMuted);
     const borderColor = colorMode === 'light' ? (neutralPairs?.border?.light ?? TOKENS.semanticTokens.light.border) : (neutralPairs?.border?.dark ?? TOKENS.semanticTokens.dark.border);
     const { isCommunity, showModal, setShowModal, updateSelectedLibrary, selectedLibrary, shouldRequestPermissions, libraries, allLibraries, setShouldRequestPermissions } = payload;
     const [query, setQuery] = React.useState('');
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
     const hasSearchQuery = !isEmpty(query) && query.trim() !== '';
     const hasNoResults = hasSearchQuery && filteredLibraries.length === 0;

     if (libraries.length === 0 && allLibraries.length === 0)
     {
	     return <Center><Text>{getTermFromDictionary('en', 'error_no_library_connection')}</Text></Center>
     }

     if (shouldRequestPermissions && showModal) {
          return (
               <PermissionsPrompt promptTitle="permissions_location_title" promptBody="permissions_location_body" setShouldRequestPermissions={setShouldRequestPermissions} updateStatus={updateStatus} setShowModal={setShowModal} />
          );
     }

     return (
          <Center>
               <Button onPress={() => setShowModal(true)} size="md" colorScheme="primary" className="m-5">
                    <MaterialIcons name="place" size={18} color={brand.primary['500-text']} className="mr-1" />
                    <ButtonText>{selectedLibrary?.name ? selectedLibrary.name : getTermFromDictionary('en', 'select_your_library')}</ButtonText>
               </Button>
               <Modal isOpen={showModal} size="lg" onClose={() => setShowModal(false)}>
                    <ModalBackdrop />
                    <ModalContent
                         style={{
                              backgroundColor: surfaceBg,
                              height: isKeyboardOpen ? '65%' : '80%',
                              maxHeight: 500,
                              minHeight: hasNoResults ? 260 : undefined,
                              marginTop: isKeyboardOpen ? insets.top + 16 : undefined,
                         }}
                    >
                         <ModalHeader style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}>
                              <Heading>{getTermFromDictionary('en', 'find_your_library')}</Heading>
                              <ModalCloseButton onPress={() => { setShowModal(false); }}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody className="flex-1" scrollEnabled={true} style={{ minHeight: hasNoResults ? 180 : undefined }}>
                              <Box className="p-2" style={{ paddingBottom: query ? 0 : 5 }}>
                                   <Input style={{ borderColor }}>
                                        <InputField
                                             size="lg"
                                             autoCorrect={false}
                                             placeholder={getTermFromDictionary('en', 'search')}
                                             value={query}
                                             onChangeText={(text) => setQuery(text)}
                                        />
                                        {query ? <InputSlot onPress={() => clearSearch()}>
                                            <MaterialCommunityIcons name="close-circle" size={20} />
                                        </InputSlot> : null}
                                   </Input>
                              </Box>
                              {hasNoResults ? (
                                   <VStack className="items-center justify-center px-4 py-6" space="sm" style={{ minHeight: 120 }}>
                                        <Text size="sm" style={{ opacity: 0.7 }}>No libraries match your search.</Text>
                                   </VStack>
                              ) : (
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
                                                  neutralPairs={neutralPairs}
                                             />
                                        ))}
                                   </VStack>
                              )}
                         </ModalBody>
                    </ModalContent>
                </Modal>
          </Center>
     );
};

const Item = (data) => {
     const library = data.data;
     const libraryIcon = library.favicon;
     const { isCommunity, setShowModal, updateSelectedLibrary, textColor, colorMode, neutralPairs } = data;

     const handleSelect = () => {
          updateSelectedLibrary(library);
          setShowModal(false);
     };

     return (
          <Pressable className="pl-4 pr-5 py-2" style={{ borderBottomWidth: 1, borderBottomColor: colorMode === 'light' ? (neutralPairs?.border?.light ?? TOKENS.semanticTokens.light.border) : (neutralPairs?.border?.dark ?? TOKENS.semanticTokens.dark.border) }} onPress={handleSelect}>
               <HStack space="lg" className="items-center">
                    {libraryIcon ? (
                         <Image
                              key={library.name}
                              source={libraryIcon}
                              alt={library.name}
                              className="rounded-full"
                              style={{ width: 26, height: 26 }}
                         />
                    ) : (
                         <Box
                              size="xs"
                              className="rounded-[999px]"
                         />
                    )}
                    <VStack className="flex-1 shrink">
                         <Text bold size="sm" style={{ flexShrink: 1 }}>
                              {library.name}
                         </Text>
                         {isCommunity ? (
                              <Text size="sm" style={{ flexShrink: 1 }}>
                                   {library.librarySystem}
                              </Text>
                         ) : null}
                    </VStack>
               </HStack>
          </Pressable>
     );
};
