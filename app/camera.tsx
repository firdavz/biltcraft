import { useRef, useState, useEffect } from 'react';
import { View, Text, Platform, Image, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Camera, RefreshCw, X, Square } from 'lucide-react-native';
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
  const [microphone, requestMicrophone] = useMicrophonePermissions();
  const [mode, setMode] = useState<'picture' | 'video'>('picture');
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [proof, setProof] = useState<{ uri: string; type: 'photo' | 'video' } | null>(null);
  const busy = useHabbit((s) => s.busy);
  const started = useHabbit((s) => s.started);
  const days = useHabbit((s) => s.days);
  const day = currentDay(days);
  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => setSeconds((s) => Math.min(10, s + 1)), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    if (recording && day?.status !== 'PROOF_WINDOW') camera.current?.stopRecording();
  }, [recording, day?.status]);
  useEffect(
    () => () => {
      camera.current?.stopRecording();
    },
    [],
  );
  async function capture() {
    if (!ready || capturing) return;
    if (recording) {
      camera.current?.stopRecording();
      return;
    }
    try {
      if (mode === 'picture') {
        setCapturing(true);
        const photo = await camera.current?.takePictureAsync({ quality: 0.5 });
        if (photo) setProof({ uri: photo.uri, type: 'photo' });
      } else {
        if (!microphone?.granted && !(await requestMicrophone()).granted)
          throw new Error('Allow microphone access to record your video proof.');
        setRecording(true);
        setSeconds(0);
        const video = await camera.current?.recordAsync({ maxDuration: 10 });
        if (video?.uri) setProof({ uri: video.uri, type: 'video' });
      }
    } catch (e) {
      reportError(e);
    } finally {
      setRecording(false);
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
            Use your camera to capture a photo or a video. No gallery. No old excuses.
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
          {proof.type === 'photo' ? (
            <Image
              source={{ uri: proof.uri }}
              resizeMode="contain"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <View style={styles.center}>
              <Camera size={40} color={colors.accent} />
              <Text style={styles.title}>Video captured.</Text>
              <Text style={styles.copy}>Your {seconds}-second proof is ready to send.</Text>
            </View>
          )}
        </View>
      ) : (
        <CameraView
          ref={camera}
          style={{ flex: 1 }}
          facing={facing}
          mode={mode}
          videoQuality="480p"
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
          isDisabled={recording || busy}
          onPress={() => goBackOrReplace('/')}
          accessibilityLabel="Close camera"
        >
          <X size={20} color={colors.foreground} />
        </Button>
        <SectionLabel>{recording ? `Recording · ${seconds} / 10 s` : 'Today’s proof'}</SectionLabel>
        {!proof && (
          <Button
            isIconOnly
            variant="secondary"
            isDisabled={recording}
            accessibilityLabel="Switch camera"
            onPress={() => {
              setReady(false);
              setFacing((f) => (f === 'back' ? 'front' : 'back'));
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
                  await sendProof(proof.uri, proof.type);
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
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {(['picture', 'video'] as const).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={mode === m ? 'secondary' : 'ghost'}
                  isDisabled={recording || capturing || (Platform.OS === 'web' && m === 'video')}
                  onPress={() => {
                    setReady(false);
                    setMode(m);
                    void Haptics.selectionAsync();
                  }}
                >
                  <Button.Label>{m === 'picture' ? 'Photo' : 'Video · 10 s'}</Button.Label>
                </Button>
              ))}
            </View>
            {Platform.OS === 'web' && (
              <Text style={styles.copy}>Video recording is available on iPhone and Android.</Text>
            )}
            <ActionButton
              busy={capturing}
              disabled={!ready}
              onPress={() => {
                void capture();
              }}
              icon={
                recording ? (
                  <Square color={colors.accent} size={20} />
                ) : (
                  <Camera color={colors.accent} size={20} />
                )
              }
            >
              {recording ? 'Stop recording' : mode === 'picture' ? 'Take photo' : 'Record proof'}
            </ActionButton>
          </>
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
