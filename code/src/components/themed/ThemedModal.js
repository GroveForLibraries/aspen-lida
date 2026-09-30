import React from 'react';
import { useWindowDimensions } from 'react-native';
import {
     Modal,
     ModalBackdrop,
     ModalBody,
     ModalCloseButton,
     ModalContent,
     ModalFooter,
     ModalHeader,
} from '@/components/ui/modal';
import { useTheme, TOKENS } from '../../themes/theme';

/** Re-export of gluestack's ModalBackdrop, unmodified. */
export const ThemedModalBackdrop = ModalBackdrop;
/** Re-export of gluestack's ModalHeader, unmodified. */
export const ThemedModalHeader = ModalHeader;
/** Re-export of gluestack's ModalBody, unmodified. */
export const ThemedModalBody = ModalBody;
/** Re-export of gluestack's ModalFooter, unmodified. */
export const ThemedModalFooter = ModalFooter;

/**
 * Wraps gluestack's Modal. `avoidKeyboard` defaults to true so the modal repositions to keep
 * focused inputs visible above the keyboard; pass `avoidKeyboard={false}` to opt out.
 */
export const ThemedModal = React.forwardRef(({ avoidKeyboard = true, ...props }, ref) => {
     return <Modal ref={ref} avoidKeyboard={avoidKeyboard} {...props} />;
});

ThemedModal.displayName = 'ThemedModal';

/**
 * Wraps gluestack's ModalContent. Caps width at 90% of the screen and height at 80% of the window,
 * fills the background with the theme's surface color, applies 16px padding on all sides, and
 * casts an elevated shadow. Pass `style` to override any of these.
 */
export const ThemedModalContent = React.forwardRef(({ style, ...props }, ref) => {
     const { neutrals } = useTheme();
     const { height: windowHeight } = useWindowDimensions();
     const surfaceBg = neutrals.surface;

     return <ModalContent ref={ref} style={[{ maxWidth: '90%', maxHeight: windowHeight * 0.8, backgroundColor: surfaceBg, padding: 16, boxShadow: TOKENS.primitives.shadows.elevated }, style]} {...props} />;
});

ThemedModalContent.displayName = 'ThemedModalContent';

/** Wraps gluestack's ModalCloseButton, adding 12px of padding by default. Pass `style` to override. */
export const ThemedModalCloseButton = React.forwardRef(({ style, ...props }, ref) => {
     return <ModalCloseButton ref={ref} style={[{ padding: 12 }, style]} {...props} />;
});

ThemedModalCloseButton.displayName = 'ThemedModalCloseButton';
