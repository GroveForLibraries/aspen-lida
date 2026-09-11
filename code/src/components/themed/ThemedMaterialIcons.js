import React from 'react';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../themes/theme';

/**
 * Wraps @expo/vector-icons' MaterialIcons. Renders an icon with the theme's default icon color
 * unless a `color` prop is explicitly provided.
 */
export const ThemedMaterialIcons = React.forwardRef(({ color, ...props }, ref) => {
     const { neutrals } = useTheme();

     return <MaterialIcons ref={ref} color={color ?? neutrals.icon} {...props} />;
});

/**
 * Wraps @expo/vector-icons' MaterialCommunityIcons. Renders an icon with the theme's default icon
 * color unless a `color` prop is explicitly provided.
 */
export const ThemedMaterialCommunityIcons = React.forwardRef(({ color, ...props }, ref) => {
     const { neutrals } = useTheme();

     return <MaterialCommunityIcons ref={ref} color={color ?? neutrals.icon} {...props} />;
});

ThemedMaterialIcons.displayName = 'ThemedMaterialIcons';
ThemedMaterialCommunityIcons.displayName = 'ThemedMaterialCommunityIcons';
