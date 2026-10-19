import { useState } from 'react';
import { View, Text } from 'react-native';
import { Button, Dialog, Spinner } from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { useAuthCopy, authErrorText } from '@/lib/auth-copy';
import { logOut, deleteAccount } from '@/lib/account';
import { useHabbit } from '@/lib/habbit-store';
import { colors } from '@/lib/habbit-theme';
import { ui } from './HabbitUI';

export function AccountActions({ compact = false }: { compact?: boolean }) {
  const copy = useAuthCopy();
  const habitBusy = useHabbit((s) => s.busy);
  const [confirm, setConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<'logout' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run(kind: 'logout' | 'delete') {
    setPending(kind);
    setError(null);
    try {
      if (kind === 'logout') await logOut();
      else await deleteAccount();
    } catch (value) {
      setError(authErrorText(value));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPending(null);
    }
  }
  if (compact && !expanded)
    return (
      <Button
        variant="ghost"
        size="sm"
        style={{ alignSelf: 'flex-end' }}
        onPress={() => setExpanded(true)}
      >
        <Button.Label style={{ color: colors.muted }}>{copy.account}</Button.Label>
      </Button>
    );
  return (
    <View style={{ gap: 4 }}>
      {compact && (
        <Button
          variant="ghost"
          size="sm"
          isDisabled={pending !== null}
          onPress={() => setExpanded(false)}
        >
          <Button.Label style={{ color: colors.muted }}>{copy.done}</Button.Label>
        </Button>
      )}
      <Button
        variant="ghost"
        isDisabled={habitBusy || pending !== null}
        onPress={() => {
          void run('logout');
        }}
      >
        {pending === 'logout' && <Spinner size="sm" />}
        <Button.Label style={{ color: colors.muted }}>
          {pending === 'logout' ? copy.waiting : copy.logout}
        </Button.Label>
      </Button>
      <Button
        variant="ghost"
        isDisabled={habitBusy || pending !== null}
        onPress={() => {
          setError(null);
          setConfirm(true);
        }}
      >
        <Button.Label style={{ color: colors.danger }}>{copy.deleteAccount}</Button.Label>
      </Button>
      {error && !confirm && (
        <Text accessibilityRole="alert" style={[ui.copy, { color: colors.danger }]}>
          {error}
        </Text>
      )}
      <Dialog
        isOpen={confirm}
        onOpenChange={(open) => {
          if (!pending) setConfirm(open);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content style={{ backgroundColor: colors.surface }}>
            <Dialog.Title>{copy.deleteTitle}</Dialog.Title>
            <Dialog.Description style={{ marginTop: 12, marginBottom: 24 }}>
              {copy.deleteBody}
            </Dialog.Description>
            {error && (
              <Text
                accessibilityRole="alert"
                style={[ui.copy, { color: colors.danger, marginBottom: 12 }]}
              >
                {error}
              </Text>
            )}
            <View style={{ gap: 10 }}>
              <Button
                variant="danger"
                isDisabled={pending !== null}
                onPress={() => {
                  void run('delete');
                }}
              >
                {pending === 'delete' && <Spinner size="sm" />}
                <Button.Label>
                  {pending === 'delete' ? copy.deleting : copy.deleteAccount}
                </Button.Label>
              </Button>
              <Button
                variant="ghost"
                isDisabled={pending !== null}
                onPress={() => setConfirm(false)}
              >
                <Button.Label>{copy.cancel}</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}
