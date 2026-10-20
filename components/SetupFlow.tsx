import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button, Input, Label, TextField } from 'heroui-native';
import { ChevronLeft, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { PropsWithChildren } from 'react';
import { Screen, Brand, ActionButton, ErrorNotice, SectionLabel, ui } from './HabbitUI';
import { GradientTitle } from './GradientTitle';
import { TimePicker } from './TimePicker';
import { AccountActions } from './AccountActions';
import { useAuthCopy } from '@/lib/auth-copy';
import { useAuth } from '@/lib/auth-state';
import { bilt } from '@/lib/bilt';
import { colors, headingFont } from '@/lib/habbit-theme';
import { save, useHabbit, type HabitConfig } from '@/lib/habbit-store';
import { action, startChallenge, reportError, openLocalDemo } from '@/lib/habbit-engine';
import { TelegramGroupSetup } from './TelegramGroupSetup';

const titles = [
  'What should we\ncall you?',
  'How should we\ncall you out?',
  'One habit.\nMake it count.',
  'How long will\nyou commit?',
  'Set your\nmoment of truth.',
  'Give your\nwitnesses time.',
  "Who's watching\nyou?",
];
function GuideStep({
  number,
  title,
  children,
}: PropsWithChildren<{ number: number; title: string }>) {
  return (
    <View style={styles.guideStep}>
      <Text style={styles.guideNumber}>{number}.</Text>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={styles.guideTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}
function update(patch: Partial<HabitConfig>) {
  void save({ draft: { ...useHabbit.getState().draft, ...patch } }).catch(reportError);
}
export function SetupFlow() {
  const copy = useAuthCopy();
  const switched = useAuth((s) => s.switched);
  const step = useHabbit((s) => s.setupStep);
  const draft = useHabbit((s) => s.draft);
  const group = useHabbit((s) => s.group);
  const connectionStage = useHabbit((s) => s.connectionStage);
  const reconnecting = useHabbit((s) => s.reconnecting);
  const busy = useHabbit((s) => s.busy);
  const [custom, setCustom] = useState<Record<string, boolean>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const select = (patch: Partial<HabitConfig>) => {
    update(patch);
    void Haptics.selectionAsync();
  };
  const valid =
    (step !== 0 || draft.name.trim().length > 0) &&
    (step !== 2 || draft.habit.trim().length > 0) &&
    (step !== 3 ||
      (Number.isInteger(draft.totalDays) && draft.totalDays >= 1 && draft.totalDays <= 366)) &&
    (step !== 4 || (draft.proofMinutes >= 1 && draft.proofMinutes <= 1440)) &&
    (step !== 5 || (draft.approvalMinutes >= 1 && draft.approvalMinutes <= 1440));
  function choices(
    field: 'totalDays' | 'proofMinutes' | 'approvalMinutes',
    values: number[],
    unit: string,
  ) {
    const isCustom = custom[field] || !values.includes(draft[field]);
    return (
      <View style={{ gap: 14 }}>
        <View style={styles.choices}>
          {values.map((n) => (
            <Button
              key={n}
              variant="secondary"
              className="rounded-xl"
              style={[styles.choice, draft[field] === n && !isCustom && styles.selected]}
              onPress={() => {
                setCustom((c) => ({ ...c, [field]: false }));
                select({ [field]: n });
              }}
            >
              <Button.Label
                style={{ color: draft[field] === n && !isCustom ? colors.accent : colors.muted }}
              >
                {n} {unit}
              </Button.Label>
            </Button>
          ))}
          <Button
            variant="secondary"
            className="rounded-xl"
            style={[styles.choice, isCustom && styles.selected]}
            onPress={() => {
              setCustom((c) => ({ ...c, [field]: true }));
              setCustomValues((v) => ({ ...v, [field]: String(draft[field]) }));
              void Haptics.selectionAsync();
            }}
          >
            <Button.Label style={{ color: isCustom ? colors.accent : colors.muted }}>
              Custom
            </Button.Label>
          </Button>
        </View>
        {isCustom && (
          <TextField>
            <Label>{field === 'totalDays' ? 'Number of days' : 'Number of minutes'}</Label>
            <Input
              keyboardType="number-pad"
              value={customValues[field] ?? String(draft[field])}
              onChangeText={(text) => {
                setCustomValues((v) => ({ ...v, [field]: text }));
                update({ [field]: /^\d+$/.test(text) ? Number(text) : 0 });
              }}
            />
          </TextField>
        )}
      </View>
    );
  }
  const next = () => {
    if (!valid) {
      reportError(
        new Error(
          step === 0
            ? 'Tell us your name.'
            : step === 2
              ? 'Choose one habit.'
              : step === 3
                ? 'Choose between 1 and 366 days.'
                : 'Choose between 1 and 1,440 minutes.',
        ),
      );
      return;
    }
    void action(async () => {
      if (step === 0) {
        const id = useAuth.getState().session?.user.id;
        if (id) {
          const result = await bilt
            .from('profiles')
            .update({ display_name: draft.name.trim() })
            .eq('id', id);
          if (result.error) throw new Error(result.error.message);
        }
      }
      await save({
        setupStep: step + 1,
        draft: { ...draft, name: draft.name.trim(), habit: draft.habit.trim() },
      });
      if (step === 0) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else void Haptics.selectionAsync();
    });
  };
  return (
    <Screen
      footer={
        <>
          <ErrorNotice />
          {step < 6 ? (
            <ActionButton onPress={next} busy={busy}>
              Continue
            </ActionButton>
          ) : connectionStage === 'connected' ? (
            <ActionButton
              busy={busy}
              disabled={!group || group.memberCount < 3 || group.selfId === null}
              onPress={() => {
                void action(async () => {
                  if (reconnecting) await save({ reconnecting: false });
                  else await startChallenge();
                });
              }}
            >
              {reconnecting ? 'Back to today' : 'Start my challenge'}
            </ActionButton>
          ) : null}
          {step !== 6 && (
            <Text style={styles.footerCopy}>
              {step === 0 ? copy.setupFooter : 'One habit. One day at a time.'}
            </Text>
          )}
        </>
      }
    >
      <View style={ui.row}>
        <Brand
          onLongPress={() => {
            void action(openLocalDemo);
          }}
        />
        <Text style={styles.step}>{step + 1} / 7</Text>
      </View>
      {switched && <Text style={[ui.copy, { marginTop: 24 }]}>{copy.accountSwitched}</Text>}
      <View style={styles.steps}>
        {Array.from({ length: 7 }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 2,
              backgroundColor: i <= step ? colors.accent : colors.border,
            }}
          />
        ))}
      </View>
      {step > 0 && !reconnecting && (
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          style={{ alignSelf: 'flex-start', marginTop: 12, marginLeft: -8 }}
          accessibilityLabel="Previous question"
          onPress={() => {
            void save({ setupStep: step - 1 }).catch(reportError);
            useHabbit.setState({ error: null });
          }}
        >
          <ChevronLeft color={colors.muted} size={20} />
        </Button>
      )}
      <View style={{ marginTop: step === 0 ? 44 : 20, marginBottom: 34 }}>
        <GradientTitle size={38}>{titles[step]}</GradientTitle>
      </View>
      {step === 0 && (
        <TextField>
          <Label style={styles.fieldLabel}>Your name</Label>
          <Input
            value={draft.name}
            onChangeText={(name) => update({ name })}
            placeholder="Your first name"
            autoCapitalize="words"
            maxLength={50}
            returnKeyType="next"
            onSubmitEditing={next}
            style={styles.input}
          />
        </TextField>
      )}
      {step === 1 && (
        <View style={styles.choices}>
          {(['He', 'She'] as const).map((g) => (
            <Button
              key={g}
              variant="secondary"
              style={[styles.gender, draft.gender === g && styles.selected]}
              onPress={() => select({ gender: g })}
            >
              <Button.Label
                style={{
                  fontFamily: headingFont,
                  fontSize: 24,
                  color: draft.gender === g ? colors.accent : colors.muted,
                }}
              >
                {g}
              </Button.Label>
              {draft.gender === g && <Check size={18} color={colors.accent} />}
            </Button>
          ))}
        </View>
      )}
      {step === 2 && (
        <>
          <TextField>
            <Label style={styles.fieldLabel}>Your new habit</Label>
            <Input
              value={draft.habit}
              onChangeText={(habit) => update({ habit })}
              placeholder="e.g. Move for 20 minutes"
              maxLength={120}
              returnKeyType="next"
              onSubmitEditing={next}
              style={styles.input}
            />
          </TextField>
          <Text style={[ui.copy, { marginTop: 16 }]}>
            Pick something you can prove with a photo.
          </Text>
        </>
      )}
      {step === 3 && choices('totalDays', [30, 66, 70], 'days')}
      {step === 4 && (
        <View style={{ gap: 32 }}>
          <View style={{ gap: 12 }}>
            <SectionLabel>Daily alarm</SectionLabel>
            <TimePicker
              hour={draft.hour}
              minute={draft.minute}
              onChange={(hour, minute) => select({ hour, minute })}
            />
          </View>
          <View style={{ gap: 14 }}>
            <SectionLabel>Time to send proof</SectionLabel>
            {choices('proofMinutes', [2, 15, 30, 60], 'min')}
          </View>
        </View>
      )}
      {step === 5 && (
        <View style={{ gap: 24 }}>
          {choices('approvalMinutes', [1, 5, 30], 'min')}
          <Text style={ui.copy}>
            The first witness decides. No vote in time? Your proof is automatically approved.
          </Text>
        </View>
      )}
      {step === 6 && <TelegramGroupSetup />}
      {step === 0 && (
        <View style={styles.promise}>
          <GuideStep number={1} title="Choose a habit" />
          <GuideStep number={2} title="Connect a friend on Telegram" />
          <GuideStep number={3} title="Send daily photo proof" />
        </View>
      )}
      <View style={{ marginTop: 24 }}>
        <AccountActions compact />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 6, marginTop: 26 },
  step: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.muted },
  input: {
    minHeight: 62,
    borderRadius: 12,
    fontSize: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
  },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 8, color: colors.muted },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: {
    minHeight: 54,
    minWidth: 90,
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  selected: { borderColor: colors.accent, backgroundColor: 'rgba(167,139,250,0.1)' },
  gender: {
    flex: 1,
    minHeight: 96,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerCopy: {
    fontFamily: 'Inter_400Regular',
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  promise: { marginTop: 32, marginBottom: 16, gap: 20 },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  guideNumber: {
    width: 24,
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    lineHeight: 24,
    color: colors.accent,
  },
  guideTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 24,
    color: colors.foreground,
  },
});
