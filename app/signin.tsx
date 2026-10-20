import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Link } from 'expo-router';
import {
  Button,
  Input,
  InputOTP,
  Label,
  TextField,
  FieldError,
  Spinner,
  Skeleton,
  REGEXP_ONLY_DIGITS,
} from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { Screen, ui } from '@/components/HabbitUI';
import { GradientTitle } from '@/components/GradientTitle';
import { bilt } from '@/lib/bilt';
import { useAuth, realSession } from '@/lib/auth-state';
import { useAuthCopy, useLocale, setLocale, authErrorText } from '@/lib/auth-copy';
import { colors, bodyFont } from '@/lib/habbit-theme';
import { useNow } from '@/hooks/useNow';

export default function SignIn() {
  const copy = useAuthCopy();
  const locale = useLocale((s) => s.locale);
  const ready = useAuth((s) => s.ready);
  const session = useAuth((s) => s.session);
  const globalError = useAuth((s) => s.error);
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [type, setType] = useState<'email' | 'email_change'>('email');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const locked = useRef(false);
  const now = useNow();
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  function fail(value: unknown) {
    setError(authErrorText(value));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
  async function send(resend = false) {
    if (locked.current || (resend && Date.now() < resendAt)) return;
    const address = resend ? sentEmail : email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      fail(new Error(copy.invalidEmail));
      return;
    }
    locked.current = true;
    setBusy(true);
    setError(null);
    useAuth.setState({ error: null });
    try {
      let nextType: 'email' | 'email_change' = 'email';
      const current = await bilt.auth.getSession();
      if (current.error) throw current.error;
      if (resend && type === 'email_change') {
        const result = await bilt.auth.resend({ type: 'email_change', email: address });
        if (result.error) throw result.error;
        nextType = 'email_change';
      } else if (!resend && current.data.session?.user.is_anonymous) {
        const upgraded = await bilt.auth.updateUser({ email: address });
        if (upgraded.error) {
          if (
            upgraded.error.code !== 'email_exists' &&
            upgraded.error.code !== 'user_already_exists'
          )
            throw upgraded.error;
          const result = await bilt.auth.signInWithOtp({ email: address });
          if (result.error) throw result.error;
        } else nextType = 'email_change';
      } else {
        const result = await bilt.auth.signInWithOtp({ email: address });
        if (result.error) throw result.error;
      }
      setType(nextType);
      setSentEmail(address);
      setCode('');
      setResendAt(Date.now() + 60000);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (value) {
      fail(value);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function verify(token: string) {
    if (locked.current || token.length !== 6) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await bilt.auth.verifyOtp({ email: sentEmail, token, type });
      if (result.error) throw result.error;
      if (!realSession(result.data.session)) throw new Error(copy.generic);
      useAuth.setState({ session: result.data.session, error: null });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (value) {
      fail(value);
      setCode('');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <Screen>
        <Skeleton className="mt-20 h-16 w-48 rounded-lg" />
        <Skeleton className="mt-12 h-16 w-full rounded-xl" />
      </Screen>
    );
  const visibleError = error ?? globalError;
  if (realSession(session))
    return (
      <Screen>
        <View style={styles.panel}>
          <GradientTitle size={48}>{copy.brand}</GradientTitle>
          {visibleError ? (
            <>
              <Text accessibilityRole="alert" style={styles.error}>
                {copy.profileError} {visibleError}
              </Text>
              <Button
                onPress={() => {
                  setError(null);
                  useAuth.setState((state) => ({ retry: state.retry + 1, error: null }));
                }}
              >
                <Button.Label>{copy.retry}</Button.Label>
              </Button>
              <Button
                variant="ghost"
                onPress={() => {
                  void bilt.auth.signOut({ scope: 'local' }).then(({ error: value }) => {
                    if (value) fail(value);
                  });
                }}
              >
                <Button.Label>{copy.logout}</Button.Label>
              </Button>
            </>
          ) : (
            <>
              <Spinner />
              <Text style={ui.copy}>{copy.waiting}</Text>
            </>
          )}
        </View>
      </Screen>
    );
  return (
    <Screen>
      <View style={styles.language}>
        {(['en', 'ru'] as const).map((item) => (
          <Button
            key={item}
            size="sm"
            variant="ghost"
            isDisabled={busy}
            accessibilityState={{ selected: locale === item }}
            onPress={() => {
              if (locale !== item) {
                void setLocale(item).catch(fail);
                setError(null);
                void Haptics.selectionAsync();
              }
            }}
          >
            <Button.Label style={{ color: locale === item ? colors.accent : colors.muted }}>
              {item.toUpperCase()}
            </Button.Label>
          </Button>
        ))}
      </View>
      <View style={styles.panel}>
        <GradientTitle size={52}>{copy.brand}</GradientTitle>
        <Text style={[ui.copy, { marginTop: 10 }]}>{copy.tagline}</Text>
        <View style={{ marginTop: 44, gap: 18 }}>
          {sentEmail ? (
            <>
              <GradientTitle size={28}>{copy.codeTitle}</GradientTitle>
              <Text style={styles.sent}>
                {copy.codeSent}
                {'\n'}
                <Text style={{ color: colors.foreground }}>{sentEmail}</Text>
              </Text>
              <Button
                variant="ghost"
                size="sm"
                isDisabled={busy}
                style={{ alignSelf: 'flex-start' }}
                onPress={() => {
                  setSentEmail('');
                  setCode('');
                  setError(null);
                }}
              >
                <Button.Label style={{ color: colors.accent }}>{copy.changeEmail}</Button.Label>
              </Button>
              <Label>{copy.codeLabel}</Label>
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                value={code}
                isDisabled={busy}
                isInvalid={Boolean(visibleError)}
                onChange={(value) => {
                  setCode(value);
                  setError(null);
                }}
                onComplete={(value) => {
                  void verify(value);
                }}
                textInputProps={{
                  keyboardType: 'number-pad',
                  autoComplete: Platform.OS === 'android' ? 'sms-otp' : 'one-time-code',
                  textContentType: 'oneTimeCode',
                  accessibilityLabel: copy.codeLabel,
                }}
              >
                <InputOTP.Group style={{ width: '100%', gap: 6 }}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTP.Slot
                      key={index}
                      index={index}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: 52,
                        backgroundColor: colors.surface,
                        borderRadius: 10,
                      }}
                    />
                  ))}
                </InputOTP.Group>
              </InputOTP>
              {visibleError && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {visibleError}
                </Text>
              )}
              <Button
                variant="secondary"
                isDisabled={busy || code.length !== 6}
                onPress={() => {
                  void verify(code);
                }}
              >
                {busy && <Spinner size="sm" />}
                <Button.Label style={{ color: colors.accent }}>
                  {busy ? copy.waiting : copy.verify}
                </Button.Label>
              </Button>
              <Button
                variant="ghost"
                isDisabled={busy || remaining > 0}
                onPress={() => {
                  void send(true);
                }}
              >
                <Button.Label style={{ color: remaining > 0 ? colors.muted : colors.accent }}>
                  {remaining > 0 ? `${copy.resendIn} ${remaining} ${copy.seconds}` : copy.resend}
                </Button.Label>
              </Button>
            </>
          ) : (
            <>
              <TextField isInvalid={Boolean(visibleError)} isDisabled={busy}>
                <Label>{copy.email}</Label>
                <Input
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setError(null);
                  }}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={copy.emailPlaceholder}
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    void send();
                  }}
                  style={{ minHeight: 56, fontFamily: bodyFont, backgroundColor: colors.surface }}
                />
                <FieldError>{visibleError}</FieldError>
              </TextField>
              <Button
                variant="secondary"
                isDisabled={busy || !email.trim()}
                style={styles.continue}
                className="bg-continue"
                animation="disable-all"
                onPress={() => {
                  void send();
                }}
              >
                {busy && <Spinner size="sm" />}
                <Button.Label style={{ color: colors.white }}>
                  {busy ? copy.waiting : copy.continue}
                </Button.Label>
              </Button>
            </>
          )}
        </View>
      </View>
      <View style={styles.legal}>
        <Text style={styles.legalText}>
          {copy.legal}{' '}
          <Link href="/terms" style={{ color: colors.accent }}>
            {copy.terms}
          </Link>{' '}
          {copy.and}{' '}
          <Link href="/privacy" style={{ color: colors.accent }}>
            {copy.privacy}
          </Link>
          .
        </Text>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  language: { flexDirection: 'row', justifyContent: 'flex-end' },
  panel: { width: '100%', maxWidth: 440, alignSelf: 'center', marginTop: 58, marginBottom: 28 },
  continue: {
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: colors.continue,
  },
  sent: { fontFamily: bodyFont, color: colors.muted, fontSize: 14, lineHeight: 24 },
  error: { fontFamily: bodyFont, color: colors.danger, fontSize: 14, lineHeight: 22 },
  legal: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 32,
    paddingBottom: 16,
    alignSelf: 'center',
    maxWidth: 440,
  },
  legalText: {
    fontFamily: bodyFont,
    fontSize: 12,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
  },
});
