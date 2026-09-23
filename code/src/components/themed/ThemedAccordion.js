import React from 'react';
import {
     Accordion,
     AccordionContent,
     AccordionContentText,
     AccordionHeader,
     AccordionIcon,
     AccordionItem,
     AccordionTitleText,
     AccordionTrigger,
} from '@/components/ui/accordion';
import { useTheme } from '../../themes/theme';

/** Re-export of gluestack's Accordion, unmodified. */
export const ThemedAccordion = Accordion;
/** Re-export of gluestack's AccordionItem, unmodified. */
export const ThemedAccordionItem = AccordionItem;
/** Re-export of gluestack's AccordionHeader, unmodified. */
export const ThemedAccordionHeader = AccordionHeader;
/** Re-export of gluestack's AccordionTrigger, unmodified. */
export const ThemedAccordionTrigger = AccordionTrigger;
/** Re-export of gluestack's AccordionContent, unmodified. */
export const ThemedAccordionContent = AccordionContent;

/** Wraps gluestack's AccordionTitleText, coloring it with the theme's default text color. */
export const ThemedAccordionTitleText = React.forwardRef(({ style, ...props }, ref) => {
     const { textColor } = useTheme();

     return <AccordionTitleText ref={ref} style={[{ color: textColor }, style]} {...props} />;
});

ThemedAccordionTitleText.displayName = 'ThemedAccordionTitleText';

/** Wraps gluestack's AccordionContentText, coloring it with the theme's default text color. */
export const ThemedAccordionContentText = React.forwardRef(({ style, ...props }, ref) => {
     const { textColor } = useTheme();

     return <AccordionContentText ref={ref} style={[{ color: textColor }, style]} {...props} />;
});

ThemedAccordionContentText.displayName = 'ThemedAccordionContentText';

/**
 * Wraps gluestack's AccordionIcon, coloring it with the theme's actionable-indicator color by
 * default (the expand/collapse chevron is a tappable trigger). Pass `as`/`name` for the glyph,
 * `style` to override the color.
 */
export const ThemedAccordionIcon = React.forwardRef(({ style, ...props }, ref) => {
     const { neutrals } = useTheme();

     return <AccordionIcon ref={ref} style={[{ color: neutrals.actionableIndicator }, style]} {...props} />;
});

ThemedAccordionIcon.displayName = 'ThemedAccordionIcon';
