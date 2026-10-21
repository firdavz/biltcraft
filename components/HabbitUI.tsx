import type { PropsWithChildren, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from '@/components/ui/primitives/SafeAreaView';
import { HabbitButton as Button } from './HabbitButton';
export { HabbitButton as ActionButton } from './HabbitButton';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { AlertCircle, X } from 'lucide-react-native';
import { colors, headingFont, bodyFont } from '@/lib/habbit-theme';
import { useHabbit } from '@/lib/habbit-store';
import { action, pollUpdates, reconcile } from '@/lib/habbit-engine';

export function Screen({
  children,
  scroll = true,
  footer,
}: PropsWithChildren<{ scroll?: boolean; footer?: ReactNode }>) {
  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="65%">
          <Defs>
            <RadialGradient id="ambient" cx="0" cy="0" rx="95%" ry="85%">
              <Stop offset="0" stopColor={colors.glow} />
              <Stop offset="1" stopColor={colors.transparent} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#ambient)" />
        </Svg>
      </View>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {scroll ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.content, { flex: 1 }]}>{children}</View>
          )}
          {footer && <View style={styles.footer}>{footer}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
export function Brand({
  onLongPress,
  small = false,
}: {
  onLongPress?: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onLongPress ? 'button' : undefined}
      accessibilityLabel="Habbit"
      onLongPress={onLongPress}
      delayLongPress={650}
      style={styles.brand}
    >
      <View style={styles.mark}>
        <View style={styles.markStem} />
        <View style={[styles.markStem, { marginTop: 9 }]} />
        <View style={styles.markBar} />
      </View>
      <Text
        style={{
          fontFamily: headingFont,
          fontSize: small ? 22 : 25,
          color: colors.foreground,
          letterSpacing: -1,
        }}
      >
        habbit<Text style={{ color: colors.accent }}>.</Text>
      </Text>
    </Pressable>
  );
}
export function SectionLabel({
  children,
  color = colors.muted,
}: PropsWithChildren<{ color?: string }>) {
  return (
    <View style={styles.section}>
      <View style={[styles.square, { backgroundColor: colors.accent }]} />
      <Text style={[styles.label, { color }]}>{children}</Text>
    </View>
  );
}
export function ErrorNotice({ retryConnection = true }: { retryConnection?: boolean }) {
  const error = useHabbit((s) => s.error);
  const busy = useHabbit((s) => s.busy);
  if (!error) return null;
  return (
    <View style={styles.error}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <AlertCircle color={colors.accent} size={18} />
        <Text style={[styles.copy, { flex: 1, color: colors.foreground }]}>{error}</Text>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          accessibilityLabel="Dismiss error"
          onPress={() => useHabbit.setState({ error: null })}
        >
          <X size={16} color={colors.muted} />
        </Button>
      </View>
      {retryConnection && (
        <Button
          size="sm"
          variant="ghost"
          isDisabled={busy}
          onPress={() => {
            void action(async () => {
              await pollUpdates();
              await reconcile();
            });
          }}
        >
          <Button.Label style={{ color: colors.accent }}>Retry connection</Button.Label>
        </Button>
      )}
    </View>
  );
}
export const ui = StyleSheet.create({
  // eslint-disable-next-line react-native/no-unused-styles -- Exported shared style; consumers may use it outside this module.
  title: {
    fontFamily: headingFont,
    color: colors.foreground,
    fontSize: 36,
    lineHeight: 46,
    letterSpacing: -1.2,
  },
  // eslint-disable-next-line react-native/no-unused-styles -- Used by sign-in, legal screens, AccountActions and other external consumers.
  copy: { fontFamily: bodyFont, color: colors.muted, fontSize: 14, lineHeight: 23 },
  // eslint-disable-next-line react-native/no-unused-styles -- Used by SetupFlow and tab screens outside this module.
  panel: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
  },
  // eslint-disable-next-line react-native/no-unused-styles -- Used by SetupFlow and the progress screen outside this module.
  divider: { height: 1, backgroundColor: colors.border },
  // eslint-disable-next-line react-native/no-unused-styles -- Used by SetupFlow and tab screens outside this module.
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24 },
  footer: { padding: 16, gap: 12, backgroundColor: colors.background },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' },
  mark: {
    width: 24,
    height: 26,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    transform: [{ skewX: '-12deg' }],
  },
  markStem: { width: 5, height: 22, backgroundColor: colors.accent, borderRadius: 1 },
  markBar: {
    position: 'absolute',
    left: 3,
    top: 11,
    width: 16,
    height: 5,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  section: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  square: { width: 6, height: 6 },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  copy: { fontFamily: bodyFont, color: colors.muted, fontSize: 13, lineHeight: 20 },
  error: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
});
