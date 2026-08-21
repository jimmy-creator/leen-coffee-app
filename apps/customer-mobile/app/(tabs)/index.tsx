import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchCategories, fetchHomeFeed } from '../../lib/queries';
import { useCart } from '../../lib/cart';
import { useFormat } from '../../lib/format';
import { colors, border, font } from '../../lib/theme';
import { onBrand, onSurface, accentTint, dangerTint } from '@leen/ui/palette';
import { ImageSlot, MerchantCard, ProductCard } from '../../components/cards';
import { BellIcon, ChevronIcon, SearchIcon, StarIcon } from '../../components/icons';
import { Card, Chip, EmptyState, PrimaryButton, Skeleton, T } from '../../components/primitives';

type Feed = Awaited<ReturnType<typeof fetchHomeFeed>>;
type Category = Awaited<ReturnType<typeof fetchCategories>>[number];

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { add, qtyOf } = useCart();

  const [feed, setFeed] = useState<Feed | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f1, c] = await Promise.all([fetchHomeFeed(), fetchCategories()]);
      setFeed(f1);
      setCategories(c);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const banner = feed?.banners[0];

  return (
    <View style={styles.root}>
      {/* Sticky header: address, rewards, notifications, and the search entry. */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.push('/addresses')} style={{ gap: 2 }}>
            <T variant="kicker" color={colors.ink3}>
              {t('home.deliverTo')}
            </T>
            <View style={styles.inlineRow}>
              <T variant="label" style={{ fontSize: 15 }}>
                {t('home.pickAddress')}
              </T>
              <ChevronIcon />
            </View>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Pressable onPress={() => router.push('/loyalty')} style={styles.rewardsPill}>
              <StarIcon color={colors.accent} />
              <T variant="micro" color={colors.brandMid} style={{ fontFamily: font.semibold }}>
                {t('loyalty.title')}
              </T>
            </Pressable>
            <Pressable style={styles.iconCircle}>
              <BellIcon />
            </Pressable>
          </View>
        </View>

        <Pressable onPress={() => router.push('/(tabs)/explore')} style={styles.searchBar}>
          <SearchIcon size={16} color={colors.ink3} />
          <T variant="body" color={colors.ink3} style={{ flex: 1 }}>
            {t('home.searchPlaceholder')}
          </T>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.brandMid}
          />
        }
      >
        {error ? (
          <Card style={styles.errorCard}>
            <View style={styles.errorBadge}>
              <T variant="micro" color={colors.bg} style={{ fontFamily: font.bold }}>
                !
              </T>
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <T variant="label" color={colors.dangerInk}>
                {t('home.errorTitle')}
              </T>
              <T variant="caption" color={colors.dangerInk}>
                {t('home.errorBody')}
              </T>
            </View>
            <Pressable onPress={() => void load()} hitSlop={8}>
              <T variant="caption" color={colors.danger} style={{ fontFamily: font.semibold }}>
                {t('common.retry')}
              </T>
            </Pressable>
          </Card>
        ) : null}

        {!feed ? (
          <HomeSkeleton />
        ) : (
          <View style={{ paddingTop: 16, gap: 26 }}>
            {banner ? (
              <Pressable
                onPress={() => banner.target_path && router.push(banner.target_path as never)}
                style={styles.hero}
              >
                <ImageSlot uri={banner.image_url} />
                <View style={styles.heroScrim} pointerEvents="none" />
                <View style={styles.heroContent} pointerEvents="none">
                  <View style={styles.heroKicker}>
                    <T variant="micro" color={colors.bg} style={{ letterSpacing: 1 }}>
                      {f.pick(banner.kicker_en, banner.kicker_ar)}
                    </T>
                  </View>
                  <View style={{ gap: 7, maxWidth: 250 }}>
                    <T variant="h3" color={colors.bg}>
                      {f.pick(banner.title_en, banner.title_ar)}
                    </T>
                    <T variant="caption" color={onBrand(0.72)}>
                      {f.pick(banner.subtitle_en, banner.subtitle_ar)}
                    </T>
                  </View>
                </View>
              </Pressable>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {categories.map((c) => (
                <Chip
                  key={c.slug}
                  label={f.pick(c.name_en, c.name_ar)}
                  active={activeCategory === c.slug}
                  onPress={() => {
                    setActiveCategory(c.slug);
                    // Categories filter the full catalogue, which is Explore's
                    // job — Home stays a curated feed.
                    if (c.slug !== 'all') {
                      router.push({ pathname: '/(tabs)/explore', params: { category: c.slug } });
                    }
                  }}
                />
              ))}
            </ScrollView>

            <View style={{ gap: 13 }}>
              <View style={styles.sectionHead}>
                <T variant="title">{t('home.roasters')}</T>
                <Pressable onPress={() => router.push('/(tabs)/explore')} hitSlop={8}>
                  <T
                    variant="caption"
                    color={colors.brandMid}
                    style={{ fontFamily: font.semibold }}
                  >
                    {t('common.seeAll')}
                  </T>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
              >
                {feed.merchants.map((m) => (
                  <MerchantCard
                    key={m.id}
                    merchant={m}
                    onPress={() => router.push(`/store/${m.id}`)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={{ gap: 13 }}>
              <View
                style={[
                  styles.sectionHead,
                  { flexDirection: 'column', alignItems: 'flex-start', gap: 3 },
                ]}
              >
                <T variant="title">{t('home.freshRoast')}</T>
                <T variant="caption" color={colors.ink2}>
                  {t('home.freshRoastSub')}
                </T>
              </View>

              {feed.freshRoast.length === 0 ? (
                <EmptyState
                  icon={<SearchIcon size={26} color={colors.accent} />}
                  title={t('home.emptyTitle')}
                  body={t('home.emptyBody')}
                />
              ) : (
                <View style={styles.grid}>
                  {feed.freshRoast.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onPress={() => router.push(`/product/${p.id}`)}
                      onAdd={() => void add(p.id, 'whole_bean', 250)}
                      cartQty={qtyOf(p.id)}
                      style={styles.gridItem}
                    />
                  ))}
                </View>
              )}
            </View>

            <Pressable onPress={() => router.push('/(tabs)/subscribe')} style={styles.subsCard}>
              <View style={styles.subsGlow} pointerEvents="none" />
              <T variant="kicker" color={onBrand(0.6)}>
                {t('subscriptions.kicker')}
              </T>
              <T variant="h3" color={colors.bg} style={{ fontSize: 19, maxWidth: 250 }}>
                {t('subscriptions.title')}
              </T>
              <T variant="caption" color={onBrand(0.72)} style={{ maxWidth: 260 }}>
                {t('subscriptions.subtitle')}
              </T>
              <T variant="label" color={colors.accent} style={{ marginTop: 6 }}>
                {t('subscriptions.cta')}
              </T>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function HomeSkeleton() {
  return (
    <View style={{ padding: 20, gap: 16 }}>
      <Skeleton style={{ height: 186, borderRadius: 20 }} />
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <Skeleton style={{ height: 34, width: 88, borderRadius: 999 }} />
        <Skeleton style={{ height: 34, width: 70, borderRadius: 999 }} />
        <Skeleton style={{ height: 34, width: 96, borderRadius: 999 }} />
      </View>
      <Skeleton style={{ height: 16, width: 150, borderRadius: 6 }} />
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={[styles.gridItem, { height: 210, borderRadius: 16 }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: onSurface(0.05),
    gap: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rewardsPill: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: accentTint(0.4),
    backgroundColor: accentTint(0.12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: onSurface(0.1),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: onSurface(0.1),
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },

  errorCard: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 13,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: dangerTint(0.09),
    borderColor: dangerTint(0.25),
    borderRadius: 13,
  },
  errorBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    marginHorizontal: 20,
    height: 186,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.brand,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: onSurface(0.55),
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'space-between',
  },
  heroKicker: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: onBrand(0.16),
  },

  chipRow: { gap: 9, paddingHorizontal: 20 },
  carousel: { gap: 13, paddingHorizontal: 20, paddingBottom: 4 },
  sectionHead: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  grid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  // Two per row, accounting for the 14 px gutter between them.
  gridItem: { width: '47.5%' },

  subsCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.brandMid,
    gap: 9,
    overflow: 'hidden',
  },
  subsGlow: {
    position: 'absolute',
    end: -26,
    top: -26,
    width: 118,
    height: 118,
    borderRadius: 99,
    backgroundColor: onBrand(0.06),
  },
});
