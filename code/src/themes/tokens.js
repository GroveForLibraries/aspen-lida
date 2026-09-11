import { Platform } from 'react-native';

// Design-token tree: primitives -> semanticTokens -> componentTokens -> dynamicBrandPalette.
// - primitives: raw, unopinionated values (font families, weights, spacing, radii, shadows, singletons).
// - semanticTokens: light/dark, purpose-named neutrals (canvas, surface, textMain, ...).
// - componentTokens: per-component color overrides (e.g. the tab bar's own background/border/tint).
// - dynamicBrandPalette: the current primary/secondary/tertiary brand palette. It varies at
//   runtime per library/location, so it is assembled separately in useThemeForDisplay() (see the
//   `tokens` field it returns) rather than stored in this constant.
export const TOKENS = {
     primitives: {
          // No custom font is bundled/loaded in this app, so these reference each platform's own
          // system font rather than naming a font that isn't actually available.
          fontFamilies: {
               sans: Platform.select({ ios: undefined, android: 'sans-serif', default: undefined }),
               serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
               mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
          },
          fontWeights: {
               normal: '400',
               medium: '500',
               semibold: '600',
               bold: '700',
          },
          // Unitless numbers (16px per rem) -- React Native's lineHeight style property doesn't
          // accept unit strings.
          lineHeights: {
               xs: 16,
               sm: 20,
               md: 24,
               lg: 28,
               xl: 32,
          },
          spacing: {
               0: '0rem',
               1: '0.25rem',
               2: '0.5rem',
               3: '0.75rem',
               4: '1rem',
               5: '1.25rem',
               6: '1.5rem',
               8: '2rem',
               12: '3rem',
          },
          radii: {
               none: '0px',
               sm: '4px',
               md: '6px',
               lg: '8px',
               xl: '12px',
               full: '9999px',
          },
          shadows: {
               none: 'none',
               subtle: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
               elevated: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
               overlay: '0 10px 20px rgba(0,0,0,0.19), 0 10px 10px rgba(0,0,0,0.23)',
          },
          singletons: {
               white: '#ffffff',
               black: '#000000',
               lightText: '#ffffff',
               darkText: '#272727',
               danger: '#ef4444',
          },
     },
     semanticTokens: {
          light: {
               canvas: '#F9FAFB', // Screen base background
               surface: '#FFFFFF', // Cards, Modals, Menus, Appbars
               surfaceMuted: '#F3F4F6', // List items, table headers
               border: '#E5E7EB', // Dividers, borders
               textMain: '#1F2937', // Headings, primary typography
               textSecondary: '#374151', // Body paragraphs
               textMuted: '#6B7280', // Placeholders, captions
               icon: '#57534e',
               iconMuted: '#6b7280',
               subtleIndicator: '#9CA3AF', // Decorative carrots, unselected dropdowns, form hints
               actionableIndicator: '#374151', // List-item navigation carrots, high-contrast triggers
               disabledIndicator: '#D1D5DB', // A carrot/arrow that's completely disabled or inactive
          },
          dark: {
               canvas: '#111827',
               surface: '#1F2937',
               surfaceMuted: '#374151',
               border: '#4B5563',
               textMain: '#F9FAFB',
               textSecondary: '#E5E7EB',
               textMuted: '#9CA3AF',
               icon: '#e5e7eb',
               iconMuted: '#9ca3af',
               subtleIndicator: '#9CA3AF',
               actionableIndicator: '#E5E7EB',
               disabledIndicator: '#4B5563',
          },
     },
     componentTokens: {
          // activeTint (tab bar) and borderHover/borderFocus (input) are resolved separately from
          // dynamicBrandPalette.primary[500] and are not included in this object.
          tabNavigator: {
               light: { background: '#FFFFFF', borderTop: '#E5E7EB', inactiveTint: '#9CA3AF' },
               dark: { background: '#1F2937', borderTop: '#374151', inactiveTint: '#6B7280' },
          },
          input: {
               light: { bg: 'transparent', text: '#111827', placeholder: '#9CA3AF', borderDefault: '#D1D5DB', borderInvalid: '#E11D48', bgDisabled: '#F3F4F6' },
               dark: { bg: 'transparent', text: '#F9FAFB', placeholder: '#6B7280', borderDefault: '#374151', borderInvalid: '#FB7185', bgDisabled: '#1F2937' },
          },
     },
};
