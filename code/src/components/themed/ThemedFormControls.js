import React from 'react';
import { ThemedMaterialIcons as MaterialIcons } from './ThemedMaterialIcons';
import {
     FormControl,
     FormControlError,
     FormControlErrorIcon,
     FormControlErrorText,
     FormControlHelper,
     FormControlHelperText,
     FormControlLabel,
     FormControlLabelText,
} from '@/components/ui/form-control';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { TOKENS, useTheme } from '../../themes/theme';

// Plain re-exports of gluestack's form-control/input primitives with no theming applied.
export const ThemedFormControlLabel = FormControlLabel;
export const ThemedFormControlError = FormControlError;
export const ThemedFormControlErrorIcon = FormControlErrorIcon;
export const ThemedFormControlErrorText = FormControlErrorText;
export const ThemedFormControlHelper = FormControlHelper;
export const ThemedFormControlHelperText = FormControlHelperText;
export const ThemedInputSlot = InputSlot;

/**
 * Wraps gluestack's FormControl. Defaults paddingBottom to 20, overridable via `style`.
 */
export const ThemedFormControl = React.forwardRef(({ style, ...props }, ref) => {
     const mergedStyle = Array.isArray(style)
          ? Object.assign({ paddingBottom: 20 }, ...style.filter(Boolean))
          : { paddingBottom: 20, ...style };

     return <FormControl ref={ref} style={mergedStyle} {...props} />;
});

ThemedFormControl.displayName = 'ThemedFormControl';

/**
 * Wraps gluestack's FormControlLabelText. Defaults text color to the theme's text
 * color, overridable via `style`.
 */
export const ThemedFormControlLabelText = React.forwardRef(({ style, ...props }, ref) => {
     const { textColor } = useTheme();

     return <FormControlLabelText ref={ref} style={[{ color: textColor }, style]} {...props} />;
});

ThemedFormControlLabelText.displayName = 'ThemedFormControlLabelText';

// Carries the current `size` from ThemedInput down to ThemedInputField.
const InputSizeContext = React.createContext('md');

// Carries focus state between ThemedInput (owns the border color) and ThemedInputField
// (the actual TextInput, which fires the focus/blur events).
const InputStateContext = React.createContext({ isFocused: false, setIsFocused: () => {} });

const INPUT_SIZE_STYLES = {
     sm: { height: 36, fontSize: 14 },
     md: { height: 40, fontSize: 16 },
     lg: { height: 44, fontSize: 18 },
     xl: { height: 48, fontSize: 20 },
};

/**
 * Wraps gluestack's Input. `size` is one of `'sm'|'md'|'lg'|'xl'` (default `'md'`),
 * controlling height, and is provided to the descendant ThemedInputField for font
 * size. Border color reflects state: invalid takes precedence over focus, which
 * takes precedence over the default border; background dims when `isDisabled`.
 * Tracks focus state (from ThemedInputField) via context to drive the border color.
 */
export const ThemedInput = React.forwardRef(({ size = 'md', style, isInvalid, isDisabled, ...props }, ref) => {
     const { colorMode, brand } = useTheme();
     const inputColors = TOKENS.componentTokens.input[colorMode === 'dark' ? 'dark' : 'light'];
     const [isFocused, setIsFocused] = React.useState(false);
     const sizeStyle = INPUT_SIZE_STYLES[size] ?? INPUT_SIZE_STYLES.md;

     const borderColor = isInvalid
          ? inputColors.borderInvalid
          : isFocused
          ? brand.primary[500]
          : inputColors.borderDefault;
     const backgroundColor = isDisabled ? inputColors.bgDisabled : inputColors.bg;

     return (
          <InputSizeContext.Provider value={size}>
               <InputStateContext.Provider value={{ isFocused, setIsFocused }}>
                    <Input
                         ref={ref}
                         isInvalid={isInvalid}
                         isDisabled={isDisabled}
                         style={[{ borderColor, backgroundColor, height: sizeStyle.height }, style]}
                         {...props}
                    />
               </InputStateContext.Provider>
          </InputSizeContext.Provider>
     );
});

/**
 * Wraps gluestack's InputField. Inherits `size` from the enclosing ThemedInput to set
 * font size, applies the theme's input text/placeholder colors (placeholder overridable
 * via `placeholderTextColor`), and reports focus/blur back to ThemedInput.
 */
export const ThemedInputField = React.forwardRef(({ style, onFocus, onBlur, placeholderTextColor, ...props }, ref) => {
     const { colorMode } = useTheme();
     const inputColors = TOKENS.componentTokens.input[colorMode === 'dark' ? 'dark' : 'light'];
     const size = React.useContext(InputSizeContext);
     const { setIsFocused } = React.useContext(InputStateContext);
     const sizeStyle = INPUT_SIZE_STYLES[size] ?? INPUT_SIZE_STYLES.md;

     return (
          <InputField
               ref={ref}
               style={[{ color: inputColors.text, fontSize: sizeStyle.fontSize }, style]}
               placeholderTextColor={placeholderTextColor ?? inputColors.placeholder}
               onFocus={(e) => {
                    setIsFocused(true);
                    onFocus?.(e);
               }}
               onBlur={(e) => {
                    setIsFocused(false);
                    onBlur?.(e);
               }}
               {...props}
          />
     );
});

/**
 * An InputSlot containing an eye/eye-off MaterialIcons button for toggling password
 * visibility. `showPassword` selects the icon shown; `onPress` handles the tap.
 */
export const PasswordVisibilityToggle = ({ showPassword, onPress, style }) => {
     return (
          <InputSlot onPress={onPress}>
               <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} style={[{ marginRight: 8 }, style]} />
          </InputSlot>
     );
};

/**
 * Renders a MaterialIcons "close" glyph in place of gluestack's CloseIcon.
 * `size` defaults to 18.
 */
export const ThemedCloseIcon = React.forwardRef(({ size = 18, ...props }, ref) => {
     return <MaterialIcons ref={ref} name="close" size={size} {...props} />;
});

ThemedInput.displayName = 'ThemedInput';
ThemedInputField.displayName = 'ThemedInputField';
ThemedCloseIcon.displayName = 'ThemedCloseIcon';
