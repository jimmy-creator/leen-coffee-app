import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isSaudiMobile, toE164 } from '@leen/lib';
import { supabase } from '../lib/supabase';
import { BackButton, OutlineButton, PrimaryButton, T } from '../components/primitives';
import { colors, border, font } from '../lib/theme';
import { onSurface } from '@leen/ui/palette';

/**
 * Phone entry. Leen signs in with an SMS one-time code — no password, which is
 * what Saudi customers expect and what removes a whole class of support load.
 *
 * The +966 prefix is fixed rather than a country picker: this is a Saudi-only
 * product, and a picker would only ever be a way to get it wrong.
 */
export default function Auth() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const e164 = toE164(phone);
  const canSend = isSaudiMobile(phone);

  async function sendCode() {
    if (!e164) {
      setError(t('auth.invalidPhone'));
      return;
    }
    setSending(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOtp({ phone: e164 });
    setSending(false);

    if (authError) {
      setError(t('auth.sendFailed'));
      return;
    }
    router.push({ pathname: '/otp', params: { phone: e164 } });
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 34 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={() => router.back()} />

        <View style={{ gap: 9 }}>
          <T variant="h1">{t('auth.title')}</T>
          <T variant="body" color={colors.ink2}>
            {t('auth.subtitle')}
          </T>
        </View>

        <View style={{ gap: 9 }}>
          <T variant="caption" color={colors.ink2} style={{ fontFamily: font.semibold }}>
            {t('auth.phoneLabel')}
          </T>
          <View style={styles.phoneRow}>
            <View style={styles.prefix}>
              <T variant="bodyLg">🇸🇦</T>
              {/* The dial code must not be reordered by an RTL layout. */}
              <T variant="label" style={{ writingDirection: 'ltr' }}>
                +966
              </T>
            </View>
            <TextInput
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                setError(null);
              }}
              placeholder={t('auth.phonePlaceholder')}
              placeholderTextColor={colors.ink3}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={12}
              style={styles.input}
            />
          </View>
          {error ? (
            <T variant="caption" color={colors.danger}>
              {error}
            </T>
          ) : null}
        </View>

        <PrimaryButton
          label={t('auth.sendCode')}
          onPress={() => void sendCode()}
          disabled={!canSend}
          loading={sending}
          style={{ height: 56 }}
        />

        <View style={styles.divider}>
          <View style={styles.line} />
          <T variant="caption" color={colors.ink3}>
            {t('common.or')}
          </T>
          <View style={styles.line} />
        </View>

        {/*
          Apple sign-in and Nafath are in the design and will be wired up before
          launch: Apple is a store requirement once any third-party sign-in
          ships, and Nafath is the Saudi national identity provider. Both need
          credentials the client has to issue, so they are disabled rather than
          faked into signing the customer in as somebody.
        */}
        <View style={{ gap: 10, opacity: 0.45 }}>
          <OutlineButton label={t('auth.continueApple')} />
          <OutlineButton label={t('auth.continueNafath')} />
        </View>

        <T variant="caption" color={colors.ink3} style={{ marginTop: 'auto', lineHeight: 20 }}>
          {t('auth.legal')}
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  phoneRow: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  prefix: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: border.soft,
    borderRadius: 14,
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: border.soft,
    borderRadius: 14,
    fontFamily: font.medium,
    fontSize: 16,
    color: colors.ink,
    // Phone numbers read left-to-right in Arabic too.
    writingDirection: 'ltr',
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: onSurface(0.1) },
});
