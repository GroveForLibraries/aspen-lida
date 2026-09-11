import React from 'react';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { TOKENS, useTheme } from '../../themes/theme';

/** Shares focus state between ThemedTextarea (the outer container) and ThemedTextareaInput (the inner input). */
const TextareaStateContext = React.createContext({ isFocused: false, setIsFocused: () => {} });

/**
 * Themed wrapper around Textarea. Colors the border red (invalid), the brand primary color
 * (focused), or the default border color, and swaps in a disabled background when `isDisabled`
 * is set.
 */
export const ThemedTextarea = React.forwardRef(({ style, isInvalid, isDisabled, ...props }, ref) => {
     const { colorMode, brand } = useTheme();
     const inputColors = TOKENS.componentTokens.input[colorMode === 'dark' ? 'dark' : 'light'];
     const [isFocused, setIsFocused] = React.useState(false);

     const borderColor = isInvalid
          ? inputColors.borderInvalid
          : isFocused
          ? brand.primary[500]
          : inputColors.borderDefault;
     const backgroundColor = isDisabled ? inputColors.bgDisabled : inputColors.bg;

     return (
          <TextareaStateContext.Provider value={{ isFocused, setIsFocused }}>
               <Textarea ref={ref} isInvalid={isInvalid} isDisabled={isDisabled} style={[{ borderColor, backgroundColor }, style]} {...props} />
          </TextareaStateContext.Provider>
     );
});

/**
 * Themed wrapper around TextareaInput. Colors the input text and placeholder from the current
 * theme, and reports focus/blur to the enclosing ThemedTextarea so its border color can update.
 */
export const ThemedTextareaInput = React.forwardRef(({ style, onFocus, onBlur, placeholderTextColor, ...props }, ref) => {
     const { colorMode } = useTheme();
     const inputColors = TOKENS.componentTokens.input[colorMode === 'dark' ? 'dark' : 'light'];
     const { setIsFocused } = React.useContext(TextareaStateContext);

     return (
          <TextareaInput
               ref={ref}
               style={[{ color: inputColors.text }, style]}
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

ThemedTextarea.displayName = 'ThemedTextarea';
ThemedTextareaInput.displayName = 'ThemedTextareaInput';
