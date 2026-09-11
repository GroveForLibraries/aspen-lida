import React from 'react';
import {
     AlertDialog,
     AlertDialogBackdrop,
     AlertDialogBody,
     AlertDialogCloseButton,
     AlertDialogContent,
     AlertDialogFooter,
     AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { useTheme } from '../../themes/theme';

/** Re-export of gluestack's AlertDialog, unmodified. */
export const ThemedAlertDialog = AlertDialog;
/** Re-export of gluestack's AlertDialogBackdrop, unmodified. */
export const ThemedAlertDialogBackdrop = AlertDialogBackdrop;
/** Re-export of gluestack's AlertDialogHeader, unmodified. */
export const ThemedAlertDialogHeader = AlertDialogHeader;
/** Re-export of gluestack's AlertDialogBody, unmodified. */
export const ThemedAlertDialogBody = AlertDialogBody;
/** Re-export of gluestack's AlertDialogFooter, unmodified. */
export const ThemedAlertDialogFooter = AlertDialogFooter;
/** Re-export of gluestack's AlertDialogCloseButton, unmodified. */
export const ThemedAlertDialogCloseButton = AlertDialogCloseButton;

/**
 * Wraps gluestack's AlertDialogContent. Fills the background with the theme's surface color and
 * colors the border with the theme's border color; both overridable via `style`.
 */
export const ThemedAlertDialogContent = React.forwardRef(({ style, ...props }, ref) => {
     const { neutrals } = useTheme();

     return <AlertDialogContent ref={ref} style={[{ backgroundColor: neutrals.surface, borderColor: neutrals.border }, style]} {...props} />;
});

ThemedAlertDialogContent.displayName = 'ThemedAlertDialogContent';
