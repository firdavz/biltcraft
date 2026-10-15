import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Day, HabitConfig } from './habbit-store';

if (Platform.OS !== 'web')
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
export async function scheduleAlarms(days: Day[], config: HabitConfig) {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('habbit-alarm', {
      name: 'Daily proof alarm',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 200, 250],
    });
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  // iOS permits at most 64 scheduled notifications. Refresh this rolling window on foreground.
  for (const day of days
    .filter((d) => d.alarmAt > Date.now() && d.status === 'WAITING')
    .slice(0, 60)) {
    await Notifications.scheduleNotificationAsync({
      identifier: `habbit-${day.day}`,
      content: {
        title: 'Time to show up.',
        body: `Time for ${config.habit}. You have ${config.proofMinutes} ${config.proofMinutes === 1 ? 'minute' : 'minutes'} to prove it.`,
        sound: 'default',
        data: { day: day.day },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(day.alarmAt),
        channelId: 'habbit-alarm',
      },
    });
  }
  return true;
}
export async function cancelAlarms() {
  if (Platform.OS !== 'web') await Notifications.cancelAllScheduledNotificationsAsync();
}
