import React from 'react';

import {
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
     Heading,
     Button,
     ButtonGroup,
     ButtonText,
     Icon,
     ButtonSpinner,
     Input,
     InputField,
     InputSlot,
     InputIcon
} from '@gluestack-ui/themed';

import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useUpdateUserProfile } from '../../hooks/useUserData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { refreshProfile, updateAlternateLibraryCard } from '../../util/api/user';
import { decodeHTML, isObject, merge } from '../../helpers/helpers';
import { completeAction } from '../../util/api/userHelper';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { EyeOff, Eye } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { logDebugMessage, logWarnMessage, getErrorMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';

export const AddAlternateLibraryCard = (props) => {
     const {
          id,
          title,
          action,
          volumeInfo,
          holdTypeForFormat,
          variationId,
          prevRoute,
          isEContent,
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
          holdSelectItemResponse,
          setHoldSelectItemResponse,
          holdItemSelectIsOpen,
          setHoldItemSelectIsOpen,
          onHoldItemSelectClose,
          cancelHoldItemSelectRef,
          recordSource,
          activeAccount } = props;

     let isPlacingHold = false;
     if (isObject(action)) {
          isPlacingHold = action.includes('hold');
     }

     const library = useLibrary();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const language = useActiveLanguage();
     const { theme, textColor, colorMode } = useTheme();
     const queryClient = useQueryClient();
     const { width } = useWindowDimensions();
     const [card, setCard] = React.useState(user?.alternateLibraryCard ?? '');
     const [password, setPassword] = React.useState(user?.alternateLibraryCardPassword ?? '');
     const [showModal, setShowModal] = React.useState(true);
     const [loading, setLoading] = React.useState(false);

     const [showPassword, setShowPassword] = React.useState(false);
     const toggleShowPassword = () => setShowPassword(!showPassword);

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
     };

     const refreshAndSaveUserProfile = React.useCallback(async () => {
          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     }, [library.baseUrl, updateUserProfile]);

     return (
          <Modal isOpen={showModal} onClose={() => setShowModal(false)} closeOnOverlayClick={false} size="lg">
               <ModalBackdrop />
               <ModalContent maxWidth="90%" bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}>
                    <ModalHeader borderBottomWidth="$1" borderBottomColor={colorMode === 'light' ? "$warmGray300" : "$coolGray500"}>
                         <Heading size="md" color={textColor}>
                              {isPlacingHold ? getTermFromDictionary(language, 'hold_options') : getTermFromDictionary(language, 'checkout_options')}
                         </Heading>
                         <ModalCloseButton p="$3" onPress={() => { setShowModal(false); }}>
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
                                        setShowModal(false);
                                        setLoading(false);
                                   }}>
                                   <ButtonText color={colorMode === 'light' ? "$warmGray500" : "$coolGray300"}>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                              </Button>
                              <Button
                                   bgColor={theme.tokens.colors.primary['500']}
                                   isDisabled={loading}
                                   onPress={async () => {
                                        setLoading(true);
                                        await completeAction(id, action, activeAccount, '', '', location, null, null, library.baseUrl, volume, holdType, holdNotificationPreferences, item).then(async (result) => {
                                             setResponse(result);
                                             logDebugMessage("Completed Action after add alternate library card");
                                             if (result) {
                                                  if (result.success === true || result.success === 'true') {
                                                       queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language] });
                                                       queryClient.invalidateQueries({ queryKey: ['checkouts', user.id, library.baseUrl, language] });
                                                       await refreshAndSaveUserProfile();
                                                  }

                                                  if (result?.confirmationNeeded && result.confirmationNeeded === true) {
                                                       let tmp = holdConfirmationResponse;
                                                       const obj = {
                                                            message: result.message,
                                                            title: result.title,
                                                            confirmationNeeded: result.confirmationNeeded ?? false,
                                                            confirmationId: result.confirmationId ?? null,
                                                            recordId: id ?? null };
                                                       tmp = merge(obj, tmp);
                                                       setHoldConfirmationResponse(tmp);
                                                  }

                                                  if (result?.shouldBeItemHold && result.shouldBeItemHold === true) {
                                                       let tmp = holdSelectItemResponse;
                                                       const obj = {
                                                            message: result.message,
                                                            title: 'Select an Item',
                                                            patronId: activeAccount,
                                                            pickupLocation: location,
                                                            bibId: id ?? null,
                                                            items: result.items ?? [] };

                                                       tmp = merge(obj, tmp);
                                                       setHoldSelectItemResponse(tmp);
                                                  }

                                                  setLoading(false);
                                                  setShowModal(false);
                                                  if (result?.confirmationNeeded && result.confirmationNeeded) {
                                                       setHoldConfirmationIsOpen(true);
                                                  } else if (result?.shouldBeItemHold && result.shouldBeItemHold) {
                                                       setHoldItemSelectIsOpen(true);
                                                  } else {
                                                       setResponseIsOpen(true);
                                                  }
                                             }
                                        });
                                   }}>
                                   {loading ? <ButtonSpinner color={theme.tokens.colors.primary['500-text']} /> : <ButtonText color={theme.tokens.colors.primary['500-text']}>{title}</ButtonText>}
                              </Button>
                         </ButtonGroup>
                    </ModalFooter>
               </ModalContent>
          </Modal>
     );
};
