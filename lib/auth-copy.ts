import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';

export type Locale = 'en' | 'ru';
const en = {
  brand: 'Habbit',
  tagline: 'One habit. Keep your word.',
  email: 'Email',
  emailPlaceholder: 'you@example.com',
  continue: 'Continue',
  waiting: 'Please wait…',
  codeTitle: 'Check your email',
  codeSent: 'We sent a code to',
  changeEmail: 'Change email',
  codeLabel: '6-digit code',
  resend: 'Resend code',
  resendIn: 'Resend in',
  seconds: 's',
  verify: 'Verify code',
  legal: 'By continuing, you agree to our',
  terms: 'Terms',
  privacy: 'Privacy',
  and: 'and',
  invalidEmail: 'Enter a valid email address.',
  invalidCode: 'That code is wrong or expired. Try again or request a new one.',
  rateLimit: 'Too many requests. Please wait before trying again.',
  network: 'Could not connect. Check your internet and try again.',
  generic: 'Could not complete sign-in. Please try again.',
  retry: 'Retry',
  profileError: 'Could not save your account.',
  logout: 'Log out',
  deleteAccount: 'Delete account',
  deleteTitle: 'Delete your account?',
  deleteBody:
    'Your account, Telegram connection and progress on this device will be deleted. Messages and photos already in Telegram will remain. This cannot be undone.',
  cancel: 'Cancel',
  deleting: 'Deleting…',
  accountError: 'Could not complete this action. Please try again.',
  termsBody:
    'Terms of use are being prepared. Contact the app owner before using Habbit if you need the full terms.',
  privacyBody:
    'Habbit uses your email for sign-in. Habit progress stays on this device. Proof photos and messages are shared with your Telegram group. The full privacy policy is being prepared.',
  done: 'Done',
  account: 'Account',
  localOnly: 'Signing in restores your account, not habit history from another device.',
  accountSwitched:
    'Your previous habit is kept on this device for its original account. Telegram connections are not transferred.',
  setupFooter: 'One habit. One day at a time.',
};
const ru: typeof en = {
  brand: 'Habbit',
  tagline: 'Одна привычка. Держи слово.',
  email: 'Электронная почта',
  emailPlaceholder: 'you@example.com',
  continue: 'Продолжить',
  waiting: 'Подождите…',
  codeTitle: 'Проверьте почту',
  codeSent: 'Мы отправили код на',
  changeEmail: 'Изменить почту',
  codeLabel: 'Код из 6 цифр',
  resend: 'Отправить код ещё раз',
  resendIn: 'Повтор через',
  seconds: 'с',
  verify: 'Подтвердить код',
  legal: 'Продолжая, вы принимаете',
  terms: 'Условия',
  privacy: 'Политику конфиденциальности',
  and: 'и',
  invalidEmail: 'Введите корректный адрес почты.',
  invalidCode: 'Код неверный или срок действия истёк. Попробуйте снова или запросите новый.',
  rateLimit: 'Слишком много запросов. Подождите и попробуйте снова.',
  network: 'Нет соединения. Проверьте интернет и попробуйте снова.',
  generic: 'Не удалось войти. Попробуйте снова.',
  retry: 'Повторить',
  profileError: 'Не удалось сохранить аккаунт.',
  logout: 'Выйти',
  deleteAccount: 'Удалить аккаунт',
  deleteTitle: 'Удалить аккаунт?',
  deleteBody:
    'Аккаунт, связь с Telegram и прогресс на этом устройстве будут удалены. Уже отправленные сообщения и фото останутся в Telegram. Это действие нельзя отменить.',
  cancel: 'Отмена',
  deleting: 'Удаление…',
  accountError: 'Не удалось выполнить действие. Попробуйте снова.',
  termsBody:
    'Условия использования готовятся. Если вам нужны полные условия, свяжитесь с владельцем приложения до использования Habbit.',
  privacyBody:
    'Habbit использует почту для входа. Прогресс привычки хранится на этом устройстве. Фото и сообщения отправляются в вашу группу Telegram. Полная политика конфиденциальности готовится.',
  done: 'Готово',
  account: 'Аккаунт',
  localOnly: 'Вход восстановит аккаунт, но не историю привычки с другого устройства.',
  accountSwitched:
    'Прежняя привычка сохранена на устройстве для исходного аккаунта. Связи с Telegram не переносятся.',
  setupFooter: 'Одна привычка. День за днём.',
};
export const authCopy = { en, ru };
export const useLocale = create<{ locale: Locale; chosen: boolean }>(() => ({
  locale: getLocales()[0]?.languageCode === 'ru' ? 'ru' : 'en',
  chosen: false,
}));
export const useAuthCopy = () => authCopy[useLocale((s) => s.locale)];
export async function loadLocale() {
  const locale = await AsyncStorage.getItem('habbit.locale');
  if (locale === 'en' || locale === 'ru') useLocale.setState({ locale, chosen: true });
}
export async function setLocale(locale: Locale) {
  useLocale.setState({ locale, chosen: true });
  await AsyncStorage.setItem('habbit.locale', locale);
}
export function authErrorText(error: unknown): string {
  const copy = authCopy[useLocale.getState().locale];
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const message =
    typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  if (
    code === 'otp_expired' ||
    code === 'otp_disabled' ||
    /token.*(invalid|expired)|invalid.*token/i.test(message)
  )
    return copy.invalidCode;
  if (
    /rate_limit|over_.*limit/.test(code) ||
    /rate limit|too many|security purposes/i.test(message)
  )
    return copy.rateLimit;
  if (/fetch|network|connection|offline/i.test(message)) return copy.network;
  // Identity-conflict details must never reveal account existence.
  if (code === 'email_exists' || code === 'user_already_exists') return copy.generic;
  return message || copy.generic;
}
