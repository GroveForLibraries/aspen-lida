import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
     Actionsheet,
     ActionsheetBackdrop,
     ActionsheetContent,
     ActionsheetDragIndicator,
     ActionsheetDragIndicatorWrapper,
     ActionsheetFlatList,
     ActionsheetItem,
     ActionsheetItemText,
     ActionsheetScrollView,
     ActionsheetSectionHeaderText,
     ActionsheetSectionList,
     ActionsheetVirtualizedList,
} from '@/components/ui/actionsheet';
import { useTheme, TOKENS } from '../../themes/theme';

// Plain re-exports of gluestack's actionsheet primitives with no theming applied.
// Note: gluestack's ActionsheetIcon is intentionally not re-exported here — it silently discards
// its children and renders an unsized blank SVG when used without an explicit numeric
// height/width (a bug in gluestack's own Icon creator). Render icon components (e.g.
// ThemedMaterialIcons) directly as a sibling of ActionsheetItemText instead.
export const ThemedActionsheet = Actionsheet;
export const ThemedActionsheetBackdrop = ActionsheetBackdrop;
export const ThemedActionsheetDragIndicator = ActionsheetDragIndicator;
export const ThemedActionsheetDragIndicatorWrapper = ActionsheetDragIndicatorWrapper;
export const ThemedActionsheetFlatList = ActionsheetFlatList;
export const ThemedActionsheetItem = ActionsheetItem;
export const ThemedActionsheetScrollView = ActionsheetScrollView;
export const ThemedActionsheetSectionHeaderText = ActionsheetSectionHeaderText;
export const ThemedActionsheetSectionList = ActionsheetSectionList;
export const ThemedActionsheetVirtualizedList = ActionsheetVirtualizedList;

/**
 * Wraps gluestack's ActionsheetContent. Defaults backgroundColor to the theme's surface color,
 * paddingBottom to a bottom-safe-area-aware value (Android adds the safe area inset, iOS uses a
 * flat 16), and casts a shadow above the sheet. All overridable via `style`.
 */
export const ThemedActionsheetContent = React.forwardRef(({ style, ...props }, ref) => {
     const { neutrals } = useTheme();
     const insets = useSafeAreaInsets();
     const surfaceBg = neutrals.surface;
     const paddingBottom = Platform.OS === 'android' ? insets.bottom + 16 : 16;

     return <ActionsheetContent ref={ref} style={[{ backgroundColor: surfaceBg, paddingBottom, boxShadow: TOKENS.primitives.shadows.overlay }, style]} {...props} />;
});

ThemedActionsheetContent.displayName = 'ThemedActionsheetContent';

/**
 * Wraps gluestack's ActionsheetItemText. Defaults text color to the theme's text color and adds
 * `flex: 1`/`minWidth: 0` so long text wraps/shrinks to fit next to a sibling icon in the item's
 * row layout instead of overflowing past the sheet's edge; both overridable via `style`.
 */
export const ThemedActionsheetItemText = React.forwardRef(({ style, ...props }, ref) => {
     const { textColor } = useTheme();
     const mergedStyle = Array.isArray(style)
          ? Object.assign({ color: textColor, flex: 1, minWidth: 0 }, ...style.filter(Boolean))
          : { color: textColor, flex: 1, minWidth: 0, ...style };

     return <ActionsheetItemText ref={ref} style={mergedStyle} {...props} />;
});

ThemedActionsheetItemText.displayName = 'ThemedActionsheetItemText';
