import React from 'react';
import { Alert, AlertIcon, AlertText } from '@/components/ui/alert';
import { ThemedMaterialIcons as MaterialIcons } from './ThemedMaterialIcons';
import { normalizeStatusAction, resolveAlertColors } from './statusStyles';
import { useTheme } from '../../themes/theme';

const ALERT_ICON_NAMES = {
     default: 'info',
     error: 'error',
     warning: 'warning',
     success: 'check-circle',
     info: 'info',
     muted: 'info',
     none: 'info',
};

/**
 * Wraps gluestack's Alert. `action` selects a status (`error`, `warning`, `success`,
 * `info`, `muted`, `none`, or `default`) whose background/border colors come from the
 * current theme. Always renders with variant="default"; `variant` is accepted but ignored.
 */
export const ThemedAlert = React.forwardRef(({ action, variant, className, style, ...props }, ref) => {
     const { brand, neutrals } = useTheme();
     const colors = resolveAlertColors(action, brand, neutrals);

     return <Alert ref={ref} variant="default" className={className} style={[{ backgroundColor: colors.bg, borderColor: colors.border }, style]} {...props} />;
});

/**
 * Wraps gluestack's AlertText. `action` selects the same status colors as
 * ThemedAlert and tints the text color to match; `variant` is accepted but ignored.
 */
export const ThemedAlertText = React.forwardRef(({ action, variant, className, style, ...props }, ref) => {
     const { brand, neutrals } = useTheme();
     const colors = resolveAlertColors(action, brand, neutrals);

     return <AlertText ref={ref} className={className} style={[{ color: colors.text }, style]} {...props} />;
});

/**
 * Wraps gluestack's AlertIcon. `action` selects the status icon name (defaulting per
 * status, e.g. "error" -> error icon, "success" -> check-circle) and its color, unless
 * `name`/`color`/`as` are explicitly provided. Renders MaterialIcons by default via `as`.
 */
export const ThemedAlertIcon = React.forwardRef(({ action, variant, as, name, className, color, style, ...props }, ref) => {
     const normalizedAction = normalizeStatusAction(action);
     const { brand, neutrals } = useTheme();
     const colors = resolveAlertColors(action, brand, neutrals);

     return <AlertIcon ref={ref} as={as ?? MaterialIcons} name={name ?? ALERT_ICON_NAMES[normalizedAction]} style={[{ color: color ?? colors.icon }, style]} className={className} {...props} />;
});

ThemedAlert.displayName = 'ThemedAlert';
ThemedAlertText.displayName = 'ThemedAlertText';
ThemedAlertIcon.displayName = 'ThemedAlertIcon';
