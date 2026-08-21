import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMerchant } from '../../lib/queries';
import { useCart } from '../../lib/cart';
import { useFormat } from '../../lib/format';
import { colors, border, font } from '../../lib/theme';
import { ImageSlot, ProductCard } from '../../components/cards';
import { StarIcon } from '../../components/icons';
import { BackButton, Card, Chip, Num, Skeleton, T } from '../../components/primitives';

type Data = Awaited<ReturnType<typeof fetchMerchant>>;

const TABS = ['all', 'beans', 'subscriptions', 'gear', 'about'] as const;
type TabKey = (typeof TABS)[number];

export default function Store() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { add } = useCart();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<TabKey>('all');

  useEffect(() => {
    if (!id) return;
    void fetchMerchant(Number(id))
      .then(setData)
      .catch(() => setData(null));
  }, [id]);

  const merchant = data?.merchant;

  return (
    <View style={styles.root}>
      {/* Light status bar: the cover photograph runs under it. */}
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.cover}>
          <ImageSlot uri={merchant?.cover_url} />
          <View style={styles.coverScrim} pointerEvents="none" />
          <View style={[styles.coverBack, { top: insets.top + 8 }]}>
            <BackButton tone="floating" onPress={() => router.back()} />
          </View>
        </View>

        <View style={styles.body}>
          {!merchant ? (
            <Skeleton style={{ height: 150, borderRadius: 20 }} />
          ) : (
            <Card style={{ gap: 14, padding: 18 }}>
              <View style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
                <View style={styles.logo}>
                  <ImageSlot uri={merchant.logo_url} radius={16} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <T variant="h3" style={{ fontSize: 18 }}>
                    {f.pick(merchant.name_en, merchant.name_ar)}
                  </T>
                  <T variant="caption" color={colors.ink2}>
                    {f.pick(merchant.tagline_en, merchant.tagline_ar)}
                  </T>
                </View>
                <View style={styles.ratingPill}>
                  <StarIcon />
                  <Num variant="caption" style={{ fontFamily: font.semibold, fontSize: 12 }}>
                    {f.num(merchant.rating)}
                  </Num>
                </View>
              </View>

              <View style={styles.stats}>
                <Stat
                  label={t('store.delivery')}
                  value={`${f.num(merchant.eta_min_minutes)}–${f.num(merchant.eta_max_minutes)}`}
                />
                <Stat label={t('store.products')} value={f.num(data.products.length)} />
                <Stat
                  label={t('store.since')}
                  value={merchant.established_year ? f.num(merchant.established_year) : '—'}
                />
              </View>

              {!merchant.is_open ? (
                <View style={styles.closed}>
                  <T variant="label" color="#8E2F2F">
                    {t('store.closed')}
                  </T>
                  <T variant="caption" color="#96524F">
                    {t('store.closedBody')}
                  </T>
                </View>
              ) : null}
            </Card>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {TABS.map((key) => (
              <Chip
                key={key}
                label={t(`store.tabs.${key}`)}
                active={tab === key}
                compact
                onPress={() => setTab(key)}
              />
            ))}
          </ScrollView>

          {tab === 'about' ? (
            <Card style={{ gap: 9 }}>
              <T variant="body" color={colors.ink2} style={{ lineHeight: 24 }}>
                {merchant
                  ? f.pick(merchant.about_en, merchant.about_ar) ||
                    f.pick(merchant.tagline_en, merchant.tagline_ar)
                  : ''}
              </T>
            </Card>
          ) : (
            <View style={styles.grid}>
              {(data?.products ?? []).map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  showMerchant={false}
                  onPress={() => router.push(`/product/${p.id}`)}
                  onAdd={() => void add(p.id, 'whole_bean', 250)}
                  style={styles.gridItem}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
      <Num variant="label">{value}</Num>
      <T variant="micro" color={colors.ink3}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  cover: { height: 210, backgroundColor: colors.espresso },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(33,23,18,0.28)',
  },
  coverBack: { position: 'absolute', start: 20 },
  // Pull the identity card up over the cover, as in the design.
  body: { marginTop: -40, paddingHorizontal: 20, gap: 20 },

  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(33,23,18,0.08)',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(217,144,47,0.12)',
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: border.hair,
    paddingTop: 13,
  },
  closed: {
    padding: 12,
    borderRadius: 12,
    gap: 3,
    backgroundColor: 'rgba(201,75,75,0.09)',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '47.5%', flexGrow: 0, flexBasis: 'auto' },
});
