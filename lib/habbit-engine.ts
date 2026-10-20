import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import {
  telegram,
  telegramConfigured,
  TelegramError,
  sendMessage,
  type TelegramMessage,
  type TelegramUpdate,
} from './telegram';
import {
  save,
  useHabbit,
  buildDays,
  finished,
  currentDay,
  errorMessage,
  resetApp,
  type Day,
  type HabitConfig,
} from './habbit-store';
import { checkGroup, appendMedia, syncConnection } from './habbit-connection';
import { approvedMessage, shameMessage, kickoff } from './habbit-copy';
import { scheduleAlarms, cancelAlarms } from './habbit-notifications';
import { PhotoSendError, recordPhotoFailure } from './photo-diagnostics';

let queue = Promise.resolve();
export function serial<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
export function reportError(error: unknown) {
  const message = errorMessage(error);
  if (useHabbit.getState().error !== message)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  useHabbit.setState({ error: message });
}
export async function action(work: () => Promise<void>) {
  if (useHabbit.getState().busy) return;
  useHabbit.setState({ busy: true, error: null });
  try {
    await serial(work);
  } catch (e) {
    reportError(e);
  } finally {
    useHabbit.setState({ busy: false });
  }
}
async function updateDay(day: Day) {
  await save({ days: useHabbit.getState().days.map((d) => (d.day === day.day ? day : d)) });
}

async function deliver(key: string, text: string) {
  const state = useHabbit.getState();
  if (state.deliveries[key]) return;
  if (!state.group) throw new Error('Reconnect your witness group.');
  await save({ deliveries: { ...state.deliveries, [key]: { status: 'attempting', text } } });
  try {
    if (!state.localDemo) await sendMessage(state.group.id, text);
    await save({
      deliveries: { ...useHabbit.getState().deliveries, [key]: { status: 'sent', text } },
    });
  } catch (e) {
    const deliveries = { ...useHabbit.getState().deliveries };
    if (e instanceof TelegramError) delete deliveries[key];
    else deliveries[key] = { status: 'uncertain', text };
    await save({ deliveries });
    throw e instanceof TelegramError
      ? e
      : new Error(
          'Connection lost while sending. Check your group; this message will not be sent twice.',
        );
  }
}
async function removeButtons(day: Day) {
  const s = useHabbit.getState();
  if (!day.messageId || !s.group || s.localDemo) return;
  const key = `buttons:${day.day}`;
  if (s.deliveries[key]?.status === 'sent') return;
  await telegram('editMessageReplyMarkup', {
    chat_id: s.group.id,
    message_id: day.messageId,
    reply_markup: { inline_keyboard: [] },
  });
  await save({
    deliveries: { ...useHabbit.getState().deliveries, [key]: { status: 'sent', text: '' } },
  });
}
async function flushDay(day: Day) {
  const state = useHabbit.getState();
  if (day.status === 'APPROVED') {
    await removeButtons(day);
    const key = `approved:${day.day}`;
    await deliver(
      key,
      state.deliveries[key]?.text ?? approvedMessage(state.draft, day.day, day.autoApproved),
    );
  } else if (day.status === 'REJECTED' || day.status === 'MISSED') {
    if (day.status === 'REJECTED') {
      await removeButtons(day);
      await deliver(
        `rejected:${day.day}`,
        `❌ Proof rejected. ${state.draft.name} tried to fake it.`,
      );
    }
    await deliver(`shame:${day.day}`, day.shame!);
  }
}
async function resolveDay(
  day: Day,
  status: 'APPROVED' | 'REJECTED' | 'MISSED',
  auto = false,
  send = true,
) {
  const s = useHabbit.getState();
  const misses = s.days.filter((d) => d.status === 'MISSED' || d.status === 'REJECTED').length + 1;
  const resolved: Day = {
    ...day,
    status,
    autoApproved: auto,
    shame: status === 'APPROVED' ? undefined : shameMessage(s.draft, day.day, misses),
  };
  await updateDay(resolved);
  if (status === 'APPROVED')
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else {
    Vibration.vibrate([0, 300, 120, 300]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
  if (send) await flushDay(resolved);
}

export async function reconcile() {
  const s = useHabbit.getState();
  if (!s.hydrated || !s.started) return;
  const now = Date.now();
  for (const original of s.days) {
    let day = useHabbit.getState().days.find((d) => d.day === original.day)!;
    if (day.status === 'WAITING' && now >= day.alarmAt) {
      day = { ...day, status: 'PROOF_WINDOW' };
      await updateDay(day);
    }
    if (day.status === 'PROOF_WINDOW' && now >= day.proofDeadline)
      await resolveDay(day, 'MISSED', false, false);
    else if (day.status === 'VOTING' && now >= day.votingDeadline!)
      await resolveDay(day, 'APPROVED', true, false);
  }
  const state = useHabbit.getState();
  if (state.groupRemoved || state.reconnecting) return;
  for (const day of state.days) {
    if (['APPROVED', 'MISSED', 'REJECTED'].includes(day.status)) await flushDay(day);
  }
  if (finished(state.days))
    await deliver(
      'finished',
      `🏆 ${state.draft.name} did it. ${state.draft.totalDays} days of ${state.draft.habit}. ${state.days.filter((d) => d.status === 'APPROVED').length} days approved. New habit unlocked.`,
    );
}

async function handleUpdate(update: TelegramUpdate) {
  const q = update.callback_query;
  if (!q) return;
  const s = useHabbit.getState();
  const day = s.days.find(
    (d) =>
      d.status === 'VOTING' &&
      q.message !== undefined &&
      d.messageId === q.message.message_id &&
      q.message.chat.id === s.group?.id,
  );
  if (!day || !q.data || ![`approve:${day.day}`, `reject:${day.day}`].includes(q.data)) {
    await telegram('answerCallbackQuery', { callback_query_id: q.id, text: 'Voting has ended.' });
    return;
  }
  if (q.from.id === s.group?.selfId) {
    await telegram('answerCallbackQuery', {
      callback_query_id: q.id,
      text: "You can't vote on yourself",
    });
    return;
  }
  if (Date.now() >= day.votingDeadline!) {
    await resolveDay(day, 'APPROVED', true);
    await telegram('answerCallbackQuery', { callback_query_id: q.id, text: 'Voting has ended.' });
    return;
  }
  await resolveDay(day, q.data.startsWith('approve:') ? 'APPROVED' : 'REJECTED');
  await telegram('answerCallbackQuery', { callback_query_id: q.id, text: 'Vote counted' });
}
export async function pollUpdates() {
  const state = useHabbit.getState();
  if (!state.hydrated || state.localDemo || !telegramConfigured()) return;
  if (
    !state.started &&
    !state.group &&
    !['waiting', 'found', 'tooFew', 'notFound'].includes(state.connectionStage)
  )
    return;
  await syncConnection();
  const latest = useHabbit.getState();
  if (
    latest.connectionStage === 'waiting' &&
    latest.connectionSince &&
    Date.now() - latest.connectionSince >= 60000
  ) {
    await save({ connectionStage: 'notFound' });
  }
  const updates = await telegram<TelegramUpdate[]>('getUpdates', {
    offset: useHabbit.getState().offset,
    timeout: 0,
    allowed_updates: ['message', 'my_chat_member', 'callback_query'],
  });
  for (const update of updates) {
    await handleUpdate(update);
    await save({ offset: update.update_id + 1 });
  }
}
export async function startChallenge() {
  const s = useHabbit.getState();
  if (!s.group || s.group.selfId === null) throw new Error('Connect your Telegram group first.');
  const count = await checkGroup();
  if (count < 3) throw new Error('Add a witness to your group');
  if (s.deliveries.kickoff?.status === 'uncertain' || s.deliveries.kickoff?.status === 'attempting')
    throw new Error(
      'The start message may already be in your group. Reset the challenge before reconnecting.',
    );
  await deliver('kickoff', kickoff(s.draft));
  const days = buildDays(s.draft);
  await save({ started: true, days });
  const notificationsReady = await scheduleAlarms(days, s.draft);
  await save({ notificationsReady });
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
export async function sendProof(uri: string) {
  useHabbit.setState({ photoStage: 'upload' });
  try {
    await sendPhotoProof(uri);
  } catch (error) {
    const failure =
      error instanceof PhotoSendError
        ? error
        : new PhotoSendError(
            'upload',
            'PHOTO_SEND_CHECK_FAILED',
            'The photo send could not start. Check your connection and try again.',
          );
    await recordPhotoFailure(failure);
    throw failure;
  } finally {
    useHabbit.setState({ photoStage: null });
  }
}
async function sendPhotoProof(uri: string) {
  await reconcile();
  const s = useHabbit.getState();
  const day = currentDay(s.days);
  if (!day || day.status !== 'PROOF_WINDOW' || Date.now() >= day.proofDeadline)
    throw new PhotoSendError('upload', 'PHOTO_WINDOW_ENDED', 'Your proof window has ended.');
  if (!s.group)
    throw new PhotoSendError('upload', 'PHOTO_GROUP_MISSING', 'Reconnect your witness group.');
  const key = `proof:${day.day}`;
  if (s.deliveries[key])
    throw new PhotoSendError(
      'telegram',
      'PHOTO_ALREADY_ATTEMPTED',
      'This proof may already be in your group. Check Telegram; do not resend.',
      'unknown',
    );
  const form = new FormData();
  form.append('chat_id', String(s.group.id));
  form.append(
    'caption',
    `${s.draft.name} — Day ${day.day}/${s.draft.totalDays}: ${s.draft.habit}. Real or fake?`,
  );
  form.append(
    'reply_markup',
    JSON.stringify({
      inline_keyboard: [
        [
          { text: '✅ Real', callback_data: `approve:${day.day}` },
          { text: '❌ Fake', callback_data: `reject:${day.day}` },
        ],
      ],
    }),
  );
  try {
    await appendMedia(form, 'photo', uri);
  } catch {
    throw new PhotoSendError(
      'upload',
      'PHOTO_READ_FAILED',
      'The captured photo could not be prepared. Retake it and try again.',
    );
  }
  if (Date.now() >= day.proofDeadline) {
    await reconcile();
    throw new PhotoSendError('upload', 'PHOTO_WINDOW_ENDED', 'Your proof window has ended.');
  }
  await save({ deliveries: { ...s.deliveries, [key]: { status: 'attempting', text: '' } } });
  let confirmed = false;
  try {
    const message = s.localDemo
      ? { message_id: day.day }
      : await telegram<TelegramMessage>('sendPhoto', form);
    confirmed = true;
    useHabbit.setState({ photoStage: 'telegram' });
    await save({
      photoDiagnostic: null,
      days: useHabbit.getState().days.map((d) =>
        d.day === day.day
          ? {
              ...day,
              status: 'VOTING',
              messageId: message.message_id,
              votingDeadline: Date.now() + s.draft.approvalMinutes * 60000,
            }
          : d,
      ),
      deliveries: { ...useHabbit.getState().deliveries, [key]: { status: 'sent', text: '' } },
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {
    const failure =
      e instanceof PhotoSendError
        ? e
        : new PhotoSendError(
            confirmed ? 'telegram' : 'upload',
            confirmed ? 'PHOTO_CONFIRMATION_FAILED' : 'PHOTO_UPLOAD_UNCONFIRMED',
            confirmed
              ? 'The photo reached Telegram, but confirmation could not be saved. Check your group; do not resend.'
              : 'The connection was lost while uploading or sending. Check Telegram; do not resend.',
            confirmed ? 'sent' : 'unknown',
          );
    const deliveries = { ...useHabbit.getState().deliveries };
    if (failure.delivery === 'not_sent') delete deliveries[key];
    else deliveries[key] = { status: failure.delivery === 'sent' ? 'sent' : 'uncertain', text: '' };
    await save({ deliveries });
    throw failure;
  }
}
export async function openLocalDemo() {
  const draft: HabitConfig = {
    name: 'Alex',
    gender: 'He',
    habit: 'Move for 20 minutes',
    totalDays: 30,
    hour: 7,
    minute: 0,
    proofMinutes: 1,
    approvalMinutes: 1,
  };
  await save({
    draft,
    started: true,
    localDemo: true,
    group: { id: -1, title: 'The accountability club', memberCount: 5, selfId: 1 },
    days: buildDays(draft),
    deliveries: {},
    notificationsReady: false,
  });
}
export async function fireAlarm() {
  const s = useHabbit.getState();
  const day = currentDay(s.days);
  if (!day || finished(s.days)) return;
  if (!['WAITING', 'PROOF_WINDOW'].includes(day.status))
    throw new Error('Move to the next day before firing another alarm.');
  await updateDay({
    ...day,
    alarmAt: Date.now(),
    proofDeadline: Date.now() + s.draft.proofMinutes * 60000,
    status: 'PROOF_WINDOW',
  });
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
export async function nextDemoDay() {
  const s = useHabbit.getState();
  const day = currentDay(s.days);
  if (!day) return;
  if (day.status === 'PROOF_WINDOW' || day.status === 'WAITING') await resolveDay(day, 'MISSED');
  else if (day.status === 'VOTING') await resolveDay(day, 'APPROVED', true);
  const next = useHabbit.getState().days.find((d) => d.day === day.day + 1);
  if (!next) {
    await reconcile();
    return;
  }
  const delta = Date.now() - next.alarmAt;
  await save({
    days: useHabbit
      .getState()
      .days.map((d) =>
        d.day >= next.day
          ? { ...d, alarmAt: d.alarmAt + delta, proofDeadline: d.proofDeadline + delta }
          : d,
      ),
  });
  await reconcile();
}
export async function demoVote(approve: boolean) {
  const s = useHabbit.getState();
  const day = currentDay(s.days);
  if (!s.localDemo || day?.status !== 'VOTING') return;
  await resolveDay(day, approve ? 'APPROVED' : 'REJECTED');
}
export async function resetChallenge() {
  await cancelAlarms();
  await resetApp();
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
