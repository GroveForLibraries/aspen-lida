import React from 'react';
import { useUserState, useAccounts } from '../../hooks/useUserData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { navigateStack } from '../../helpers/RootNavigator';
import { useNavigation, useRoute } from '@react-navigation/native';
import _ from 'lodash';
import {logDebugMessage} from "../../util/logging";
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';
import { ThemedAlertDialogContent as AlertDialogContent, ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader } from '@/src/components/themed/ThemedAlertDialog';
import { Box } from '@/components/ui/box';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedFormControl as FormControl, ThemedFormControlLabelText as FormControlLabelText, ThemedFormControlLabel as FormControlLabel } from '../../components/themed/ThemedFormControls';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedSelect as Select, ThemedSelectBackdrop as SelectBackdrop, ThemedSelectContent as SelectContent, ThemedSelectDragIndicator as SelectDragIndicator, ThemedSelectDragIndicatorWrapper as SelectDragIndicatorWrapper, ThemedSelectInput as SelectInput, ThemedSelectItem as SelectItem, ThemedSelectPortal as SelectPortal, ThemedSelectScrollView as SelectScrollView, ThemedSelectTrigger as SelectTrigger } from '../../components/themed/ThemedSelect';

/**
 * StartCheckOutSession component that displays an alert dialog for starting a new checkout session. It allows the user to select an account and either start a new session or cancel and go back home.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const StartCheckOutSession = () => {
     const navigation = useNavigation();
     const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: accounts } = useAccounts();
     const { textColor, brand } = useTheme();

     let startNew = useRoute().params?.startNew ?? false;

     const [isOpen, setIsOpen] = React.useState(useRoute().params?.startNew ?? true);
     const cancelRef = React.useRef(null);

     const [activeAccount, setActiveAccount] = React.useState(user.ils_barcode ?? user.cat_username);
     let availableAccounts = [];
     if (_.size(accounts) > 0) {
          availableAccounts = Object.values(accounts);
     }

     React.useLayoutEffect(() => {
          navigation.setOptions({
               headerLeft: () => <Box /> });
     }, [navigation]);

     React.useEffect(() => {
          const startNewSession = navigation.addListener('focus', () => {
               if (startNew) {
                    setActiveAccount(user.ils_barcode ?? user.cat_username);
                    setIsOpen(true);
               }
          });

          return startNewSession;
     }, [navigation, startNew]);

     const GoBackHome = () => {
          setIsOpen(false);
          navigateStack('BrowseTab', 'HomeScreen', {});
     };

     const StartNewSession = () => {
          setIsOpen(false);
          navigateStack('SelfCheckTab', 'SelfCheckOut', {
               activeAccount: activeAccount });
     };

     /*useFocusEffect(
          React.useCallback(() => {
               const resubscribe = () => {
                    if (!isOpen) {
                         setIsOpen(true);
                    }
               };

               return () => resubscribe();
          }, [isFocused])
     );
     */

     logDebugMessage("Active account is " + activeAccount);
     logDebugMessage("User dispaly name is " + user.displayName);

     const activeItem = availableAccounts.find(
          item => activeAccount == item.ils_barcode || item.cat_username
     );

     return (
          <Center>
               <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={() => GoBackHome()}>
                    <AlertDialogBackdrop />
                    <AlertDialogContent>
                         <AlertDialogHeader><Heading>{getTermFromDictionary(language, 'start_checkout_session')}</Heading></AlertDialogHeader>
                         <AlertDialogBody>
                              <FormControl>
                                   <FormControlLabel>
                                        <FormControlLabelText>{getTermFromDictionary(language, 'select_an_account')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Select
                                        name="linkedAccount"
                                        selectedValue={activeAccount}
                                        accessibilityLabel={getTermFromDictionary(language, 'select_an_account')}
                                        className="mt-1 mb-3"
                                        onValueChange={(itemValue) => setActiveAccount(itemValue)}>
                                        <SelectTrigger>
                                             <SelectInput
                                                  value={
                                                       // Find the displayName of the selected account or use placeholder
                                                       (() => {
                                                            if (activeAccount === (user.ils_barcode ?? user.cat_username)) {
                                                                 return user.displayName;
                                                            }
                                                            const found = availableAccounts.find(
                                                                 item => activeAccount === (item.ils_barcode ?? item.cat_username)
                                                            );
                                                            return found ? found.displayName : '';
                                                       })()
                                                  }
                                                  placeholder={getTermFromDictionary(language, 'select_an_account')}
                                             />
                                        </SelectTrigger>
                                        <SelectPortal>
                                             <SelectBackdrop />
                                             <SelectContent>
                                                  <SelectDragIndicatorWrapper>
                                                       <SelectDragIndicator />
                                                  </SelectDragIndicatorWrapper>
                                                  <SelectScrollView>
                                                       <SelectItem label={user.displayName} value={user.ils_barcode ?? user.cat_username} style={activeAccount === (user.ils_barcode ?? user.cat_username) ? { backgroundColor: brand.tertiary[300] } : undefined} textStyle={{ color: activeAccount === (user.ils_barcode ?? user.cat_username) ? brand.tertiary['500-text'] : textColor }} />
                                                       {availableAccounts.map((item, index) => {
                                                            return <SelectItem label={item.displayName} value={item.ils_barcode ?? item.cat_username} key={index} style={activeAccount === (item.ils_barcode || item.cat_username) ? { backgroundColor: brand.tertiary[300] } : undefined} textStyle={{ color: activeAccount === (item.ils_barcode || item.cat_username) ? brand.tertiary['500-text'] : textColor }} />;
                                                       })}
                                                  </SelectScrollView>
                                             </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </FormControl>
                         </AlertDialogBody>
                         <AlertDialogFooter>
                              <ButtonGroup space="sm">
                                   <Button ref={cancelRef} onPress={() => GoBackHome()} colorScheme="primary">
                                        <ButtonText>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                   </Button>
                                   <Button onPress={() => StartNewSession()} colorScheme="primary">
                                        <ButtonText>{getTermFromDictionary(language, 'button_start')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </AlertDialogFooter>
                    </AlertDialogContent>
               </AlertDialog>
          </Center>
     );
};
