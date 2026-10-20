import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { z } from 'zod';

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
export type PhotoStage = 'capture' | 'upload' | 'telegram';
export type PhotoDiagnostic = {
  stage: PhotoStage;
  code: string;
  message: string;
  delivery: 'not_sent' | 'unknown' | 'sent';
  recordedAt: string;
  platform: string;
};
export type ConnectionStage = 'intro' | 'waiting' | 'found' | 'tooFew' | 'notFound' | 'connected';
export type Saved = {
  connectionStage: ConnectionStage;
  connectionSince: number | null;
  groupRemoved: boolean;
  reconnecting: boolean;
  photoDiagnostic: PhotoDiagnostic | null;
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
    connectionStage: 'intro',
    connectionSince: null,
    groupRemoved: false,
    reconnecting: false,
    photoDiagnostic: null,
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
// Older records may omit newer fields; validate present values and retain fresh defaults.
const savedSchema = z
  .object({
    connectionStage: z.enum(['intro', 'waiting', 'found', 'tooFew', 'notFound', 'connected']),
    connectionSince: z.number().nullable(),
    groupRemoved: z.boolean(),
    reconnecting: z.boolean(),
    photoDiagnostic: z
      .object({
        stage: z.enum(['capture', 'upload', 'telegram']),
        code: z.string(),
        message: z.string(),
        delivery: z.enum(['not_sent', 'unknown', 'sent']),
        recordedAt: z.string(),
        platform: z.string(),
      })
      .nullable(),
    draft: z.object({
      name: z.string(),
      gender: z.enum(['He', 'She']),
      habit: z.string(),
      totalDays: z.number(),
      hour: z.number(),
      minute: z.number(),
      proofMinutes: z.number(),
      approvalMinutes: z.number(),
    }),
    setupStep: z.number(),
    code: z.string(),
    group: z
      .object({
        id: z.number(),
        title: z.string(),
        memberCount: z.number(),
        selfId: z.number().nullable(),
      })
      .nullable(),
    started: z.boolean(),
    localDemo: z.boolean(),
    days: z.array(
      z.object({
        day: z.number(),
        alarmAt: z.number(),
        proofDeadline: z.number(),
        status: z.enum(['WAITING', 'PROOF_WINDOW', 'VOTING', 'APPROVED', 'REJECTED', 'MISSED']),
        votingDeadline: z.number().optional(),
        messageId: z.number().optional(),
        shame: z.string().optional(),
        autoApproved: z.boolean().optional(),
      }),
    ),
    offset: z.number(),
    deliveries: z.record(
      z.string(),
      z.object({
        status: z.enum(['attempting', 'sent', 'uncertain']),
        text: z.string(),
      }),
    ),
    notificationsReady: z.boolean(),
  })
  .partial();
function parseSaved(raw: string): Partial<Saved> {
  const value: unknown = JSON.parse(raw);
  return savedSchema.parse(value);
}
const key = 'habbit.v1';
let writes = Promise.resolve();
export const useHabbit = create<
  Saved & { hydrated: boolean; error: string | null; busy: boolean; photoStage: PhotoStage | null }
>(() => ({ ...fresh(), hydrated: false, error: null, busy: false, photoStage: null }));
export async function save(patch: Partial<Saved>) {
  useHabbit.setState(patch);
  const {
    hydrated: _hydrated,
    error: _error,
    busy: _busy,
    photoStage: _photoStage,
    ...value
  } = useHabbit.getState();
  writes = writes
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(key, JSON.stringify(value)));
  await writes;
}
export async function hydrate() {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) useHabbit.setState(parseSaved(raw));
    // In-flight sends cannot be retried safely after interruption.
    const deliveries = Object.fromEntries(
      Object.entries(useHabbit.getState().deliveries).map(([id, item]) => [
        id,
        item.status === 'attempting' ? { ...item, status: 'uncertain' as const } : item,
      ]),
    );
    const interruptedPhoto = Object.entries(useHabbit.getState().deliveries).some(
      ([id, item]) => id.startsWith('proof:') && item.status === 'attempting',
    );
    const photoDiagnostic: PhotoDiagnostic | null = interruptedPhoto
      ? {
          stage: 'upload',
          code: 'PHOTO_SEND_INTERRUPTED',
          message:
            'The app closed while uploading or sending. Check your Telegram group; do not resend.',
          delivery: 'unknown',
          recordedAt: new Date().toISOString(),
          platform: Platform.OS,
        }
      : useHabbit.getState().photoDiagnostic;
    await save({ deliveries, photoDiagnostic });
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
  const owner = await AsyncStorage.getItem('habbit.owner');
  await AsyncStorage.multiRemove([key, ...(owner ? [`habbit.account.${owner}`] : [])]);
  useHabbit.setState({ ...fresh(), hydrated: true, error: null, busy: false, photoStage: null });
}
export async function rememberHabitOwner(userId: string) {
  if (!(await AsyncStorage.getItem('habbit.owner')))
    await AsyncStorage.setItem('habbit.owner', userId);
}
export async function bindHabitAccount(userId: string, previousSessionId: string | null) {
  await writes.catch(() => undefined);
  const storedOwner = await AsyncStorage.getItem('habbit.owner');
  const previousOwner = storedOwner ?? previousSessionId;
  if (previousOwner && previousOwner !== userId) {
    const raw = await AsyncStorage.getItem(key);
    if (raw) await AsyncStorage.setItem(`habbit.account.${previousOwner}`, raw);
    const restored = await AsyncStorage.getItem(`habbit.account.${userId}`);
    useHabbit.setState({
      ...fresh(),
      ...(restored ? parseSaved(restored) : {}),
      hydrated: true,
      error: null,
      busy: false,
      photoStage: null,
    });
    await save({});
  }
  await AsyncStorage.setItem('habbit.owner', userId);
  return Boolean(previousOwner && previousOwner !== userId);
}
export async function clearDeletedHabit(userId: string) {
  await resetApp();
  await AsyncStorage.multiRemove(['habbit.owner', `habbit.account.${userId}`, 'habbit.locale']);
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
