import { useEffect, useRef } from 'react';
import { FunctionsHttpError } from '@biltme/backend';
import { AppState, Platform } from 'react-native';
import { bilt } from '@/lib/bilt';
import { useAuth, realSession } from '@/lib/auth-state';
import { hydrate, bindHabitAccount, rememberHabitOwner, useHabbit, save } from '@/lib/habbit-store';
import { loadLocale, setLocale, useLocale, authErrorText } from '@/lib/auth-copy';
import { cancelAlarms } from '@/lib/habbit-notifications';
import { serial } from '@/lib/habbit-engine';
import * as Haptics from 'expo-haptics';

export function AuthRuntime() {
  const session = useAuth((s) => s.session);
  const ready = useAuth((s) => s.ready);
  const retry = useAuth((s) => s.retry);
  const previousId = useRef<string | null>(null);
  const accountReady = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = bilt.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      if (next?.user.id !== useAuth.getState().session?.user.id || !realSession(next)) {
        useAuth.setState({ accessReady: false });
      }
      useAuth.setState({ session: next });
    });
    void (async () => {
      try {
        await Promise.all([hydrate(), loadLocale()]);
        const { data, error } = await bilt.auth.getSession();
        if (error) throw error;
        if (data.session?.user.is_anonymous) await rememberHabitOwner(data.session.user.id);
        if (!active) return;
        previousId.current = data.session?.user.id ?? null;
        useAuth.setState({ session: data.session, ready: true, error: null });
      } catch (error) {
        if (active) {
          useAuth.setState({ ready: true, error: authErrorText(error) });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    })();
    const listener = AppState.addEventListener('change', (state) => {
      if (Platform.OS === 'web') return;
      if (state === 'active') void bilt.auth.startAutoRefresh();
      else void bilt.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      listener.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready || !realSession(session) || !session) return undefined;
    if (accountReady.current === session.user.id && useAuth.getState().accessReady)
      return undefined;
    let active = true;
    const id = session.user.id;
    void (async () => {
      try {
        await serial(async () => {
          if (!active) return;
          const switched = await bindHabitAccount(id, previousId.current);
          if (switched) await cancelAlarms();
          const context = await bilt.functions.invoke<{
            group: { id: number; selfId: number; title: string } | null;
            code: string | null;
          }>('account-context', { body: {} });
          if (context.error instanceof FunctionsHttpError) {
            const body: unknown = await context.error.context.json().catch(() => null);
            throw new Error(
              typeof body === 'object' && body !== null && 'error' in body
                ? String(body.error)
                : context.error.message,
            );
          }
          if (context.error) throw context.error;
          if (!context.data) throw new Error(authErrorText(null));
          // Recover only server-verified ownership. Never send a fresh reset code for an existing account.
          if (context.data.code || context.data.group) {
            const state = useHabbit.getState();
            await save({
              ...(context.data.code ? { code: context.data.code } : {}),
              ...(context.data.group
                ? {
                    group: {
                      ...context.data.group,
                      memberCount:
                        state.group?.id === context.data.group.id ? state.group.memberCount : 0,
                    },
                  }
                : {}),
            });
          }
          const localeState = useLocale.getState();
          const profile = await bilt.from('profiles').select('*').eq('id', id).maybeSingle();
          if (profile.error) throw profile.error;
          const locale = localeState.chosen
            ? localeState.locale
            : (profile.data?.locale ?? localeState.locale);
          const saved = await bilt.from('profiles').upsert({
            id,
            locale,
            ...(!profile.data ? { display_name: useHabbit.getState().draft.name || null } : {}),
          });
          if (saved.error) throw saved.error;
          await setLocale(locale);
          if (!active) return;
          previousId.current = id;
          accountReady.current = id;
          useAuth.setState({ accessReady: true, paused: false, error: null, switched });
        });
      } catch (error) {
        if (active) {
          useAuth.setState({ accessReady: false, error: authErrorText(error) });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react/exhaustive-effect-dependencies -- Retry intentionally reruns failed account initialization from the sign-in button.
  }, [ready, session, retry]);
  return null;
}
