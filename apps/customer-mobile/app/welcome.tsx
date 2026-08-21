import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { localeNames, type Locale } from '@leen/i18n';
import { ImageSlot } from '../components/cards';
import { OutlineButton, PrimaryButton, T } from '../components/primitives';
import { colors, font } from '../lib/theme';
import { onBrand, onSurface, brandTint } from '@leen/ui/palette';
import { SEEN_ONBOARDING_KEY } from './index';

/**
 * Onboarding. Full-bleed roastery photograph, a brand-green scrim so the type
 * stays legible over whatever image the marketing team drops in, and the two
 * ways into the app: create an account, or browse as a guest.
 */
export default function Welcome() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const current = (i18n.language as Locale) in localeNames ? (i18n.language as Locale) : 'ar';

  async function go(path: '/auth' | '/(tabs)') {
    // Either choice counts as having seen onboarding — a guest should not be
    // shown this screen again on every launch.
    await AsyncStorage.setItem(SEEN_ONBOARDING_KEY, '1');
    router.replace(path);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={StyleSheet.absoluteFill}>
        <ImageSlot />
      </View>
      {/* Three-stop scrim: light at the top so the photograph reads, opaque at
          the bottom so the buttons sit on solid brand green. */}
      <View style={styles.scrim} pointerEvents="none" />

      {/*
        Language switch, before anything else on screen. Arabic is the default,
        and without this the first thing a non-Arabic reader sees is a screen
        they cannot navigate — the switch in Profile is several taps away and
        also in Arabic.
      */}
      <Pressable
        onPress={() => router.push('/language')}
        hitSlop={8}
        style={[styles.langBar, { top: insets.top + 10 }]}
      >
        <T variant="micro" color={colors.bg} style={{ fontSize: 12.5, fontFamily: font.semibold }}>
          {localeNames[current]}
        </T>
      </Pressable>

      <View style={[styles.content, { paddingBottom: insets.bottom + 46 }]}>
        <View style={{ gap: 14 }}>
          <T variant="kicker" color={colors.accent} style={{ letterSpacing: 3.7 }}>
            LEEN · لين
          </T>
          <T variant="display" color={colors.bg}>
            {t('onboarding.title')}
          </T>
          <T variant="bodyLg" color={onBrand(0.72)} style={{ maxWidth: 300 }}>
            {t('onboarding.subtitle')}
          </T>
        </View>

        {/* Page indicator. Static: onboarding is one screen, and the design uses
            the dots to signal there is more to the story, not more to swipe. */}
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <View style={{ gap: 11 }}>
          <PrimaryButton
            label={t('onboarding.getStarted')}
            tone="light"
            onPress={() => void go('/auth')}
          />
          <OutlineButton
            label={t('onboarding.browseGuest')}
            tone="light"
            onPress={() => void go('/(tabs)')}
            style={{ height: 54 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: brandTint(0.62),
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 26,
    gap: 26,
  },
  langBar: {
    position: 'absolute',
    end: 20,
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: onSurface(0.4),
  },

  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: onBrand(0.3),
  },
  dotActive: { width: 26, backgroundColor: colors.accent },
});
