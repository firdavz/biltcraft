import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, Users, Check, Radio } from 'lucide-react-native';
import { Skeleton, Spinner } from 'heroui-native';
import { HabbitButton as Button } from '@/components/HabbitButton';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { Screen, Brand, ActionButton, ErrorNotice, SectionLabel, ui } from '@/components/HabbitUI';
import { GradientTitle } from '@/components/GradientTitle';
import { SetupFlow } from '@/components/SetupFlow';
import { PhotoSendDiagnostic } from '@/components/PhotoSendDiagnostic';
import { AccountIcon } from '@/components/AccountIcon';
import { useHabbit, currentDay, finished, save, createChallenge } from '@/lib/habbit-store';
import { action, openLocalDemo } from '@/lib/habbit-engine';
import { quotes } from '@/lib/habbit-copy';
import { colors, headingFont } from '@/lib/habbit-theme';
import { useNow, countdown } from '@/hooks/useNow';
import { scheduleAlarms } from '@/lib/habbit-notifications';

function VotingPulse() {
  const opacity = useSharedValue(1);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!reduced) opacity.set(withRepeat(withTiming(0.4, { duration: 600 }), -1, true));
  }, [opacity, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View style={[{ alignItems: 'center', gap: 18 }, style]}>
      <Radio size={40} strokeWidth={1.5} color={colors.accent} />
      <Text style={styles.stateText}>WAITING FOR{'\n'}WITNESSES</Text>
    </Animated.View>
  );
}
function Clock({
  deadline,
  now,
  short = false,
}: {
  deadline: number;
  now: number;
  short?: boolean;
}) {
  const values = countdown(deadline, now);
  const parts = short && values[0] === '00' ? values.slice(1) : values;
  const labels = parts.length === 3 ? ['Hours', 'Minutes', 'Seconds'] : ['Minutes', 'Seconds'];
  return (
    <View style={styles.clock}>
      {parts.map((v, i) => (
        <View key={labels[i]} style={{ flexDirection: 'row', flex: 1, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[styles.digit, { fontSize: parts.length === 2 ? 76 : 52 }]}
            >
              {v}
            </Text>
            <Text style={styles.unit}>{labels[i]}</Text>
          </View>
          {i < parts.length - 1 && (
            <Text style={[styles.colon, { fontSize: parts.length === 2 ? 54 : 36 }]}>:</Text>
          )}
        </View>
      ))}
    </View>
  );
}
export default function Today() {
  const router = useRouter();
  const params = useLocalSearchParams<{ demo?: string }>();
  const activeId = useHabbit((s) => s.activeId);
  const hydrated = useHabbit((s) => s.hydrated);
  const started = useHabbit((s) => s.started);
  const draft = useHabbit((s) => s.draft);
  const days = useHabbit((s) => s.days);
  const group = useHabbit((s) => s.group);
  const groupRemoved = useHabbit((s) => s.groupRemoved);
  const reconnecting = useHabbit((s) => s.reconnecting);
  const localDemo = useHabbit((s) => s.localDemo);
  const notificationsReady = useHabbit((s) => s.notificationsReady);
  const now = useNow();
  const day = currentDay(days, now);
  const done = finished(days);
  const [dismissed, setDismissed] = useState('');
  const [adding, setAdding] = useState(false);
  const busy = useHabbit((s) => s.busy);
  const addHabit = async () => {
    setAdding(true);
    try {
      await action(async () => {
        await createChallenge();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });
    } finally {
      setAdding(false);
    }
  };
  // Explicit preview-only demo entry; never substitutes for a real Telegram connection.
  useEffect(() => {
    if (hydrated && params.demo === '1' && !started) void action(openLocalDemo);
  }, [hydrated, params.demo, started]);

  if (!hydrated)
    return (
      <Screen>
        <View style={{ gap: 24, marginTop: 40 }}>
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="mt-12 h-40 w-full rounded-xl" />
        </View>
      </Screen>
    );
  if (!started || !day || reconnecting) return <SetupFlow />;
  const resultKey = `${activeId}:${day.day}:${day.status}`;
  const showResult =
    ['APPROVED', 'MISSED', 'REJECTED'].includes(day.status) && dismissed !== resultKey && !done;
  if (showResult && !groupRemoved) {
    const failed = day.status !== 'APPROVED';
    const shame = day.shame?.replace(/\p{Extended_Pictographic}|\uFE0F/gu, '').trim();
    return (
      <View style={{ flex: 1, backgroundColor: failed ? colors.danger : colors.background }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 70,
            paddingBottom: 30,
            flex: 1,
            justifyContent: 'space-between',
          }}
        >
          <SectionLabel color={failed ? colors.failMuted : colors.accent}>
            Day {day.day} / {draft.totalDays}
          </SectionLabel>
          <View style={{ gap: 28 }}>
            <Text
              style={[styles.resultTitle, { color: failed ? colors.failText : colors.foreground }]}
            >
              {failed ? 'YOU FAILED.\nTHEY KNOW.' : `APPROVED.\nDAY ${day.day}\nDONE.`}
            </Text>
            {failed ? (
              <View style={{ paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.failMuted }}>
                <Text
                  style={{
                    color: colors.failMuted,
                    fontFamily: 'Inter_700Bold',
                    fontSize: 12,
                    letterSpacing: 1.4,
                    marginBottom: 16,
                  }}
                >
                  YOUR GROUP’S CALLOUT
                </Text>
                <Text
                  style={{
                    color: colors.failText,
                    fontFamily: 'Inter_500Medium',
                    fontSize: 19,
                    lineHeight: 30,
                  }}
                >
                  {shame}
                </Text>
              </View>
            ) : (
              <>
                <Check size={52} strokeWidth={1.5} color={colors.accent} />
                <Text style={ui.copy}>Day complete.</Text>
              </>
            )}
          </View>
          <View style={{ gap: 16 }}>
            <ErrorNotice />
            <PhotoSendDiagnostic />
            <Button
              variant="primary"
              onPress={() => setDismissed(resultKey)}
              style={failed ? { backgroundColor: colors.background, borderRadius: 10 } : undefined}
            >
              <Button.Label style={{ color: failed ? colors.white : colors.accent }}>
                Back to today
              </Button.Label>
            </Button>
          </View>
        </View>
      </View>
    );
  }
  const quote = quotes[(day.day - 1) % quotes.length];
  const next = days.find((d) => d.status === 'WAITING' && d.day > day.day);
  const alarmTime = new Date(day.alarmAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return (
    <Screen>
      <View style={ui.row}>
        <Brand small />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.date}>
            {new Date(now).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
          <AccountIcon />
        </View>
      </View>
      {groupRemoved && (
        <View style={{ gap: 12, marginTop: 24 }}>
          <Text style={ui.copy}>Habbit was removed from your group</Text>
          <Button
            variant="primary"
            onPress={() =>
              void action(async () => {
                await save({
                  setupStep: 5,
                  reconnecting: true,
                  connectionStage: 'intro',
                  connectionSince: null,
                });
              })
            }
          >
            <Button.Label style={{ color: colors.accent }}>Reconnect</Button.Label>
          </Button>
        </View>
      )}
      <View style={{ marginTop: 36, gap: 14 }}>
        <SectionLabel color={colors.accent}>
          {done ? 'Challenge complete' : `Day ${day.day} / ${draft.totalDays}`}
        </SectionLabel>
        <GradientTitle size={36}>{draft.habit}</GradientTitle>
      </View>
      {localDemo && (
        <Text style={[styles.localDemo, { marginTop: 14 }]}>Local demo · no messages are sent</Text>
      )}
      <PhotoSendDiagnostic />
      <View style={styles.main}>
        {done ? (
          <View style={{ alignItems: 'center', gap: 24 }}>
            <Check size={48} color={colors.accent} />
            <Text style={styles.stateText}>NEW HABIT\nUNLOCKED.</Text>
            <Text style={ui.copy}>
              {days.filter((d) => d.status === 'APPROVED').length} of {draft.totalDays} days
              approved
            </Text>
            <ActionButton onPress={() => router.push('/progress')}>See my challenge</ActionButton>
          </View>
        ) : day.status === 'WAITING' ? (
          <>
            <SectionLabel>Next alarm in</SectionLabel>
            <Clock deadline={day.alarmAt} now={now} />
            <View style={styles.alarmBadge}>
              <Bell size={15} strokeWidth={1.8} color={colors.accent} />
              <Text style={styles.alarmText}>Every day at {alarmTime}</Text>
            </View>
          </>
        ) : day.status === 'PROOF_WINDOW' ? (
          <>
            <SectionLabel color={colors.accent}>Time to prove it</SectionLabel>
            <Clock deadline={day.proofDeadline} now={now} short />
            <View style={{ width: '100%', marginTop: 26 }}>
              <ActionButton
                disabled={now >= day.proofDeadline || groupRemoved}
                onPress={() => router.push('/camera')}
              >
                PROVE IT
              </ActionButton>
            </View>
          </>
        ) : day.status === 'VOTING' ? (
          <>
            <VotingPulse />
            <Text style={[ui.copy, { marginTop: 20, textAlign: 'center' }]}>
              A witness must press Approve in Telegram to complete this day. No vote means it stays
              pending.
            </Text>
          </>
        ) : (
          <>
            <Check size={38} color={colors.accent} />
            <Text style={[styles.stateText, { marginTop: 18 }]}>
              {day.status === 'APPROVED' ? 'YOU SHOWED UP.' : 'THEY KNOW.'}
            </Text>
            {next && (
              <>
                <Text style={[ui.copy, { marginTop: 20 }]}>Next chance in</Text>
                <Clock deadline={next.alarmAt} now={now} />
              </>
            )}
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          style={{ marginTop: 18 }}
          onPress={() => router.push('/edit-habit')}
        >
          <Button.Label numberOfLines={1} style={{ color: colors.accent }}>
            Edit habit
          </Button.Label>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          isDisabled={busy || adding}
          onPress={() => void addHabit()}
        >
          {adding && <Spinner size="sm" color={colors.accent} />}
          <Button.Label numberOfLines={1} style={{ color: colors.accent }}>
            {adding ? 'Adding habit…' : 'Add new habit'}
          </Button.Label>
        </Button>
      </View>
      <ErrorNotice />
      {!localDemo && !notificationsReady && !done && (
        <Button
          variant="ghost"
          size="sm"
          onPress={() => {
            void action(async () => {
              const allowed = await scheduleAlarms(days, draft);
              await save({ notificationsReady: allowed });
              if (!allowed)
                throw new Error(
                  Platform.OS === 'web'
                    ? 'Daily alarms work in the iPhone and Android app.'
                    : 'Notifications are off. Allow them in your device settings.',
                );
            });
          }}
        >
          <Button.Label style={{ color: colors.accent }}>Enable daily alarm</Button.Label>
        </Button>
      )}
      <View style={styles.witnesses}>
        <View style={styles.witnessIcons}>
          <Users color={colors.accent} size={21} strokeWidth={1.6} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.witnessLabel}>
            {Math.max(0, (group?.memberCount ?? 2) - 2)}{' '}
            {(group?.memberCount ?? 2) - 2 === 1 ? 'WITNESS' : 'WITNESSES'} WATCHING
          </Text>
          <Text style={styles.groupName}>{group?.title}</Text>
        </View>
        <View style={{ width: 6, height: 6, backgroundColor: colors.accent, borderRadius: 3 }} />
      </View>
      <View style={[ui.panel, styles.quote]}>
        <SectionLabel>Words to live by</SectionLabel>
        <Text style={styles.quoteText}>“{quote[0]}”</Text>
        <Text style={styles.author}>— {quote[1]}</Text>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  date: { color: colors.muted, fontFamily: 'Inter_500Medium', fontSize: 12 },
  main: {
    minHeight: 290,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 46,
  },
  clock: { flexDirection: 'row', width: '100%', maxWidth: 380, marginTop: 18 },
  digit: {
    color: colors.foreground,
    fontFamily: headingFont,
    letterSpacing: -2.4,
    fontVariant: ['tabular-nums'],
    lineHeight: 96,
  },
  colon: { color: colors.accent, fontFamily: headingFont, lineHeight: 85, marginHorizontal: 0 },
  unit: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  alarmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(167,139,250,0.06)',
    marginTop: 28,
  },
  alarmText: { color: colors.muted, fontFamily: 'Inter_500Medium', fontSize: 12 },
  stateText: {
    color: colors.foreground,
    fontFamily: headingFont,
    fontSize: 28,
    lineHeight: 38,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  witnesses: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 22,
    paddingBottom: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  witnessIcons: { paddingRight: 2 },
  witnessLabel: {
    color: colors.accent,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.1,
  },
  groupName: { color: colors.muted, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  quote: { gap: 16, padding: 20 },
  quoteText: {
    color: colors.foreground,
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
    lineHeight: 27,
    letterSpacing: -0.2,
  },
  author: { color: colors.muted, fontFamily: 'Inter_400Regular', fontSize: 12 },
  resultTitle: { fontFamily: headingFont, fontSize: 48, lineHeight: 61, letterSpacing: -1.5 },
  localDemo: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.accent },
});
