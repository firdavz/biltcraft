import { FunctionsHttpError } from '@biltme/backend';
import { bilt } from './bilt';
import { PhotoSendError } from './photo-diagnostics';
import { canRunHabit } from './auth-state';
import { challengeId } from './challenge-context';
import { authCopy, useLocale } from './auth-copy';

let botUsername = '';

export const telegramConfigured = () =>
  Boolean(process.env.EXPO_PUBLIC_BILT_URL && process.env.EXPO_PUBLIC_BILT_ANON_KEY);

async function ensureSession(): Promise<void> {
  if (!canRunHabit()) throw new TelegramError(authCopy[useLocale.getState().locale].generic);
  const { data, error } = await bilt.auth.getSession();
  if (error) throw new TelegramError(error.message);
  if (!data.session || data.session.user.is_anonymous)
    throw new TelegramError(authCopy[useLocale.getState().locale].generic);
}

export async function getBotUsername(): Promise<string> {
  if (botUsername) return botUsername;
  const bot = await telegram<{ id: number; is_bot: boolean; username?: string }>('getMe');
  if (!bot.is_bot || !bot.username)
    throw new TelegramError('Telegram could not identify your bot.');
  botUsername = bot.username;
  return botUsername;
}
export type TelegramChat = { id: number; title?: string; type: string };
export type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  from?: { id: number; is_bot?: boolean };
  text?: string;
};
export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  my_chat_member?: {
    chat: TelegramChat;
    from: { id: number };
    date: number;
    new_chat_member: { status: string };
  };
  callback_query?: { id: string; from: { id: number }; data?: string; message?: TelegramMessage };
};
export class TelegramError extends Error {}

function photoResponseError(value: unknown): PhotoSendError {
  const metadata =
    typeof value === 'object' && value !== null && 'photo_diagnostic' in value
      ? value.photo_diagnostic
      : null;
  const codes: Record<string, string> = {
    PHOTO_UPLOAD_INVALID: 'The photo could not be read. Try another photo.',
    PHOTO_UPLOAD_TOO_LARGE: 'The photo is over 10 MB. Try a smaller photo.',
    PHOTO_UPLOAD_REJECTED:
      'The upload was not accepted. Check your witness connection and try again.',
    PHOTO_TELEGRAM_PERMISSION: 'The bot cannot post in your group. Check its group permissions.',
    PHOTO_TELEGRAM_RATE_LIMIT: 'Telegram is busy. Wait a little, then try again.',
    PHOTO_TELEGRAM_REJECTED:
      'Telegram rejected the photo. Check the bot in your group and try another photo.',
    PHOTO_TELEGRAM_UNCONFIRMED:
      'Check your Telegram group. Delivery could not be confirmed; do not resend.',
    PHOTO_CONFIRMATION_FAILED:
      'The photo reached Telegram, but its confirmation could not be saved. Check your group; do not resend.',
  };
  if (
    typeof metadata === 'object' &&
    metadata !== null &&
    'code' in metadata &&
    typeof metadata.code === 'string' &&
    Object.prototype.hasOwnProperty.call(codes, metadata.code)
  ) {
    const code = metadata.code;
    const stage = code.startsWith('PHOTO_UPLOAD') ? 'upload' : 'telegram';
    const delivery =
      code === 'PHOTO_CONFIRMATION_FAILED'
        ? 'sent'
        : code === 'PHOTO_TELEGRAM_UNCONFIRMED'
          ? 'unknown'
          : 'not_sent';
    return new PhotoSendError(stage, code, codes[code], delivery);
  }
  return new PhotoSendError(
    'upload',
    'PHOTO_UPLOAD_UNCONFIRMED',
    'The connection was lost while uploading or sending. Check your Telegram group before trying again.',
    'unknown',
  );
}

export async function telegram<T>(
  method: string,
  body: Record<string, unknown> | FormData = {},
): Promise<T> {
  try {
    if (!telegramConfigured())
      throw new TelegramError('Your bot is not available yet. Reopen the app and try again.');
    await ensureSession();
  } catch (error) {
    if (method === 'sendPhoto')
      throw new PhotoSendError(
        'upload',
        'PHOTO_CONNECTION_FAILED',
        'Your connection could not be opened. Reopen the app and try again.',
      );
    throw error;
  }
  const multipart = body instanceof FormData;
  const id = challengeId();
  if (multipart) {
    body.append('method', method);
    if (id !== 'legacy') body.append('challenge_id', id);
  }
  const { data, error } = await bilt.functions.invoke<{
    ok: boolean;
    result: T;
    description?: string;
    photo_diagnostic?: unknown;
  }>(id === 'legacy' ? 'telegram' : 'telegram-challenges', {
    body: multipart ? body : { method, body, challenge_id: id },
    timeout: multipart ? 120000 : 20000,
  });
  if (error instanceof FunctionsHttpError) {
    const response: unknown = await error.context.json().catch(() => null);
    if (method === 'sendPhoto') throw photoResponseError(response);
    const description =
      typeof response === 'object' &&
      response !== null &&
      'description' in response &&
      typeof response.description === 'string'
        ? response.description
        : undefined;
    throw new TelegramError(description || error.message);
  }
  if (method === 'sendPhoto' && (error || !data || !data.ok)) throw photoResponseError(data);
  if (error) throw new TelegramError(error.message);
  if (!data) throw new TelegramError('Could not reach Telegram. Please try again.');
  if (!data.ok)
    throw new TelegramError(data.description || 'Telegram could not complete that request.');
  return data.result;
}

export async function connectionLink(code: string): Promise<string> {
  const username = await getBotUsername();
  return `https://t.me/${username}?startgroup=${encodeURIComponent(code)}`;
}
export const sendMessage = (chatId: number, text: string, parseMode?: 'HTML') =>
  telegram<TelegramMessage>('sendMessage', { chat_id: chatId, text, parse_mode: parseMode });
