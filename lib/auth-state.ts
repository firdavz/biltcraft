import { create } from 'zustand';
import type { Session } from '@biltme/backend';

export const useAuth = create<{
  session: Session | null;
  ready: boolean;
  accessReady: boolean;
  paused: boolean;
  error: string | null;
  retry: number;
  switched: boolean;
}>(() => ({
  session: null,
  ready: false,
  accessReady: false,
  paused: false,
  error: null,
  retry: 0,
  switched: false,
}));
export const realSession = (session: Session | null) =>
  Boolean(session && !session.user.is_anonymous && session.user.email_confirmed_at);
export const canRunHabit = () => {
  const state = useAuth.getState();
  return realSession(state.session) && state.accessReady && !state.paused;
};
