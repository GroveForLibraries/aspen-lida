import React from 'react';
import { Checkbox, CheckboxGroup, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
// Reads the checkbox's current checked state, reflecting controlled `isChecked`, uncontrolled
// `defaultIsChecked`, and CheckboxGroup value-membership alike.
import { useCheckbox } from '@gluestack-ui/core/lib/esm/checkbox/creator/CheckboxProvider';
import { ThemedMaterialIcons as MaterialIcons } from './ThemedMaterialIcons';
import { useTheme } from '../../themes/theme';

// Per-size Tailwind classes for the indicator box, its check icon, and the label text,
// keyed by the `size` prop ('sm' | 'md' | 'lg').
const CHECKBOX_SIZE_STYLES = {
     sm: { indicator: 'w-4 h-4 border-2', icon: 'h-3 w-3', label: 'text-sm' },
     md: { indicator: 'w-5 h-5 border-2', icon: 'h-4 w-4', label: 'text-base' },
     lg: { indicator: 'w-6 h-6 border-[3px]', icon: 'h-[18px] w-[18px]', label: 'text-lg' },
};

function resolveCheckboxSizeStyle(size) {
     return CHECKBOX_SIZE_STYLES[size] ?? CHECKBOX_SIZE_STYLES.sm;
}

const CheckboxSizeContext = React.createContext('sm');

/**
 * Wraps gluestack's Checkbox. `size` is `'sm'` (default), `'md'`, or `'lg'`, provided
 * to descendant ThemedCheckboxIndicator/ThemedCheckboxIcon/ThemedCheckboxLabel via context.
 */
export const ThemedCheckbox = React.forwardRef(({ size = 'sm', isChecked, ...props }, ref) => {
     return (
          <CheckboxSizeContext.Provider value={size}>
               <Checkbox ref={ref} isChecked={isChecked} {...props} />
          </CheckboxSizeContext.Provider>
     );
});

// Classes that force the indicator's border/background to transparent in both checked and
// unchecked states, so the brand colors applied via `style` below are what's actually visible.
const CHECKED_COLOR_NEUTRALIZER =
     'border-transparent dark:bg-transparent ' +
     'data-[checked=true]:bg-transparent data-[checked=true]:border-transparent dark:data-[checked=true]:bg-transparent dark:data-[checked=true]:border-transparent';

/**
 * Wraps gluestack's CheckboxIndicator. Sizes itself from the enclosing ThemedCheckbox's
 * `size`, and colors its border/background from the theme's brand primary color
 * (filled when checked, outlined when unchecked).
 */
export const ThemedCheckboxIndicator = React.forwardRef(({ className, style, ...props }, ref) => {
     const size = React.useContext(CheckboxSizeContext);
     const { isChecked } = useCheckbox('CheckboxContext');
     const sizeStyle = resolveCheckboxSizeStyle(size);
     const { brand } = useTheme();
     const checkedStyle = isChecked
          ? { borderColor: brand.primary[500], backgroundColor: brand.primary[500] }
          : { borderColor: brand.primary[500] };

     return <CheckboxIndicator ref={ref} className={[sizeStyle.indicator, CHECKED_COLOR_NEUTRALIZER, className].filter(Boolean).join(' ')} style={[{ marginRight: 8 }, checkedStyle, style]} {...props} />;
});

/**
 * Wraps gluestack's CheckboxIcon. Renders MaterialIcons' "check" glyph by default
 * (override via `as`/`name`), sized from the enclosing ThemedCheckbox's `size` and
 * colored from the theme's brand primary color.
 */
export const ThemedCheckboxIcon = React.forwardRef(({ as, name, className, style, ...props }, ref) => {
     const size = React.useContext(CheckboxSizeContext);
     const sizeStyle = resolveCheckboxSizeStyle(size);
     const { brand } = useTheme();

     return <CheckboxIcon ref={ref} as={as ?? MaterialIcons} name={name ?? 'check'} className={[sizeStyle.icon, 'text-transparent', className].filter(Boolean).join(' ')} style={[{ color: brand.primary['500-text'] }, style]} {...props} />;
});

/**
 * Wraps gluestack's CheckboxLabel. Sizes its text from the enclosing ThemedCheckbox's
 * `size` and colors it with the theme's default text color.
 */
export const ThemedCheckboxLabel = React.forwardRef(({ className, style, ...props }, ref) => {
     const size = React.useContext(CheckboxSizeContext);
     const sizeStyle = resolveCheckboxSizeStyle(size);
     const { textColor } = useTheme();

     return <CheckboxLabel ref={ref} className={[sizeStyle.label, className].filter(Boolean).join(' ')} style={[{ color: textColor }, style]} {...props} />;
});

/** Plain re-export of gluestack's CheckboxGroup with no theming applied. */
export const ThemedCheckboxGroup = CheckboxGroup;

ThemedCheckbox.displayName = 'ThemedCheckbox';
ThemedCheckboxIndicator.displayName = 'ThemedCheckboxIndicator';
ThemedCheckboxIcon.displayName = 'ThemedCheckboxIcon';
ThemedCheckboxLabel.displayName = 'ThemedCheckboxLabel';
