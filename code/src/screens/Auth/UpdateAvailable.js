import React from 'react';
import * as Linking from 'expo-linking';
import {getTermFromDictionary} from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { ThemedAlertDialog as AlertDialog, ThemedAlertDialogBackdrop as AlertDialogBackdrop, ThemedAlertDialogBody as AlertDialogBody, ThemedAlertDialogFooter as AlertDialogFooter, ThemedAlertDialogHeader as AlertDialogHeader, ThemedAlertDialogContent as AlertDialogContent } from '@/src/components/themed/ThemedAlertDialog';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';

/**
 * UpdateAvailable component that displays an alert dialog informing the user about an available update and provides options to update or cancel.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const UpdateAvailable = (props) => {
	const language = useActiveLanguage();
	const { url, latest, setHasUpdate } = props;
	const [isOpen, setIsOpen] = React.useState(true);
	const onClose = () => {
		setHasUpdate(false);
		setIsOpen(false);
	};
	const cancelRef = React.useRef(null);

	const openAppStore = async () => {
		onClose();
		await Linking.openURL(url);
	}

	return (
		<Center>
			<AlertDialog isOpen={isOpen} onClose={onClose} finalFocusRef={cancelRef}>
				<AlertDialogBackdrop />
				<AlertDialogContent>
					<AlertDialogHeader>
						<Heading>{getTermFromDictionary(language, 'update_available')}</Heading>
					</AlertDialogHeader>
					<AlertDialogBody>
						<Text size="sm">{getTermFromDictionary(language, 'update_message')}</Text>
					</AlertDialogBody>
					<AlertDialogFooter>
						<ButtonGroup space="md">
							<Button variant="outline" colorScheme="secondary" onPress={onClose} ref={cancelRef}>
								<ButtonText>{getTermFromDictionary(language, 'cancel')}</ButtonText>
							</Button>
							<Button colorScheme="primary" onPress={() => openAppStore()}>
								<ButtonText>{getTermFromDictionary(language, 'update_now')}</ButtonText>
							</Button>
						</ButtonGroup>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Center>
	);
};
