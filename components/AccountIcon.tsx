import { useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import { CircleUserRound } from 'lucide-react-native';
import { colors } from '@/lib/habbit-theme';

export function AccountIcon() {
  const router = useRouter();
  return (
    <Button
      isIconOnly
      variant="ghost"
      size="sm"
      accessibilityLabel="Account settings"
      style={{ minWidth: 44, minHeight: 44 }}
      onPress={() => router.push('/account')}
    >
      <CircleUserRound size={22} strokeWidth={1.8} color={colors.muted} />
    </Button>
  );
}
