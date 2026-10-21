import { Link, Stack } from 'expo-router';
import { HabbitButton } from '@/components/HabbitButton';
import { Screen } from '@/components/HabbitUI';
import { Text } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Screen>
        <Text>This screen doesn&apos;t exist.</Text>

        <Link href="/" asChild>
          <HabbitButton variant="secondary">Go to home screen!</HabbitButton>
        </Link>
      </Screen>
    </>
  );
}
