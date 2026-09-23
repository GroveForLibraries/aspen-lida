import React from 'react';
import { ScrollView } from '@/components/ui/scroll-view';

/**
 * Wraps gluestack's ScrollView. When `horizontal` is true, its content container defaults to
 * `flexDirection: 'row'` so children lay out side by side; a caller-provided
 * `contentContainerStyle` still wins for any conflicting keys.
 */
export const ThemedScrollView = React.forwardRef(({ horizontal, contentContainerStyle, ...props }, ref) => {
     return (
          <ScrollView
               ref={ref}
               horizontal={horizontal}
               contentContainerStyle={horizontal ? [{ flexDirection: 'row' }, contentContainerStyle] : contentContainerStyle}
               {...props}
          />
     );
});

ThemedScrollView.displayName = 'ThemedScrollView';
