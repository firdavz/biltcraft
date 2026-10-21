import { Text } from 'react-native';
import { Link } from 'expo-router';
import { Screen, ui } from '@/components/HabbitUI';
import { GradientTitle } from '@/components/GradientTitle';
import { useAuthCopy } from '@/lib/auth-copy';
import { useAuth, realSession } from '@/lib/auth-state';
import { HabbitButton } from '@/components/HabbitButton';
export default function Terms() {
  const copy = useAuthCopy();
  const session = useAuth((s) => s.session);
  return (
    <Screen>
      <GradientTitle size={32}>{copy.terms}</GradientTitle>
      <Text style={[ui.copy, { marginTop: 28 }]}>{copy.termsBody}</Text>
      <Link href={realSession(session) ? '/' : '/signin'} replace asChild>
        <HabbitButton variant="secondary" style={{ marginTop: 32 }}>
          {copy.done}
        </HabbitButton>
      </Link>
    </Screen>
  );
}
