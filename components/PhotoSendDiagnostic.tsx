import { useState } from 'react';
import { View, Text } from 'react-native';
import { Button, Spinner } from 'heroui-native';
import { AlertCircle, Copy, X } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useHabbit, save } from '@/lib/habbit-store';
import { photoStageLabels, photoReport } from '@/lib/photo-diagnostics';
import { colors, bodyFont } from '@/lib/habbit-theme';

export function PhotoSendDiagnostic() {
  const diagnostic = useHabbit((s) => s.photoDiagnostic);
  const stage = useHabbit((s) => s.photoStage);
  const [copiedReport, setCopiedReport] = useState('');
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState(false);
  if (stage)
    return (
      <View
        accessibilityLiveRegion="polite"
        style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
      >
        <Spinner size="sm" />
        <Text style={{ color: colors.foreground, fontFamily: bodyFont, fontSize: 13 }}>
          {stage === 'capture'
            ? 'Taking photo…'
            : stage === 'upload'
              ? 'Uploading and sending…'
              : 'Sending to Telegram…'}
        </Text>
      </View>
    );
  if (!diagnostic) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12, gap: 8 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <AlertCircle color={colors.accent} size={18} strokeWidth={1.8} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
            {photoStageLabels[diagnostic.stage]}{' '}
            {diagnostic.delivery === 'unknown'
              ? 'unconfirmed'
              : diagnostic.delivery === 'sent'
                ? 'sent · confirmation failed'
                : 'failed'}
          </Text>
          <Text style={{ color: colors.muted, fontFamily: bodyFont, fontSize: 13, lineHeight: 20 }}>
            {diagnostic.message}
          </Text>
        </View>
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          accessibilityLabel="Dismiss photo report"
          onPress={() => {
            if (useHabbit.getState().error === diagnostic.message)
              useHabbit.setState({ error: null });
            void save({ photoDiagnostic: null });
          }}
        >
          <X color={colors.muted} size={16} strokeWidth={1.8} />
        </Button>
      </View>
      <Button
        size="sm"
        variant="ghost"
        isDisabled={copying}
        onPress={() => {
          setCopying(true);
          setCopyError(false);
          void Clipboard.setStringAsync(photoReport(diagnostic))
            .then(() => {
              setCopiedReport(diagnostic.recordedAt);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            })
            .catch(() => {
              setCopyError(true);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            })
            .finally(() => setCopying(false));
        }}
      >
        <Copy color={colors.accent} size={15} strokeWidth={1.8} />
        <Button.Label style={{ color: colors.accent }} numberOfLines={1}>
          {copying
            ? 'Copying…'
            : copiedReport === diagnostic.recordedAt
              ? 'Report copied'
              : 'Copy safe report'}
        </Button.Label>
      </Button>
      {copyError && (
        <Text style={{ color: colors.foreground, fontSize: 13 }}>Could not copy. Try again.</Text>
      )}
    </View>
  );
}
