import React from 'react';
import { Heading } from '@/components/ui/heading';
import { useTheme, TOKENS } from '../../themes/theme';

// Maps Heading's size scale onto TOKENS.primitives.lineHeights' 5 steps.
const HEADING_LINE_HEIGHTS = {
     xs: 'sm',
     sm: 'sm',
     md: 'md',
     lg: 'md',
     xl: 'lg',
     '2xl': 'lg',
     '3xl': 'xl',
     '4xl': 'xl',
     '5xl': 'xl',
};

/**
 * Wraps gluestack's Heading. Defaults text color to the theme's text color and sets a
 * `lineHeight` matching `size` (gluestack's own default is `'md'`); both overridable via
 * `size` and `style`.
 */
export const ThemedHeading = React.forwardRef(({ size = 'md', style, ...props }, ref) => {
     const { textColor } = useTheme();
     const lineHeight = TOKENS.primitives.lineHeights[HEADING_LINE_HEIGHTS[size] ?? 'md'];

     return <Heading ref={ref} size={size} style={[{ color: textColor, lineHeight }, style]} {...props} />;
});

ThemedHeading.displayName = 'ThemedHeading';
