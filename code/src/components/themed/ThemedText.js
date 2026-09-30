import React from 'react';
import { Text } from '@/components/ui/text';
import { useTheme, TOKENS } from '../../themes/theme';

// Maps Text's size scale onto TOKENS.primitives.lineHeights' 5 steps.
const TEXT_LINE_HEIGHTS = {
     '2xs': 'xs',
     xs: 'xs',
     sm: 'sm',
     md: 'sm',
     lg: 'md',
     xl: 'md',
     '2xl': 'lg',
     '3xl': 'lg',
     '4xl': 'xl',
     '5xl': 'xl',
     '6xl': 'xl',
};

/**
 * Wraps gluestack's Text. Defaults `size` to `'sm'`, colors the text with the theme's default
 * text color, and sets a `lineHeight` matching `size`; all overridable via `size` and `style`.
 */
export const ThemedText = React.forwardRef(({ size = 'sm', style, ...props }, ref) => {
     const { textColor } = useTheme();
     const lineHeight = TOKENS.primitives.lineHeights[TEXT_LINE_HEIGHTS[size] ?? 'sm'];

     return <Text ref={ref} size={size} style={[{ color: textColor, lineHeight }, style]} {...props} />;
});

ThemedText.displayName = 'ThemedText';
