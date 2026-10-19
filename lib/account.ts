import { FunctionsHttpError } from '@biltme/backend';
import * as Haptics from 'expo-haptics';
import { bilt } from './bilt';
import { useAuth } from './auth-state';
import { authCopy, useLocale } from './auth-copy';
import { cancelAlarms } from './habbit-notifications';
import { clearDeletedHabit, useHabbit } from './habbit-store';
import { serial } from './habbit-engine';

export async function logOut() {
  useAuth.setState({ paused: true });
  try {
    await serial(async () => {
      const { error } = await bilt.auth.signOut({ scope: 'local' });
      if (error) throw error;
      await cancelAlarms();
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } finally {
    useAuth.setState({ paused: false });
  }
}
export async function deleteAccount() {
  const id = useAuth.getState().session?.user.id;
  if (!id) throw new Error(authCopy[useLocale.getState().locale].accountError);
  useAuth.setState({ paused: true });
  try {
    await serial(async () => {
      const { data, error } = await bilt.functions.invoke<{ ok?: boolean; error?: string }>(
        'delete-account',
        { body: {} },
      );
      if (error instanceof FunctionsHttpError) {
        const body: unknown = await error.context.json().catch(() => null);
        throw new Error(
          typeof body === 'object' && body !== null && 'error' in body
            ? String(body.error)
            : error.message,
        );
      }
      if (error) throw error;
      if (!data?.ok)
        throw new Error(data?.error || authCopy[useLocale.getState().locale].accountError);
      await cancelAlarms();
      await clearDeletedHabit(id);
      const result = await bilt.auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
      useAuth.setState({ session: null, accessReady: false });
      useHabbit.setState({ error: null });
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } finally {
    useAuth.setState({ paused: false });
  }
}
