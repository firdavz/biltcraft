import Constants from 'expo-constants';

const configuredToken: unknown = Constants.expoConfig?.extra?.telegramBotToken;
export const TELEGRAM_BOT_TOKEN = typeof configuredToken === 'string' ? configuredToken.trim() : '';
let botUsername = '';

export const telegramConfigured = () => TELEGRAM_BOT_TOKEN.length > 0;

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), body instanceof FormData ? 120000 : 20000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      signal: controller.signal,
      method: 'POST',
      headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
    const result = (await response.json()) as { ok: boolean; result: T; description?: string };
    if (!result.ok)
      throw new TelegramError(result.description || 'Telegram could not complete that request.');
    return result.result;
  } finally {
    clearTimeout(timer);
  }
}

export async function connectionLink(code: string): Promise<string> {
  const username = await getBotUsername();
  return `https://t.me/${username}?startgroup=${encodeURIComponent(code)}`;
}
export const sendMessage = (chatId: number, text: string) =>
  telegram<TelegramMessage>('sendMessage', { chat_id: chatId, text });
