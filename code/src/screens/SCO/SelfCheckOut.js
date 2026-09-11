import React, {useState} from 'react';
import { CheckoutsContext } from '../../context/initialContext';
import { useLibraryLocation, useSelfCheckSettings } from '../../hooks/useLibraryBranchData';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useCards, useAccounts, useUpdateUserProfile } from '../../hooks/useUserData';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { navigateStack } from '../../helpers/RootNavigator';
import { ThemedMaterialIcons as MaterialIcons, ThemedMaterialCommunityIcons as MaterialCommunityIcons } from '../../components/themed/ThemedMaterialIcons';
import _ from 'lodash';
import { loadingSpinner } from '../../components/loadingSpinner';
import { checkoutItem, refreshProfile } from '../../util/api/user';
import { useQueryClient } from '@tanstack/react-query';
import { logDebugMessage, logErrorMessage, logInfoMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { ThemedAlert as Alert, ThemedAlertText as AlertText } from '../../components/themed/ThemedAlert';
import { ThemedCloseIcon as CloseIcon, ThemedFormControl as FormControl, ThemedInput as Input, ThemedInputField as InputField, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { Box } from '@/components/ui/box';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { FlatList } from '@/components/ui/flat-list';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * SelfCheckOut component that manages the self-checkout process for library items. It allows users to scan or enter barcodes, checks out items, and displays the current session's checked-out items. It also handles errors and confirmation messages during the checkout process.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SelfCheckOut = () => {
     const queryClient = useQueryClient();
     const navigation = useNavigation();
     const route = useRoute();
     const library = useLibrary();
     const location = useLibraryLocation();
     const selfCheckSettings = useSelfCheckSettings();
     const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const updateUserProfile = useUpdateUserProfile();
     const { data: cards } = useCards();
     const { data: accounts } = useAccounts();
     const { checkouts, updateCheckouts } = React.useContext(CheckoutsContext);
     const { brand } = useTheme();

     const passedItems = route.params?.items ?? [];
     const [items, setItems] = React.useState(passedItems);

     const [mustConfirm, setMustConfirm] = React.useState(false);
     const [confirmMessage, setConfirmMessage] = React.useState('');
     const [openConfirmAlert, setOpenConfirmAlert] = React.useState(false);
     const [showModal, setShowModal] = useState(false);
     const [showFinishModal, setShowFinishModal] = useState(false);
     const [newBarcode, setNewBarcode] = React.useState(null);
     const [isProcessingCheckout, setIsProcessingCheckout] = React.useState(false);
     const [isOpen, setIsOpen] = React.useState(false);
     const [hasError, setHasError] = React.useState(false);
     const [errorBody, setErrorBody] = React.useState(null);
     const [errorTitle, setErrorTitle] = React.useState(null);
     const [itemNotFound, setItemNotFound] = React.useState(false);
     const [tempBarcode, setTempBarcode] = React.useState(null);

     const onCloseConfirm = () => setOpenConfirmAlert(false);
     const cancelRefConfirm = React.useRef(null);
     const onClose = () => setIsOpen(false);
     const cancelRef = React.useRef(null);

     let startNew = route.params?.startNew ?? false;
     let activeAccount = route.params?.activeAccount ?? user;

     let barcode = route.params?.barcode ?? null;
     let barcodeType = route.params?.type ?? null;
     let sessionCheckouts = [];

     let keyboardType = 0;
     if (selfCheckSettings.barcodeEntryKeyboardType) {
          keyboardType = selfCheckSettings.barcodeEntryKeyboardType;
     }
     const toggle = () => {
          barcode = null;
          setNewBarcode(null);
          setShowModal(!showModal);
     };

     let checkoutResult = null;
     let checkoutHasError = false;
     let checkoutErrorMessageBody = null;
     let checkoutErrorMessageTitle = null;

     const refreshAndSaveUserProfile = React.useCallback(async () => {
          const profileResponse = await refreshProfile(library.baseUrl);
          if (profileResponse?.ok && profileResponse?.data?.result?.profile) {
               await updateUserProfile(profileResponse.data.result.profile);
          }
     }, [library.baseUrl, updateUserProfile]);

     if (_.find(cards, ['ils_barcode', activeAccount])) {
          activeAccount = _.find(cards, ['ils_barcode', activeAccount]);
     } else if (_.find(cards, ['cat_username', activeAccount])) {
          activeAccount = _.find(cards, ['cat_username', activeAccount]);
     }

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box /> });
     }, [navigation]);

     React.useEffect(() => {
          const updateCheckoutsCallback = async () => {
               if (startNew) {
                    setItems([]);
                    startNew = false;
                    checkoutHasError = false;
               } else {
                    if (barcode) {
                         logDebugMessage('barcode: ' + barcode);
                         logDebugMessage('items:');
                         logDebugMessage(items);
                         logDebugMessage('session checkouts: ');
                         logDebugMessage(sessionCheckouts);
                         logDebugMessage('matching items: ');
                         logDebugMessage(_.find(sessionCheckouts, ['barcode', barcode]) ?? false);
                         // check if item is already checked out
                         if (_.find(sessionCheckouts, ['barcode', barcode]) || _.find(checkouts, ['barcode', barcode])) {
                              // prompt error
                              setHasError(true);
                              setErrorBody(getTermFromDictionary(language, 'item_already_checked_out'));
                              setErrorTitle(getTermFromDictionary(language, 'unable_to_checkout_title'));
                              setIsOpen(true);
                         } else {
                              // do the checkout
                              setIsProcessingCheckout(true);
                              await checkoutItem(library.baseUrl, barcode, 'ils', activeAccount.userId ?? user.id, barcode, location.locationId, barcodeType, language).then((result) => {
                                   if (!result.success) {
                                        // prompt error
                                        setHasError(true);
                                        setErrorBody(result.message ?? getTermFromDictionary(language, 'unknown_error_checking_out'));
                                        setErrorTitle(result.title ?? getTermFromDictionary(language, 'unable_to_checkout_title'));
                                        setItemNotFound(result.itemNotFound ?? false);
                                        setTempBarcode(result.barcode ?? null);
                                        setIsOpen(true);
                                        logErrorMessage(result);
                                   } else {
                                        let tmp = result.itemData;
                                        tmp.completionMessage = result.completionMessage ?? null;
                                        tmp.mustConfirm = result.mustConfirmCompletionMessage ?? false;
                                        let updatedSession = _.concat(tmp, items);
                                        logInfoMessage(tmp);
                                        //setItems(tmp);
                                        setItems([...items, tmp]);
                                        sessionCheckouts = updatedSession;

                                        queryClient.invalidateQueries({ queryKey: ['checkouts', user.id, library.baseUrl, language] });
                                        refreshAndSaveUserProfile();
                                        /*useQuery(['checkouts', user.id, library.baseUrl, language], () => getPatronCheckedOutItems('all', library.baseUrl, true, language), {
                                             onSuccess: (data) => {
                                                  updateCheckouts(data);
                                             } });*/

                                        setMustConfirm(false); //reset in case multi-checkout session
                                        if (result.completionMessage && (result.mustConfirmCompletionMessage === 1 || result.mustConfirmCompletionMessage === true || result.mustConfirmCompletionMessage === '1' || result.mustConfirmCompletionMessage === 'true')) {
                                             setMustConfirm(true);
                                             setConfirmMessage(result.completionMessage ?? '');
                                             setOpenConfirmAlert(true);
                                        }
                                   }
                                   barcode = null;
                                   setIsProcessingCheckout(false);
                              });
                         }
                    }
               }
          };

          const unsubscribe = navigation.addListener('focus', updateCheckoutsCallback);

          return unsubscribe;
     }, [navigation, barcode, startNew, items, checkouts, library.baseUrl, language, activeAccount.userId, user.id, location.locationId, barcodeType, queryClient]);

     const openScanner = async () => {
          barcode = null;
          navigateStack('SelfCheckTab', 'SelfCheckOutScanner', {
               activeAccount });
     };

     const finishSession = () => {
          barcode = null;
          setShowFinishModal(true);
     };

     const startNewSession = () => {
          setShowFinishModal(false);
          if (_.size(accounts) >= 1) {
               navigation.replace('StartCheckOutSession', {
                    startNew: true });
          } else {
               navigation.replace('SelfCheckOut', {
                    startNew: true,
                    barcode: null });
          }
     };

     const goToCheckouts = () => {
          setShowFinishModal(false);
          navigateStack('AccountScreenTab', 'MyCheckouts');
     };

     const currentCheckoutHeader = () => {
          if (_.size(items) >= 1) {
               return (
                    <HStack space="md" className="justify-between pb-2">
                         <Text bold className="w-[70%]" size="xs">
                              {getTermFromDictionary(language, 'title')}
                         </Text>
                         <Text bold className="w-[25%]" size="xs">
                              {getTermFromDictionary(language, 'checkout_due')}
                         </Text>
                    </HStack>
               );
          }
          return null;
     };

     const currentCheckOutItem = (item) => {
          if (item) {
               let title = item?.title ?? getTermFromDictionary(language, 'unknown_title');
               let barcode = item?.barcode ?? '';
               let dueDate = item?.due ?? '';
               let completionMessage = item?.completionMessage ?? '';
               let mustConfirm = item?.mustConfirm ?? false;
               return (
                    <>
                         <HStack space="md" className="justify-between">
                              <HStack space="xs" className="w-[70%] flex-wrap">
                                   <Text bold size="xs">
                                        {title}
                                   </Text>
                                   <Text size="xs">
                                        ({barcode})
                                   </Text>
                              </HStack>
                              <Text className="w-[25%]" size="xs">
                                   {dueDate}
                              </Text>
                         </HStack>
                         {completionMessage !== '' && !mustConfirm ? DisplayCompletionMessage(completionMessage) : null}
                    </>
               );
          }
          return null;
     };

     const DisplayCompletionMessage = (message) => {
          if (message && !mustConfirm) {
               return (
                    <Alert action="warning" variant="solid" className="w-full max-w-full">
                         <AlertText action="warning" variant="solid" bold className="text-xs">
                              {message}
                         </AlertText>
                    </Alert>
               );
          }
          return null;
     }

     const currentCheckOutEmpty = () => {
          return <Text>{getTermFromDictionary(language, 'no_items_checked_out')}</Text>;
     };

     const currentCheckOutFooter = () => {};

     return (
          <ScreenContainer className="py-5 w-full">
               <Center className="pb-5">
                    {activeAccount?.displayName ? (
                         <Text className="pb-3">
                              {getTermFromDictionary(language, 'checking_out_as')} {activeAccount.displayName}
                         </Text>
                    ) : null}
                    {keyboardType === 0 ? (
                         <Button onPress={() => openScanner()} colorScheme="secondary">
                              <MaterialCommunityIcons name="barcode" size={18} color={brand.secondary['500-text']} />
                              <ButtonText>{getTermFromDictionary(language, 'add_new_item')}</ButtonText>
                         </Button>
                    ) : (
                         <Center>
                              <FormControl>
                                   <Center>
                                        <FormControlLabel>
                                            <FormControlLabelText>{getTermFromDictionary(language, 'add_new_item')}</FormControlLabelText>
                                        </FormControlLabel>
                                       <ButtonGroup space="md">
                                            <Button onPress={() => openScanner()} colorScheme="secondary">
                                                 <MaterialCommunityIcons name="barcode" size={18} color={brand.secondary['500-text']} />
                                                 <ButtonText>{getTermFromDictionary(language, 'scan')}</ButtonText>
                                             </Button>
                                            <Button onPress={toggle} colorScheme="secondary">
                                                 <MaterialIcons name="dialpad" size={18} color={brand.secondary['500-text']} />
                                                 <ButtonText>{getTermFromDictionary(language, 'type')}</ButtonText>
                                             </Button>
                                        </ButtonGroup>
                                   </Center>
                              </FormControl>
                              <Modal isOpen={showModal} onClose={toggle} size="md" useRNModal={true}>
                                   <ModalBackdrop />
                                   <ModalContent className="max-w-[90%]">
                                        <ModalHeader>
                                            <Heading>
                                                  {getTermFromDictionary(language, 'add_new_item')}
                                             </Heading>
                                            <ModalCloseButton onPress={toggle}>
                                                 <CloseIcon />
                                             </ModalCloseButton>
                                        </ModalHeader>
                                        <ModalBody>
                                            <FormControl>
                                                 <Input>
                                                      <InputField keyboardType={keyboardType === 1 ? 'number-pad' : 'default'} variant="outline" autoCapitalize="none" placeholder={getTermFromDictionary(language, 'enter_barcode')} size="$lg" defaultValue={newBarcode} onChangeText={(text) => setNewBarcode(text)} />
                                                  </Input>
                                             </FormControl>
                                        </ModalBody>
                                        <ModalFooter>
                                             <ButtonGroup>
                                                 <Button colorScheme="primary" variant="outline" onPress={toggle}>
                                                      <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                                  </Button>
                                                  <Button
                                                      colorScheme="primary"
                                                       onPress={() => {
                                                            navigation.replace('SelfCheckOut', {
                                                                 barcode: newBarcode,
                                                                 type: null,
                                                                 activeAccount,
                                                                 startNew: false,
                                                                 items,
                                                            });
                                                       }}>
                                                       <ButtonText>{getTermFromDictionary(language, 'add_new_item')}</ButtonText>
                                                  </Button>
                                             </ButtonGroup>
                                        </ModalFooter>
                                   </ModalContent>
                              </Modal>
                         </Center>
                    )}
               </Center>
               <Heading size="md" className="pb-2">
                    {getTermFromDictionary(language, 'checked_out_during_session')}
               </Heading>
               {isProcessingCheckout ? (
                    <Center>
                         <Text className="pb-5">
                              {getTermFromDictionary(language, 'processing_checkout_message')}
                         </Text>
                         {loadingSpinner()}
                    </Center>
               ) : (
                    <FlatList data={items} keyExtractor={(item, index) => index.toString()} ListEmptyComponent={currentCheckOutEmpty()} ListHeaderComponent={currentCheckoutHeader()} renderItem={({ item }) => currentCheckOutItem(item)} />
               )}
               <Center className="pt-5">
                    <Button onPress={() => finishSession()} size="sm" colorScheme="primary">
                         <ButtonText>{getTermFromDictionary(language, 'button_finish')}</ButtonText>
                    </Button>
               </Center>
               <Center>
                    <AlertDialog leastDestructiveRef={cancelRefConfirm} isOpen={openConfirmAlert} onClose={onCloseConfirm} closeOnOverlayClick={false} useRNModal={true}>
                         <AlertDialogBackdrop />
                         <AlertDialogContent>
                              <AlertDialogHeader>
                                   <Heading>{getTermFromDictionary(language, 'notice_about_item')}</Heading>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                   <Text>{confirmMessage}</Text>
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <ButtonGroup space="sm">
                                        <Button colorScheme="primary" variant="outline" onPress={() => setOpenConfirmAlert(false)}>
                                             <ButtonText>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                   </ButtonGroup>
                              </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
               </Center>
               <Center>
                    <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose} useRNModal={true}>
                         <AlertDialogBackdrop />
                         <AlertDialogContent>
                              <AlertDialogHeader>
                                   <Heading>
                                        {errorTitle}
                                   </Heading>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                   <Text>{errorBody}</Text>
                                   {itemNotFound && tempBarcode ? (
                                        <>
                                             <FormControl>
                                                  <FormControlLabel>
                                                       <FormControlLabelText>{getTermFromDictionary(language, 'does_barcode_match_item')}</FormControlLabelText>
                                                  </FormControlLabel>
                                                  <Input>
                                                       <InputField id="barcode" autoCapitalize="none" autoCorrect={false} onChangeText={(text) => setTempBarcode(text)} defaultValue={tempBarcode} />
                                                  </Input>
                                             </FormControl>
                                        </>
                                   ) : null}
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <ButtonGroup space="sm">
                                        <Button colorScheme="primary" variant="outline" onPress={() => setIsOpen(false)}>
                                             <ButtonText>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                        {itemNotFound && tempBarcode ? (
                                             <Button
                                                  colorScheme="primary"
                                                  onPress={() => {
                                                       navigation.replace('SelfCheckOut', {
                                                            barcode: tempBarcode,
                                                            type: null,
                                                            activeAccount,
                                                            startNew: false,
                                                            items,
                                                       });
                                                  }}>
                                                  <ButtonText>{getTermFromDictionary(language, 'try_again')}</ButtonText>
                                             </Button>
                                        ) : null}
                                   </ButtonGroup>
                              </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
               </Center>
               <Center>
                    <AlertDialog leastDestructiveRef={cancelRef} isOpen={showFinishModal} onClose={() => startNewSession()} size="lg" useRNModal={true}>
                         <AlertDialogBackdrop />
                         <AlertDialogContent>
                              <AlertDialogHeader>
                                   <Heading>{getTermFromDictionary(language, 'finish_checkout_session')}</Heading>
                                   <Button variant="link" onPress={() => setShowFinishModal(false)} style={{ position: 'absolute', right: 12, top: 4, backgroundColor: 'transparent' }}>
                                        <CloseIcon />
                                   </Button>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                   <Text>{getTermFromDictionary(language, 'finish_checkout_session_body')}</Text>
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <HStack className="w-full justify-center">
                                        <Button size="sm" onPress={() => startNewSession()} colorScheme="primary" className="mr-5">
                                             <ButtonText>{getTermFromDictionary(language, 'start_new_session')}</ButtonText>
                                        </Button>
                                        <Button size="sm" colorScheme="primary" onPress={() => goToCheckouts()}>
                                             <ButtonText>{getTermFromDictionary(language, 'view_checkouts')}</ButtonText>
                                        </Button>
                                   </HStack>
                              </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
               </Center>
          </ScreenContainer>
     );
};
