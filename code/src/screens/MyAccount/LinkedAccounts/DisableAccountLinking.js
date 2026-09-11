import React, { useState } from 'react';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { useUserState, useUpdateUserProfile, useUpdateAccounts, useUpdateViewers } from '@/src/hooks/useUserData';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { disableAccountLinking, refreshProfile, getLinkedAccounts, getViewerAccounts } from '@/src/util/api/user';
import { formatLinkedAccounts } from '@/src/util/api/userHelper';
import { toArray } from '@/src/helpers/helpers';
import { useActiveLanguage } from '@/src/hooks/useLanguageData';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { ThemedCloseIcon as CloseIcon } from '@/src/components/themed/ThemedFormControls';

/**
 * DisableAccountLinking component that allows users to disable account linking. It displays a button that opens a modal where users can confirm disabling account linking. The component handles API calls to disable account linking and refreshes the linked accounts, viewer accounts, and user profile upon successful completion.
 * @returns {React.JSX.Element}
 * @constructor
 */
const DisableAccountLinking = () => {
     const library = useLibrary();
     const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const updateAccounts = useUpdateAccounts();
     const updateViewers = useUpdateViewers();
     const [loading, setLoading] = useState(false);
     const [showModal, setShowModal] = useState(false);

     const toggle = () => {
          setShowModal(!showModal);
          setLoading(false);
     };

     const refreshLinkedAccounts = async () => {
          const linkedResponse = await getLinkedAccounts(library.baseUrl, language);
          if (linkedResponse?.ok) {
               const formatted = formatLinkedAccounts(user, [], library.barcodeStyle, linkedResponse.data.result.linkedAccounts);
               await updateAccounts(formatted.accounts);
          }

          const viewerResponse = await getViewerAccounts(library.baseUrl, language);
          if (viewerResponse?.ok) {
               const viewerList = toArray(viewerResponse.data?.result?.viewers ?? []);
               await updateViewers(viewerList);
          }

          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     };

     return (
          <Center>
               <Button onPress={toggle} colorScheme="primary">
                    <ButtonText>{getTermFromDictionary(language, 'disable_linked_accounts')}</ButtonText>
               </Button>
               <Modal isOpen={showModal} onClose={toggle} size="lg">
                    <ModalBackdrop />
                    <ModalContent className="max-w-[95%]">
                         <ModalHeader>
                              <Heading>{getTermFromDictionary(language, 'disable_linked_accounts_title')}</Heading>
                              <ModalCloseButton onPress={toggle}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody>
                              <Text>{getTermFromDictionary(language, 'disable_linked_accounts_body')}</Text>
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup>
                                   <Button colorScheme="primary" variant="link" onPress={toggle}>
                                       <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                   <Button
                                       colorScheme="primary"
                                        isLoading={loading}
                                        isLoadingText={getTermFromDictionary(language, 'updating', true)}
                                        onPress={async () => {
                                             setLoading(true);
                                             await disableAccountLinking(library.baseUrl).then(async (r) => {
                                                  await refreshLinkedAccounts();
                                                  toggle();
                                             });
                                        }}>
                                      <ButtonText>{getTermFromDictionary(language, 'accept')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </Center>
     );
};

export default DisableAccountLinking;
