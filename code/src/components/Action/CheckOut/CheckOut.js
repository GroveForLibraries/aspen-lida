import {
     Box,
     Button,
     ButtonSpinner,
     ButtonGroup,
     ButtonIcon,
     ButtonText,
     Text,
     Heading,
     Icon,
     CloseIcon,
     Modal,
     ModalBackdrop,
     ModalContent,
     ModalHeader,
     ModalCloseButton,
     ModalBody,
     ModalFooter,
     FormControl,
     FormControlLabel,
     FormControlLabelText,
     Input,
     InputField,
     InputSlot,
     InputIcon
} from '@gluestack-ui/themed';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EyeOff, Eye } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';

// custom components and helper files

import { useLibrary } from '../../../hooks/useLibrarySystemData';
import { useUserState, useAccounts, useUpdateUserProfile } from '../../../hooks/useUserData';
import { decodeHTML } from '../../../helpers/helpers';
import { completeAction } from '../../../util/api/userHelper';
import { refreshProfile, updateAlternateLibraryCard } from '../../../util/api/user';
import { HoldPrompt } from '../Holds/HoldPrompt';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { logDebugMessage, logWarnMessage, getErrorMessage } from '../../../util/logging';
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useTheme } from '../../../themes/theme';

export const CheckOut = (props) => {
     const queryClient = useQueryClient();
     const { id, title, type, record, prevRoute, response, setResponse, responseIsOpen, setResponseIsOpen, onResponseClose, cancelResponseRef, holdConfirmationResponse, setHoldConfirmationResponse, holdConfirmationIsOpen, setHoldConfirmationIsOpen, onHoldConfirmationClose, cancelHoldConfirmationRef, userHasAlternateLibraryCard, shouldPromptAlternateLibraryCard } = props;
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: accounts } = useAccounts();
     const updateUserProfile = useUpdateUserProfile();
     const library = useLibrary();
     const language = useActiveLanguage();
     const [loading, setLoading] = React.useState(false);
     const { theme, colorMode, textColor } = useTheme();
     const availableAccounts = Object.values(accounts ?? {});

     const volumeInfo = {
          numItemsWithVolumes: 0,
          numItemsWithoutVolumes: 1,
          hasItemsWithoutVolumes: true,
          majorityOfItemsHaveVolumes: false };

     const refreshAndSaveUserProfile = React.useCallback(async () => {
          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     }, [library.baseUrl, updateUserProfile]);

     if (availableAccounts.length > 0) {
          return (
               <HoldPrompt
                    language={language}
                    id={record}
                    title={title}
                    action={type}
                    volumeInfo={volumeInfo}
                    prevRoute={prevRoute}
                    isEContent={true}
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
               />
          );
     } else if (shouldPromptAlternateLibraryCard && !userHasAlternateLibraryCard) {
          const [showAddAlternateLibraryCardModal, setShowAddAlternateLibraryCardModal] = React.useState(false);

          let cardLabel = getTermFromDictionary(language, 'alternate_library_card');
          let passwordLabel = getTermFromDictionary(language, 'password');
          let formMessage = '';
          let showAlternateLibraryCardPassword = false;

          if (library?.alternateLibraryCardConfig?.alternateLibraryCardLabel) {
               cardLabel = library.alternateLibraryCardConfig.alternateLibraryCardLabel;
          }

          if (library?.alternateLibraryCardConfig?.alternateLibraryCardPasswordLabel) {
               passwordLabel = library.alternateLibraryCardConfig.alternateLibraryCardPasswordLabel;
          }

          if (library?.alternateLibraryCardConfig?.alternateLibraryCardFormMessage) {
               formMessage = decodeHTML(library.alternateLibraryCardConfig.alternateLibraryCardFormMessage);
          }

          if (library?.alternateLibraryCardConfig?.showAlternateLibraryCardPassword) {
               if (library.alternateLibraryCardConfig.showAlternateLibraryCardPassword === '1' || library.alternateLibraryCardConfig.showAlternateLibraryCardPassword === 1) {
                    showAlternateLibraryCardPassword = true;
               }
          }

          const { width } = useWindowDimensions();
          const [card, setCard] = React.useState(user?.alternateLibraryCard ?? '');
          const [password, setPassword] = React.useState(user?.alternateLibraryCardPassword ?? '');
          const [showPassword, setShowPassword] = React.useState(false);
          const toggleShowPassword = () => setShowPassword(!showPassword);

          const source = {
               baseUrl: library.baseUrl,
               html: formMessage };

          const tagsStyles = {
               body: {
                    color: textColor },
               a: {
                    color: textColor,
                    textDecorationColor: textColor } };

          const updateCard = async () => {
               await updateAlternateLibraryCard(card, password, false, library.baseUrl, language);
               await refreshProfile(library.baseUrl).then(async (data) => {
                    if(data.ok) {
                         await updateUserProfile(data.data.result.profile);
                    } else {
                         logWarnMessage('Could not refresh profile after placing hold from volume selection.');
                         logDebugMessage(data);
                         getErrorMessage(data.code ?? 0, data.problem);
                    }
               });
               setCard('');
               setPassword('');
          };
          return (
               <>
                    <Button minWidth="100%" maxWidth="100%" bgColor={theme.tokens.colors.primary['500']} onPress={() => setShowAddAlternateLibraryCardModal(true)}>
                         <ButtonText color={theme.tokens.colors.primary['500-text']}>{title}</ButtonText>
                    </Button>
                    <Modal isOpen={showAddAlternateLibraryCardModal} onClose={() => setShowAddAlternateLibraryCardModal(false)} closeOnOverlayClick={false} size="lg">
                         <ModalBackdrop />
                         <ModalContent maxWidth="90%" bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}>
                              <ModalHeader borderBottomWidth="$1" borderBottomColor={colorMode === 'light' ? "$warmGray300" : "$coolGray500"}>
                                   <Heading size="md" color={textColor}>
                                        {getTermFromDictionary(language, 'add_alternate_library_card')}
                                   </Heading>
                                   <ModalCloseButton p="$3" onPress={() => { setShowAddAlternateLibraryCardModal(false); }}>
                                        <Icon as={CloseIcon} color={textColor} />
                                   </ModalCloseButton>
                              </ModalHeader>
                              <ModalBody mt="$3">
                                   {formMessage ? <RenderHtml contentWidth={width} source={source} tagsStyles={tagsStyles} /> : null}
                                   <FormControl mb="$2">
                                        <FormControlLabel>
                                             <FormControlLabelText color={textColor} size="sm">
                                                  {cardLabel}
                                             </FormControlLabelText>
                                        </FormControlLabel>
                                        <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                             <InputField textContentType="none" color={textColor} name="card" defaultValue={card} accessibilityLabel={cardLabel} onChangeText={(value) => setCard(value)} />
                                        </Input>
                                   </FormControl>
                                   {showAlternateLibraryCardPassword ? (
                                        <FormControl mb="$2">
                                             <FormControlLabel>
                                                  <FormControlLabelText color={textColor} size="sm">
                                                       {passwordLabel}
                                                  </FormControlLabelText>
                                             </FormControlLabel>
                                             <Input borderColor={colorMode === 'light' ? "$coolGray500" : "$warmGray300"}>
                                                  <InputField textContentType="none" type={showPassword ? 'text' : 'password'} color={textColor} name="password" defaultValue={password} accessibilityLabel={passwordLabel} onChangeText={(value) => setPassword(value)} />
                                                  <InputSlot onPress={toggleShowPassword}>
                                                       <InputIcon as={showPassword ? Eye : EyeOff} mr="$2" color={textColor} />
                                                  </InputSlot>
                                             </Input>
                                        </FormControl>
                                   ) : null}
                              </ModalBody>
                              <ModalFooter borderTopWidth="$1" borderTopColor={colorMode === 'light' ? "$warmGray300" : "$coolGray500"}>
                                   <ButtonGroup space="sm">
                                        <Button
                                             variant="outline"
                                             borderColor={colorMode === 'light' ? "$warmGray300" : "$coolGray500"}
                                             onPress={() => {
                                                  setShowAddAlternateLibraryCardModal(false);
                                                  setLoading(false);
                                             }}>
                                             <ButtonText color={colorMode === 'light' ? "$warmGray500" : "$coolGray300"}>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                        </Button>
                                        <Button
                                             bgColor={theme.tokens.colors.primary['500']}
                                             isDisabled={loading}
                                             onPress={async () => {
                                                  setLoading(true);
                                                  await updateCard();
                                                  await completeAction(record, type, user.id, null, null, null, null, null, library.baseUrl).then(async (response) => {
                                                       logDebugMessage("Completed Action - Checkout with alternate card");
                                                       setResponse(response);
                                                       if (response.success) {
                                                            queryClient.invalidateQueries({ queryKey: ['checkouts', user.id, library.baseUrl, language] });
                                                            await refreshAndSaveUserProfile();
                                                       }
                                                       setLoading(false);
                                                       setResponseIsOpen(true);
                                                       setShowAddAlternateLibraryCardModal(false);
                                                  });
                                             }}>
                                             {loading ? <ButtonSpinner color={theme.tokens.colors.primary['500-text']} /> : <ButtonText color={theme.tokens.colors.primary['500-text']}>{title}</ButtonText>}
                                        </Button>
                                   </ButtonGroup>
                              </ModalFooter>
                         </ModalContent>
                    </Modal>
               </>
          );
     } else {
          return (
               <>
                    <Button
                         minWidth="100%"
                         maxWidth="100%"
                         bgColor={theme.tokens.colors.primary['500']}
                         variant="solid"
                         onPress={async () => {
                              setLoading(true);
                              await completeAction(record, type, user.id, null, null, null, null, null, library.baseUrl).then(async (eContentResponse) => {
                                   setResponse(eContentResponse);
                                   logDebugMessage("Completed Action - Checkout");
                                   if (eContentResponse.success) {
                                        queryClient.invalidateQueries({ queryKey: ['checkouts', user.id, library.baseUrl, language] });
                                        await refreshAndSaveUserProfile();
                                   }
                                   setLoading(false);
                                   setResponseIsOpen(true);
                              });
                         }}>
                         {loading ? <ButtonSpinner color={theme.tokens.colors.primary['500-text']} pr={2} /> : <ButtonText color={theme.tokens.colors.primary['500-text']}>{title}</ButtonText>}
                    </Button>
               </>
          );
     }
};
