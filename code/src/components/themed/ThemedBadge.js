import React from 'react';
import { StyleSheet } from 'react-native';
import { Badge, BadgeText } from '@/components/ui/badge';
import { useTheme } from '../../themes/theme';

const BADGE_STATUS_COLORS = {
     error: { bg: '#fee2e2', text: '#991b1b' },
     warning: { bg: '#fef3c7', text: '#92400e' },
     success: { bg: '#dcfce7', text: '#166534' },
     info: { bg: '#e0f2fe', text: '#075985' },
     muted: { bg: '#f3f4f6', text: '#1f2937' },
     none: { bg: '#e5e7eb', text: '#1f2937' },
};

const BadgeActionContext = React.createContext({ colorScheme: undefined, variant: 'solid' });

function normalizeBadgeColorScheme(colorScheme) {
     if (colorScheme === 'danger') {
          return 'error';
     }
     return colorScheme || 'default';
}

function resolveBrandBadgeColors(brand, colorScheme, variant) {
     const scale = brand?.[colorScheme];
     if (!scale) {
          return null;
     }
     if (variant === 'outline') {
          return { borderColor: scale[500], textColor: scale[500], backgroundColor: 'transparent' };
     }
     return { backgroundColor: scale[500], textColor: scale['500-text'] };
}

function resolveStatusBadgeColors(brand, colorScheme, variant) {
     const normalized = normalizeBadgeColorScheme(colorScheme);
     const status = BADGE_STATUS_COLORS[normalized];

     if (!status) {
          return resolveBrandBadgeColors(brand, 'primary', variant) ?? { backgroundColor: 'transparent', textColor: undefined };
     }
     if (variant === 'outline') {
          return { borderColor: status.text, textColor: status.text, backgroundColor: 'transparent' };
     }
     return { backgroundColor: status.bg, textColor: status.text };
}

/**
 * Wraps gluestack's Badge. `colorScheme` selects colors: a brand scale name (e.g.
 * "primary") uses that brand color, a status name (`error`/`danger`, `warning`,
 * `success`, `info`, `muted`, `none`) uses a fixed status palette, and anything else
 * falls back to the brand's primary color. `variant` is `'solid'` (default, filled
 * background) or `'outline'` (transparent background, colored border/text). The
 * resolved colorScheme/variant are provided to descendant ThemedBadgeText via context.
 */
export const ThemedBadge = React.forwardRef(({ colorScheme, variant = 'solid', className, style, ...props }, ref) => {
     const { brand } = useTheme();
     const brandColors = resolveBrandBadgeColors(brand, colorScheme, variant);
     const colors = brandColors ?? resolveStatusBadgeColors(brand, colorScheme, variant);

     return (
          <BadgeActionContext.Provider value={{ colorScheme, variant }}>
               <Badge
                    ref={ref}
                    variant={variant === 'outline' ? 'outline' : 'solid'}
                    className={className}
                    style={[{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, borderRadius: 4 }, style]}
                    {...props}
               />
          </BadgeActionContext.Provider>
     );
});

/**
 * Wraps gluestack's BadgeText. Reads colorScheme/variant from the nearest ThemedBadge
 * (via context) to color its text to match, and resets textTransform to `'none'`
 * (overriding the primitive's default uppercase transform).
 */
export const ThemedBadgeText = React.forwardRef(({ className, style, ...props }, ref) => {
     const { colorScheme, variant } = React.useContext(BadgeActionContext);
     const { brand } = useTheme();
     const brandColors = resolveBrandBadgeColors(brand, colorScheme, variant);
     const colors = brandColors ?? resolveStatusBadgeColors(brand, colorScheme, variant);

     return (
          <BadgeText
               ref={ref}
               className={className}
               style={{ textTransform: 'none', color: colors.textColor, ...StyleSheet.flatten(style) }}
               {...props}
          />
     );
});

ThemedBadge.displayName = 'ThemedBadge';
ThemedBadgeText.displayName = 'ThemedBadgeText';
