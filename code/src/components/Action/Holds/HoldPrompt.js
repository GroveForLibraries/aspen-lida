import { useQuery, useQueryClient } from '@tanstack/react-query';
import _ from 'lodash';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';
import { useUserState, useAccounts, useLocations, useSublocations, useUpdateUserProfile } from '@/src/hooks/useUserData';
import { refreshProfile, updateAlternateLibraryCard } from '@/src/util/api/user';
import { decodeHTML } from '@/src/helpers/helpers';
import { completeAction } from '@/src/util/api/userHelper';
import { getTermFromDictionary } from '@/src/translations/TranslationService';
import { getCopies } from '@/src/util/api/item';
import { HoldNotificationPreferences } from './HoldNotificationPreferences';
import { SelectItemHold } from './SelectItem';
import { SelectVolume } from './SelectVolume';
import { SelectNewHoldSublocation } from './SelectNewHoldSublocation';
import { PasswordVisibilityToggle, ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../themed/ThemedFormControls';
import { logDebugMessage, logInfoMessage, logWarnMessage, getErrorMessage } from '@/src/util/logging';
import { useTheme } from '@/src/themes/theme';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { ThemedCheckbox as Checkbox, ThemedCheckboxIcon as CheckboxIcon, ThemedCheckboxIndicator as CheckboxIndicator, ThemedCheckboxLabel as CheckboxLabel } from '../../themed/ThemedCheckbox';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../themed/ThemedSelect';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * HoldPrompt component for displaying a prompt to the user for placing holds on items.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const HoldPrompt = (props) => {
     // 1. ALL HOOK DECLARATIONS FIRST (Unconditional & Predictable Order)
     const queryClient = useQueryClient();
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
     const { neutralPairs, neutrals, brand, colorMode, textColor } = useTheme();

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

     const defaultEmailNotification = promptForHoldNotifications && preferences ? _.includes(preferences, 'email') : false;
     const defaultPhoneNotification = promptForHoldNotifications && preferences ? _.includes(preferences, 'phone') : false;
     const defaultSMSNotification = promptForHoldNotifications && preferences ? _.includes(preferences, 'sms') : false;

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
     if (_.isNumber(userPickupLocationId)) {
          userPickupLocationId = _.toString(userPickupLocationId);
     }

     let defaultPickupLocation = '';
     if (_.size(locations) > 1 || !preferredPickupLocationIsValid) {
          const userPickupLocation = _.filter(locations, { locationId: userPickupLocationId });
          if (!_.isUndefined(userPickupLocation) && !_.isEmpty(userPickupLocation)) {
               defaultPickupLocation = userPickupLocation[0];
               if (_.isObject(defaultPickupLocation)) {
                    defaultPickupLocation = defaultPickupLocation.code;
               }
          }
     } else {
          defaultPickupLocation = locations[0];
          if (_.isObject(defaultPickupLocation)) {
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
          enabled: (holdTypeForFormat === 'item' || holdTypeForFormat === 'either') && _.isEmpty(volumeId) });

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

     if (!_.isEmpty(volumeId)){
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
          if (_.isEmpty(volumeInfo.hasItemsWithoutVolumes)) {
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
               let newAccount = _.filter(accounts, ['id', newId]);
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
               <Button colorScheme="primary" className="min-w-full max-w-full" onPress={() => setShowModal(true)}>
                    <ButtonText>{title}</ButtonText>
               </Button>
               <Modal isOpen={showAddAlternateLibraryCardModal} onClose={() => setShowAddAlternateLibraryCardModal(false)} closeOnOverlayClick={false} size="lg" useRNModal={true}>
                    <ModalBackdrop />
                    <ModalContent className="max-w-[90%]">
                         <ModalHeader>
                              <Heading>
                                   {getTermFromDictionary(language, 'add_alternate_library_card')}
                              </Heading>
                              <ModalCloseButton
                                   onPress={() => {
                                        setShowAddAlternateLibraryCardModal(false);
                                   }}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody className="mt-3">
                              {formMessage ? <RenderHtml contentWidth={width} source={source} tagsStyles={tagsStyles} /> : null}
                              <FormControl className="mb-2">
                                   <FormControlLabel>
                                        <FormControlLabelText size="sm">
                                             {cardLabel}
                                        </FormControlLabelText>
                                   </FormControlLabel>
                                   <Input>
                                        <InputField textContentType="none" name="card" defaultValue={card} accessibilityLabel={cardLabel} onChangeText={(value) => setCard(value)} />
                                   </Input>
                              </FormControl>
                              {showAlternateLibraryCardPassword ? (
                                   <FormControl className="mb-2">
                                        <FormControlLabel>
                                             <FormControlLabelText size="sm">
                                                  {passwordLabel}
                                             </FormControlLabelText>
                                        </FormControlLabel>
                                        <Input>
                                             <InputField textContentType="none" type={showPassword ? 'text' : 'password'} name="password" defaultValue={password} accessibilityLabel={passwordLabel} onChangeText={(value) => setPassword(value)} />
                                             <PasswordVisibilityToggle showPassword={showPassword} onPress={toggleShowPassword} />
                                        </Input>
                                   </FormControl>
                              ) : null}
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="sm">
                                   <Button
                                        variant="outline"
                                        style={{ borderColor: neutrals.border }}
                                        onPress={() => {
                                             setShowAddAlternateLibraryCardModal(false);
                                        }}>
                                        <ButtonText style={{ color: neutrals.textMain }}>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                   <Button
                                        colorScheme="primary"
                                        onPress={async () => {
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
                                                            tmp = _.merge(obj, tmp);
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

                                                            tmp = _.merge(obj, tmp);
                                                            setHoldSelectItemResponse(tmp);
                                                       }

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
                                       <ButtonText>{title}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
               <Modal isOpen={showModal} onClose={() => setShowModal(false)} closeOnOverlayClick={false} size="lg" useRNModal={true}>
                    <ModalBackdrop />
                    <ModalContent className="max-w-[90%]">
                         <ModalHeader>
                              <Heading>
                                   {isPlacingHold ? getTermFromDictionary(language, 'hold_options') : getTermFromDictionary(language, 'checkout_options')}
                              </Heading>
                              <ModalCloseButton
                                   onPress={() => {
                                        setShowModal(false);
                                   }}>
                                   <CloseIcon />
                              </ModalCloseButton>
                         </ModalHeader>
                         <ModalBody className="mt-3">
                              {alreadyOnHold ? <Text>{getTermFromDictionary(language, 'already_on_hold')}</Text> : null}
                              {!preferredPickupLocationIsValid ? <Text>{preferredPickupLocationWarning}</Text> : null}
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
                                        neutralPairs={neutralPairs}
                                        brand={brand}
                                        colorMode={colorMode}
                                   />
                              ) : null}
                              {data !== undefined && !isFetching && _.isEmpty(volumeId) && (holdType === 'either' || holdType === 'item') ? <SelectItemHold neutralPairs={neutralPairs} brand={brand} colorMode={colorMode} id={id} item={item} setItem={setItem} language={language} data={data} holdType={holdType} setHoldType={setHoldType} holdTypeForFormat={holdTypeForFormat} url={library.baseUrl} showModal={showModal} textColor={textColor} /> : null}
                              {promptForHoldType || (holdType === 'volume' && _.isEmpty(volumeId)) ? <SelectVolume neutralPairs={neutralPairs} brand={brand} id={id} language={language} volume={volume} setVolume={setVolume} promptForHoldType={promptForHoldType} holdType={holdType} setHoldType={setHoldType} showModal={showModal} url={library.baseUrl} textColor={textColor} colorMode={colorMode} /> : null}
                              {(_.isArray(locations) && (_.size(locations) > 1 || !preferredPickupLocationIsValid) && !isEContent && !user.rememberHoldPickupLocation) || (_.isArray(locations) && _.size(locations) > 1 && !isEContent && _.size(accounts) > 0) ? (
                                   <FormControl className="mt-1">
                                        <FormControlLabel>
                                             <FormControlLabelText size="sm">
                                                  {getTermFromDictionary(language, 'select_pickup_location')}
                                             </FormControlLabelText>
                                        </FormControlLabel>
                                        <Select name="pickupLocations" selectedValue={location} minWidth={200} className="mt-1 mb-2" onValueChange={(itemValue) => setLocation(itemValue)}>
                                             <SelectTrigger>
                                                  {locations.map((selectedLocation, index) => {
                                                       if (selectedLocation.code === location) {
                                                            return <SelectInput value={selectedLocation.name} key={index} />;
                                                       }
                                                  })}
                                             </SelectTrigger>
                                             <SelectPortal useRNModal={true}>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            {locations.map((availableLocations, index) => {
                                                                 if (availableLocations.code === location) {
                                                                    return <SelectItem label={availableLocations.name} value={availableLocations.code} key={index} style={{ backgroundColor: brand.tertiary[300] }} textStyle={{ color: brand.tertiary['500-text'] }} />;
                                                                 }
                                                                 return <SelectItem label={availableLocations.name} value={availableLocations.code} key={index} style={{ backgroundColor: location === availableLocations.code ? brand.tertiary[300] : 'transparent' }} textStyle={{ color: location === availableLocations.code ? brand.tertiary['500-text'] : textColor }} />;
                                                            })}
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              ) : null}
                              {!user.rememberHoldPickupLocation ? <SelectNewHoldSublocation sublocations={sublocations ?? []} location={location} activeSublocation={sublocation} setActiveSublocation={setSublocation} language={language} textColor={textColor} neutralPairs={neutralPairs} brand={brand} colorMode={colorMode} /> : null}
                              {_.size(locations) > 1 && _.size(accounts) === 0 && !isEContent && library.allowRememberPickupLocation && !user.rememberHoldPickupLocation ? (
                                   <FormControl className="mb-3">
                                        <Checkbox
                                             defaultIsChecked={rememberPickupLocation}
                                             accessibilityLabel={getTermFromDictionary(language, 'always_use_pickup_location')}
                                             onChange={(value) => {
                                                  setRememberPickupLocation(value);
                                             }}>
                                             <CheckboxIndicator className="mr-2">
                                                  <CheckboxIcon style={{ color: textColor }} />
                                             </CheckboxIndicator>
                                             <CheckboxLabel>{getTermFromDictionary(language, 'always_use_pickup_location')}</CheckboxLabel>
                                        </Checkbox>
                                   </FormControl>
                              ) : null}
                              {_.isArray(accounts) && _.size(accounts) > 0 ? (
                                   <FormControl>
                                        <FormControlLabel>
                                             <FormControlLabelText>{isPlacingHold ? getTermFromDictionary(language, 'linked_place_hold_for_account') : getTermFromDictionary(language, 'linked_checkout_to_account')}</FormControlLabelText>
                                        </FormControlLabel>
                                        <Select name="linkedAccount" selectedValue={activeAccount} minWidth={200} className="mt-1 mb-3" onValueChange={(itemValue) => updateActiveAccount(itemValue)}>
                                             <SelectTrigger>
                                                  <SelectInput
                                                       value={(() => {
                                                            if (activeAccount === user.id) {
                                                                 return user.displayName;
                                                            }
                                                            const found = accounts.find((item) => activeAccount === item.id);
                                                            return found ? found.displayName : '';
                                                       })()}
                                                       placeholder={getTermFromDictionary(language, 'select_an_account')}
                                                  />
                                             </SelectTrigger>
                                             <SelectPortal useRNModal={true}>
                                                  <SelectBackdrop />
                                                  <SelectContent>
                                                       <SelectDragIndicatorWrapper>
                                                            <SelectDragIndicator />
                                                       </SelectDragIndicatorWrapper>
                                                       <SelectScrollView>
                                                            <SelectItem label={user.displayName} value={user.id} style={{ backgroundColor: activeAccount === user.id ? brand.tertiary[300] : 'transparent' }} textStyle={{ color: activeAccount === user.id ? brand.tertiary['500-text'] : textColor }} />
                                                            {accounts.map((item, index) => {
                                                                 return <SelectItem label={item.displayName} value={item.id} key={index} style={{ backgroundColor: activeAccount === item.id ? brand.tertiary[300] : 'transparent' }} textStyle={{ color: activeAccount === item.id ? brand.tertiary['500-text'] : textColor }} />;
                                                            })}
                                                       </SelectScrollView>
                                                  </SelectContent>
                                             </SelectPortal>
                                        </Select>
                                   </FormControl>
                              ) : null}
                         </ModalBody>
                         <ModalFooter>
                              <ButtonGroup space="sm">
                                   <Button
                                        variant="outline"
                                        style={{ borderColor: neutrals.border }}
                                        onPress={() => {
                                             setShowModal(false);
                                        }}>
                                        <ButtonText style={{ color: neutrals.textMain }}>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                   </Button>
                                   {promptAlternateLibraryCard && !userHasAlternateLibraryCard ? (
                                        <Button
                                             colorScheme="primary"
                                             onPress={() => {
                                                  setShowModal(false);
                                                  setShowAddAlternateLibraryCardModal(true);
                                             }}>
                                             <ButtonText>{getTermFromDictionary(language, 'next')}</ButtonText>
                                        </Button>
                                   ) : (
                                        <Button
                                             colorScheme="primary"
                                             onPress={async () => {
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
                                                                 tmp = _.merge(obj, tmp);
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

                                                                 tmp = _.merge(obj, tmp);
                                                                 setHoldSelectItemResponse(tmp);
                                                            }

                                                            if (result?.needsIllRequest && result.needsIllRequest === true) {
                                                                 result.message = result.message + '\n' + 'You may be able to request this title from another library using our web based catalog or by visiting the library.';
                                                                 setResponse(result);
                                                            }

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
                                            <ButtonText>{title}</ButtonText>
                                        </Button>
                                   )}
                              </ButtonGroup>
                         </ModalFooter>
                    </ModalContent>
               </Modal>
          </>
     );
};
