import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Button } from 'heroui-native';
import { Users } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ActionButton, ui } from './HabbitUI';
import { useHabbit } from '@/lib/habbit-store';
import { action } from '@/lib/habbit-engine';
import {
  beginConnection,
  cancelConnection,
  confirmGroup,
  rejectGroup,
  checkGroup,
} from '@/lib/habbit-connection';
import { colors } from '@/lib/habbit-theme';

function Looking() {
  const opacity = useSharedValue(1);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!reduced) opacity.set(withRepeat(withTiming(0.5, { duration: 900 }), -1, true));
    else opacity.set(1);
    return () => cancelAnimation(opacity);
  }, [opacity, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.Text
      accessibilityLiveRegion="polite"
      style={[ui.copy, { color: colors.foreground, textAlign: 'center' }, style]}
    >
      Looking for your group...
    </Animated.Text>
  );
}
export function TelegramGroupSetup() {
  const stage = useHabbit((s) => s.connectionStage);
  const group = useHabbit((s) => s.group);
  const busy = useHabbit((s) => s.busy);
  const [note, setNote] = useState(false);
  return (
    <View style={{ gap: 24 }}>
      {stage === 'intro' && (
        <>
          <Text style={ui.copy}>Add Habbit to a Telegram group with your witnesses.</Text>
          <View style={{ gap: 14 }}>
            {['Tap the button below', 'Pick your group in Telegram', 'Tap Add'].map(
              (label, index) => (
                <View key={label} style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={[ui.copy, { color: colors.accent, width: 20 }]}>{index + 1}</Text>
                  <Text style={[ui.copy, { color: colors.foreground, flex: 1 }]}>{label}</Text>
                </View>
              ),
            )}
          </View>
          <ActionButton busy={busy} onPress={() => void action(beginConnection)}>
            Add Habbit to your group
          </ActionButton>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setNote(!note);
              void Haptics.selectionAsync();
            }}
          >
            <Button.Label style={{ color: colors.accent }}>No group yet?</Button.Label>
          </Button>
          {note && (
            <Text style={ui.copy}>
              Create a Telegram group with at least 1 friend, then come back here.
            </Text>
          )}
        </>
      )}
      {stage === 'waiting' && (
        <>
          <View style={{ paddingVertical: 32 }}>
            <Looking />
          </View>
          <Button
            variant="ghost"
            size="sm"
            isDisabled={busy}
            onPress={() => void action(cancelConnection)}
          >
            <Button.Label style={{ color: colors.muted }}>Cancel</Button.Label>
          </Button>
        </>
      )}
      {(stage === 'found' || stage === 'tooFew') && group && (
        <>
          <View style={[ui.panel, { gap: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Users size={22} strokeWidth={1.8} color={colors.accent} />
              <Text
                style={[
                  ui.copy,
                  { flex: 1, color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
                ]}
              >
                {group.title}
              </Text>
            </View>
            <Text style={ui.copy}>
              {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>
          {stage === 'tooFew' ? (
            <>
              <Text style={ui.copy}>Add at least 1 friend to {group.title}.</Text>
              <ActionButton
                busy={busy}
                onPress={() =>
                  void action(async () => {
                    await checkGroup();
                    void Haptics.selectionAsync();
                  })
                }
              >
                Check again
              </ActionButton>
            </>
          ) : (
            <ActionButton busy={busy} onPress={() => void action(confirmGroup)}>
              Yes, that&apos;s my group
            </ActionButton>
          )}
          <Button variant="ghost" isDisabled={busy} onPress={() => void action(rejectGroup)}>
            <Button.Label style={{ color: colors.muted }}>Not my group</Button.Label>
          </Button>
        </>
      )}
      {stage === 'notFound' && (
        <>
          <Text style={ui.copy}>Didn&apos;t see it yet. Make sure you tapped Add in Telegram.</Text>
          <ActionButton busy={busy} onPress={() => void action(beginConnection)}>
            Try again
          </ActionButton>
          <Text style={[ui.copy, { fontSize: 12 }]}>
            Bot already in the group? Type /connect there.
          </Text>
        </>
      )}
      {stage === 'connected' && group && (
        <View style={[ui.panel, { gap: 16 }]}>
          <Users size={24} strokeWidth={1.8} color={colors.accent} />
          <Text accessibilityLiveRegion="polite" style={[ui.copy, { color: colors.foreground }]}>
            Connected to {group.title}. {Math.max(0, group.memberCount - 2)}{' '}
            {group.memberCount - 2 === 1 ? 'witness' : 'witnesses'} watching.
          </Text>
        </View>
      )}
    </View>
  );
}
