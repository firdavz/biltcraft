import { View, Text, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, ArrowUpRight } from 'lucide-react-native';
import { Screen, Brand, SectionLabel, ActionButton, ui } from '@/components/HabbitUI';
import { GradientTitle } from '@/components/GradientTitle';
import { useHabbit, currentDay, type Day } from '@/lib/habbit-store';
import { colors } from '@/lib/habbit-theme';
import { useNow } from '@/hooks/useNow';

export default function Progress() {
  const router = useRouter();
  const days = useHabbit((s) => s.days);
  const draft = useHabbit((s) => s.draft);
  const localDemo = useHabbit((s) => s.localDemo);
  const { width } = useWindowDimensions();
  const now = useNow();
  const today = currentDay(days, now);
  const cellSize = (Math.min(width, 520) - 32 - 6 * 6) / 7;
  const approved = days.filter((d) => d.status === 'APPROVED').length;
  const missed = days.filter((d) => d.status === 'MISSED' || d.status === 'REJECTED').length;
  const header = (
    <View>
      <Brand small />
      <View style={{ marginTop: 36, gap: 14 }}>
        <SectionLabel>Your word, day by day</SectionLabel>
        <GradientTitle>Your progress.</GradientTitle>
      </View>
      {localDemo && (
        <Text style={[ui.copy, { marginTop: 14, fontSize: 11, color: colors.accent }]}>
          Local demo · no messages are sent
        </Text>
      )}
      <Text style={[ui.copy, { marginTop: 24, marginBottom: 28, color: colors.foreground }]}>
        {draft.habit}
      </Text>
    </View>
  );
  if (!days.length)
    return (
      <Screen>
        {header}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 24,
            paddingVertical: 60,
          }}
        >
          <CalendarDays size={40} color={colors.accent} />
          <Text style={ui.copy}>Your daily proof will appear here.</Text>
          <ActionButton onPress={() => router.replace('/')}>Choose my habit</ActionButton>
        </View>
      </Screen>
    );
  function cell(day: Day) {
    const success = day.status === 'APPROVED';
    const fail = day.status === 'MISSED' || day.status === 'REJECTED';
    return (
      <View
        accessibilityLabel={`Day ${day.day}: ${day.status.toLowerCase().replace('_', ' ')}`}
        style={{
          width: cellSize,
          height: cellSize,
          borderRadius: 6,
          borderWidth: 1,
          borderColor:
            today?.day === day.day
              ? colors.accent
              : success || fail
                ? 'transparent'
                : colors.border,
          backgroundColor: success
            ? colors.accent
            : fail
              ? colors.danger
              : 'rgba(255,255,255,0.015)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color:
              success || fail
                ? colors.background
                : today?.day === day.day
                  ? colors.accent
                  : colors.muted,
            fontSize: 11,
            fontFamily: 'Inter_600SemiBold',
          }}
        >
          {day.day}
        </Text>
      </View>
    );
  }
  return (
    <Screen scroll={false}>
      <FlatList
        data={days}
        numColumns={7}
        keyExtractor={(day) => String(day.day)}
        renderItem={({ item }) => cell(item)}
        columnWrapperStyle={{ gap: 6, marginBottom: 6 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListFooterComponent={
          <View style={{ marginTop: 28, gap: 26 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', color: colors.muted, fontSize: 15 }}>
              <Text style={{ color: colors.accent }}>{approved} approved</Text> · {missed} missed
            </Text>
            <View style={[ui.divider, { marginTop: 2 }]} />
            <View style={styles.legend}>
              <Legend color={colors.accent} label="Approved" />
              <Legend color={colors.danger} label="Missed" />
              <Legend label="Upcoming" />
            </View>
            <View style={[ui.panel, { marginTop: 10, gap: 16 }]}>
              <SectionLabel>Your commitment</SectionLabel>
              <View style={ui.row}>
                <Text style={[ui.copy, { color: colors.foreground }]}>
                  {draft.totalDays} days. One new habit.
                </Text>
                <ArrowUpRight size={18} color={colors.accent} />
              </View>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </Screen>
  );
}
function Legend({ color, label }: { color?: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          borderWidth: color ? 0 : 1,
          borderColor: colors.border,
          backgroundColor: color || 'transparent',
        }}
      />
      <Text style={{ color: colors.muted, fontFamily: 'Inter_400Regular', fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({ legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 } });
