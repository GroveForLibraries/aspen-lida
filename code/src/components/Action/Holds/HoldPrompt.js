import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
     CloseIcon,
     Modal,
     Checkbox,
     CheckboxIndicator,
     CheckboxIcon,
     CheckboxLabel,
     CheckIcon,
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
     Select,
     Button,
     ButtonGroup,
     ButtonText,
     SelectTrigger,
     SelectInput,
     SelectIcon,
     SelectPortal,
     SelectBackdrop,
     SelectContent,
     SelectDragIndicatorWrapper,
     SelectDragIndicator,
     SelectItem,
     Icon,
     ChevronDownIcon,
     ButtonSpinner,
     SelectScrollView,
     Input,
     InputField,
     InputSlot,
     InputIcon,
     Text
} from '@gluestack-ui/themed';
import React from 'react';
import { EyeOff, Eye } from 'lucide-react-native';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RenderHtml from 'react-native-render-html';

import { useLibrary } from '../../../hooks/useLibrarySystemData';
import { useUserState, useAccounts, useLocations, useSublocations, useUpdateUserProfile } from '../../../hooks/useUserData';
import { refreshProfile, updateAlternateLibraryCard } from '../../../util/api/user';
import { decodeHTML, filter, isEmpty, isNumber, isObject, merge } from '../../../helpers/helpers';
import { completeAction } from '../../../util/api/userHelper';
import { getTermFromDictionary } from '../../../translations/TranslationService';
import { getCopies } from '../../../util/api/item';
import { HoldNotificationPreferences } from './HoldNotificationPreferences';
import { SelectItemHold } from './SelectItem';
import { SelectVolume } from './SelectVolume';
import { SelectNewHoldSublocation } from './SelectNewHoldSublocation';

import { logDebugMessage, logInfoMessage, logWarnMessage, getErrorMessage } from '../../../util/logging.js';
import { useTheme } from '../../../themes/theme';

export const HoldPrompt = (props) => {
     // 1. ALL HOOK DECLARATIONS FIRST (Unconditional & Predictable Order)
     const queryClient = useQueryClient();
     const insets = useSafeAreaInsets();
     const { width } = useWindowDimensions();

     // Contexts
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const preferredPickupLocationIsValid = userState?.preferredPickupLocationIsValid ?? true;
     const preferredPickupLocationWarning = userState?.preferredPickupLocationWarning ?? '';
     const { data: accounts } = useAccounts();
     const { data: locations } = useLocations();
     const { data: sublocations } = useSublocations();
     const updateUserProfile = useUpdateUserProfile();
     const library = useLibrary();
     const { theme, colorMode, textColor } = useTheme();
     const safeAccounts = Array.isArray(accounts) ? accounts : [];
     const safeLocations = Array.isArray(locations) ? locations : [];

     const {
          language,
          id,
          title,
          action,
          volumeInfo,
          volumeId,
          volumeName,
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
          setIllRequestResponse,
          alreadyOnHold
     } = props;

     // Basic State Hooks
     const [userHasAlternateLibraryCard, setUserHasAlternateLibraryCard] = React.useState(props.userHasAlternateLibraryCard ?? false);
     const [promptAlternateLibraryCard, setPromptAlternateLibraryCard] = React.useState(props.shouldPromptAlternateLibraryCard ?? false);
     const [loading, setLoading] = React.useState(false);
     const [showModal, setShowModal] = React.useState(false);
     const [showAddAlternateLibraryCardModal, setShowAddAlternateLibraryCardModal] = React.useState(false);
     const [activeAccount, setActiveAccount] = React.useState(user.id ?? '');
     const [card, setCard] = React.useState(user?.alternateLibraryCard ?? '');
     const [password, setPassword] = React.useState(user?.alternateLibraryCardPassword ?? '');
     const [showPassword, setShowPassword] = React.useState(false);

     // Hold Notification Info Setup (Safe fallbacks for initial state instantiation)
     const promptForHoldNotifications = user.promptForHoldNotifications ?? false;
     const holdNotificationInfo = user.holdNotificationInfo ?? [];
     const preferences = holdNotificationInfo?.preferences?.opac_hold_notify?.value;

     const defaultEmailNotification = promptForHoldNotifications && preferences ? preferences.includes('email') : false;
     const defaultPhoneNotification = promptForHoldNotifications && preferences ? preferences.includes('phone') : false;
     const defaultSMSNotification = promptForHoldNotifications && preferences ? preferences.includes('sms') : false;

     // Notification State Hooks
     const [emailNotification, setEmailNotification] = React.useState(defaultEmailNotification);
     const [phoneNotification, setPhoneNotification] = React.useState(defaultPhoneNotification);
     const [smsNotification, setSMSNotification] = React.useState(defaultSMSNotification);
     const [smsCarrier, setSMSCarrier] = React.useState(holdNotificationInfo.preferences?.opac_default_sms_carrier?.value ?? -1);
     const [smsNumber, setSMSNumber] = React.useState(holdNotificationInfo.preferences?.opac_default_sms_notify?.value ?? null);
     const [phoneNumber, setPhoneNumber] = React.useState(holdNotificationInfo.preferences?.opac_default_phone?.value ?? null);

     // Hold Types State Hooks
     const typeOfHold = holdTypeForFormat || 'default';
     const [volume, setVolume] = React.useState('');
     const [holdType, setHoldType] = React.useState(typeOfHold);
     const [item, setItem] = React.useState('');

     // Location Setup & Location State Hooks
     let userPickupLocationId = user.pickupLocationId ?? user.homeLocationId;
     if (isNumber(userPickupLocationId)) {
          userPickupLocationId = String(userPickupLocationId);
     }

     let defaultPickupLocation = '';
     if (safeLocations.length > 1 || !preferredPickupLocationIsValid) {
          const userPickupLocation = filter(safeLocations, { locationId: userPickupLocationId });
          if (userPickupLocation.length > 0) {
               defaultPickupLocation = userPickupLocation[0];
               if (isObject(defaultPickupLocation)) {
                    defaultPickupLocation = defaultPickupLocation.code;
               }
          }
     } else {
          defaultPickupLocation = safeLocations[0];
          if (isObject(defaultPickupLocation)) {
               defaultPickupLocation = defaultPickupLocation.code;
          }
     }

     const [location, setLocation] = React.useState(defaultPickupLocation);
     const [sublocation, setSublocation] = React.useState(null);
     const rememberHoldPickupLocation = user.rememberHoldPickupLocation ? 1 : 0;
     const [rememberPickupLocation, setRememberPickupLocation] = React.useState(rememberHoldPickupLocation);

     // TanStack useQuery Hook
     const { status, data, error, isFetching } = useQuery({
          queryKey: ['copies', id, variationId, language, library.baseUrl],
          queryFn: () => getCopies(id, language, variationId, library.baseUrl),
          enabled: (holdTypeForFormat === 'item' || holdTypeForFormat === 'either') && isEmpty(volumeId) });

     // Effect Hooks
     React.useEffect(() => {
          setHoldType(derivedTypeOfHold);
     }, [derivedTypeOfHold]);


     // 2. BUSINESS LOGIC & DERIVED VARIABLES (Happens AFTER all hooks are safely locked in place)
     logDebugMessage("In Hold Prompt, preferredPickupLocationIsValid = " + preferredPickupLocationIsValid);
     logDebugMessage("In Hold Prompt, preferredPickupLocationWarning = " + preferredPickupLocationWarning);

     let isPlacingHold = false;
     if (typeof action === 'string') {
          isPlacingHold = action.includes('hold');
     }

     const holdNotificationPreferences = {
          emailNotification: emailNotification,
          phoneNotification: phoneNotification,
          smsNotification: smsNotification,
          phoneNumber: phoneNumber,
          smsNumber: smsNumber,
          smsCarrier: smsCarrier };

     let promptForHoldType = false;
     let derivedTypeOfHold = typeOfHold;

     if (!isEmpty(volumeId)){
          logDebugMessage("Placing a hold on a single volume");
          derivedTypeOfHold = 'volume';
          promptForHoldType = false;
     } else if (volumeInfo.numItemsWithVolumes >= 1) {
          logDebugMessage("Placing with numItemsWithVolumes >= 1");
          derivedTypeOfHold = 'item';
          promptForHoldType = true;
          if (volumeInfo.majorityOfItemsHaveVolumes) {
               derivedTypeOfHold = 'volume';
               promptForHoldType = true;
          }
          if (isEmpty(volumeInfo.hasItemsWithoutVolumes)) {
               derivedTypeOfHold = 'volume';
               promptForHoldType = false;
          }
          if (volumeInfo.hasItemsWithoutVolumes) {
               promptForHoldType = true;
               derivedTypeOfHold = 'item';
          }
          logDebugMessage("Type of hold is " + derivedTypeOfHold);
     }

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

     const toggleShowPassword = () => setShowPassword(!showPassword);

     const source = {
          baseUrl: library.baseUrl,
          html: formMessage };

     const tagsStyles = {
          body: { color: textColor },
          a: { color: textColor, textDecorationColor: textColor } };


     // 3. EVENT HANDLERS & CALLBACKS
     const updateActiveAccount = (newId) => {
          setActiveAccount(newId);
          if (newId !== user.id) {
                let newAccount = filter(safeAccounts, ['id', newId]);
               if (newAccount[0]) {
                    newAccount = newAccount[0];
                    if (newAccount) {
                         if (typeof newAccount.alternateLibraryCard !== 'undefined') {
                              const alternateLibraryCardOptions = newAccount?.alternateLibraryCardOptions ?? [];
                              if (alternateLibraryCardOptions) {
                                   if (alternateLibraryCardOptions.showAlternateLibraryCard === '1' || alternateLibraryCardOptions.showAlternateLibraryCard === 1) {
                                        if (recordSource === 'cloud_library' && (alternateLibraryCardOptions.useAlternateLibraryCardForCloudLibrary === '1' || alternateLibraryCardOptions.useAlternateLibraryCardForCloudLibrary === 1)) {
                                             setPromptAlternateLibraryCard(true);
                                        }
                                   }

                                   if (newAccount.alternateLibraryCard && newAccount.alternateLibraryCard !== '') {
                                        if (alternateLibraryCardOptions?.showAlternateLibraryCardPassword === '1') {
                                             if (newAccount.alternateLibraryCardPassword !== '') {
                                                  setUserHasAlternateLibraryCard(true);
                                             } else {
                                                  setUserHasAlternateLibraryCard(false);
                                             }
                                        } else {
                                             setUserHasAlternateLibraryCard(true);
                                        }
                                   } else {
                                        setUserHasAlternateLibraryCard(false);
                                   }

                                   if (alternateLibraryCardOptions?.alternateLibraryCardLabel) {
                                        cardLabel = alternateLibraryCardOptions.alternateLibraryCardLabel;
                                   }
                                   if (alternateLibraryCardOptions?.alternateLibraryCardPasswordLabel) {
                                        passwordLabel = alternateLibraryCardOptions.alternateLibraryCardPasswordLabel;
                                   }
                                   if (alternateLibraryCardOptions?.alternateLibraryCardFormMessage) {
                                        formMessage = decodeHTML(alternateLibraryCardOptions.alternateLibraryCardFormMessage);
                                   }
                                   if (alternateLibraryCardOptions?.showAlternateLibraryCardPassword) {
                                        if (alternateLibraryCardOptions.showAlternateLibraryCardPassword === '1' || alternateLibraryCardOptions.showAlternateLibraryCardPassword === 1) {
                                             showAlternateLibraryCardPassword = true;
                                        }
                                   }
                              } else {
                                   setUserHasAlternateLibraryCard(false);
                                   setPromptAlternateLibraryCard(false);
                              }
                         } else {
                              setUserHasAlternateLibraryCard(false);
                              setPromptAlternateLibraryCard(false);
                         }
                    }
               }
          } else {
               setUserHasAlternateLibraryCard(props.userHasAlternateLibraryCard);
               setPromptAlternateLibraryCard(props.shouldPromptAlternateLibraryCard);
          }
     };

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

     const refreshAndSaveUserProfile = React.useCallback(async () => {
          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     }, [library.baseUrl, updateUserProfile]);

     logDebugMessage("Remember Hold Pickup Location in Hold Prompt is " + user.rememberHoldPickupLocation);

     return (
          <>
               <Button minWidth="100%" maxWidth="100%" bgColor={theme.tokens.colors.primary['500']} onPress={() => setShowModal(true)}>
                    <ButtonText color={theme.tokens.colors.primary['500-text']}>{title}</ButtonText>
               </Button>
               <Modal isOpen={showAddAlternateLibraryCardModal} onClose={() => setShowAddAlternateLibraryCardModal(false)} closeOnOverlayClick={false} size="lg" useRNModal={true}>
                    <ModalBackdrop />
                    <ModalContent maxWidth="90%" bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'}>
                         <ModalHeader borderBottomWidth="$1" borderBottomColor={colorMode === 'light' ? '$warmGray300' : '$coolGray500'}>
                              <Heading size="md" color={textColor}>
                                   {getTermFromDictionary(language, 'add_alternate_library_card')}
                              </Heading>
                              <ModalCloseButton
                                   p="$3"
                                   onPress={() => {
                                        setShowAddAlternateLibraryCardModal(false);
                                   }}>
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
                                   <Input borderColor={colorMode === 'light' ? '$coolGray500' : '$warmGray300'}>
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
                                        <Input borderColor={colorMode === 'light' ? '$coolGray500' : '$warmGray300'}>
                                             <InputField textContentType="none" type={showPassword ? 'text' : 'password'} color={textColor} name="password" defaultValue={password} accessibilityLabel={passwordLabel} onChangeText={(value) => setPassword(value)} />
                                             <InputSlot onPress={toggleShowPassword}>
                                                  <InputIcon as={showPassword ? Eye : EyeOff} mr="$2" color={textColor} />
                                             </InputSlot>
                                        </Input>
                                   </FormControl>
                              ) : null}
                         </ModalBody>
                         <ModalFooter borderTopWidth="$1" borderTopColor={colorMode === 'light' ? '$warmGray300' : '$coolGray500'}>
                              <ButtonGroup space="sm">
                                   <Button
                                        variant="outline"
                                        borderColor={colorMode === 'light' ? '$warmGray300' : '$coolGray500'}
                                        onPress={() => {
                                             setShowAddAlternateLibraryCardModal(false);
                                             setLoading(false);
                                        }}>
                                        <ButtonText color={colorMode === 'light' ? '$warmGray500' : '$coolGray300'}>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                   <Button
                                        bgColor={theme.tokens.colors.primary['500']}
                                        isDisabled={loading}
                                        onPress={async () => {
                                             setLoading(true);
                                             await updateCard();
                                             await completeAction(id, action, activeAccount, '', '', location, sublocation, rememberHoldPickupLocation, library.baseUrl, volume, holdType, holdNotificationPreferences, item).then(async (result) => {
                                                  logDebugMessage('Completed Action - Hold Prompt footer');

                                                  setResponse(result);
                                                  if (result) {
                                                       if (result.success === true || result.success === 'true') {
                                                            queryClient.invalidateQueries({ queryKey: ['holds', activeAccount, library.baseUrl, language] });
                                                            await refreshAndSaveUserProfile();
                                                       }

                                                       if (result?.confirmationNeeded && result.confirmationNeeded === true) {
                                                            let tmp = holdConfirmationResponse;
                                                            const obj = {
                                                                 message: result.message,
                                                                 title: result.title,
                                                                 confirmationNeeded: result.confirmationNeeded ?? false,
                                                                 confirmationId: result.confirmationId ?? null,
                                                                 recordId: id ?? null,
                                                            };
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
                                                                 items: result.items ?? [],
                                                            };

                                                            tmp = merge(obj, tmp);
                                                            setHoldSelectItemResponse(tmp);
                                                       }

                                                       setLoading(false);
                                                       setShowAddAlternateLibraryCardModal(false);
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
               <Modal isOpen={showModal} onClose={() => setShowModal(false)} closeOnOverlayClick={false} size="lg" useRNModal={true}>
                    <ModalBackdrop />
                    <ModalContent maxWidth="90%" bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'}>
                         <ModalHeader borderBottomWidth="$1" borderBottomColor={colorMode === 'light' ? '$warmGray300' : '$coolGray500'}>
                              <Heading size="md" color={textColor}>
                                   {isPlacingHold ? getTermFromDictionary(language, 'hold_options') : getTermFromDictionary(language, 'checkout_options')}
                              </Heading>
                              <ModalCloseButton
                                   p="$3"
                                   onPress={() => {
                                        setShowModal(false);
                                   }}>
                                   <Icon as={CloseIcon} color={textColor} />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody mt="$3">
                              {alreadyOnHold ? <Text color={textColor}>{getTermFromDictionary(language, 'already_on_hold')}</Text> : null}
                              {!preferredPickupLocationIsValid ? <Text color={textColor}>{preferredPickupLocationWarning}</Text> : null}
                              {promptForHoldNotifications ? (
                                   <HoldNotificationPreferences
                                        user={user}
                                        language={language}
                                        emailNotification={emailNotification}
                                        setEmailNotification={setEmailNotification}
                                        phoneNotification={phoneNotification}
                                        setPhoneNotification={setPhoneNotification}
                                        smsNotification={smsNotification}
                                        setSMSNotification={setSMSNotification}
                                        smsCarrier={smsCarrier}
                                        setSMSCarrier={setSMSCarrier}
                                        smsNumber={smsNumber}
                                        setSMSNumber={setSMSNumber}
                                        phoneNumber={phoneNumber}
                                        setPhoneNumber={setPhoneNumber}
                                        url={library.baseUrl}
                                        textColor={textColor}
                                        theme={theme}
                                        colorMode={colorMode}
                                   />
                              ) : null}
                              {data !== undefined && !isFetching && isEmpty(volumeId) && (holdType === 'either' || holdType === 'item') ? <SelectItemHold theme={theme} colorMode={colorMode} id={id} item={item} setItem={setItem} language={language} data={data} holdType={holdType} setHoldType={setHoldType} holdTypeForFormat={holdTypeForFormat} url={library.baseUrl} showModal={showModal} textColor={textColor} /> : null}
                              {promptForHoldType || (holdType === 'volume' && isEmpty(volumeId)) ? <SelectVolume theme={theme} id={id} language={language} volume={volume} setVolume={setVolume} promptForHoldType={promptForHoldType} holdType={holdType} setHoldType={setHoldType} showModal={showModal} url={library.baseUrl} textColor={textColor} colorMode={colorMode} /> : null}
                              {((safeLocations.length > 1 || !preferredPickupLocationIsValid) && !isEContent && !user.rememberHoldPickupLocation) || (safeLocations.length > 1 && !isEContent && safeAccounts.length > 0) ? (
                                   <FormControl mt="$1">
                                        <FormControlLabel>
                                             <FormControlLabelText size="sm" color={textColor}>
                                                  {getTermFromDictionary(language, 'select_pickup_location')}
                                             </FormControlLabelText>
                                        </FormControlLabel>
                                        <Select name="pickupLocations" selectedValue={location} minWidth={200} mt="$1" mb="$2" onValueChange={(itemValue) => setLocation(itemValue)}>
                                             <SelectTrigger variant="outline" size="md">
                                                  {safeLocations.map((selectedLocation, index) => {
                                                       if (selectedLocation.code === location) {
                                                            return <SelectInput py={0} value={selectedLocation.name} color={textColor} key={index} />;
                                                       }
                                                  })}
                                                  <SelectIcon mr="$3" as={ChevronDownIcon} color={textColor} />
                                             </SelectTrigger>
                                             <SelectPortal useRNModal={true}>
                                                  <SelectBackdrop />
                                                  <SelectContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            {safeLocations.map((availableLocations, index) => {
                                                                 if (availableLocations.code === location) {
                                                                      return <SelectItem label={availableLocations.name} value={availableLocations.code} key={index} bgColor={theme.tokens.colors.tertiary['300']} sx={{ _text: { color: theme.tokens.colors.tertiary['500-text'] } }} />;
                                                                 }
                                                                 return <SelectItem label={availableLocations.name} value={availableLocations.code} key={index} bgColor={location === availableLocations.code ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: location === availableLocations.code ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />;
                                                            })}
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              ) : null}
                              {!user.rememberHoldPickupLocation ? <SelectNewHoldSublocation sublocations={sublocations ?? []} location={location} activeSublocation={sublocation} setActiveSublocation={setSublocation} language={language} textColor={textColor} theme={theme} colorMode={colorMode} /> : null}
                              {safeLocations.length > 1 && safeAccounts.length === 0 && !isEContent && library.allowRememberPickupLocation && !user.rememberHoldPickupLocation ? (
                                   <FormControl mb="$3">
                                        <Checkbox
                                             size="sm"
                                             defaultIsChecked={rememberPickupLocation}
                                             accessibilityLabel={getTermFromDictionary(language, 'always_use_pickup_location')}
                                             onChange={(value) => {
                                                  setRememberPickupLocation(value);
                                             }}>
                                             <CheckboxIndicator mr="$2">
                                                  <CheckboxIcon as={CheckIcon} color={textColor} />
                                             </CheckboxIndicator>
                                             <CheckboxLabel color={textColor}>{getTermFromDictionary(language, 'always_use_pickup_location')}</CheckboxLabel>
                                        </Checkbox>
                                   </FormControl>
                              ) : null}
                              {safeAccounts.length > 0 ? (
                                   <FormControl>
                                        <FormControlLabel>
                                             <FormControlLabelText color={textColor}>{isPlacingHold ? getTermFromDictionary(language, 'linked_place_hold_for_account') : getTermFromDictionary(language, 'linked_checkout_to_account')}</FormControlLabelText>
                                        </FormControlLabel>
                                        <Select name="linkedAccount" selectedValue={activeAccount} minWidth={200} mt="$1" mb="$3" onValueChange={(itemValue) => updateActiveAccount(itemValue)}>
                                             <SelectTrigger variant="outline" size="md">
                                                  <SelectInput
                                                       py={0}
                                                       value={(() => {
                                                            if (activeAccount === user.id) {
                                                                 return user.displayName;
                                                            }
                                                             const found = safeAccounts.find((item) => activeAccount === item.id);
                                                            return found ? found.displayName : '';
                                                       })()}
                                                       color={textColor}
                                                       placeholder={getTermFromDictionary(language, 'select_an_account')}
                                                  />
                                                  <SelectIcon mr="$3">
                                                       <Icon as={ChevronDownIcon} color={textColor} />
                                                  </SelectIcon>
                                             </SelectTrigger>
                                             <SelectPortal useRNModal={true}>
                                                  <SelectBackdrop />
                                                  <SelectContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            <SelectItem label={user.displayName} value={user.id} color={textColor} bgColor={activeAccount === user.id ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: activeAccount === user.id ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                            {safeAccounts.map((item, index) => {
                                                                 return <SelectItem label={item.displayName} value={item.id} key={index} color={textColor} bgColor={activeAccount === item.id ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: activeAccount === item.id ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />;
                                                            })}
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              ) : null}
                         </ModalBody>
                         <ModalFooter borderTopWidth="$1" borderTopColor={colorMode === 'light' ? '$warmGray300' : '$coolGray500'}>
                              <ButtonGroup space="sm">
                                   <Button
                                        variant="outline"
                                        borderColor={colorMode === 'light' ? '$warmGray300' : '$coolGray500'}
                                        onPress={() => {
                                             setShowModal(false);
                                             setLoading(false);
                                        }}>
                                        <ButtonText color={colorMode === 'light' ? '$warmGray500' : '$coolGray300'}>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                   {promptAlternateLibraryCard && !userHasAlternateLibraryCard ? (
                                        <Button
                                             bgColor={theme.tokens.colors.primary['500']}
                                             onPress={() => {
                                                  setShowModal(false);
                                                  setShowAddAlternateLibraryCardModal(true);
                                             }}>
                                             <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'next')}</ButtonText>
                                        </Button>
                                   ) : (
                                        <Button
                                             bgColor={theme.tokens.colors.primary['500']}
                                             isDisabled={loading}
                                             onPress={async () => {
                                                  setLoading(true);
                                                  await completeAction(id, action, activeAccount, '', '', location, sublocation, rememberPickupLocation, library.baseUrl, volumeId ?? volume, holdType, holdNotificationPreferences, item).then(async (result) => {
                                                       setResponse(result);
                                                       logDebugMessage('Completed Action Hold Prompt Alternate Library Card');

                                                       if (result) {
                                                            if (result.success === true || result.success === 'true') {
                                                                 logDebugMessage('Placing succeeded, invalidating queries for user ' + user.id + ' baseUrl ' + library.baseUrl + ' language ' + language);
                                                                 logDebugMessage(result);
                                                                 queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language] });
                                                                 queryClient.invalidateQueries({ queryKey: ['checkouts', user.id, library.baseUrl, language] });
                                                                 await refreshAndSaveUserProfile();

                                                                 const timeoutId = setTimeout(() => {
                                                                      queryClient.invalidateQueries({ queryKey: ['holds', user.id, library.baseUrl, language] });
                                                                      queryClient.invalidateQueries({ queryKey: ['checkouts', user.id, library.baseUrl, language] });
                                                                      refreshAndSaveUserProfile();
                                                                 }, 45 * 1000);
                                                                 logDebugMessage('Query invalidation complete');
                                                            } else {
                                                                 logInfoMessage('Placing hold failed');
                                                                 logInfoMessage(result);
                                                            }

                                                            if (result?.confirmationNeeded && result.confirmationNeeded === true) {
                                                                 let tmp = holdConfirmationResponse;
                                                                 const obj = {
                                                                      message: result.message,
                                                                      title: result.title,
                                                                      confirmationNeeded: result.confirmationNeeded ?? false,
                                                                      confirmationId: result.confirmationId ?? null,
                                                                      recordId: id ?? null,
                                                                 };
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
                                                                      items: result.items ?? [],
                                                                 };

                                                                 tmp = merge(obj, tmp);
                                                                 setHoldSelectItemResponse(tmp);
                                                            }

                                                            if (result?.needsIllRequest && result.needsIllRequest === true) {
                                                                 result.message = result.message + '\n' + 'You may be able to request this title from another library using our web based catalog or by visiting the library.';
                                                                 setResponse(result);
                                                            }

                                                            setLoading(false);
                                                            setShowModal(false);
                                                            if (result?.confirmationNeeded && result.confirmationNeeded) {
                                                                 setHoldConfirmationIsOpen(true);
                                                            } else if (result?.shouldBeItemHold && result.shouldBeItemHold) {
                                                                 setHoldItemSelectIsOpen(true);
                                                            } else if (result?.needsIllRequest && result.needsIllRequest === true) {
                                                                 logDebugMessage('Need to show local ILL form');
                                                                 logDebugMessage(response);
                                                            }
                                                            {
                                                                 setResponseIsOpen(true);
                                                            }
                                                       } else {
                                                            logWarnMessage('Did not get a good result completing action');
                                                       }
                                                  });
                                             }}>
                                             {loading ? <ButtonSpinner color={theme.tokens.colors.primary['500-text']} /> : <ButtonText color={theme.tokens.colors.primary['500-text']}>{title}</ButtonText>}
                                        </Button>
                                   )}
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </>
     );
};
