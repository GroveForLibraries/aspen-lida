import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import {
     Select,
     SelectTrigger,
     SelectInput,
     SelectIcon,
     SelectPortal,
     SelectBackdrop,
     SelectContent,
     SelectDragIndicator,
     SelectDragIndicatorWrapper,
     SelectItem,
     SelectScrollView,
     SelectVirtualizedList,
     SelectFlatList,
     SelectSectionList,
     SelectSectionHeaderText,
} from '@/components/ui/select';
import { ThemedMaterialIcons as MaterialIcons } from './ThemedMaterialIcons';
import { useTheme, TOKENS } from '../../themes/theme';

const SELECT_ICON_SIZE = {
     xl: 'h-6 w-6',
     lg: 'h-5 w-5',
     md: 'h-4 w-4',
     sm: 'h-3.5 w-3.5',
};

// Fixed trigger height per size (matches ThemedButton's per-size heights) so a Select lines up
// with a Button of the same size.
const SELECT_TRIGGER_HEIGHT = {
     xl: 'h-12',
     lg: 'h-11',
     md: 'h-10',
     sm: 'h-9',
};

const SelectValueContext = React.createContext(undefined);

/**
 * Wraps gluestack's Select. Provides the current `selectedValue` via context so descendant
 * ThemedSelectItem components can determine their own selected/highlighted state.
 */
export const ThemedSelect = React.forwardRef(({ selectedValue, ...props }, ref) => {
     return (
          <SelectValueContext.Provider value={selectedValue}>
               <Select ref={ref} selectedValue={selectedValue} {...props} />
          </SelectValueContext.Provider>
     );
});

ThemedSelect.displayName = 'ThemedSelect';

/**
 * Wraps gluestack's SelectInput. Removes vertical padding, colors the text with the theme's
 * default text color, and colors the placeholder with the theme's input placeholder color; all
 * overridable via `style`/`placeholderTextColor`.
 */
export const ThemedSelectInput = React.forwardRef(({ style, placeholderTextColor, ...props }, ref) => {
     const { textColor, colorMode } = useTheme();
     const inputColors = TOKENS.componentTokens.input[colorMode === 'dark' ? 'dark' : 'light'];

     return (
          <SelectInput
               ref={ref}
               style={[{ paddingVertical: 0, color: textColor }, style]}
               placeholderTextColor={placeholderTextColor ?? inputColors.placeholder}
               {...props}
          />
     );
});

ThemedSelectInput.displayName = 'ThemedSelectInput';

/**
 * Wraps gluestack's SelectTrigger. Defaults to `variant="outline"` and `size="md"`, applies a
 * fixed height per size, colors the border with the theme's input border color, and renders a
 * trailing "expand-more" icon after `children`.
 */
export const ThemedSelectTrigger = React.forwardRef(({ children, variant = 'outline', size = 'md', className, style, ...props }, ref) => {
     const { neutrals, colorMode } = useTheme();
     const borderColor = TOKENS.componentTokens.input[colorMode === 'dark' ? 'dark' : 'light'].borderDefault;

     const heightClass = SELECT_TRIGGER_HEIGHT[size] ?? SELECT_TRIGGER_HEIGHT.md;
     const mergedStyle = Array.isArray(style) ? Object.assign({ borderColor }, ...style.filter(Boolean)) : { borderColor, ...style };

     return (
          <SelectTrigger variant="outline" ref={ref} size={size} className={['justify-between', heightClass, className].filter(Boolean).join(' ')} style={mergedStyle} {...props}>
               {children}
               <MaterialIcons name="expand-more" size={18} color={neutrals.subtleIndicator} className="mr-3" />
          </SelectTrigger>
     );
});

ThemedSelectTrigger.displayName = 'ThemedSelectTrigger';

/**
 * Wraps gluestack's SelectIcon. Sizes the icon from `size`, falling back to the parent size
 * context (from the enclosing trigger/context) when not given. Supports `xl`/`lg`/`md`/`sm`.
 */
export const ThemedSelectIcon = React.forwardRef(({ size, className, ...props }, ref) => {
     const { size: parentSize } = useStyleContext();
     const resolvedSize = size ?? parentSize;
     const sizeClass = SELECT_ICON_SIZE[resolvedSize] ?? SELECT_ICON_SIZE.md;

     return <SelectIcon ref={ref} size={size} className={[sizeClass, className].filter(Boolean).join(' ')} {...props} />;
});

/** Re-export of gluestack's SelectPortal, unmodified. */
export const ThemedSelectPortal = SelectPortal;
/** Re-export of gluestack's SelectBackdrop, unmodified. */
export const ThemedSelectBackdrop = SelectBackdrop;

/**
 * Wraps gluestack's SelectContent. Fills the background with the theme's surface color, caps
 * height at 80% of the window height, pads the bottom (adding the safe-area inset on Android),
 * and casts a shadow above the sheet.
 */
export const ThemedSelectContent = React.forwardRef(({ style, ...props }, ref) => {
     const { neutrals } = useTheme();
     const insets = useSafeAreaInsets();
     const { height: windowHeight } = useWindowDimensions();
     const surfaceBg = neutrals.surface;
     const paddingBottom = Platform.OS === 'android' ? insets.bottom + 16 : 16;

     return <SelectContent ref={ref} style={[{ backgroundColor: surfaceBg, paddingBottom, maxHeight: windowHeight * 0.8, boxShadow: TOKENS.primitives.shadows.overlay }, style]} {...props} />;
});

ThemedSelectContent.displayName = 'ThemedSelectContent';

/** Re-export of gluestack's SelectDragIndicator, unmodified. */
export const ThemedSelectDragIndicator = SelectDragIndicator;
/** Re-export of gluestack's SelectDragIndicatorWrapper, unmodified. */
export const ThemedSelectDragIndicatorWrapper = SelectDragIndicatorWrapper;

/**
 * Wraps gluestack's SelectItem. Highlights its background with the theme's tertiary brand color
 * and its label text with the matching tertiary contrast color when its `value` matches the
 * selected value; the selected value is read from an explicit `selectedValue` prop if provided,
 * otherwise from the enclosing ThemedSelect's context.
 */
export const ThemedSelectItem = React.forwardRef(({ value, selectedValue: selectedValueProp, style, textStyle, ...props }, ref) => {
     const selectedValueFromContext = React.useContext(SelectValueContext);
     const selectedValue = selectedValueProp !== undefined ? selectedValueProp : selectedValueFromContext;
     const { brand } = useTheme();
     const highlightColor = brand.tertiary[500];
     const highlightTextColor = brand.tertiary['500-text'];
     // eslint-disable-next-line eqeqeq
     const isSelected = selectedValue !== undefined && selectedValue !== null && selectedValue == value;
     const mergedTextStyle = isSelected ? { ...textStyle, style: [{ color: highlightTextColor }, textStyle?.style] } : textStyle;

     return <SelectItem ref={ref} value={value} style={[{ backgroundColor: isSelected ? highlightColor : 'transparent' }, style]} textStyle={mergedTextStyle} {...props} />;
});

ThemedSelectItem.displayName = 'ThemedSelectItem';

/** Re-export of gluestack's SelectScrollView, unmodified. */
export const ThemedSelectScrollView = SelectScrollView;
/** Re-export of gluestack's SelectVirtualizedList, unmodified. */
export const ThemedSelectVirtualizedList = SelectVirtualizedList;
/** Re-export of gluestack's SelectFlatList, unmodified. */
export const ThemedSelectFlatList = SelectFlatList;
/** Re-export of gluestack's SelectSectionList, unmodified. */
export const ThemedSelectSectionList = SelectSectionList;
/** Re-export of gluestack's SelectSectionHeaderText, unmodified. */
export const ThemedSelectSectionHeaderText = SelectSectionHeaderText;

ThemedSelectIcon.displayName = 'ThemedSelectIcon';
