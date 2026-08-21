import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchLoyalty, redeemReward } from '../lib/queries';
import { useSession } from '../lib/session';
import { useFormat } from '../lib/format';
import { colors, border, font } from '../lib/theme';
import { onBrand, accentTint } from '@leen/ui/palette';
import { StarIcon } from '../components/icons';
import { BackButton, Card, EmptyState, Num, PrimaryButton, T } from '../components/primitives';

type Data = Awaited<ReturnType<typeof fetchLoyalty>>;

/** Lifetime-point thresholds, matching `private.tier_for` in the database. */
const TIER_THRESHOLDS = [
  { tier: 'qahwa_silver', at: 500 },
  { tier: 'qahwa_gold', at: 2000 },
  { tier: 'qahwa_black', at: 10000 },
] as const;

export default function Loyalty() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { userId } = useSession();

  const [data, setData] = useState<Data | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchLoyalty());
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    if (userId) void load();
  }, [userId, load]);

  async function redeem(rewardId: number) {
    setBusyId(rewardId);
    try {
      await redeemReward(rewardId);
      await load();
    } catch {
      // The RPC refuses when the balance is short; the reward simply stays put.
    }
    setBusyId(null);
  }

  const points = data?.account?.points ?? 0;
  const lifetime = data?.account?.lifetime_points ?? 0;
  const tier = data?.account?.tier ?? 'qahwa_bronze';

  const nextTier = TIER_THRESHOLDS.find((x) => lifetime < x.at);
  // Fraction of the way to the next tier — the ring on the header.
  const progress = nextTier ? Math.min(1, lifetime / nextTier.at) : 1;

  if (!userId) {
    return (
      <View style={styles.root}>
        <EmptyState
          icon={<StarIcon size={26} color={colors.accent} />}
          title={t('profile.guest')}
          body={t('profile.guestBody')}
          action={<PrimaryButton label={t('auth.signIn')} onPress={() => router.push('/auth')} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <BackButton tone="dark" onPress={() => router.back()} />
            <T variant="title" color={colors.bg}>
              {t('loyalty.title')}
            </T>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            {/*
              Progress ring. React Native has no conic gradient, so the ring is
              a track with an arc drawn over it by rotating a half-circle — the
              standard trick, and it costs nothing at this size.
            */}
            <View style={styles.ringTrack}>
              <View
                style={[styles.ringFill, { transform: [{ rotate: `${progress * 360}deg` }] }]}
              />
              <View style={styles.ringInner}>
                <Num variant="h3" color={colors.bg} style={{ fontSize: 19 }}>
                  {f.num(points)}
                </Num>
                <T variant="micro" color={onBrand(0.6)} style={{ fontSize: 9.5 }}>
                  {t('loyalty.points')}
                </T>
              </View>
            </View>

            <View style={{ gap: 6, flex: 1 }}>
              <T variant="kicker" color={colors.accent}>
                {t('loyalty.tier')}
              </T>
              <T variant="h3" color={colors.bg} style={{ fontSize: 19 }}>
                {t(`loyalty.tiers.${tier}`)}
              </T>
              <T variant="caption" color={onBrand(0.7)}>
                {nextTier
                  ? t('loyalty.toNextTier', { count: nextTier.at - lifetime })
                  : t('loyalty.topTier')}
              </T>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <T variant="title" style={{ fontSize: 15 }}>
            {t('loyalty.redeem')}
          </T>

          {(data?.rewards ?? []).map((reward) => {
            const affordable = points >= reward.points_cost;
            return (
              <Card key={reward.id} style={styles.rewardRow}>
                <View style={styles.rewardIcon}>
                  <StarIcon size={16} color={colors.accent} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <T variant="label">{f.pick(reward.name_en, reward.name_ar)}</T>
                  <T variant="caption" color={colors.ink2}>
                    {t('loyalty.pointsCost', { count: reward.points_cost })}
                  </T>
                </View>
                <Pressable
                  disabled={!affordable || busyId === reward.id}
                  onPress={() => void redeem(reward.id)}
                  style={[
                    styles.redeemButton,
                    affordable
                      ? { backgroundColor: colors.brand }
                      : { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  <T
                    variant="micro"
                    color={affordable ? colors.bg : colors.ink4}
                    style={{ fontSize: 12.5 }}
                  >
                    {affordable ? t('loyalty.redeem') : t('loyalty.locked')}
                  </T>
                </Pressable>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
    paddingBottom: 26,
    gap: 20,
  },
  ringTrack: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: onBrand(0.14),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringFill: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 6,
    borderColor: colors.accent,
    // Only the leading half of the ring is painted; rotating it sweeps the arc.
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringInner: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  body: { padding: 20, gap: 14 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: 16 },
  rewardIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: accentTint(0.14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemButton: {
    height: 36,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
