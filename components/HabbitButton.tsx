import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Spinner } from 'heroui-native';
import { colors } from '@/lib/habbit-theme';

const ButtonContext = createContext({
  primary: true,
  selected: false,
  disabled: false,
  progress: 0,
});
type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'secondary' | 'ghost' | 'tab';
  size?: 'sm' | 'md' | 'lg';
  isIconOnly?: boolean;
  isDisabled?: boolean;
  busy?: boolean;
  selected?: boolean;
  icon?: ReactNode;
};
function Label({ children, style, ...props }: TextProps) {
  const { primary, selected, disabled, progress } = useContext(ButtonContext);
  return (
    <Text
      {...props}
      style={[
        style,
        styles.label,
        {
          fontSize: primary ? 13 : 12,
          color: disabled
            ? colors.buttonDisabledLabel
            : selected || progress > 0
              ? colors.foreground
              : primary
                ? colors.foreground
                : colors.muted,
        },
      ]}
    >
      {children}
    </Text>
  );
}

/** All action, selection, icon and navigator buttons share this press-state implementation. */
export function HabbitButton({
  children,
  variant = 'primary',
  size = 'md',
  isIconOnly = false,
  isDisabled = false,
  disabled = false,
  busy = false,
  selected = false,
  icon,
  style,
  onPressIn,
  onPressOut,
  accessibilityState,
  ...props
}: ButtonProps) {
  const inactive = disabled || isDisabled || busy;
  const active = selected || accessibilityState?.selected === true;
  const primary = variant === 'primary';
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const emphasis = useSharedValue(active ? 1 : 0);
  // React state communicates the pressed label colour without reading shared values during render.
  const [labelPressed, setLabelPressed] = useState(false);
  const contextValue = useMemo(
    () => ({ primary, selected: active, disabled: inactive, progress: labelPressed ? 1 : 0 }),
    [primary, active, inactive, labelPressed],
  );
  useEffect(() => {
    emphasis.set(
      withTiming(active ? 1 : 0, { duration: reduced ? 0 : 200, easing: Easing.out(Easing.quad) }),
    );
  }, [active, emphasis, reduced]);
  const surface = useAnimatedStyle(() => ({
    transform: [{ scale: primary ? 1 - pressed.get() * 0.02 : 1 }],
    backgroundColor:
      primary && !inactive
        ? `rgba(167,139,250,${0.06 + pressed.get() * 0.08})`
        : colors.transparent,
  }));
  const line = useAnimatedStyle(() => ({
    width: primary ? 24 + pressed.get() * 16 : 24 + Math.max(pressed.get(), emphasis.get()) * 24,
    backgroundColor: inactive
      ? colors.buttonDisabledLabel
      : primary || Math.max(pressed.get(), emphasis.get()) > 0
        ? colors.accent
        : colors.muted,
  }));
  const corner = useAnimatedStyle(() => ({
    width: 12 + pressed.get() * 4,
    height: 12 + pressed.get() * 4,
  }));
  const updatePress = (value: number) =>
    pressed.set(
      withTiming(value, { duration: reduced ? 0 : 200, easing: Easing.out(Easing.quad) }),
    );
  const content = busy ? (
    <>
      <Spinner size="sm" color={colors.accent} />
      <Label>Please wait…</Label>
    </>
  ) : typeof children === 'string' || typeof children === 'number' ? (
    <Label>{children}</Label>
  ) : (
    children
  );
  return (
    <ButtonContext.Provider value={contextValue}>
      <Pressable
        {...props}
        accessibilityRole={variant === 'tab' ? 'tab' : 'button'}
        accessibilityState={{ ...accessibilityState, disabled: inactive, busy, selected: active }}
        disabled={inactive}
        onPressIn={(event) => {
          setLabelPressed(true);
          updatePress(1);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          setLabelPressed(false);
          updatePress(0);
          onPressOut?.(event);
        }}
        style={[
          style,
          { minHeight: 44, flexShrink: 1 },
          primary && !isIconOnly && { width: '100%' },
          isIconOnly && { width: 44, height: 44, flexGrow: 0 },
          variant === 'tab' && { flex: 1 },
        ]}
      >
        <Animated.View
          style={[
            styles.surface,
            primary && !isIconOnly ? styles.primary : styles.secondary,
            !primary && { paddingVertical: size === 'sm' ? 6 : 8 },
            isIconOnly && styles.icon,
            variant === 'tab' && styles.tab,
            primary && {
              borderColor: inactive ? colors.buttonDisabledBorder : colors.buttonBorder,
            },
            surface,
          ]}
        >
          {primary &&
            (
              [
                ['topLeft', styles.topLeft],
                ['topRight', styles.topRight],
                ['bottomLeft', styles.bottomLeft],
                ['bottomRight', styles.bottomRight],
              ] as const
            ).map(([position, cornerStyle]) => (
              <Animated.View
                key={position}
                pointerEvents="none"
                style={[
                  styles.corner,
                  cornerStyle,
                  {
                    borderColor:
                      Platform.OS === 'android' ? colors.buttonAndroidBracket : colors.accent,
                    opacity: inactive ? 0.3 : 1,
                  },
                  !inactive && Platform.OS !== 'android' && styles.glow,
                  corner,
                ]}
              />
            ))}
          {!isIconOnly && <Animated.View pointerEvents="none" style={[styles.line, line]} />}
          {!busy && icon}
          {content}
        </Animated.View>
      </Pressable>
    </ButtonContext.Provider>
  );
}
// Compound label keeps existing compositions and handlers intact.
HabbitButton.Label = Label;
const styles = StyleSheet.create({
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexGrow: 1,
  },
  primary: {
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondary: {
    minHeight: 44,
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  tab: { paddingHorizontal: 0 },
  icon: { width: 44, minHeight: 44, borderRadius: 10, borderWidth: 0, padding: 0 },
  label: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    lineHeight: 18,
    flexShrink: 1,
    textAlign: 'center',
  },
  line: { height: 1, flexShrink: 0 },
  corner: { position: 'absolute', borderColor: colors.accent },
  topLeft: {
    top: -1,
    left: -1,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  topRight: {
    top: -1,
    right: -1,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
  },
  bottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  bottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
  },
});
