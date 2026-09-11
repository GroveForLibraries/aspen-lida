import React, {useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import {getItemDetails} from '../../util/api/item';
import _ from 'lodash';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import {getTermFromDictionary} from '../../translations/TranslationService';
import { logDebugMessage, getErrorMessage } from '../../util/logging';
import { DisplayErrorAlertDialog } from '../../components/loadError';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedModal as Modal, ThemedModalBody as ModalBody, ThemedModalContent as ModalContent, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * ShowItemDetails component that displays a button to show item details in a modal, including available copies, location, and call number. It fetches item details from the API based on the provided library URL, item ID, and format.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
const ShowItemDetails = (props) => {
     const language = useActiveLanguage();
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
          let copies = [];
          if (copyDetails) {
               _.map(copyDetails, function(copy, index, array) {
                    copy = {
                         id: index,
                         totalCopies: copy.totalCopies,
                         availableCopies: copy.availableCopies,
                         shelfLocation: copy.shelfLocation,
                         callNumber: copy.callNumber,
                    };
                    copies = _.concat(copies, copy);
               });
          }
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
                            variant="ghost"
                            size="sm"
                            colorScheme="secondary">
                            <HStack space="xs" className="items-center">
                                 <MaterialIcons name="location-pin" size={14} className="mr-[-4px]" />
                                 <ButtonText>{getTermFromDictionary(language, 'where_is_it')}</ButtonText>
                            </HStack>
                        </Button>

                        <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="full">
                             <ModalContent>
                                  <ModalHeader>
                                       <HStack className="items-center">
                                            <MaterialIcons name="location-pin" size={14} className="mt-[2px] pr-[5px]" />
                                            <Heading>{getTermFromDictionary(language, 'where_is_it')}</Heading>
                                       </HStack>
                                  </ModalHeader>
                                  <ModalBody>
                                       <FlatList data={details} keyExtractor={(item) => item.description} ListHeaderComponent={renderHeader()} renderItem={({item}) => renderCopyDetails(item)}/>
                                  </ModalBody>
                             </ModalContent>
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
                        <Button onPress={() => setShowModal(true)} variant="ghost" size="sm" colorScheme="secondary">
                            <HStack space="xs" className="items-center">
                                 <MaterialIcons name="location-pin" size={14} className="mr-[-4px]" />
                                 <ButtonText>{getTermFromDictionary(language, 'where_is_it')}</ButtonText>
                            </HStack>
                        </Button>

                        <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="full">
                             <ModalContent>
                                  <ModalHeader>
                                       <HStack className="items-center">
                                            <MaterialIcons name="location-pin" size={14} className="mt-[2px] pr-[5px]" />
                                            <Heading>{getTermFromDictionary(language, 'where_is_it')}</Heading>
                                       </HStack>
                                  </ModalHeader>
                                  <ModalBody>
                                       <FlatList data={copies} ListHeaderComponent={renderHeader()} renderItem={({item}) => renderCopyDetails(item)} keyExtractor={(item, index) => index.toString()}/>
                                  </ModalBody>
                             </ModalContent>
                        </Modal>
                   </Center>
              </SafeAreaView>
          );
     }
};

/**
 * Renders the header for the copy details list, displaying column titles for available copies, location, and call number.
 * @returns {React.JSX.Element}
 */
const renderHeader = () => {
    const language = useActiveLanguage();
     return (
         <HStack space="md" className="justify-between pb-2">
              <Text bold size="xs" className="w-[30%]">
                  {getTermFromDictionary(language, 'available_copies')}
              </Text>
              <Text bold size="xs" className="w-[30%]">
                  {getTermFromDictionary(language, 'location')}
              </Text>
              <Text bold size="xs" className="w-[30%]">
                  {getTermFromDictionary(language, 'call_num')}
              </Text>
         </HStack>
     );
};

/**
 * Renders the details of a single copy, displaying the number of available copies, shelf location, and call number in a horizontal stack.
 * @param item
 * @returns {React.JSX.Element}
 */
const renderCopyDetails = (item) => {
     return (
         <HStack space="md" className="justify-between">
              <Text size="xs" className="w-[30%]">
                   {item.availableCopies} of {item.totalCopies}
              </Text>
              <Text size="xs" className="w-[30%]">
                   {item.shelfLocation}
              </Text>
              <Text size="xs" className="w-[30%]">
                   {item.callNumber}
              </Text>
         </HStack>
     );
};

export default ShowItemDetails;
