import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatSar } from '@leen/lib';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import {
  advanceSubOrder,
  fetchMyMerchants,
  fetchOrderBoard,
  nextStatus,
  setOpen,
} from '../lib/orders';
import { colors, border, font } from '../lib/theme';
import { Card, EmptyState, Num, OutlineButton, PrimaryButton, T } from '../components/primitives';

type Board = Awaited<ReturnType<typeof fetchOrderBoard>>;
type Merchant = Awaited<ReturnType<typeof fetchMyMerchants>>[number];

/** How each board status should read and colour. */
const STATUS_TONE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'New', color: '#8E2F2F', bg: 'rgba(201,75,75,0.12)' },
  confirmed: { label: 'Accepted', color: '#5A3826', bg: 'rgba(197,139,85,0.16)' },
  roasting: { label: 'Roasting', color: '#5A3826', bg: 'rgba(197,139,85,0.16)' },
  ready: { label: 'Ready', color: '#1F4D3A', bg: 'rgba(46,125,91,0.14)' },
};

/** The button copy for advancing out of each status. */
const ADVANCE_LABEL: Record<string, string> = {
  pending: 'Accept order',
  confirmed: 'Start roasting',
  roasting: 'Mark ready',
};

export default function OrderBoard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, ready, signOut } = useSession();

  const [board, setBoard] = useState<Board | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (ready && !userId) router.replace('/sign-in');
  }, [ready, userId, router]);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [b, m] = await Promise.all([fetchOrderBoard(), fetchMyMerchants()]);
      setBoard(b);
      setMerchants(m);
    } catch {
      setBoard([]);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  // A new order has to appear without the merchant pulling to refresh — this
  // board is the thing that tells a roastery someone is waiting.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('merchant-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_orders' }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const shop = merchants[0];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1, gap: 3 }}>
          <T variant="kicker" color="rgba(248,244,238,0.6)">
            LEEN · MERCHANT
          </T>
          <T variant="h3" color={colors.bg}>
            {shop ? (shop.name_en ?? 'Your roastery') : 'Your roastery'}
          </T>
        </View>

        {shop ? (
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <T variant="micro" color="rgba(248,244,238,0.6)">
              {shop.is_open ? 'Open' : 'Closed'}
            </T>
            <Switch
              value={shop.is_open}
              onValueChange={(v) => {
                // Optimistic: the toggle should feel instant, and the reload
                // below puts it right if the write is refused.
                setMerchants((prev) =>
                  prev.map((m) => (m.id === shop.id ? { ...m, is_open: v } : m)),
                );
                void setOpen(shop.id, v).then(load);
              }}
              trackColor={{ true: colors.green, false: 'rgba(248,244,238,0.25)' }}
            />
          </View>
        ) : null}
      </View>

      {board === null ? null : board.length === 0 ? (
        <EmptyState
          icon={<View style={styles.emptyMark} />}
          title="No orders waiting"
          body="New orders land here the moment a customer checks out."
          action={<OutlineButton label="Sign out" tone="danger" onPress={() => void signOut()} />}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load().then(() => setRefreshing(false));
              }}
            />
          }
        >
          {board.map((sub) => {
            const tone = STATUS_TONE[sub.status] ?? STATUS_TONE.pending!;
            const next = nextStatus(sub.status);
            return (
              <Card key={sub.id} style={{ gap: 12 }}>
                <View style={styles.cardHead}>
                  <View style={{ gap: 3, flex: 1 }}>
                    <T variant="kicker" color={colors.ink3}>
                      {sub.orders?.code ?? ''}
                    </T>
                    <T variant="caption" color={colors.ink2}>
                      {sub.orders?.fulfilment === 'pickup' ? 'Pickup' : 'Delivery'}
                    </T>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                    <T variant="micro" color={tone.color}>
                      {tone.label}
                    </T>
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  {sub.order_items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Num variant="label" color={colors.brown} style={{ minWidth: 26 }}>
                        {`${item.qty}×`}
                      </Num>
                      <View style={{ flex: 1 }}>
                        <T variant="label">{item.name_en}</T>
                        <T variant="caption" color={colors.ink2}>
                          {`${item.grind.replace('_', ' ')} · ${item.weight_g} g`}
                        </T>
                      </View>
                      <Num variant="body">{formatSar(item.line_total_minor, 'en')}</Num>
                    </View>
                  ))}
                </View>

                <View style={styles.cardFoot}>
                  <T variant="label">Subtotal</T>
                  <Num variant="title">{formatSar(sub.subtotal_minor, 'en')}</Num>
                </View>

                {next ? (
                  <PrimaryButton
                    label={ADVANCE_LABEL[sub.status] ?? 'Advance'}
                    onPress={() => void advanceSubOrder(sub.id, next).then(load)}
                    style={{ height: 48 }}
                  />
                ) : (
                  <View style={styles.waitingForRider}>
                    <T variant="caption" color={colors.forest}>
                      Waiting for a rider to collect
                    </T>
                  </View>
                )}
              </Card>
            );
          })}

          <Pressable onPress={() => void signOut()} style={{ alignSelf: 'center', padding: 12 }}>
            <T variant="caption" color={colors.red} style={{ fontFamily: font.semibold }}>
              Sign out
            </T>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.espresso,
  },
  list: { padding: 20, gap: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusPill: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: border.hair,
    paddingTop: 12,
  },
  waitingForRider: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(46,125,91,0.09)',
    alignItems: 'center',
  },
  emptyMark: {
    width: 26,
    height: 34,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(90,56,38,0.28)',
    transform: [{ rotate: '-18deg' }],
  },
});
