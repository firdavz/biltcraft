import { useState } from 'react';
import { View, Text } from 'react-native';
import { Button, Spinner } from 'heroui-native';
import { LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthCopy, authErrorText } from '@/lib/auth-copy';
import { logOut } from '@/lib/account';
import { useHabbit } from '@/lib/habbit-store';
import { colors } from '@/lib/habbit-theme';
import { ui } from './HabbitUI';

export function AccountActions({ compact = false }: { compact?: boolean }) {
  const copy = useAuthCopy();
  const busy = useHabbit((s) => s.busy);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (compact) return null;
  return (
    <View style={{ gap: 12 }}>
      <Button
        variant="ghost"
        isDisabled={busy || pending}
        style={{ justifyContent: 'flex-start', paddingHorizontal: 0 }}
        onPress={() => {
          setPending(true);
          setError(null);
          void logOut()
            .then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
            .catch((value: unknown) => {
              setError(authErrorText(value));
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            })
            .finally(() => setPending(false));
        }}
      >
        {pending ? (
          <Spinner size="sm" />
        ) : (
          <LogOut size={20} strokeWidth={1.8} color={colors.danger} />
        )}
        <Button.Label style={{ color: colors.danger }}>
          {pending ? copy.waiting : copy.logout}
        </Button.Label>
      </Button>
      {error && (
        <Text accessibilityRole="alert" style={[ui.copy, { color: colors.danger }]}>
          {error}
        </Text>
      )}
    </View>
  );
}
