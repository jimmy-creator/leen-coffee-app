import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageSlot } from '../components/cards';
import { OutlineButton, PrimaryButton, T } from '../components/primitives';
import { colors, font } from '../lib/theme';
import { SEEN_ONBOARDING_KEY } from './index';

/**
 * Onboarding. Full-bleed roastery photograph, an espresso scrim so the type
 * stays legible over whatever image the marketing team drops in, and the two
 * ways into the app: create an account, or browse as a guest.
 */
export default function Welcome() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
          the bottom so the buttons sit on solid espresso. */}
      <View style={styles.scrim} pointerEvents="none" />

      <View style={[styles.content, { paddingBottom: insets.bottom + 46 }]}>
        <View style={{ gap: 14 }}>
          <T variant="kicker" color={colors.caramel} style={{ letterSpacing: 3.7 }}>
            LEEN · لين
          </T>
          <T variant="display" color={colors.bg}>
            {t('onboarding.title')}
          </T>
          <T variant="bodyLg" color="rgba(248,244,238,0.72)" style={{ maxWidth: 300 }}>
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
            tone="cream"
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
  root: { flex: 1, backgroundColor: colors.espresso },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(59,36,24,0.62)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 26,
    gap: 26,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(248,244,238,0.3)',
  },
  dotActive: { width: 26, backgroundColor: colors.caramel },
});
