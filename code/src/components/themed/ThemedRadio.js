import React from 'react';
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '@/components/ui/radio';
import { useTheme } from '../../themes/theme';

/** Re-export of gluestack's Radio, unmodified. Supports the `sm`/`md`/`lg` sizes (16/20/24px indicator). */
export const ThemedRadio = Radio;
/** Re-export of gluestack's RadioGroup, unmodified. */
export const ThemedRadioGroup = RadioGroup;
/** Wraps gluestack's RadioIcon (the selected-state dot), filling it with the theme's brand primary color. */
export const ThemedRadioIcon = React.forwardRef(({ className, style, ...props }, ref) => {
     const { brand } = useTheme();

     return <RadioIcon ref={ref} className={['fill-transparent', className].filter(Boolean).join(' ')} style={[{ color: brand.primary[500] }, style]} {...props} />;
});

ThemedRadioIcon.displayName = 'ThemedRadioIcon';

/** Wraps gluestack's RadioLabel, coloring the label text with the theme's default text color by default. */
export const ThemedRadioLabel = React.forwardRef(({ style, ...props }, ref) => {
     const { textColor } = useTheme();

     return <RadioLabel ref={ref} style={[{ color: textColor }, style]} {...props} />;
});

ThemedRadioLabel.displayName = 'ThemedRadioLabel';

/** Wraps gluestack's RadioIndicator, giving it a 2px border colored with the theme's border color. */
export const ThemedRadioIndicator = React.forwardRef(({ className, style, ...props }, ref) => {
     const { neutrals } = useTheme();

     return <RadioIndicator ref={ref} className={['border-2', className].filter(Boolean).join(' ')} style={[{ borderColor: neutrals.border }, style]} {...props} />;
});

ThemedRadioIndicator.displayName = 'ThemedRadioIndicator';
