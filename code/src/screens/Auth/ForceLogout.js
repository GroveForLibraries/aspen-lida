import React from 'react';
import { AuthContext } from '../../context/AuthContext';
import {getTermFromDictionary} from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * ForceLogout component that displays an alert dialog when the user is forced to log out, allowing the user to sign out.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const ForceLogout = (props) => {
     const { title, reason } = props;
	const language = useActiveLanguage();
	const { signOut } = React.useContext(AuthContext);
	const [isOpen, setIsOpen] = React.useState(true);
	const onClose = () => setIsOpen(false);
	const cancelRef = React.useRef(null);

	return (
		<Center>
			<AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
				<AlertDialogBackdrop/>
				<AlertDialogContent>
					<AlertDialogHeader><Heading>{title ?? getTermFromDictionary(language, 'error')}</Heading></AlertDialogHeader>
					<AlertDialogBody><Text>{reason ?? getTermFromDictionary(language, 'error_invalid_session')}</Text></AlertDialogBody>
					<AlertDialogFooter>
						<ButtonGroup space="sm">
							<Button colorScheme="primary" onPress={signOut} ref={cancelRef}>
								<ButtonText>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
							</Button>
						</ButtonGroup>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Center>
	);
};
