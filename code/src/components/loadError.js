import React from 'react';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { ThemedButton as Button, ThemedButtonIcon as ButtonIcon, ThemedButtonText as ButtonText } from './themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { HStack } from '@/components/ui/hstack';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { getTermFromDictionary } from '../translations/TranslationHelper';
import { useActiveLanguage } from '../hooks/useLanguageData';
import { useTheme } from '../themes/theme';

/**
 * Catch an error and display it to the user
 * <ul>
 *     <li>error - The error array that contains title and message objects</li>
 *     <li>reloadAction - The name of the component that would result in a reload of the screen (optional)</li>
 * </ul>
 * @param props
 **/
export const LoadError = (props) => {
     const { error, reloadAction } = props;
     const { neutralPairs, brand } = useTheme();

     return (
          <Center className="flex-1">
               <HStack>
                    <MaterialIcons name="error" size={18} color={neutralPairs.danger} className="mr-1" />
                    <Heading className="mb-2" style={{ color: neutralPairs.danger }}>
                         {getTermFromDictionary('en', 'error')}
                    </Heading>
               </HStack>
               <Text bold className="w-[75%] text-center">
                    {getTermFromDictionary('en', 'error_loading_results')}
               </Text>
               {reloadAction ? (
                   <Button onPress={reloadAction} colorScheme="primary" className="mt-5">
                         <ButtonIcon>
                              <MaterialIcons name="refresh" size={16} color={brand.primary['500-text']} />
                         </ButtonIcon>
                         <ButtonText>{getTermFromDictionary('en', 'button_reload')}</ButtonText>
                    </Button>
               ) : null}
               <Text size="xs" className="mt-5" style={{ width: '75%', color: neutralPairs.iconMuted.dark, textAlign: 'center' }}>
                    ERROR: {error}
               </Text>
          </Center>
     );
}

/**
 * Catch an error and display it to the user
 * @param error
 * @param reloadAction
 * @returns {React.JSX.Element}
 */
export function loadError(error, reloadAction = '') {
     return <LoadError error={error} reloadAction={reloadAction} />;
}

/**
 * DisplayErrorAlertDialog component for displaying an error alert dialog to the user.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const DisplayErrorAlertDialog = (props) => {
     const { title, message } = props;
     const language = useActiveLanguage();
     const { neutralPairs, brand } = useTheme();
     const [isOpen, setIsOpen] = React.useState(true);
     const onClose = () => setIsOpen(false);
     const cancelRef = React.useRef(null);

     return (
          <Center>
               <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
                    <AlertDialogBackdrop />
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <Heading>{title}</Heading>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        <Text>{message}</Text>
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <ButtonGroup space="md">
                            <Button onPress={onClose} colorScheme="primary" ref={cancelRef}>
                                <ButtonText>{getTermFromDictionary(language, 'close_window')}</ButtonText>
                            </Button>
                        </ButtonGroup>
                    </AlertDialogFooter>
                    </AlertDialogContent>
               </AlertDialog>
          </Center>
     );
}
