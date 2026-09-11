import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUserState, useAccounts } from '../../hooks/useUserData';
import {
     AlertDialog,
     AlertDialogBackdrop,
     AlertDialogContent,
     AlertDialogHeader,
     AlertDialogBody,
     AlertDialogFooter,
     Box,
     Heading,
     Button,
     ButtonGroup,
     ButtonText,
     Center,
     FormControl,
     FormControlLabel,
     FormControlLabelText,
     Select,
     SelectItem,
     SelectTrigger,
     SelectInput,
     SelectIcon,
     Icon,
     ChevronDownIcon,
     SelectPortal, SelectContent, SelectScrollView,
     SelectBackdrop,
     SelectDragIndicatorWrapper,
     SelectDragIndicator } from '@gluestack-ui/themed';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { navigateStack } from '../../helpers/RootNavigator';
import { useNavigation, useRoute } from '@react-navigation/native';
import {logDebugMessage} from "../../util/logging";
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { useTheme } from '../../themes/theme';

export const StartCheckOutSession = () => {
     const navigation = useNavigation();
     const language = useActiveLanguage();
     const { data: userState } = useUserState();
     const user = userState?.user ?? {};
     const { data: accounts } = useAccounts();
     const { textColor, colorMode, theme } = useTheme();
     const insets = useSafeAreaInsets();

     let startNew = useRoute().params?.startNew ?? false;

     const [isOpen, setIsOpen] = React.useState(useRoute().params?.startNew ?? true);
     const cancelRef = React.useRef(null);

     const [activeAccount, setActiveAccount] = React.useState(user.ils_barcode ?? user.cat_username);
     const availableAccounts = Object.values(accounts ?? {});

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
                    <AlertDialogContent bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}>
                         <AlertDialogHeader><Heading size="md" color={textColor}>{getTermFromDictionary(language, 'start_checkout_session')}</Heading></AlertDialogHeader>
                         <AlertDialogBody>
                              <FormControl pb="$5">
                                   <FormControlLabel>
                                        <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'select_an_account')}</FormControlLabelText>
                                   </FormControlLabel>
                                   <Select
                                        name="linkedAccount"
                                        selectedValue={activeAccount}
                                        accessibilityLabel={getTermFromDictionary(language, 'select_an_account')}
                                        mt="$1"
                                        mb="$3"
                                        onValueChange={(itemValue) => setActiveAccount(itemValue)}>
                                        <SelectTrigger variant="outline" size="md">
                                             <SelectInput
                                                  py={0}
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
                                                  color={textColor}
                                                  placeholder={getTermFromDictionary(language, 'select_an_account')}
                                             />
                                             <SelectIcon mr="$3">
                                                  <Icon as={ChevronDownIcon} color={textColor} />
                                             </SelectIcon>
                                        </SelectTrigger>
                                        <SelectPortal>
                                             <SelectBackdrop />
                                             <SelectContent
                                                  bgColor={colorMode === 'light' ? "$warmGray50" : "$coolGray700"}
                                                  pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}
                                             >
                                                  <SelectDragIndicatorWrapper>
                                                       <SelectDragIndicator />
                                                  </SelectDragIndicatorWrapper>
                                                  <SelectScrollView>
                                                       <SelectItem label={user.displayName} value={user.ils_barcode ?? user.cat_username} bgColor={activeAccount === (user.ils_barcode ?? user.cat_username) ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: activeAccount === (user.ils_barcode ?? user.cat_username) ? theme.tokens.colors.tertiary['500-text'] : textColor } }} />
                                                       {availableAccounts.map((item, index) => {
                                                            return <SelectItem label={item.displayName} value={item.ils_barcode ?? item.cat_username} key={index} bgColor={activeAccount === (item.ils_barcode || item.cat_username) ? theme.tokens.colors.tertiary['300'] : ''} sx={{ _text: { color: activeAccount === (item.ils_barcode || item.cat_username) ? theme.tokens.colors.tertiary['500-text'] : textColor } }}/>;
                                                       })}
                                                  </SelectScrollView>
                                             </SelectContent>
                                        </SelectPortal>
                                   </Select>
                              </FormControl>
                         </AlertDialogBody>
                         <AlertDialogFooter>
                              <ButtonGroup space="sm">
                                   <Button ref={cancelRef} onPress={() => GoBackHome()} bgColor={theme.tokens.colors.primary['500']}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'cancel')}</ButtonText>
                                   </Button>
                                   <Button onPress={() => StartNewSession()} bgColor={theme.tokens.colors.primary['500']}>
                                        <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'button_start')}</ButtonText>
                                   </Button>
                              </ButtonGroup>
                         </AlertDialogFooter>
                    </AlertDialogContent>
               </AlertDialog>
          </Center>
     );
};
