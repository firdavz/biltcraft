import { useState } from 'react';
import { View, Text } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Dialog } from 'heroui-native';
import { HabbitButton as Button } from '@/components/HabbitButton';
import { Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Screen, ActionButton, ui } from '@/components/HabbitUI';
import { TimePicker } from '@/components/TimePicker';
import { TelegramGroupSetup } from '@/components/TelegramGroupSetup';
import { useHabbit, save } from '@/lib/habbit-store';
import { colors } from '@/lib/habbit-theme';
import { action } from '@/lib/habbit-engine';
import { inChallenge } from '@/lib/challenge-context';
import { updateHabitTimes, changeHabitGroup, deleteHabit } from '@/lib/habbit-edit';
import { goBackOrReplace } from '@/lib/navigation';

export default function EditHabit() {
  const router = useRouter();
  const activeId = useHabbit((s) => s.activeId);
  const [editingId] = useState(activeId);
  const draft = useHabbit((s) => s.draft);
  const started = useHabbit((s) => s.started);
  const group = useHabbit((s) => s.group);
  const stage = useHabbit((s) => s.connectionStage);
  const reconnecting = useHabbit((s) => s.reconnecting);
  const localDemo = useHabbit((s) => s.localDemo);
  const busy = useHabbit((s) => s.busy);
  const error = useHabbit((s) => s.error);
  const notice = useHabbit((s) => s.deliveries['habit-deleted']);
  const [hour, setHour] = useState(draft.hour);
  const [minute, setMinute] = useState(draft.minute);
  const [confirm, setConfirm] = useState<'delete' | 'group' | null>(null);
  const uncertain = notice && notice.status !== 'sent';
  const run = (work: () => Promise<void>) => {
    void action(() => inChallenge(editingId, work));
  };
  const saveChanges = () =>
    run(async () => {
      await updateHabitTimes({ hour, minute });
      goBackOrReplace('/');
    });
  if (!started || editingId !== activeId)
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: 20, paddingTop: 48 }}>
          <Users size={28} strokeWidth={1.8} color={colors.accent} />
          <Text style={ui.copy}>Start a habit to edit its settings.</Text>
          <Button onPress={() => router.replace('/')}>
            <Button.Label>Go to today</Button.Label>
          </Button>
        </View>
      </Screen>
    );
  return (
    <Screen
      footer={
        <View style={{ gap: 12 }}>
          {error && (
            <Text accessibilityLiveRegion="polite" style={[ui.copy, { color: colors.accent }]}>
              {error}
            </Text>
          )}
          {reconnecting ? (
            <ActionButton
              busy={busy}
              disabled={stage !== 'connected'}
              onPress={() =>
                run(async () => {
                  await save({ reconnecting: false });
                })
              }
            >
              Done
            </ActionButton>
          ) : null}
          {!router.canGoBack() && (
            <Link href="/" asChild>
              <Button variant="secondary">Today</Button>
            </Link>
          )}
        </View>
      }
    >
      <Text style={[ui.title, { fontSize: 28, lineHeight: 38, marginBottom: 32 }]}>
        {draft.habit}
      </Text>
      <View style={{ gap: 32 }}>
        {!reconnecting && (
          <>
            <View style={{ gap: 12 }}>
              <Text
                style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}
              >
                Daily alarm
              </Text>
              <TimePicker
                hour={hour}
                minute={minute}
                onChange={(h, m) => {
                  setHour(h);
                  setMinute(m);
                  void Haptics.selectionAsync();
                }}
              />
            </View>
            <Text style={ui.copy}>
              Changes apply to upcoming alarms. Today’s open proof window stays the same.
            </Text>
          </>
        )}
        <View style={{ gap: 14, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Users size={20} strokeWidth={1.8} color={colors.accent} />
            <Text
              style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}
            >
              Telegram group
            </Text>
          </View>
          {reconnecting ? (
            <TelegramGroupSetup />
          ) : (
            <>
              <Text style={ui.copy}>{group?.title || 'No group connected'}</Text>
              <Button
                variant="primary"
                isDisabled={busy || localDemo}
                onPress={() => setConfirm('group')}
              >
                <Button.Label style={{ color: colors.accent }}>Change group</Button.Label>
              </Button>
            </>
          )}
        </View>
        {!reconnecting && (
          <ActionButton busy={busy} onPress={saveChanges}>
            Save changes
          </ActionButton>
        )}
        <Button
          variant="ghost"
          isDisabled={busy}
          style={{ alignSelf: 'flex-start' }}
          onPress={() => setConfirm('delete')}
        >
          <Button.Label style={{ color: colors.accent }}>Delete habit</Button.Label>
        </Button>
      </View>
      <Dialog
        isOpen={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content
            style={{ backgroundColor: colors.surface, padding: 24, borderRadius: 16 }}
          >
            <View style={{ gap: 18 }}>
              <Dialog.Title style={{ color: colors.foreground }}>
                {confirm === 'group' ? 'Change Telegram group?' : 'Delete this habit?'}
              </Dialog.Title>
              <Dialog.Description style={{ color: colors.muted }}>
                {confirm === 'group'
                  ? 'Disconnect this group and choose another. Finish any open proof or voting first. Your progress stays.'
                  : uncertain
                    ? 'The deletion notice may already be in Telegram. Check your group first; confirming will not send it again.'
                    : localDemo
                      ? 'This deletes the demo habit and its progress.'
                      : group
                        ? 'Your group will receive a message that you deleted this habit. Its progress will be removed. This cannot be undone.'
                        : 'This removes the habit and its progress. No group is currently connected. This cannot be undone.'}
              </Dialog.Description>
              {error && (
                <Text accessibilityLiveRegion="polite" style={[ui.copy, { color: colors.accent }]}>
                  {error}
                </Text>
              )}
              <Button
                variant="primary"
                isDisabled={busy}
                onPress={() => {
                  const choice = confirm;
                  run(async () => {
                    if (choice === 'group') await changeHabitGroup();
                    else await deleteHabit(uncertain);
                    setConfirm(null);
                    if (choice === 'delete') router.dismissTo('/');
                  });
                }}
              >
                <Button.Label style={{ color: colors.accent }}>
                  {busy
                    ? 'Please wait…'
                    : confirm === 'group'
                      ? 'Choose another group'
                      : uncertain
                        ? 'I checked Telegram — delete'
                        : 'Delete habit'}
                </Button.Label>
              </Button>
              <Button variant="ghost" isDisabled={busy} onPress={() => setConfirm(null)}>
                <Button.Label style={{ color: colors.muted }}>Cancel</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Screen>
  );
}
