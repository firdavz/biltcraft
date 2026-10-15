import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type DayStatus = 'WAITING' | 'PROOF_WINDOW' | 'VOTING' | 'APPROVED' | 'REJECTED' | 'MISSED';
export type HabitConfig = {
  name: string;
  gender: 'He' | 'She';
  habit: string;
  totalDays: number;
  hour: number;
  minute: number;
  proofMinutes: number;
  approvalMinutes: number;
};
export type Group = { id: number; title: string; memberCount: number; selfId: number | null };
export type Day = {
  day: number;
  alarmAt: number;
  proofDeadline: number;
  status: DayStatus;
  votingDeadline?: number;
  messageId?: number;
  shame?: string;
  autoApproved?: boolean;
};
export type Delivery = { status: 'attempting' | 'sent' | 'uncertain'; text: string };
export type Saved = {
  draft: HabitConfig;
  setupStep: number;
  code: string;
  group: Group | null;
  started: boolean;
  localDemo: boolean;
  days: Day[];
  offset: number;
  deliveries: Record<string, Delivery>;
  notificationsReady: boolean;
};
const defaults: HabitConfig = {
  name: '',
  gender: 'He',
  habit: '',
  totalDays: 30,
  hour: 7,
  minute: 0,
  proofMinutes: 15,
  approvalMinutes: 5,
};
function fresh(): Saved {
  return {
    draft: { ...defaults },
    setupStep: 0,
    code: `HB${Math.floor(1000 + Math.random() * 9000)}`,
    group: null,
    started: false,
    localDemo: false,
    days: [],
    offset: 0,
    deliveries: {},
    notificationsReady: false,
  };
}
const key = 'habbit.v1';
let writes = Promise.resolve();
export const useHabbit = create<Saved & { hydrated: boolean; error: string | null; busy: boolean }>(
  () => ({ ...fresh(), hydrated: false, error: null, busy: false }),
);
export async function save(patch: Partial<Saved>) {
  useHabbit.setState(patch);
  const { hydrated: _hydrated, error: _error, busy: _busy, ...value } = useHabbit.getState();
  writes = writes
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(key, JSON.stringify(value)));
  await writes;
}
export async function hydrate() {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) useHabbit.setState(JSON.parse(raw) as Saved);
    // In-flight sends cannot be retried safely after interruption.
    const deliveries = Object.fromEntries(
      Object.entries(useHabbit.getState().deliveries).map(([id, item]) => [
        id,
        item.status === 'attempting' ? { ...item, status: 'uncertain' as const } : item,
      ]),
    );
    await save({ deliveries });
    useHabbit.setState({ hydrated: true });
  } catch {
    useHabbit.setState({
      hydrated: true,
      error: 'Your saved challenge could not be opened. Try reopening the app.',
    });
  }
}
export async function resetApp() {
  await writes.catch(() => undefined);
  await AsyncStorage.removeItem(key);
  useHabbit.setState({ ...fresh(), hydrated: true, error: null, busy: false });
}
export function buildDays(config: HabitConfig, first = Date.now()) {
  const start = new Date(first);
  start.setHours(config.hour, config.minute, 0, 0);
  if (start.getTime() <= first) start.setDate(start.getDate() + 1);
  return Array.from({ length: config.totalDays }, (_, index): Day => {
    const alarm = new Date(start);
    alarm.setDate(alarm.getDate() + index);
    return {
      day: index + 1,
      alarmAt: alarm.getTime(),
      proofDeadline: alarm.getTime() + config.proofMinutes * 60000,
      status: 'WAITING',
    };
  });
}
export function currentDay(days: Day[], now = Date.now()): Day | undefined {
  return (
    days.find((d) => d.status === 'PROOF_WINDOW' || d.status === 'VOTING') ??
    days.findLast((d) => d.alarmAt <= now) ??
    days[0]
  );
}
export function finished(days: Day[]) {
  return (
    days.length > 0 && days.every((d) => ['APPROVED', 'MISSED', 'REJECTED'].includes(d.status))
  );
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
