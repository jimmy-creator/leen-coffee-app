import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isSaudiMobile, toE164 } from '@leen/lib';
import { supabase } from '../lib/supabase';
import { colors, border, font } from '../lib/theme';
import { onBrand } from '@leen/ui/palette';
import { PrimaryButton, T } from '../components/primitives';

/**
 * Merchant sign-in. Same SMS one-time code as the customer app, on purpose:
 * a roastery owner is a person with a Saudi mobile, not a separate credential
 * system to maintain.
 */
export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const e164 = toE164(phone);
    if (!e164) {
      setError('Enter a Saudi mobile number starting with 5.');
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
    setError(null);
  }

  async function verify() {
    const e164 = toE164(phone);
    if (!e164) return;
    setBusy(true);
    const { error: authError } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code,
      type: 'sms',
    });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + 80 }]}>
        <View style={{ gap: 8 }}>
          <T variant="kicker" color={colors.accent}>
            LEEN · RIDER
          </T>
          <T variant="h1" color={colors.bg}>
            Your deliveries
          </T>
          <T variant="body" color={onBrand(0.68)}>
            Sign in with the mobile number on your rider account.
          </T>
        </View>

        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="5X XXX XXXX"
          placeholderTextColor={onBrand(0.4)}
          keyboardType="phone-pad"
          editable={!sent}
          style={styles.input}
        />

        {sent ? (
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Six-digit code"
            placeholderTextColor={onBrand(0.4)}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            style={styles.input}
          />
        ) : null}

        {error ? (
          <T variant="caption" color={colors.danger}>
            {error}
          </T>
        ) : null}

        <PrimaryButton
          label={sent ? 'Verify' : 'Send the code'}
          tone="light"
          loading={busy}
          disabled={sent ? code.length < 6 : !isSaudiMobile(phone)}
          onPress={() => void (sent ? verify() : send())}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandMid },
  content: { flex: 1, paddingHorizontal: 24, gap: 20 },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: onBrand(0.2),
    color: colors.bg,
    fontFamily: font.medium,
    fontSize: 16,
    writingDirection: 'ltr',
  },
});
