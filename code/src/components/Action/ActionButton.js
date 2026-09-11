import { isObject } from '../../helpers/helpers';
import { CheckedOutToYou } from './CheckedOutToYou';
import { CheckOut } from './CheckOut/CheckOut';
import { PlaceHold } from './Holds/PlaceHold';
import { StartLocalIllRequest } from './Holds/LocalIllRequest';
import { StartLocalIllRequestEmail } from './Holds/LocalIllRequestEmail';
import { LoadOverDriveSample } from './LoadOverDriveSample';
import { MoreInfo } from './MoreInfo';
import { OnHoldForYou } from './OnHoldForYou';
import { OpenSideLoad } from './OpenSideLoad';
import {
     Button,
     ButtonText,
     CloseIcon,
     Heading,
     Icon,
     Modal,
     ModalBackdrop,
     ModalContent,
     ModalBody,
     ModalHeader,
     ModalCloseButton,
     Text } from '@gluestack-ui/themed';
import React, { useContext, useState } from 'react';

import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState } from '../../hooks/useUserData';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../themes/theme';
import { passUserToDiscovery } from '../../util/api/user';

export const ActionButton = (data) => {
     const {theme, textColor, backgroundColor, colorMode} = useTheme();
     const library = useLibrary();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const [showIllUnavailableModal, setShowIllUnavailableModal] = useState(false);

     const action = data.actions;
     const {
          volumeInfo,
          groupedWorkId,
          fullRecordId,
          recordSource,
          title,
          author,
          publisher,
          isbn,
          oclcNumber,
          holdTypeForFormat,
          variationId,
          prevRoute,
          response,
          setResponse,
          responseIsOpen,
          setResponseIsOpen,
          onResponseClose,
          cancelResponseRef,
          holdConfirmationResponse,
          setHoldConfirmationResponse,
          holdConfirmationIsOpen,
          setHoldConfirmationIsOpen,
          onHoldConfirmationClose,
          cancelHoldConfirmationRef,
          language,
          holdSelectItemResponse,
          setHoldSelectItemResponse,
          holdItemSelectIsOpen,
          setHoldItemSelectIsOpen,
          onHoldItemSelectClose,
          cancelHoldItemSelectRef,
          userHasAlternateLibraryCard,
          shouldPromptAlternateLibraryCard,
          onBeforeNavigate } = data;
     if (isObject(action)) {
          if (action.type === 'overdrive_sample') {
               return <LoadOverDriveSample title={action.title} prevRoute={prevRoute} id={fullRecordId} type={action.type} sampleNumber={action.sampleNumber} formatId={action.formatId} />;
          } else if (action.type === 'project_palace_sample') {
               return null;
          } else if (action.url === '/MyAccount/CheckedOut') {
               return <CheckedOutToYou title={action.title} prevRoute={prevRoute} onBeforeNavigate={onBeforeNavigate} />;
          } else if (action.url === '/MyAccount/Holds') {
               return <OnHoldForYou title={action.title} prevRoute={prevRoute} onBeforeNavigate={onBeforeNavigate} />;
          } else if (action.type === 'ils_hold') {
               return (
                    <PlaceHold
                         language={language}
                         title={action.title}
                         id={groupedWorkId}
                         type={action.type}
                         record={fullRecordId}
                         holdTypeForFormat={holdTypeForFormat}
                         variationId={variationId}
                         volumeInfo={volumeInfo}
                         volumeId={action.volumeId}
                         volumeName={action.volumeName}
                         prevRoute={prevRoute}
                         setResponseIsOpen={setResponseIsOpen}
                         responseIsOpen={responseIsOpen}
                         onResponseClose={onResponseClose}
                         cancelResponseRef={cancelResponseRef}
                         response={response}
                         setResponse={setResponse}
                         setHoldConfirmationIsOpen={setHoldConfirmationIsOpen}
                         holdConfirmationIsOpen={holdConfirmationIsOpen}
                         onHoldConfirmationClose={onHoldConfirmationClose}
                         cancelHoldConfirmationRef={cancelHoldConfirmationRef}
                         holdConfirmationResponse={holdConfirmationResponse}
                         setHoldConfirmationResponse={setHoldConfirmationResponse}
                         setHoldItemSelectIsOpen={setHoldItemSelectIsOpen}
                         holdItemSelectIsOpen={holdItemSelectIsOpen}
                         onHoldItemSelectClose={onHoldItemSelectClose}
                         cancelHoldItemSelectRef={cancelHoldItemSelectRef}
                         holdSelectItemResponse={holdSelectItemResponse}
                         setHoldSelectItemResponse={setHoldSelectItemResponse}
                         userHasAlternateLibraryCard={userHasAlternateLibraryCard}
                         shouldPromptAlternateLibraryCard={shouldPromptAlternateLibraryCard}
                         recordSource={recordSource}
                    />
               );
          } else if (action.type === 'local_ill_request') {
               return (
                    <StartLocalIllRequest
                         title={action.title}
                         record={fullRecordId}
                         id={groupedWorkId}
                         workTitle={title}
                         holdTypeForFormat={holdTypeForFormat}
                         variationId={variationId}
                         volumeInfo={volumeInfo}
                         volumeId={action.volumeId}
                         volumeName={action.volumeName}
                         prevRoute={prevRoute}
                         setResponseIsOpen={setResponseIsOpen}
                         responseIsOpen={responseIsOpen}
                         onResponseClose={onResponseClose}
                         cancelResponseRef={cancelResponseRef}
                         response={response}
                         setResponse={setResponse}
                         setHoldConfirmationIsOpen={setHoldConfirmationIsOpen}
                         holdConfirmationIsOpen={holdConfirmationIsOpen}
                         onHoldConfirmationClose={onHoldConfirmationClose}
                         cancelHoldConfirmationRef={cancelHoldConfirmationRef}
                         holdConfirmationResponse={holdConfirmationResponse}
                         setHoldConfirmationResponse={setHoldConfirmationResponse}
                         onBeforeNavigate={onBeforeNavigate}
                    />
               );
          } else if (action.type === 'local_ill_request_material_request') {
               //logDebugMessage("Title has a local_ill_request_material_request action");
               return (
                    <Button
                         size="md"
                         bgColor={theme.tokens.colors.primary['500']}
                         variant="solid"
                         minWidth="100%"
                         maxWidth="100%"
                         onPress={async () =>
                           await passUserToDiscovery(library?.baseUrl ?? '', 'NewMaterialRequest', user.id, backgroundColor, textColor, null, action.redirectParams)
                         }
                    >
                         <ButtonText color={theme.tokens.colors.primary['500-text']}>{action.title}</ButtonText>
                    </Button>
               );
          } else if (action.type === 'local_ill_request_material_request_ils') {
               //logDebugMessage("Title has a local_ill_request_material_request_ils action");
               return (
                    <Button
                         size="md"
                         bgColor={theme.tokens.colors.primary['500']}
                         variant="solid"
                         minWidth="100%"
                         maxWidth="100%"
                         onPress={async () =>
                           await passUserToDiscovery(library?.baseUrl ?? '', 'NewMaterialRequestIls', user.id, backgroundColor, textColor, null, action.redirectParams)
                         }
                    >
                         <ButtonText color={theme.tokens.colors.primary['500-text']}>{action.title}</ButtonText>
                    </Button>
               );
          } else if (action.type === 'local_ill_request_external_request') {
               //logDebugMessage("Title has a local_ill_request_external_request action");
               //logDebugMessage(action);
               return (
                    <Button
                         size="md"
                         bgColor={theme.tokens.colors.primary['500']}
                         variant="solid"
                         minWidth="100%"
                         maxWidth="100%"
                         onPress={async () =>
                              {
                                   const browserParams = {
                                        enableDefaultShareMenuItem: false,
                                        presentationStyle: 'automatic',
                                        showTitle: false,
                                        toolbarColor: backgroundColor,
                                        controlsColor: textColor,
                                        secondaryToolbarColor: backgroundColor };
                                   await WebBrowser.openBrowserAsync(action.redirectParams.url, browserParams);
                              }
                         }
                    >
                         <ButtonText color={theme.tokens.colors.primary['500-text']}>{action.title}</ButtonText>
                    </Button>
               );
          } else if (action.type === 'local_ill_request_email') {
               //logDebugMessage("Title has a local_ill_request_email action");
               //logDebugMessage(action);
               return (
                    <StartLocalIllRequestEmail
                         title={action.title}
                         workTitle={action.redirectParams.title}
                         workAuthor={action.redirectParams.author}
                         volumeName={action.redirectParams.volume}
                         recordId={action.redirectParams.recordId}
                         onBeforeNavigate={onBeforeNavigate}
                    />
               );
          } else if (action.type === 'local_ill_request_unavailable') {
               //logDebugMessage("Title has a local_ill_request_unavailable action");
               //logDebugMessage(action);
               return (
                    <>
                         <Button
                              size="md"
                              bgColor={theme.tokens.colors.primary['500']}
                              variant="solid"
                              minWidth="100%"
                              maxWidth="100%"
                              onPress={async () => {setShowIllUnavailableModal(true)}}
                         >
                              <ButtonText color={theme.tokens.colors.primary['500-text']}>{action.title}</ButtonText>
                         </Button>
                         <Modal isOpen={showIllUnavailableModal} size="lg" avoidKeyboard={true} onClose={() => setShowIllUnavailableModal(false)}>
                              <ModalBackdrop />
                              <ModalContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}>
                                   <ModalHeader>
                                        <Heading size="md" color={textColor}>{action.title}</Heading>
                                        <ModalCloseButton p="$3" onPress={() => { setShowIllUnavailableModal(false); }}>
                                             <Icon as={CloseIcon} color={textColor} />
                                        </ModalCloseButton>
                                   </ModalHeader>

                                   <ModalBody><Text color={textColor}>{action.message}</Text></ModalBody>
                              </ModalContent>
                         </Modal>
                    </>
               );
          } else if (action.type === 'more_info_link') {
               return (
                    <MoreInfo
                         source={action.source}
                         title={action.title}
                         groupedWorkId={action.groupedWorkId}
                         module={action.module}
                         recordId={action.recordId}
                    />
               );
          } else if (action.redirectUrl !== undefined) {
               return <OpenSideLoad title={action.title} url={action.redirectUrl} prevRoute={prevRoute} />;
          } else if (action.type === "hoopla_access_online") {
               return <OpenSideLoad title={action.title} url={action.url} prevRoute={prevRoute} />;
          } else {
               return (
                    <CheckOut
                         title={action.title}
                         type={action.type}
                         id={groupedWorkId}
                         record={fullRecordId}
                         holdTypeForFormat={holdTypeForFormat}
                         variationId={variationId}
                         volumeInfo={volumeInfo}
                         prevRoute={prevRoute}
                         setResponseIsOpen={setResponseIsOpen}
                         responseIsOpen={responseIsOpen}
                         onResponseClose={onResponseClose}
                         cancelResponseRef={cancelResponseRef}
                         response={response}
                         setResponse={setResponse}
                         setHoldConfirmationIsOpen={setHoldConfirmationIsOpen}
                         holdConfirmationIsOpen={holdConfirmationIsOpen}
                         onHoldConfirmationClose={onHoldConfirmationClose}
                         cancelHoldConfirmationRef={cancelHoldConfirmationRef}
                         holdConfirmationResponse={holdConfirmationResponse}
                         setHoldConfirmationResponse={setHoldConfirmationResponse}
                         userHasAlternateLibraryCard={userHasAlternateLibraryCard}
                         shouldPromptAlternateLibraryCard={shouldPromptAlternateLibraryCard}
                         recordSource={recordSource}
                    />
               );
          }
     }

     return null;
};
