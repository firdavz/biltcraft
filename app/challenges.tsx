import { View, Text, FlatList } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Button } from 'heroui-native';
import { Plus, Users, Check, ListChecks } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Screen, ErrorNotice, ui } from '@/components/HabbitUI';
import {
  useHabbit,
  allChallenges,
  createChallenge,
  selectChallenge,
  finished,
} from '@/lib/habbit-store';
import { action, reconcileAll } from '@/lib/habbit-engine';
import { colors, headingFont } from '@/lib/habbit-theme';

export default function Challenges() {
  const router = useRouter();
  useHabbit((s) => s.challenges);
  const activeId = useHabbit((s) => s.activeId);
  const busy = useHabbit((s) => s.busy);
  const data = Object.entries(allChallenges()).filter(
    ([, c]) => c.started || c.draft.habit || c.setupStep > 0,
  );
  const add = () =>
    void action(async () => {
      await createChallenge();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissTo('/');
    });
  return (
    <Screen
      scroll={false}
      footer={
        <View style={{ gap: 12 }}>
          <ErrorNotice />
          <Button variant="secondary" isDisabled={busy} onPress={add}>
            <Plus size={20} color={colors.accent} strokeWidth={1.8} />
            <Button.Label style={{ color: colors.accent }}>New challenge</Button.Label>
          </Button>
          {!router.canGoBack() && (
            <Link href="/account" style={{ color: colors.accent }}>
              Account settings
            </Link>
          )}
        </View>
      }
    >
      <FlatList
        data={data}
        keyExtractor={([id]) => id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, flexGrow: 1 }}
        renderItem={({ item: [id, c] }) => (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={{ borderBottomWidth: 1, borderColor: colors.border }}
          >
            <Button
              variant="ghost"
              isDisabled={busy}
              style={{
                borderRadius: 0,
                height: 'auto',
                paddingVertical: 22,
                paddingHorizontal: 0,
                alignItems: 'flex-start',
              }}
              accessibilityLabel={`Open ${c.draft.habit || 'unfinished challenge'}`}
              onPress={() =>
                void action(async () => {
                  await selectChallenge(id);
                  await reconcileAll();
                  if (id !== activeId) void Haptics.selectionAsync();
                  router.dismissTo('/');
                })
              }
            >
              <View style={{ flex: 1, gap: 12 }}>
                <Text style={{ fontFamily: headingFont, fontSize: 21, color: colors.foreground }}>
                  {c.draft.habit || 'New challenge'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Users size={16} color={colors.muted} strokeWidth={1.8} />
                  <Text style={[ui.copy, { flex: 1, fontSize: 14 }]}>
                    {c.group
                      ? `${c.group.title}${c.groupRemoved ? ' · Reconnect' : ''}`
                      : 'No group connected'}
                  </Text>
                </View>
                <Text style={{ color: colors.accent, fontFamily: 'Inter_500Medium', fontSize: 12 }}>
                  {!c.started
                    ? 'Finish setup'
                    : finished(c.days)
                      ? 'Completed'
                      : `${c.days.filter((d) => ['APPROVED', 'MISSED', 'REJECTED'].includes(d.status)).length} / ${c.draft.totalDays} days`}
                </Text>
              </View>
              {id === activeId && <Check size={20} strokeWidth={1.8} color={colors.accent} />}
            </Button>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <ListChecks size={32} color={colors.accent} strokeWidth={1.8} />
            <Text style={ui.copy}>Your challenges and witness groups appear here.</Text>
            <Button variant="ghost" isDisabled={busy} onPress={add}>
              <Button.Label style={{ color: colors.accent }}>Create a challenge</Button.Label>
            </Button>
          </View>
        }
      />
    </Screen>
  );
}
