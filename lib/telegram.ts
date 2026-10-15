export const TELEGRAM_BOT_TOKEN = 'PASTE_TOKEN_HERE';
export const BOT_USERNAME = 'PASTE_BOT_USERNAME'; // without @

export const telegramConfigured = () =>
  TELEGRAM_BOT_TOKEN !== 'PASTE_TOKEN_HERE' && BOT_USERNAME !== 'PASTE_BOT_USERNAME';
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
    throw new TelegramError('Add your bot token and username in lib/telegram.ts first.');
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

export function connectionLink(code: string) {
  return `https://t.me/${BOT_USERNAME}?startgroup=${encodeURIComponent(code)}`;
}
export const sendMessage = (chatId: number, text: string) =>
  telegram<TelegramMessage>('sendMessage', { chat_id: chatId, text });
