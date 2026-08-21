import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMyOrders } from '../lib/queries';
import { useSession } from '../lib/session';
import { useFormat } from '../lib/format';
import { colors, font } from '../lib/theme';
import { onSurface, liveTint } from '@leen/ui/palette';
import { BagIcon } from '../components/icons';
import {
  BackButton,
  Card,
  EmptyState,
  Num,
  PrimaryButton,
  Skeleton,
  T,
} from '../components/primitives';

type Order = Awaited<ReturnType<typeof fetchMyOrders>>[number];

/** Delivered and cancelled orders are done; everything else is still moving. */
const isLive = (status: string) => status !== 'delivered' && status !== 'cancelled';

export default function Orders() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { userId } = useSession();

  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!userId) {
      setOrders([]);
      return;
    }
    void fetchMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [userId]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => router.back()} />
        <T variant="h3" style={{ fontSize: 18 }}>
          {t('orders.title')}
        </T>
      </View>

      {orders === null ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 108, borderRadius: 18 }} />
          ))}
        </View>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<BagIcon size={28} color={colors.accent} />}
          title={t('tracking.noOrders')}
          body={t('tracking.noOrdersBody')}
          action={
            <PrimaryButton
              label={t('cart.startShopping')}
              onPress={() => router.replace('/(tabs)')}
              style={{ paddingHorizontal: 26 }}
            />
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {orders.map((order) => {
            const itemCount = order.sub_orders.reduce((n, so) => n + so.order_items.length, 0);
            const roasteries = order.sub_orders
              .map((so) => f.pick(so.merchants?.name_en, so.merchants?.name_ar))
              .filter(Boolean)
              .join(' · ');

            return (
              <Pressable key={order.id} onPress={() => router.push(`/track/${order.code}`)}>
                <Card style={{ gap: 12 }}>
                  <View style={styles.cardHead}>
                    <View style={{ gap: 3, flex: 1 }}>
                      <T variant="kicker" color={colors.ink3}>
                        {order.code}
                      </T>
                      <T variant="label" numberOfLines={1}>
                        {roasteries}
                      </T>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isLive(order.status)
                          ? { backgroundColor: liveTint(0.12) }
                          : { backgroundColor: colors.surfaceAlt },
                      ]}
                    >
                      <T variant="micro" color={isLive(order.status) ? colors.live : colors.ink3}>
                        {t(`tracking.statusTitle.${order.status}`)}
                      </T>
                    </View>
                  </View>

                  <View style={styles.cardFoot}>
                    <T variant="caption" color={colors.ink2}>
                      {`${t('orders.itemCount', { count: itemCount })} · ${f.date(new Date(order.placed_at))}`}
                    </T>
                    <Num variant="title">{f.money(order.total_minor)}</Num>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
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
  scroll: { padding: 20, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusPill: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
