import type { Day, HabitConfig } from './habbit-store';
// Browser previews cannot schedule native device alarms.
export function scheduleAlarms(_days: Day[], _config: HabitConfig): Promise<boolean> {
  return Promise.resolve(false);
}
export function cancelAlarms(): Promise<void> {
  return Promise.resolve();
}
