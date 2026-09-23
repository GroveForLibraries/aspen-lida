import React from 'react';
import { StyleSheet } from 'react-native';
import { useStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import { Button, ButtonGroup, ButtonIcon, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { useTheme } from '../../themes/theme';

const SCOPE = 'BUTTON';

const ButtonActionContext = React.createContext({ colorScheme: undefined, variant: undefined });

const ButtonGroupSizeContext = React.createContext(undefined);

function resolveActionColors(brand, colorScheme, variant) {
     const scale = brand?.[colorScheme];
     if (!scale) {
          return null;
     }
     if (variant === 'outline') {
          return { borderColor: scale[500], textColor: scale[500] };
     }
     if (variant === 'link' || variant === 'ghost') {
          return { textColor: scale[500] };
     }
     return { backgroundColor: scale[500], textColor: scale['500-text'] };
}

// Per-size padding/minHeight for the button container, plus the matching text size class and
// icon size for ThemedButtonText/ThemedButtonIcon. minHeight (rather than a fixed height) lets
// the button grow taller when its text wraps onto multiple lines.
const BUTTON_SIZE_STYLES = {
     xs: { container: { paddingHorizontal: 14, paddingVertical: 4, minHeight: 32 }, text: 'text-2xs', icon: '2xs' },
     sm: { container: { paddingHorizontal: 16, paddingVertical: 6, minHeight: 36 }, text: 'text-xs', icon: 'sm' },
     md: { container: { paddingHorizontal: 20, paddingVertical: 8, minHeight: 40 }, text: 'text-sm', icon: 'md' },
     lg: { container: { paddingHorizontal: 24, paddingVertical: 10, minHeight: 44 }, text: 'text-base', icon: 'md' },
     xl: { container: { paddingHorizontal: 28, paddingVertical: 12, minHeight: 48 }, text: 'text-lg', icon: 'lg' },
};

function resolveButtonSizeStyle(size) {
     return BUTTON_SIZE_STYLES[size] ?? BUTTON_SIZE_STYLES.md;
}

/**
 * Wraps gluestack's Button. `size` is one of `'xs'|'sm'|'md'|'lg'|'xl'` (default `'md'`,
 * or inherited from an enclosing ThemedButtonGroup) and controls padding/minHeight plus
 * the text/icon size used by ThemedButtonText/ThemedButtonIcon. `colorScheme` is a brand
 * scale name (e.g. `'primary'`) whose color is applied per `variant`: `'outline'` colors
 * the border/text, `'link'`/`'ghost'` color only the text, otherwise the background/text
 * are filled. Resolved colorScheme/variant are provided to descendants via context.
 *
 * If `onPress` returns a Promise (e.g. an `async () => {...}` handler), a ButtonSpinner is
 * automatically rendered before `children` and the button is disabled for the duration —
 * callers don't need to track their own loading state or place a ButtonSpinner themselves.
 * Pass `autoLoading={false}` to opt out (e.g. a fire-and-forget onPress that happens to
 * return a Promise it doesn't want reflected in the UI).
 */
export const ThemedButton = React.forwardRef(({ size, colorScheme, variant, className, style, onPress, children, autoLoading = true, disabled, isDisabled, ...props }, ref) => {
     const groupSize = React.useContext(ButtonGroupSizeContext);
     const resolvedSize = size ?? groupSize ?? 'md';
     const sizeStyle = resolveButtonSizeStyle(resolvedSize);
     const { brand } = useTheme();
     const actionColors = resolveActionColors(brand, colorScheme, variant);
     const mergedStyle = Array.isArray(style)
          ? Object.assign({}, sizeStyle.container, actionColors ? { backgroundColor: actionColors.backgroundColor, borderColor: actionColors.borderColor } : null, ...style.filter(Boolean))
          : { ...sizeStyle.container, ...(actionColors ? { backgroundColor: actionColors.backgroundColor, borderColor: actionColors.borderColor } : null), ...style };

     const [isPending, setIsPending] = React.useState(false);
     const isMountedRef = React.useRef(true);
     React.useEffect(() => () => { isMountedRef.current = false; }, []);

     const handlePress = (...args) => {
          const result = onPress?.(...args);
          if (autoLoading && result && typeof result.then === 'function') {
               setIsPending(true);
               const stopPending = () => { if (isMountedRef.current) setIsPending(false); };
               result.then(stopPending, stopPending);
          }
          return result;
     };

     return (
          <ButtonActionContext.Provider value={{ colorScheme, variant }}>
               <Button
                    ref={ref}
                    size={resolvedSize}
                    variant={variant}
                    className={className}
                    style={mergedStyle}
                    onPress={handlePress}
                    disabled={isPending || disabled}
                    isDisabled={isPending || isDisabled}
                    {...props}
               >
                    {isPending ? <ButtonSpinner className="mr-2" style={{ color: actionColors?.textColor }} /> : null}
                    {children}
               </Button>
          </ButtonActionContext.Provider>
     );
});

/**
 * Wraps gluestack's ButtonText. Inherits size from the enclosing ThemedButton to pick
 * a matching text size class, and colorScheme/variant to color the text. Sets
 * flexShrink so long text wraps instead of pushing the button wider, and centers
 * wrapped lines via textAlign.
 */
export const ThemedButtonText = React.forwardRef(({ className, style, ...props }, ref) => {
     const { size: parentSize } = useStyleContext(SCOPE);
     const sizeStyle = resolveButtonSizeStyle(parentSize);
     const { colorScheme, variant } = React.useContext(ButtonActionContext);
     const { brand } = useTheme();
     const actionColors = resolveActionColors(brand, colorScheme, variant);

     const mergedTextStyle = Array.isArray(style)
          ? Object.assign({ flexShrink: 1, textAlign: 'center' }, actionColors ? { color: actionColors.textColor } : null, ...style.filter(Boolean))
          : { flexShrink: 1, textAlign: 'center', ...(actionColors ? { color: actionColors.textColor } : null), ...style };

     return <ButtonText ref={ref} className={[sizeStyle.text, className].filter(Boolean).join(' ')} style={mergedTextStyle} {...props} />;
});

/**
 * Wraps gluestack's ButtonIcon. Inherits size from the enclosing ThemedButton to pick
 * a matching icon size, unless `size` is passed explicitly.
 */
export const ThemedButtonIcon = React.forwardRef(({ size, ...props }, ref) => {
     const { size: parentSize } = useStyleContext(SCOPE);
     const sizeStyle = resolveButtonSizeStyle(parentSize);

     return <ButtonIcon ref={ref} size={size ?? sizeStyle.icon} {...props} />;
});

/** Wraps gluestack's ButtonSpinner with no theming applied. */
export const ThemedButtonSpinner = React.forwardRef((props, ref) => {
     return <ButtonSpinner ref={ref} {...props} />;
});

const BUTTON_BORDER_RADIUS = 6;

// Rounds only the outer corners of a row/column of buttons (first child's leading corners,
// last child's trailing corners) so an attached ButtonGroup reads as one continuous shape.
function applyAttachedCorners(children, flexDirection) {
     const items = React.Children.toArray(children);
     if (items.length < 2) {
          return children;
     }
     const isRow = flexDirection === 'row' || flexDirection === 'row-reverse';
     return items.map((child, index) => {
          if (!React.isValidElement(child)) {
               return child;
          }
          const isFirst = index === 0;
          const isLast = index === items.length - 1;
          const startRadius = isFirst ? BUTTON_BORDER_RADIUS : 0;
          const endRadius = isLast ? BUTTON_BORDER_RADIUS : 0;
          const cornerStyle = isRow
               ? { borderTopLeftRadius: startRadius, borderBottomLeftRadius: startRadius, borderTopRightRadius: endRadius, borderBottomRightRadius: endRadius }
               : { borderTopLeftRadius: startRadius, borderTopRightRadius: startRadius, borderBottomLeftRadius: endRadius, borderBottomRightRadius: endRadius };
          const childStyle = StyleSheet.flatten(child.props.style) ?? {};
          const definedChildStyle = Object.fromEntries(Object.entries(childStyle).filter(([, value]) => value !== undefined));
          return React.cloneElement(child, {
               style: { ...definedChildStyle, ...cornerStyle },
          });
     });
}

/**
 * Wraps gluestack's ButtonGroup. Provides `size` to child ThemedButtons that don't set
 * their own size. When `isAttached` is set, rounds only the group's outer corners
 * (per `flexDirection`, default `'row'`) so the buttons appear joined into one shape.
 */
export const ThemedButtonGroup = React.forwardRef(({ flexDirection = 'row', size, space, isAttached, children, ...props }, ref) => {
     return (
          <ButtonGroupSizeContext.Provider value={size}>
               <ButtonGroup ref={ref} flexDirection={flexDirection} space={space} isAttached={isAttached} {...props}>
                    {isAttached ? applyAttachedCorners(children, flexDirection) : children}
               </ButtonGroup>
          </ButtonGroupSizeContext.Provider>
     );
});

ThemedButton.displayName = 'ThemedButton';
ThemedButtonText.displayName = 'ThemedButtonText';
ThemedButtonIcon.displayName = 'ThemedButtonIcon';
ThemedButtonSpinner.displayName = 'ThemedButtonSpinner';
ThemedButtonGroup.displayName = 'ThemedButtonGroup';
