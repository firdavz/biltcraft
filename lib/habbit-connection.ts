import { Platform } from 'react-native';
import { telegram, type TelegramUpdate, type TelegramChat } from './telegram';
import { save, useHabbit } from './habbit-store';

export async function checkGroup() {
  const group = useHabbit.getState().group;
  if (!group) throw new Error('Connect your Telegram group first.');
  const count = await telegram<number>('getChatMemberCount', { chat_id: group.id });
  await save({ group: { ...group, memberCount: count } });
  return count;
}
export async function connectManually(id: string) {
  if (!/^-\d+$/.test(id.trim())) throw new Error('Enter a valid negative Telegram group ID.');
  const chat = await telegram<TelegramChat>('getChat', { chat_id: id.trim() });
  if (!['group', 'supergroup'].includes(chat.type))
    throw new Error('Choose a group, not a private chat or channel.');
  await save({
    group: { id: chat.id, title: chat.title || 'Telegram group', memberCount: 0, selfId: null },
  });
  await checkGroup();
}
export async function findConnection(update: TelegramUpdate) {
  const state = useHabbit.getState();
  const m = update.message;
  if (
    state.started ||
    !m ||
    !['group', 'supergroup'].includes(m.chat.type) ||
    !m.text ||
    m.from?.is_bot ||
    !m.from
  )
    return;
  const escaped = state.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i').test(m.text)) return;
  if (state.group && state.group.id !== m.chat.id) return;
  const count = await telegram<number>('getChatMemberCount', { chat_id: m.chat.id });
  await save({
    group: {
      id: m.chat.id,
      title: m.chat.title || 'Telegram group',
      selfId: m.from.id,
      memberCount: count,
    },
  });
}
export async function appendMedia(form: FormData, field: 'photo', uri: string) {
  const name = 'proof.jpg';
  const type = 'image/jpeg';
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    form.append(field, blob, name);
  } else {
    // React Native accepts URI file descriptors, but the DOM FormData overloads only accept Blob.
    // eslint-disable-next-line typescript/no-unsafe-type-assertion -- Bridge the native file-descriptor API; this branch never runs on web.
    form.append(field, { uri, name, type } as unknown as Blob);
  }
}
