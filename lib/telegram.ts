import { FunctionsHttpError } from '@biltme/backend';
import { bilt } from './bilt';

let botUsername = '';
let sessionReady: Promise<void> | null = null;

export const telegramConfigured = () =>
  Boolean(process.env.EXPO_PUBLIC_BILT_URL && process.env.EXPO_PUBLIC_BILT_ANON_KEY);

async function ensureSession(): Promise<void> {
  if (!sessionReady) {
    sessionReady = (async () => {
      const { data, error } = await bilt.auth.getSession();
      if (error) throw new TelegramError(error.message);
      if (!data.session) {
        const signedIn = await bilt.auth.signInAnonymously();
        if (signedIn.error) throw new TelegramError(signedIn.error.message);
        if (!signedIn.data.session) throw new TelegramError('Could not connect. Please try again.');
      }
    })().catch((error: unknown) => {
      sessionReady = null;
      throw error;
    });
  }
  await sessionReady;
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
  callback_query?: { id: string; from: { id: number }; data?: string; message?: TelegramMessage };
};
export class TelegramError extends Error {}

export async function telegram<T>(
  method: string,
  body: Record<string, unknown> | FormData = {},
): Promise<T> {
  if (!telegramConfigured())
    throw new TelegramError('Your bot is not available yet. Reopen the app and try again.');
  await ensureSession();
  const multipart = body instanceof FormData;
  if (multipart) body.append('method', method);
  const { data, error } = await bilt.functions.invoke<{
    ok: boolean;
    result: T;
    description?: string;
  }>('telegram', {
    body: multipart ? body : { method, body },
    timeout: multipart ? 120000 : 20000,
  });
  if (error instanceof FunctionsHttpError) {
    const response: unknown = await error.context.json();
    const description =
      typeof response === 'object' &&
      response !== null &&
      'description' in response &&
      typeof response.description === 'string'
        ? response.description
        : undefined;
    throw new TelegramError(description || error.message);
  }
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
export const sendMessage = (chatId: number, text: string) =>
  telegram<TelegramMessage>('sendMessage', { chat_id: chatId, text });
