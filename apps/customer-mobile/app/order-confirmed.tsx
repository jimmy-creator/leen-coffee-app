import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';
import { CheckIcon } from '../components/icons';
import { OutlineButton, PrimaryButton, T } from '../components/primitives';

/**
 * Order confirmation.
 *
 * Reached with `replace`, and the root layout disables the swipe gesture on it:
 * a customer must not be able to swipe back into checkout and place the same
 * order twice.
 */
export default function OrderConfirmed() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
      <StatusBar style="light" />

      <View style={styles.checkOuter}>
        <View style={styles.checkInner}>
          <CheckIcon />
        </View>
      </View>

      <T variant="h2" color={colors.bg}>
        {t('orderDone.title')}
      </T>

      <T
        variant="body"
        color="rgba(248,244,238,0.7)"
        style={{ textAlign: 'center', maxWidth: 260, lineHeight: 24 }}
      >
        {/* The design names the roastery here. With a multi-roastery basket
            there is no single one to name, so the copy stays general and the
            per-roastery detail lives on the tracking screen. */}
        {t('orderDone.subtitle', { merchant: t('common.appName') })}
      </T>

      {code ? (
        <T variant="kicker" color={colors.caramel}>
          {t('tracking.orderNo', { code })}
        </T>
      ) : null}

      <View style={{ gap: 11, alignSelf: 'stretch', marginTop: 8 }}>
        <PrimaryButton
          label={t('orderDone.trackOrder')}
          tone="cream"
          onPress={() => router.replace(`/track/${code}`)}
        />
        <OutlineButton
          label={t('orderDone.keepShopping')}
          tone="light"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 34,
  },
  checkOuter: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: 'rgba(46,125,91,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInner: {
    width: 62,
    height: 62,
    borderRadius: 999,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
