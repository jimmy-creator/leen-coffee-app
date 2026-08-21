import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supportedLocales, localeNames, isRtl, type Locale } from '@leen/i18n';
import { setAppLanguage } from '../lib/i18n';
import { colors, border, font } from '../lib/theme';
import { onSurface, brandTint } from '@leen/ui/palette';
import { CheckIcon } from '../components/icons';
import { BackButton, Card, T } from '../components/primitives';

/**
 * Language picker.
 *
 * A full screen rather than the two-button segment this replaced: nine
 * languages do not fit in a segmented control, and several are in scripts a
 * reader of the others cannot parse. Each is listed under its own endonym for
 * exactly that reason — "Malayalam" is no use to someone who only reads
 * മലയാളം.
 */
export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const current = i18n.language as Locale;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => router.back()} />
        <T variant="h3" style={{ fontSize: 18 }}>
          {t('common.language')}
        </T>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {supportedLocales.map((locale, i) => {
            const active = current === locale;
            return (
              <Pressable
                key={locale}
                onPress={() => {
                  // Switching reloads the app so the layout direction can
                  // change, so there is nothing to navigate back to.
                  void setAppLanguage(locale);
                }}
                style={({ pressed }) => [
                  styles.row,
                  i === supportedLocales.length - 1 && { borderBottomWidth: 0 },
                  active && { backgroundColor: brandTint(0.04) },
                  pressed && { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  {/* The endonym renders in its own script and direction; the
                      row itself keeps the app's current direction so the list
                      does not jump around as you scan it. */}
                  <T
                    variant="bodyLg"
                    style={{
                      fontFamily: active ? font.semibold : font.medium,
                      fontSize: 16,
                      writingDirection: isRtl(locale) ? 'rtl' : 'ltr',
                    }}
                  >
                    {localeNames[locale]}
                  </T>
                </View>

                {active ? (
                  <View style={styles.check}>
                    <CheckIcon size={14} color={colors.surface} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </Card>

        <T variant="caption" color={colors.ink3} style={{ paddingHorizontal: 4 }}>
          {t('common.languageNote')}
        </T>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: onSurface(0.06),
  },
  list: { padding: 20, gap: 12 },
  row: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: border.hair,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
