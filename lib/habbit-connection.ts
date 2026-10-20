import { Platform, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { telegram, connectionLink } from './telegram';
import type { Group } from './habbit-store';
import { habitMessage } from './habbit-copy';
import { habitState, saveHabit as save } from './challenge-context';

export async function beginConnection() {
  await syncConnection();
  if (habitState().connectionStage === 'connected' && !habitState().groupRemoved) return;
  const result = await telegram<{ code: string; lookingSince: number }>('beginConnection');
  await save({
    code: result.code,
    connectionSince: result.lookingSince,
    connectionStage: 'waiting',
    ...(habitState().started ? {} : { group: null }),
  });
  try {
    const link = await connectionLink(result.code);
    await Linking.openURL(link);
  } catch (error) {
    await telegram('cancelConnection');
    await save({ connectionStage: 'intro', connectionSince: null });
    throw error;
  }
}
export async function cancelConnection() {
  await telegram('cancelConnection');
  await save({
    connectionStage: 'intro',
    connectionSince: null,
    ...(habitState().started ? {} : { group: null }),
  });
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
export async function rejectGroup() {
  const group = habitState().group;
  if (!group) return;
  await telegram('rejectGroup', { chat_id: group.id });
  await save({ group: null, connectionStage: 'waiting', connectionSince: Date.now() });
  void Haptics.selectionAsync();
}
export async function confirmGroup() {
  const state = habitState();
  if (!state.group) throw new Error('Choose your Telegram group first.');
  if ((await checkGroup()) < 3) return;
  const group = await telegram<Group>('confirmGroup', {
    chat_id: state.group.id,
    name: state.draft.name,
    connection_message: habitMessage(
      state.draft,
      `${state.draft.name}'s witnesses, are you ready?`,
    ),
  });
  await save({ group, connectionStage: 'connected', connectionSince: null, groupRemoved: false });
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
export async function syncConnection() {
  const state = habitState();
  const result = await telegram<{
    code: string;
    group: { id: number; selfId: number; title: string } | null;
    removed: boolean;
    candidate: { id: number; selfId: number; title: string } | null;
    lookingSince: number | null;
  }>('syncConnection', {
    code: state.code,
    group: state.connectionStage === 'connected' || state.started ? state.group : null,
    message_ids: state.days.flatMap((day) => (day.messageId === undefined ? [] : [day.messageId])),
  });
  if (habitState().code !== state.code) return;
  const connected = result.removed ? null : result.group;
  const candidate = ['waiting', 'found', 'tooFew', 'notFound'].includes(state.connectionStage)
    ? result.candidate
    : null;
  const group = connected || candidate;
  const nextGroup = group
    ? { ...group, memberCount: state.group?.id === group.id ? state.group.memberCount : 0 }
    : null;
  await save({
    code: result.code,
    groupRemoved: result.removed,
    ...(result.removed && !state.started && state.connectionStage === 'connected' && !candidate
      ? { connectionStage: 'intro' }
      : {}),
    ...(connected
      ? { group: nextGroup, connectionStage: 'connected', connectionSince: null }
      : candidate
        ? { group: nextGroup }
        : {}),
  });
  if (nextGroup && !connected) {
    const count = await checkGroup();
    await save({ connectionStage: count < 3 ? 'tooFew' : 'found' });
  } else if (nextGroup && (state.group?.id !== nextGroup.id || nextGroup.memberCount === 0))
    await checkGroup();
}
export async function checkGroup() {
  const state = habitState();
  const group = state.group;
  if (!group) throw new Error('Connect your Telegram group first.');
  const count = await telegram<number>('getChatMemberCount', { chat_id: group.id });
  if (habitState().group?.id !== group.id) return count;
  await save({
    group: { ...group, memberCount: count },
    ...(['found', 'tooFew'].includes(state.connectionStage)
      ? { connectionStage: count < 3 ? 'tooFew' : 'found' }
      : {}),
  });
  return count;
}
export async function appendMedia(form: FormData, field: 'photo', uri: string) {
  const name = 'proof.jpg';
  const type = 'image/jpeg';
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('The captured photo could not be read.');
    const blob = await response.blob();
    if (!blob.size) throw new Error('The captured photo is empty.');
    form.append(field, blob, name);
  } else {
    // eslint-disable-next-line typescript/no-unsafe-type-assertion -- React Native accepts URI descriptors for file uploads.
    form.append(field, { uri, name, type } as unknown as Blob);
  }
}
