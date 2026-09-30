import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Standard horizontal screen margin (px) every screen applies at its outermost container, so
 * content doesn't hug the screen edges. Single source of truth for ScreenContainer and
 * screenContentContainerStyle below.
 */
export const SCREEN_HORIZONTAL_PADDING = 16;

/**
 * Wraps a screen's static (non-scrolling) root with the standard horizontal screen margin.
 * Pass `safeArea` to render as a SafeAreaView instead of a plain View (for screens that need
 * their own safe-area insets, e.g. ones presented without a navigator header). Pass `className`
 * to add more (e.g. vertical padding) alongside the standard `px-4`.
 *
 * Full-bleed screens (camera scanner, map, carousel, hero image) should not use this component —
 * they intentionally opt out of the standard margin.
 */
export const ScreenContainer = React.forwardRef(({ safeArea, className, ...props }, ref) => {
     const Component = safeArea ? SafeAreaView : View;
     return <Component ref={ref} className={['flex-1 px-4', className].filter(Boolean).join(' ')} {...props} />;
});

ScreenContainer.displayName = 'ScreenContainer';

/**
 * contentContainerStyle for a screen's ScrollView/FlatList root, applying the standard
 * horizontal screen margin to the scrollable content (padding directly on a ScrollView/FlatList
 * insets the outer frame, not the content, so this goes on contentContainerStyle instead).
 * Spread additional contentContainerStyle needs (e.g. paddingBottom) alongside it.
 */
export const screenContentContainerStyle = { paddingHorizontal: SCREEN_HORIZONTAL_PADDING };
