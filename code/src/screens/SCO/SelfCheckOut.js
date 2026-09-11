import React, {useState} from 'react';
import { CheckoutsContext } from '../../context/initialContext';
import { useLibraryLocation, useSelfCheckSettings } from '../../hooks/useLibraryBranchData';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import { useUserState, useCards, useAccounts, useUpdateUserProfile } from '../../hooks/useUserData';
import { Box, Button, ButtonGroup, ButtonIcon, ButtonText, Text, Heading, Center, HStack, VStack, Icon, FlatList, FormControl, FormControlLabel, FormControlLabelText, Input, InputField, Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter, CloseIcon, ModalCloseButton, AlertDialog, AlertDialogBackdrop, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Alert, AlertText } from '@gluestack-ui/themed';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { navigateStack } from '../../helpers/RootNavigator';
import { Ionicons } from '@expo/vector-icons';
import { concat, find } from '../../helpers/helpers';
import { loadingSpinner } from '../../components/loadingSpinner';
import { checkoutItem, refreshProfile } from '../../util/api/user';
import { useQueryClient } from '@tanstack/react-query';
import { logDebugMessage, logErrorMessage, logInfoMessage } from '../../util/logging';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';

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
     const {textColor, colorMode, theme} = useTheme();
     const availableAccounts = Object.values(accounts ?? {});

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

     if (find(cards, ['ils_barcode', activeAccount])) {
          activeAccount = find(cards, ['ils_barcode', activeAccount]);
     } else if (find(cards, ['cat_username', activeAccount])) {
          activeAccount = find(cards, ['cat_username', activeAccount]);
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
                         logDebugMessage(find(sessionCheckouts, ['barcode', barcode]) ?? false);
                         // check if item is already checked out
                         if (find(sessionCheckouts, ['barcode', barcode]) || find(checkouts, ['barcode', barcode])) {
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
                                        let updatedSession = concat(tmp, items);
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
          if (availableAccounts.length >= 1) {
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
          if (items.length >= 1) {
               return (
                    <HStack space="md" justifyContent="space-between" pb="$2">
                         <Text bold fontSize="$xs" w="70%" color={textColor}>
                              {getTermFromDictionary(language, 'title')}
                         </Text>
                         <Text bold fontSize="$xs" w="25%" color={textColor}>
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
                         <HStack space="md" justifyContent="space-between">
                              <HStack space="xs" w="70%" flexWrap="wrap">
                                   <Text bold fontSize="$xs" color={textColor}>
                                        {title}
                                   </Text>
                                   <Text fontSize="$xs" color={textColor}>
                                        ({barcode})
                                   </Text>
                              </HStack>
                              <Text fontSize="$xs" w="25%" color={textColor}>
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
                    <Alert width="100%" maxwidth="$full" action="warning" variant="solid">
                         <AlertText size="xs" bold>
                              {message}
                         </AlertText>
                    </Alert>
               );
          }
          return null;
     }

     const currentCheckOutEmpty = () => {
          return <Text color={textColor}>{getTermFromDictionary(language, 'no_items_checked_out')}</Text>;
     };

     const currentCheckOutFooter = () => {};

     return (
          <Box p="$5" width="$full" style={{ flex: 1 }}>
               <Center pb="$5">
                    {activeAccount?.displayName ? (
                         <Text pb="$3" color={textColor}>
                              {getTermFromDictionary(language, 'checking_out_as')} {activeAccount.displayName}
                         </Text>
                    ) : null}
                    {keyboardType === 0 ? (
                         <Button bgColor={theme['tokens']['colors']['secondary']['500']} onPress={() => openScanner()}>
                              <ButtonIcon as={Ionicons} name="barcode-outline" color={theme['tokens']['colors']['secondary']['500-text']} />
                              <ButtonText color={theme['tokens']['colors']['secondary']['500-text']}>{getTermFromDictionary(language, 'add_new_item')}</ButtonText>
                         </Button>
                    ) : (
                         <Center>
                              <FormControl>
                                   <Center>
                                        <FormControlLabel>
                                             <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'add_new_item')}</FormControlLabelText>
                                        </FormControlLabel>
                                        <ButtonGroup sp="md">
                                             <Button bgColor={theme['tokens']['colors']['secondary']['500']} onPress={() => openScanner()}>
                                                  <ButtonIcon as={Ionicons} name="barcode-outline" color={theme['tokens']['colors']['secondary']['500-text']} />
                                                  <ButtonText color={theme['tokens']['colors']['secondary']['500-text']}>{getTermFromDictionary(language, 'scan')}</ButtonText>
                                             </Button>
                                             <Button bgColor={theme['tokens']['colors']['secondary']['500']} onPress={toggle}>
                                                  <ButtonIcon as={Ionicons} name="keypad-outline" color={theme['tokens']['colors']['secondary']['500-text']} />
                                                  <ButtonText color={theme['tokens']['colors']['secondary']['500-text']}>{getTermFromDictionary(language, 'type')}</ButtonText>
                                             </Button>
                                        </ButtonGroup>
                                   </Center>
                              </FormControl>
                              <Modal isOpen={showModal} onClose={toggle} size="md" avoidKeyboard useRNModal={true}>
                                   <ModalBackdrop />
                                   <ModalContent maxWidth="90%" bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'}>
                                        <ModalHeader>
                                             <Heading size="md" color={textColor}>
                                                  {getTermFromDictionary(language, 'add_new_item')}
                                             </Heading>
                                             <ModalCloseButton p="$3" onPress={toggle}>
                                                  <Icon as={CloseIcon} color={textColor} />
                                             </ModalCloseButton>
                                        </ModalHeader>
                                        <ModalBody>
                                             <FormControl pb="$5">
                                                  <Input borderColor={colorMode === 'light' ? '$coolGray500' : '$warmGray300'}>
                                                       <InputField color={textColor} keyboardType={keyboardType === 1 ? 'number-pad' : 'default'} variant="outline" autoCapitalize="none" placeholder={getTermFromDictionary(language, 'enter_barcode')} size="$lg" defaultValue={newBarcode} onChangeText={(text) => setNewBarcode(text)} />
                                                  </Input>
                                             </FormControl>
                                        </ModalBody>
                                        <ModalFooter>
                                             <ButtonGroup>
                                                  <Button variant="outline" onPress={toggle} borderColor={theme.tokens.colors.primary['500']}>
                                                       <ButtonText color={theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                                                  </Button>
                                                  <Button
                                                       bgColor={theme.tokens.colors.primary['500']}
                                                       onPress={() => {
                                                            navigation.replace('SelfCheckOut', {
                                                                 barcode: newBarcode,
                                                                 type: null,
                                                                 activeAccount,
                                                                 startNew: false,
                                                                 items,
                                                            });
                                                       }}>
                                                       <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'add_new_item')}</ButtonText>
                                                  </Button>
                                             </ButtonGroup>
                                        </ModalFooter>
                                   </ModalContent>
                              </Modal>
                         </Center>
                    )}
               </Center>
               <Heading size="md" pb="$2" color={textColor}>
                    {getTermFromDictionary(language, 'checked_out_during_session')}
               </Heading>
               {isProcessingCheckout ? (
                    <Center>
                         <Text pb="$5" color={textColor}>
                              {getTermFromDictionary(language, 'processing_checkout_message')}
                         </Text>
                         {loadingSpinner()}
                    </Center>
               ) : (
                    <FlatList data={items} keyExtractor={(item, index) => index.toString()} ListEmptyComponent={currentCheckOutEmpty()} ListHeaderComponent={currentCheckoutHeader()} renderItem={({ item }) => currentCheckOutItem(item)} />
               )}
               <Center pt="$5">
                    <Button onPress={() => finishSession()} bgColor={theme.tokens.colors.primary['500']} size="sm">
                         <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'button_finish')}</ButtonText>
                    </Button>
               </Center>
               <Center>
                    <AlertDialog leastDestructiveRef={cancelRefConfirm} isOpen={openConfirmAlert} onClose={onCloseConfirm} closeOnOverlayClick={false} useRNModal={true}>
                         <AlertDialogBackdrop />
                         <AlertDialogContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'}>
                              <AlertDialogHeader>
                                   <Heading color={textColor}>{getTermFromDictionary(language, 'notice_about_item')}</Heading>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                   <Text color={textColor}>{confirmMessage}</Text>
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <ButtonGroup space="sm">
                                        <Button variant="outline" borderColor={theme.tokens.colors.primary['500']} onPress={() => setOpenConfirmAlert(false)}>
                                             <ButtonText color={theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                   </ButtonGroup>
                              </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
               </Center>
               <Center>
                    <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose} useRNModal={true}>
                         <AlertDialogBackdrop />
                         <AlertDialogContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'}>
                              <AlertDialogHeader>
                                   <Heading size="md" color={textColor}>
                                        {errorTitle}
                                   </Heading>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                   <Text color={textColor}>{errorBody}</Text>
                                   {itemNotFound && tempBarcode ? (
                                        <>
                                             <FormControl>
                                                  <FormControlLabel>
                                                       <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'does_barcode_match_item')}</FormControlLabelText>
                                                  </FormControlLabel>
                                                  <Input borderColor={colorMode === 'light' ? '$coolGray500' : '$warmGray300'}>
                                                       <InputField id="barcode" autoCapitalize="none" autoCorrect={false} onChangeText={(text) => setTempBarcode(text)} defaultValue={tempBarcode} color={textColor} />
                                                  </Input>
                                             </FormControl>
                                        </>
                                   ) : null}
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <ButtonGroup space="sm">
                                        <Button variant="outline" borderColor={theme.tokens.colors.primary['500']} onPress={() => setIsOpen(false)}>
                                             <ButtonText color={theme.tokens.colors.primary['500']}>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
                                        </Button>
                                        {itemNotFound && tempBarcode ? (
                                             <Button
                                                  bgColor={theme.tokens.colors.primary['500']}
                                                  onPress={() => {
                                                       navigation.replace('SelfCheckOut', {
                                                            barcode: tempBarcode,
                                                            type: null,
                                                            activeAccount,
                                                            startNew: false,
                                                            items,
                                                       });
                                                  }}>
                                                  <ButtonText textColor={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'try_again')}</ButtonText>
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
                         <AlertDialogContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'}>
                              <AlertDialogHeader>
                                   <Heading color={textColor}>{getTermFromDictionary(language, 'finish_checkout_session')}</Heading>
                                   <Button variant="link" onPress={() => setShowFinishModal(false)} position="absolute" right="$3" top="$1" bg="transparent">
                                        <Icon as={CloseIcon} color={textColor} />
                                   </Button>
                              </AlertDialogHeader>
                              <AlertDialogBody>
                                   <Text color={textColor}>{getTermFromDictionary(language, 'finish_checkout_session_body')}</Text>
                              </AlertDialogBody>
                              <AlertDialogFooter>
                                   <HStack width="$full" justifyContent="center">
                                        <Button size="sm" onPress={() => startNewSession()} bgColor={theme.tokens.colors.primary['500']} mr="$5">
                                             <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'start_new_session')}</ButtonText>
                                        </Button>
                                        <Button size="sm" bgColor={theme.tokens.colors.primary['500']} onPress={() => goToCheckouts()}>
                                             <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'view_checkouts')}</ButtonText>
                                        </Button>
                                   </HStack>
                              </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>
               </Center>
          </Box>
     );
};
