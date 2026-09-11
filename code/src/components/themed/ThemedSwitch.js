import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '../../themes/theme';

/**
 * Wraps gluestack's Switch. Defaults `trackColor` to the theme's border color when off and the
 * brand primary color when on (also applied as `ios_backgroundColor`); pass `trackColor` to override.
 */
export const ThemedSwitch = React.forwardRef(({ trackColor, ...props }, ref) => {
     const { brand, neutrals } = useTheme();
     const offColor = neutrals.border;
     const resolvedTrackColor = trackColor ?? { false: offColor, true: brand.primary[500] };

     return <Switch ref={ref} trackColor={resolvedTrackColor} ios_backgroundColor={resolvedTrackColor.false} {...props} />;
});

ThemedSwitch.displayName = 'ThemedSwitch';
