import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useHabbit, save, allChallenges } from '@/lib/habbit-store';
import { canRunHabit } from '@/lib/auth-state';
import { pollAllUpdates, reconcileAll, reportError, serial } from '@/lib/habbit-engine';
import { scheduleAlarms } from '@/lib/habbit-notifications';

export function HabbitRuntime() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      if (cancelled || !canRunHabit()) return;
      if (AppState.currentState !== 'background' && !useHabbit.getState().busy) {
        try {
          await serial(async () => {
            if (cancelled || !canRunHabit()) return;
            try {
              await pollAllUpdates();
            } catch (error) {
              reportError(error);
            }
            await reconcileAll();
          });
        } catch (e) {
          reportError(e);
        }
      }
      if (!cancelled)
        timer = setTimeout(() => {
          void run();
        }, 3000);
    };
    void run();
    void serial(async () => {
      if (cancelled || !canRunHabit()) return;
      const state = useHabbit.getState();
      if (!Object.values(allChallenges()).some((c) => c.started && !c.localDemo)) return;
      await save({ notificationsReady: await scheduleAlarms(state.days, state.draft) });
    }).catch(reportError);
    const listener = AppState.addEventListener('change', (status) => {
      if (status !== 'active' || !canRunHabit()) return;
      const s = useHabbit.getState();
      if (!Object.values(allChallenges()).some((c) => !c.localDemo)) return;
      void serial(async () => {
        if (cancelled || !canRunHabit()) return;
        try {
          await pollAllUpdates();
        } catch (error) {
          reportError(error);
        }
        await reconcileAll();
        if (Object.values(allChallenges()).some((c) => c.started && !c.localDemo))
          await save({
            notificationsReady: await scheduleAlarms(useHabbit.getState().days, s.draft),
          });
      }).catch(reportError);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      listener.remove();
    };
  }, []);
  return null;
}
