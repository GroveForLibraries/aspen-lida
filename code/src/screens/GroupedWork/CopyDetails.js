import React, {useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button, ButtonText, Center, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, HStack, Text, Icon, FlatList, Heading} from '@gluestack-ui/themed';
import {MaterialIcons} from '@expo/vector-icons';
import {getItemDetails} from '../../util/api/item';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import {useQueryClient} from '@tanstack/react-query';
import {getTermFromDictionary} from '../../translations/TranslationService';
import { logDebugMessage, getErrorMessage } from '../../util/logging';
import { DisplayErrorAlertDialog } from '../../components/loadError';

/*const CopyDetails = (props) => {
 const library = useLibrary();
 const [open, setOpen] = React.useState(false);
 const toggleModal = () => {
 setOpen(!open);
 };
 const [loading, setLoading] = React.useState(false);
 };*/

const ShowItemDetails = (props) => {
     const library = useLibrary();
     const language = useActiveLanguage();
     const queryClient = useQueryClient();
     const {
          data,
          title,
          id,
          format,
          libraryUrl,
          copyDetails,
          discoveryVersion
     } = props;
     const [showModal, setShowModal] = useState(false);
     const [details, setDetails] = React.useState('');
     const [shouldFetch, setShouldFetch] = React.useState(true);
     const loading = React.useCallback(() => setShouldFetch(true), []);
     const [errorDetails, setErrorDetails] = React.useState(null);
     const [showErrorDialog, setShowErrorDialog] = React.useState(false);

     let copies = copyDetails;

     if (discoveryVersion <= '22.12.01') {
          copies = Array.isArray(copyDetails)
               ? copyDetails.map((copy, index) => {
                    return {
                         id: index,
                         totalCopies: copy.totalCopies,
                         availableCopies: copy.availableCopies,
                         shelfLocation: copy.shelfLocation,
                         callNumber: copy.callNumber,
                    };
               })
               : [];
     }

     if (discoveryVersion <= '22.09.01') {
          React.useEffect(() => {
               if (!loading) {
                    return;
               }

               const loadItemDetails = async () => {
                    if (typeof id !== 'undefined' && format !== null) {
                         await getItemDetails(libraryUrl, id, format).then((response) => {
                              setShouldFetch(false);
                              setDetails(response.result);
                         });
                    }
               };
               loadItemDetails();
          }, [loading]);

          return (
              <SafeAreaView>
                   <Center>
                        <Button
                            onPress={() => {
                                 getItemDetails(libraryUrl, id, format).then((response) => {
                                      if(response.ok) {
                                           setDetails(response.data.result);
                                           setShowModal(true);
                                      } else {
                                           logDebugMessage("Error fetching items details for item ID: " + id);
                                           logDebugMessage(response);
                                           const error = getErrorMessage(response.code ?? 0, response.problem);
                                           setShowErrorDialog(true);
                                           setErrorDetails(error)
                                      }
                                 });
                            }}
                            colorScheme="tertiary"
                            variant="ghost"
                            size="sm"
                            leftIcon={<Icon as={MaterialIcons} name="location-pin" size="xs" mr="-1"/>}>
                             {getTermFromDictionary(language, 'where_is_it')}
                        </Button>

                        <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="full">
                             <Modal.Content maxWidth="90%" bg="white" _dark={{bg: 'coolGray.800'}}>
                                  <Modal.CloseButton/>
                                  <Modal.Header>
                                       <HStack>
                                            <Icon as={MaterialIcons} name="location-pin" size="xs" mt=".5" pr={5}/>
                                            <Heading size="sm">{getTermFromDictionary(language, 'where_is_it')}</Heading>
                                       </HStack>
                                  </Modal.Header>
                                  <Modal.Body>
                                       <FlatList data={details} keyExtractor={(item) => item.description} ListHeaderComponent={renderHeader()} renderItem={({item}) => renderCopyDetails(item)}/>
                                  </Modal.Body>
                             </Modal.Content>
                        </Modal>
                        {showErrorDialog && (
                             <DisplayErrorAlertDialog title={errorDetails.title} message={errorDetails.message} />
                        )}
                   </Center>
              </SafeAreaView>
          );
     } else {
          return (
              <SafeAreaView>
                   <Center>
                        <Button onPress={() => setShowModal(true)} colorScheme="tertiary" variant="ghost" size="sm" leftIcon={<Icon as={MaterialIcons} name="location-pin" size="xs" mr="-1"/>}>
                            {getTermFromDictionary(language, 'where_is_it')}
                        </Button>

                        <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="full">
                             <Modal.Content maxWidth="90%" bg="white" _dark={{bg: 'coolGray.800'}}>
                                  <Modal.CloseButton/>
                                  <Modal.Header>
                                       <HStack>
                                            <Icon as={MaterialIcons} name="location-pin" size="xs" mt=".5" pr={5}/>
                                            <Heading size="sm">{getTermFromDictionary(language, 'where_is_it')}</Heading>
                                       </HStack>
                                  </Modal.Header>
                                  <Modal.Body>
                                       <FlatList data={copies} ListHeaderComponent={renderHeader()} renderItem={({item}) => renderCopyDetails(item)} keyExtractor={(item, index) => index.toString()}/>
                                  </Modal.Body>
                             </Modal.Content>
                        </Modal>
                   </Center>
              </SafeAreaView>
          );
     }
};

const renderHeader = () => {
    const language = useActiveLanguage();
     return (
         <HStack space={4} justifyContent="space-between" pb={2}>
              <Text bold w="30%" fontSize="$xs">
                  {getTermFromDictionary(language, 'available_copies')}
              </Text>
              <Text bold w="30%" fontSize="$xs">
                  {getTermFromDictionary(language, 'location')}
              </Text>
              <Text bold w="30%" fontSize="$xs">
                  {getTermFromDictionary(language, 'call_num')}
              </Text>
         </HStack>
     );
};

const renderCopyDetails = (item) => {
     return (
         <HStack space={4} justifyContent="space-between">
              <Text w="30%" fontSize="$xs">
                   {item.availableCopies} of {item.totalCopies}
              </Text>
              <Text w="30%" fontSize="$xs">
                   {item.shelfLocation}
              </Text>
              <Text w="30%" fontSize="$xs">
                   {item.callNumber}
              </Text>
         </HStack>
     );
};

export default ShowItemDetails;
