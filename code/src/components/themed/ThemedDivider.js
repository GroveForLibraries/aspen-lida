import React from 'react';
import { Divider } from '@/components/ui/divider';
import { useTheme } from '../../themes/theme';

/**
 * Wraps gluestack's Divider. Colors the line with the theme's border color instead of
 * gluestack's own generic color; `orientation` and `style` behave as they do on `Divider`.
 */
export const ThemedDivider = React.forwardRef(({ style, ...props }, ref) => {
     const { neutrals } = useTheme();

     return <Divider ref={ref} style={[{ backgroundColor: neutrals.border }, style]} {...props} />;
});

ThemedDivider.displayName = 'ThemedDivider';
