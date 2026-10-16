import { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Camera, RefreshCw, X } from 'lucide-react-native';
import { Button } from 'heroui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBackOrReplace } from '@/lib/navigation';
import { colors, headingFont } from '@/lib/habbit-theme';
import { action, sendProof, reportError } from '@/lib/habbit-engine';
import { currentDay, useHabbit } from '@/lib/habbit-store';
import { Screen, ActionButton, ErrorNotice, SectionLabel } from '@/components/HabbitUI';
import * as Haptics from 'expo-haptics';

export default function ProofCamera() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [proof, setProof] = useState<{ uri: string } | null>(null);
  const busy = useHabbit((s) => s.busy);
  const started = useHabbit((s) => s.started);
  const days = useHabbit((s) => s.days);
  const day = currentDay(days);

  async function capture() {
    if (!ready || capturing) return;
    setCapturing(true);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.5, imageType: 'jpg' });
      if (photo) setProof({ uri: photo.uri });
    } catch (e) {
      reportError(e);
    } finally {
      setCapturing(false);
    }
  }

  if (!started || day?.status !== 'PROOF_WINDOW')
    return (
      <Screen>
        <View style={styles.center}>
          <Camera color={colors.accent} size={36} />
          <Text style={styles.title}>No proof due.</Text>
          <ActionButton onPress={() => goBackOrReplace('/')}>Back to today</ActionButton>
        </View>
      </Screen>
    );
  if (!permission?.granted)
    return (
      <Screen>
        <View style={styles.center}>
          <Camera color={colors.accent} size={40} />
          <Text style={styles.title}>Show up. Show proof.</Text>
          <Text style={styles.copy}>
            Use your camera to take a photo. No gallery. No old excuses.
          </Text>
          <ActionButton
            onPress={() => {
              void requestPermission().then((p) => {
                if (!p.granted)
                  reportError(
                    new Error(
                      'Camera access is off. Allow it in your device settings, then try again.',
                    ),
                  );
              });
            }}
          >
            Allow camera
          </ActionButton>
          <Button variant="ghost" onPress={() => goBackOrReplace('/')}>
            <Button.Label>Not now</Button.Label>
          </Button>
          <ErrorNotice />
        </View>
      </Screen>
    );
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {proof ? (
        <View style={styles.preview}>
          <Image
            source={{ uri: proof.uri }}
            resizeMode="contain"
            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
          />
        </View>
      ) : (
        <CameraView
          ref={camera}
          style={{ flex: 1 }}
          facing={facing}
          mode="picture"
          onCameraReady={() => setReady(true)}
          onMountError={() =>
            reportError(
              new Error('Your camera could not open. Check its permission and try again.'),
            )
          }
        />
      )}
      <View style={[styles.top, { top: insets.top + 12 }]}>
        <Button
          isIconOnly
          variant="secondary"
          isDisabled={capturing || busy}
          onPress={() => goBackOrReplace('/')}
          accessibilityLabel="Close camera"
        >
          <X size={20} color={colors.foreground} />
        </Button>
        <SectionLabel>Today’s proof</SectionLabel>
        {!proof && (
          <Button
            isIconOnly
            variant="secondary"
            isDisabled={capturing}
            accessibilityLabel="Switch camera"
            onPress={() => {
              setReady(false);
              setFacing((f) => (f === 'back' ? 'front' : 'back'));
              void Haptics.selectionAsync();
            }}
          >
            <RefreshCw size={20} color={colors.foreground} />
          </Button>
        )}
      </View>
      <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
        <ErrorNotice />
        {proof ? (
          <>
            <ActionButton
              busy={busy}
              onPress={() => {
                void action(async () => {
                  await sendProof(proof.uri);
                  router.replace('/');
                });
              }}
            >
              Send to witnesses
            </ActionButton>
            <Button
              variant="ghost"
              isDisabled={busy}
              onPress={() => {
                setProof(null);
                setReady(false);
              }}
            >
              <Button.Label>Retake</Button.Label>
            </Button>
          </>
        ) : (
          <ActionButton
            busy={capturing}
            disabled={!ready}
            onPress={() => {
              void capture();
            }}
            icon={<Camera color={colors.accent} size={20} />}
          >
            Take photo
          </ActionButton>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24, padding: 24 },
  title: { color: colors.foreground, fontFamily: headingFont, fontSize: 28, textAlign: 'center' },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  preview: { flex: 1 },
  top: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controls: { padding: 16, backgroundColor: colors.background, gap: 12 },
});
