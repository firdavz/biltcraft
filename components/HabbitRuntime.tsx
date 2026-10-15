import { useEffect } from 'react';
import { AppState } from 'react-native';
import { hydrate, useHabbit, save } from '@/lib/habbit-store';
import { pollUpdates, reconcile, reportError, serial } from '@/lib/habbit-engine';
import { scheduleAlarms } from '@/lib/habbit-notifications';

export function HabbitRuntime() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      if (cancelled) return;
      if (AppState.currentState !== 'background' && !useHabbit.getState().busy) {
        try {
          await serial(async () => {
            try {
              await pollUpdates();
            } catch (error) {
              reportError(error);
            }
            await reconcile();
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
    void hydrate().then(() => {
      if (!cancelled) void run();
    });
    const listener = AppState.addEventListener('change', (status) => {
      if (status !== 'active') return;
      const s = useHabbit.getState();
      if (!s.started || s.localDemo) return;
      void serial(async () => {
        try {
          await pollUpdates();
        } catch (error) {
          reportError(error);
        }
        await reconcile();
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
