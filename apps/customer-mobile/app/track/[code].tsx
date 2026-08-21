import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OrderStatus } from '@leen/types';
import { fetchOrderTracking } from '../../lib/queries';
import { staticMapWithMarkers, type MapMarker } from '../../lib/mapbox';
import { supabase } from '../../lib/supabase';
import { useFormat } from '../../lib/format';
import { colors, border, font } from '../../lib/theme';
import { onSurface, liveTint } from '@leen/ui/palette';
import { ImageSlot } from '../../components/cards';
import { PhoneIcon, TruckIcon } from '../../components/icons';
import { BackButton, Card, Num, Skeleton, T } from '../../components/primitives';

type TrackingRow = Awaited<ReturnType<typeof fetchOrderTracking>>[number];

/** The ladder a sub-order climbs. `cancelled` is not a step — it ends the run. */
const STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'roasting',
  'ready',
  'picked_up',
  'delivered',
];

export default function Track() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { code } = useLocalSearchParams<{ code: string }>();

  const [rows, setRows] = useState<TrackingRow[] | null>(null);

  const load = useCallback(async () => {
    if (!code) return;
    try {
      setRows(await fetchOrderTracking(code));
    } catch {
      setRows([]);
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Live updates. RLS applies to realtime too, so this stream only ever carries
   * rows the customer's own policies already let them read — no filter needed
   * beyond the one that keeps unrelated traffic off the wire.
   */
  useEffect(() => {
    if (!code) return;
    const channel = supabase
      .channel(`order-${code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sub_orders' },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [code, load]);

  if (rows === null) {
    return (
      <View style={styles.root}>
        <Skeleton style={{ height: 330, borderRadius: 0 }} />
        <View style={{ padding: 20, gap: 14 }}>
          <Skeleton style={{ height: 24, width: '60%' }} />
          <Skeleton style={{ height: 160 }} />
        </View>
      </View>
    );
  }

  // A basket can span roasteries; the header follows the least-advanced one,
  // because that is when the whole order is actually finished.
  const primary = rows[0];
  const currentIndex = rows.length
    ? Math.min(...rows.map((r) => Math.max(0, STEPS.indexOf(r.sub_order_status as OrderStatus))))
    : 0;
  const currentStatus = STEPS[currentIndex] ?? 'pending';
  /**
   * Three pins, in the order they matter to someone waiting: where it is
   * coming from, where it is now, where it is going. The rider only appears
   * once one has picked the order up and reported a position.
   *
   * Brass for the roastery, brand green for the rider, live green for the
   * door — the same meanings those colours carry everywhere else in the app.
   */
  const markers: MapMarker[] = [];
  if (primary?.merchant_lat != null && primary?.merchant_lng != null) {
    markers.push({
      point: { lat: primary.merchant_lat, lng: primary.merchant_lng },
      color: 'C8A45C',
      label: 'cafe',
    });
  }
  const withRider = rows.find((r) => r.rider_lat != null && r.rider_lng != null);
  if (withRider?.rider_lat != null && withRider?.rider_lng != null) {
    markers.push({
      point: { lat: withRider.rider_lat, lng: withRider.rider_lng },
      color: '1C3819',
      label: 'car',
    });
  }
  if (primary?.dest_lat != null && primary?.dest_lng != null) {
    markers.push({
      point: { lat: primary.dest_lat, lng: primary.dest_lng },
      color: '4C9A5E',
      label: 'home',
    });
  }
  const mapUrl = staticMapWithMarkers(markers, 402 * 2, 330 * 2);

  const riderName = rows.find((r) => r.rider_name)?.rider_name ?? null;
  const riderVehicle = rows.find((r) => r.rider_vehicle)?.rider_vehicle ?? null;
  const riderRating = rows.find((r) => r.rider_rating)?.rider_rating ?? null;
  const merchantPhone = primary?.merchant_phone ?? null;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/*
          Real map when there are coordinates and a token, and the design's
          stylised street grid when there are not — a pickup order has no
          destination, and a roastery that has not set its position yet would
          otherwise frame the map on null island.
        */}
        <View style={styles.map}>
          {mapUrl ? (
            <Image
              source={{ uri: mapUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
            />
          ) : (
            <>
              <View style={styles.mapRoadV} />
              <View style={styles.mapRoadH} />
              <View style={styles.mapRoadH2} />
              <View style={styles.driverPin}>
                <TruckIcon />
              </View>
            </>
          )}

          <View style={[styles.mapTop, { top: insets.top + 8 }]}>
            <BackButton tone="floating" onPress={() => router.back()} />
            {primary?.eta_minutes ? (
              <View style={styles.etaPill}>
                <T variant="micro" color={colors.bg} style={{ fontSize: 12.5 }}>
                  {t('tracking.arrives', {
                    time: f.time(new Date(Date.now() + primary.eta_minutes * 60_000)),
                  })}
                </T>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={{ gap: 5 }}>
            <T variant="kicker" color={colors.ink3}>
              {t('tracking.orderNo', { code: code ?? '' })}
            </T>
            <T variant="h3">{t(`tracking.statusTitle.${currentStatus}`)}</T>
          </View>

          <View>
            {STEPS.map((step, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              const last = i === STEPS.length - 1;
              return (
                <View key={step} style={{ flexDirection: 'row', gap: 14 }}>
                  <View style={{ alignItems: 'center', width: 20 }}>
                    <View
                      style={[
                        styles.stepDot,
                        done && { backgroundColor: colors.live },
                        active && styles.stepDotActive,
                        !done && !active && styles.stepDotIdle,
                      ]}
                    />
                    {!last ? (
                      <View
                        style={[
                          styles.stepLine,
                          { backgroundColor: done ? colors.live : onSurface(0.12) },
                        ]}
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 18, gap: 3 }}>
                    <T variant="label" color={i <= currentIndex ? colors.ink : colors.ink3}>
                      {t(`tracking.steps.${step}`, { name: riderName ?? '' })}
                    </T>
                  </View>
                </View>
              );
            })}
          </View>

          {riderName ? (
            <Card style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <ImageSlot radius={999} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <T variant="label">{riderName}</T>
                <T variant="caption" color={colors.ink2}>
                  {[riderVehicle, riderRating ? `${f.num(Number(riderRating))} ★` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </T>
              </View>
              {merchantPhone ? (
                <Pressable
                  onPress={() => void Linking.openURL(`tel:${merchantPhone}`)}
                  style={styles.callButton}
                >
                  <PhoneIcon />
                </Pressable>
              ) : null}
            </Card>
          ) : null}

          {rows.length > 1 ? (
            <View style={{ gap: 9 }}>
              {rows.map((row, i) => (
                <Card key={`${row.order_id}-${i}`} style={styles.merchantRow}>
                  <T variant="label" style={{ flex: 1 }}>
                    {f.pick(row.merchant_name_en, row.merchant_name_ar)}
                  </T>
                  <T variant="caption" color={colors.ink2}>
                    {t(`tracking.statusTitle.${row.sub_order_status}`)}
                  </T>
                </Card>
              ))}
            </View>
          ) : null}

          {primary ? (
            <Card style={styles.merchantRow}>
              <T variant="label" style={{ flex: 1 }}>
                {t('totals.total')}
              </T>
              <Num variant="title">{f.money(primary.total_minor)}</Num>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  map: { height: 330, backgroundColor: colors.canvas, overflow: 'hidden' },
  mapRoadV: {
    position: 'absolute',
    top: 0,
    start: '22%',
    width: 34,
    height: '100%',
    backgroundColor: colors.surfaceSoft,
  },
  mapRoadH: {
    position: 'absolute',
    top: '38%',
    start: 0,
    end: 0,
    height: 28,
    backgroundColor: colors.surfaceSoft,
  },
  mapRoadH2: {
    position: 'absolute',
    top: '64%',
    start: 0,
    end: 0,
    height: 44,
    backgroundColor: colors.canvas,
  },
  driverPin: {
    position: 'absolute',
    start: 76,
    top: 242,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand,
    borderWidth: 3,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTop: {
    position: 'absolute',
    start: 20,
    end: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etaPill: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: onSurface(0.9),
  },

  // Overlap the map, as in the design.
  sheet: {
    marginTop: -24,
    backgroundColor: colors.bg,
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
    padding: 22,
    paddingHorizontal: 20,
    gap: 22,
  },

  stepDot: { width: 14, height: 14, borderRadius: 999 },
  stepDotActive: {
    backgroundColor: colors.live,
    borderWidth: 5,
    borderColor: liveTint(0.18),
  },
  stepDotIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: onSurface(0.16),
  },
  stepLine: { width: 1.5, flex: 1, minHeight: 22 },

  riderCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15 },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.brandMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
});
