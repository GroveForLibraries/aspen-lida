import React from 'react';
import { Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { resolveAlertColors } from './statusStyles';
import { useTheme } from '../../themes/theme';

/**
 * Themed wrapper around Toast. Colors background/border from `action` via resolveAlertColors and
 * always renders with the underlying `variant="solid"`; the `variant` prop is only read here to
 * pick between a filled background (default) or a left-accent-border style (`variant === 'accent'`).
 * The original `action` prop is still forwarded to the underlying Toast. Defaults to a standard
 * width (90% of the screen, centered) instead of shrinking to fit its content.
 */
export const ThemedToast = React.forwardRef(({ action, variant = 'solid', className, style, ...props }, ref) => {
     const { brand, neutrals } = useTheme();
     const colors = resolveAlertColors(action, brand, neutrals);
     const isAccent = variant === 'accent';
     const colorStyle = isAccent
          ? { width: '90%', backgroundColor: colors.bg, borderLeftColor: colors.icon }
          : { width: '90%', backgroundColor: colors.bg, borderColor: colors.bg };
     const structureClasses = isAccent ? 'border-0 border-l-4 shadow-soft-4' : null;

     return <Toast ref={ref} action={action} variant="solid" className={[structureClasses, className].filter(Boolean).join(' ')} style={[colorStyle, style]} {...props} />;
});

/** Themed wrapper around ToastTitle. Colors its text from `action` via resolveAlertColors. */
export const ThemedToastTitle = React.forwardRef(({ action, variant, className, style, ...props }, ref) => {
     const { brand, neutrals } = useTheme();
     const colors = resolveAlertColors(action, brand, neutrals);

     return <ToastTitle ref={ref} className={className} style={[{ color: colors.text }, style]} {...props} />;
});

/** Themed wrapper around ToastDescription. Passes className/style through unchanged. */
export const ThemedToastDescription = React.forwardRef(({ className, ...props }, ref) => {
     return <ToastDescription ref={ref} className={className} {...props} />;
});

ThemedToast.displayName = 'ThemedToast';
ThemedToastTitle.displayName = 'ThemedToastTitle';
ThemedToastDescription.displayName = 'ThemedToastDescription';
