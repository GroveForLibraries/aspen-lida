import React from 'react';
import { AuthContext } from '../../context/AuthContext';
import {getTermFromDictionary} from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { ThemedButtonGroup as ButtonGroup } from '@/src/components/themed/ThemedButton';
import { Center } from '@/components/ui/center';
import { ThemedHeading as Heading } from '@/src/components/themed/ThemedHeading';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { ThemedModal as Modal, ThemedModalBackdrop as ModalBackdrop, ThemedModalBody as ModalBody, ThemedModalCloseButton as ModalCloseButton, ThemedModalContent as ModalContent, ThemedModalFooter as ModalFooter, ThemedModalHeader as ModalHeader } from '@/src/components/themed/ThemedModal';
import { ThemedCloseIcon as CloseIcon } from '@/src/components/themed/ThemedFormControls';

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
			<Modal leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
				<ModalBackdrop/>
				<ModalContent>
					<ModalHeader>
						<Heading>{title ?? getTermFromDictionary(language, 'error')}</Heading>
						<ModalCloseButton onPress={onClose}>
							<CloseIcon />
						</ModalCloseButton>
					</ModalHeader>
					<ModalBody>
						<Text>{reason ?? getTermFromDictionary(language, 'error_invalid_session')}</Text>
					</ModalBody>
					<ModalFooter>
						<ButtonGroup space="sm">
							<Button colorScheme="primary" onPress={signOut} ref={cancelRef}>
								<ButtonText>{getTermFromDictionary(language, 'button_ok')}</ButtonText>
							</Button>
						</ButtonGroup>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</Center>
	);
};
