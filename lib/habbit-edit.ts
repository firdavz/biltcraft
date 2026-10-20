import * as Haptics from 'expo-haptics';
import { FunctionsHttpError } from '@biltme/backend';
import { bilt } from './bilt';
import { challengeId, habitState, saveHabit } from './challenge-context';
import { buildDays, removeChallenge, save, useHabbit, type HabitConfig } from './habbit-store';
import { reconcile, sendDeletionNotice } from './habbit-engine';
import { cancelAlarms, scheduleAlarms } from './habbit-notifications';

// Call these inside the engine's serialized action and captured challenge scope.
async function disconnectGroup() {
  if (habitState().localDemo) return;
  const { data, error } = await bilt.functions.invoke<{ ok: boolean; description?: string }>(
    'habit-group-settings',
    {
      body: { challenge_id: challengeId() },
    },
  );
  if (error instanceof FunctionsHttpError) {
    const payload: unknown = await error.context.json().catch(() => null);
    if (
      payload &&
      typeof payload === 'object' &&
      'description' in payload &&
      typeof payload.description === 'string'
    )
      throw new Error(payload.description);
  }
  if (error) throw new Error(error.message);
  if (!data?.ok)
    throw new Error(data?.description || 'Your group could not be disconnected. Try again.');
}
export async function updateHabitTimes(
  config: Pick<HabitConfig, 'hour' | 'minute' | 'approvalMinutes'>,
) {
  if (
    !Number.isInteger(config.hour) ||
    config.hour < 0 ||
    config.hour > 23 ||
    !Number.isInteger(config.minute) ||
    config.minute < 0 ||
    config.minute > 59
  )
    throw new Error('Choose an alarm time.');
  if (
    !Number.isInteger(config.approvalMinutes) ||
    config.approvalMinutes < 1 ||
    config.approvalMinutes > 1440
  )
    throw new Error('Choose between 1 and 1,440 minutes for witnesses.');
  // Resolve elapsed days without requiring message delivery before a local schedule edit.
  const state = habitState();
  const now = Date.now();
  const draft = { ...state.draft, ...config };
  const changed = draft.hour !== state.draft.hour || draft.minute !== state.draft.minute;
  const waiting = state.days.filter((d) => d.status === 'WAITING' && d.alarmAt > now);
  // Start after an already-open proof/vote day, without changing its deadline.
  const elapsed = state.days.findLast((d) => d.status !== 'WAITING' || d.alarmAt <= now);
  let first = now;
  if (elapsed) {
    const tomorrow = new Date(elapsed.alarmAt);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    first = Math.max(now, tomorrow.getTime() - 1);
  }
  const replacement = changed ? buildDays({ ...draft, totalDays: waiting.length }, first) : [];
  let index = 0;
  const days = state.days.map((day) =>
    changed && day.status === 'WAITING' && day.alarmAt > now
      ? {
          ...day,
          alarmAt: replacement[index].alarmAt,
          proofDeadline: replacement[index++].proofDeadline,
        }
      : day,
  );
  await saveHabit({ draft, days });
  await cancelAlarms();
  const notificationsReady = await scheduleAlarms(days, draft);
  await saveHabit({ notificationsReady });
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
export async function changeHabitGroup() {
  await reconcile();
  const state = habitState();
  if (state.days.some((d) => d.status === 'PROOF_WINDOW' || d.status === 'VOTING'))
    throw new Error('Wait until today’s proof and witness voting finish before changing groups.');
  if (state.localDemo) throw new Error('Group changes are not available in the local demo.');
  await disconnectGroup();
  await saveHabit({
    group: null,
    groupRemoved: false,
    reconnecting: true,
    setupStep: 6,
    connectionStage: 'intro',
    connectionSince: null,
    days: state.days.map((day) =>
      day.status === 'WAITING' ? day : { ...day, messageId: undefined },
    ),
  });
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
export async function deleteHabit(checkedNotice = false) {
  const id = challengeId();
  const state = habitState();
  if (!state.localDemo && state.group) {
    const notice = state.deliveries['habit-deleted'];
    if (checkedNotice && notice && notice.status !== 'sent') {
      await saveHabit({
        deliveries: { ...state.deliveries, 'habit-deleted': { ...notice, status: 'sent' } },
      });
    } else await sendDeletionNotice();
  }
  await disconnectGroup();
  await removeChallenge(id);
  await cancelAlarms();
  const next = useHabbit.getState();
  const notificationsReady = await scheduleAlarms(next.days, next.draft);
  // Deletion changes the active ID; never save through the old scope here.
  await save({ notificationsReady });
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
