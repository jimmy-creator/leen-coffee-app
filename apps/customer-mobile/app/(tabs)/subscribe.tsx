import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SubscriptionFrequency } from '@leen/types';
import { fetchMySubscriptions, fetchSubscriptionPlans } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { useFormat } from '../../lib/format';
import { colors, border, font } from '../../lib/theme';
import { Card, Num, PrimaryButton, SelectTile, Skeleton, T } from '../../components/primitives';

type Plan = Awaited<ReturnType<typeof fetchSubscriptionPlans>>[number];
type MySubscription = Awaited<ReturnType<typeof fetchMySubscriptions>>[number];

const FREQUENCIES: SubscriptionFrequency[] = ['weekly', 'biweekly', 'monthly'];

/** Days until the first delivery, by cadence. */
const FIRST_DELIVERY_DAYS: Record<SubscriptionFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

export default function Subscribe() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { userId } = useSession();

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [mine, setMine] = useState<MySubscription[]>([]);
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('biweekly');
  const [busyPlanId, setBusyPlanId] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setPlans(await fetchSubscriptionPlans());
      } catch {
        setPlans([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) {
      setMine([]);
      return;
    }
    void fetchMySubscriptions()
      .then(setMine)
      .catch(() => setMine([]));
  }, [userId]);

  async function subscribe(plan: Plan) {
    if (!userId) {
      router.push('/auth');
      return;
    }
    setBusyPlanId(plan.id);

    const first = new Date();
    first.setDate(first.getDate() + FIRST_DELIVERY_DAYS[frequency]);

    const { error } = await supabase.from('subscriptions').insert({
      customer_id: userId,
      plan_id: plan.id,
      frequency,
      next_delivery_on: first.toISOString().slice(0, 10),
    });

    setBusyPlanId(null);
    if (!error) setMine(await fetchMySubscriptions());
  }

  async function togglePause(sub: MySubscription) {
    const next = sub.status === 'active' ? 'paused' : 'active';
    await supabase.from('subscriptions').update({ status: next }).eq('id', sub.id);
    setMine(await fetchMySubscriptions());
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <T variant="kicker" color="rgba(248,244,238,0.6)">
            {t('subscriptions.kicker')}
          </T>
          <T variant="h2" color={colors.bg} style={{ maxWidth: 280 }}>
            {t('subscriptions.title')}
          </T>
          <T variant="body" color="rgba(248,244,238,0.72)" style={{ maxWidth: 290 }}>
            {t('subscriptions.subtitle')}
          </T>
        </View>

        <View style={styles.body}>
          {mine.length > 0 ? (
            <View style={{ gap: 11 }}>
              <T variant="caption" color={colors.ink2} style={{ fontFamily: font.semibold }}>
                {t('subscriptions.mine')}
              </T>
              {mine.map((sub) => (
                <Card key={sub.id} style={styles.mineCard}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <T variant="label">
                      {f.pick(sub.subscription_plans?.name_en, sub.subscription_plans?.name_ar)}
                    </T>
                    <T variant="caption" color={colors.ink2}>
                      {sub.next_delivery_on
                        ? t('subscriptions.nextDelivery', {
                            date: f.date(new Date(sub.next_delivery_on)),
                          })
                        : t(`subscriptions.freq.${sub.frequency}`)}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View
                      style={[
                        styles.statusPill,
                        sub.status === 'active'
                          ? { backgroundColor: 'rgba(46,125,91,0.12)' }
                          : { backgroundColor: colors.surfaceAlt },
                      ]}
                    >
                      <T
                        variant="micro"
                        color={sub.status === 'active' ? colors.green : colors.ink3}
                      >
                        {t(`subscriptions.${sub.status === 'active' ? 'active' : 'paused'}`)}
                      </T>
                    </View>
                    <T
                      variant="micro"
                      color={colors.brown}
                      onPress={() => void togglePause(sub)}
                      style={{ fontFamily: font.semibold }}
                    >
                      {t(`subscriptions.${sub.status === 'active' ? 'pause' : 'resume'}`)}
                    </T>
                  </View>
                </Card>
              ))}
            </View>
          ) : null}

          <View style={{ gap: 11 }}>
            <T variant="caption" color={colors.ink2} style={{ fontFamily: font.semibold }}>
              {t('subscriptions.frequency')}
            </T>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              {FREQUENCIES.map((freq) => (
                <SelectTile
                  key={freq}
                  label={t(`subscriptions.freq.${freq}`)}
                  active={frequency === freq}
                  onPress={() => setFrequency(freq)}
                  style={{ flex: 1 }}
                />
              ))}
            </View>
          </View>

          {plans === null ? (
            <View style={{ gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} style={{ height: 168, borderRadius: 18 }} />
              ))}
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {plans.map((plan, index) => {
                // The middle plan is the one the design highlights as the
                // recommendation; it also gets the forest-green CTA.
                const featured = index === 1;
                const perks = f.isArabic && plan.perks_ar?.length ? plan.perks_ar : plan.perks_en;

                return (
                  <Card key={plan.id} style={{ gap: 12, padding: 17 }}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, gap: 5 }}>
                        <T variant="title" style={{ fontSize: 16 }}>
                          {f.pick(plan.name_en, plan.name_ar)}
                        </T>
                        <T variant="caption" color={colors.ink2}>
                          {f.pick(plan.description_en, plan.description_ar)}
                        </T>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Num variant="h3" style={{ fontSize: 18 }}>
                          {f.money(plan.price_minor)}
                        </Num>
                        <T variant="micro" color={colors.ink3}>
                          {t('subscriptions.perDelivery')}
                        </T>
                      </View>
                    </View>

                    <View style={styles.perks}>
                      {(perks ?? []).map((perk) => (
                        <View key={perk} style={styles.perk}>
                          <T variant="micro" color={colors.brown} style={{ fontSize: 11 }}>
                            {perk}
                          </T>
                        </View>
                      ))}
                    </View>

                    <PrimaryButton
                      label={
                        featured ? t('subscriptions.mostPopular') : t('subscriptions.subscribe')
                      }
                      loading={busyPlanId === plan.id}
                      onPress={() => void subscribe(plan)}
                      style={[
                        { height: 46 },
                        featured
                          ? { backgroundColor: colors.forest }
                          : { backgroundColor: colors.surfaceSoft },
                      ]}
                      tone={featured ? 'espresso' : 'cream'}
                    />
                  </Card>
                );
              })}
            </View>
          )}

          <View style={styles.note}>
            <T variant="caption" color={colors.brown}>
              {t('subscriptions.note')}
            </T>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.forest,
    gap: 9,
  },
  body: { padding: 20, gap: 22 },
  mineCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusPill: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 },
  perks: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  perk: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
  },
  note: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(197,139,85,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(197,139,85,0.25)',
  },
});
