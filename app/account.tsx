import { View, Text } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { HabbitButton as Button } from '@/components/HabbitButton';
import { MailCheck } from 'lucide-react-native';
import { Screen, ui } from '@/components/HabbitUI';
import { AccountActions } from '@/components/AccountActions';
import { useAuth } from '@/lib/auth-state';
import { colors, headingFont } from '@/lib/habbit-theme';
import { useHabbit } from '@/lib/habbit-store';

export default function Account() {
  const router = useRouter();
  const email = useAuth((s) => s.session?.user.email);
  const challenges = useHabbit((s) => s.challenges);
  const count = Object.values(challenges).filter(
    (c) => c.started || c.draft.habit || c.setupStep > 0,
  ).length;
  return (
    <Screen>
      <View style={{ gap: 36, paddingTop: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
          <MailCheck size={24} strokeWidth={1.8} color={colors.accent} />
          <View style={{ flex: 1, gap: 8 }}>
            <Text
              style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}
            >
              Email connected
            </Text>
            <Text selectable style={[ui.copy, { fontSize: 15 }]}>
              {email}
            </Text>
          </View>
        </View>
        <Button
          variant="ghost"
          style={{ justifyContent: 'flex-start' }}
          onPress={() => router.push('/challenges')}
        >
          <Button.Label
            style={{ flex: 1, color: colors.foreground, fontFamily: headingFont, fontSize: 18 }}
          >
            Challenges
          </Button.Label>
          <Text style={ui.copy}>{count}</Text>
        </Button>
        <AccountActions />
        {!router.canGoBack() && (
          <Link href="/" asChild>
            <Button variant="secondary">Today</Button>
          </Link>
        )}
      </View>
    </Screen>
  );
}
