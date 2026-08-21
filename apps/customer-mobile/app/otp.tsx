import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { BackButton, T } from '../components/primitives';
import { useFormat } from '../lib/format';
import { colors, border, font } from '../lib/theme';

/** Supabase phone OTP is six digits; the design's four-cell mock predates that. */
const CODE_LENGTH = 6;
const RESEND_SECONDS = 45;

/**
 * One-time code entry.
 *
 * The visible cells are decoration over a single hidden TextInput. Six separate
 * inputs with focus-juggling is the usual approach and it fights every platform
 * feature that matters here — SMS autofill, paste, and the backspace-into-the-
 * previous-cell behaviour all work for free with one field.
 */
export default function Otp() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const focus = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(focus);
  }, []);

  async function verify(fullCode: string) {
    if (!phone) return;
    setVerifying(true);
    setError(null);

    const { error: authError } = await supabase.auth.verifyOtp({
      phone,
      token: fullCode,
      type: 'sms',
    });

    setVerifying(false);
    if (authError) {
      setError(t('auth.invalidOtp'));
      setCode('');
      return;
    }
    // Replace rather than push: the customer must not be able to swipe back
    // into a code screen for a session that is already established.
    router.replace('/(tabs)');
  }

  function onChange(next: string) {
    const digits = next.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) void verify(digits);
  }

  async function resend() {
    if (!phone || secondsLeft > 0) return;
    setSecondsLeft(RESEND_SECONDS);
    await supabase.auth.signInWithOtp({ phone });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 34 }]}>
      <BackButton onPress={() => router.back()} />

      <View style={{ gap: 9 }}>
        <T variant="h1">{t('auth.otpTitle')}</T>
        <T variant="body" color={colors.ink2} style={{ writingDirection: 'ltr' }}>
          {phone}
        </T>
      </View>

      <Pressable onPress={() => inputRef.current?.focus()} style={styles.cells}>
        {Array.from({ length: CODE_LENGTH }).map((_, i) => {
          const digit = code[i];
          return (
            <View
              key={i}
              style={[
                styles.cell,
                { borderColor: digit ? colors.brand : border.soft },
                // Mark where the next digit will land.
                i === code.length && !verifying ? styles.cellFocused : null,
              ]}
            >
              <T variant="h2">{digit ? f.num(Number(digit)) : ''}</T>
            </View>
          );
        })}
      </Pressable>

      {/* Off-screen but focusable: this is the field the keyboard and SMS
          autofill actually talk to. */}
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={CODE_LENGTH}
        editable={!verifying}
        style={styles.hiddenInput}
      />

      {error ? (
        <T variant="caption" color={colors.danger}>
          {error}
        </T>
      ) : null}

      <Pressable onPress={() => void resend()} disabled={secondsLeft > 0} hitSlop={8}>
        <T variant="caption" color={secondsLeft > 0 ? colors.ink3 : colors.brandMid}>
          {secondsLeft > 0 ? t('auth.resendIn', { seconds: f.num(secondsLeft) }) : t('auth.resend')}
        </T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, gap: 26 },
  // The cells always run left-to-right: a code is a sequence of digits, and
  // mirroring it in Arabic would put the first digit typed on the right.
  cells: { flexDirection: 'row', gap: 10, direction: 'ltr' },
  cell: {
    flex: 1,
    height: 64,
    borderRadius: 15,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFocused: { borderColor: colors.accent },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
});
