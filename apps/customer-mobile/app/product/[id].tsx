import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BAG_WEIGHTS, GRIND_OPTIONS, daysSinceRoast, variantPriceMinor } from '@leen/lib';
import type { BagWeight, GrindOption } from '@leen/types';
import { fetchProduct } from '../../lib/queries';
import { useCart } from '../../lib/cart';
import { useFormat } from '../../lib/format';
import { colors, border, font } from '../../lib/theme';
import { ImageSlot } from '../../components/cards';
import { HeartIcon } from '../../components/icons';
import {
  BackButton,
  Card,
  Num,
  PrimaryButton,
  SelectTile,
  Skeleton,
  T,
} from '../../components/primitives';

type Product = Awaited<ReturnType<typeof fetchProduct>>;

export default function ProductDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { add } = useCart();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [grind, setGrind] = useState<GrindOption>('whole_bean');
  // 500 g is the default the design lands on — the size most customers buy.
  const [weight, setWeight] = useState<BagWeight>(500);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchProduct(Number(id))
      .then(setProduct)
      .catch(() => setProduct(null));
  }, [id]);

  if (!product) {
    return (
      <View style={styles.root}>
        <Skeleton style={{ height: 300, borderRadius: 0 }} />
        <View style={{ padding: 20, gap: 14 }}>
          <Skeleton style={{ height: 28, width: '70%' }} />
          <Skeleton style={{ height: 20, width: '40%' }} />
          <Skeleton style={{ height: 120 }} />
        </View>
      </View>
    );
  }

  const unitMinor = variantPriceMinor(product.base_price_minor, weight);
  const soldOut = product.stock_qty <= 0;
  const notes = f.pick(product.notes_en, product.notes_ar);
  // The notes column stores the display string; the chips are its parts.
  const noteChips = notes
    ? notes
        .split('·')
        .map((n) => n.trim())
        .filter(Boolean)
    : [];
  const roastAge = product.roasted_on ? daysSinceRoast(product.roasted_on) : null;

  async function addToCart() {
    if (!product || soldOut) return;
    setAdding(true);
    await add(product.id, grind, weight, qty);
    setAdding(false);
    router.push('/(tabs)/cart');
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={styles.hero}>
          <ImageSlot uri={product.image_url} />
          <View style={[styles.heroActions, { top: insets.top + 8 }]}>
            <BackButton tone="floating" onPress={() => router.back()} />
            <Pressable style={styles.heartButton}>
              <HeartIcon />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => router.push(`/store/${product.merchant_id}`)}
              style={styles.merchantLink}
            >
              <View style={styles.merchantMark} />
              <T variant="micro" color={colors.brown} style={{ fontSize: 12 }}>
                {f.pick(product.merchants?.name_en, product.merchants?.name_ar)}
              </T>
            </Pressable>

            <T variant="h2" style={{ fontSize: 25 }}>
              {f.pick(product.name_en, product.name_ar)}
            </T>

            <View style={styles.priceRow}>
              <Num variant="h2" style={{ fontSize: 26 }}>
                {f.money(unitMinor)}
              </Num>
              <T variant="caption" color={colors.ink3}>
                {t('product.perWeight', { weight: t(`product.weights.${weight}`) })}
              </T>
            </View>

            {noteChips.length > 0 ? (
              <View style={styles.noteChips}>
                {noteChips.map((note) => (
                  <View key={note} style={styles.noteChip}>
                    <T variant="micro" color={colors.brown} style={{ fontSize: 11.5 }}>
                      {note}
                    </T>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.specGrid}>
            <Spec
              label={t('product.specs.origin')}
              value={f.pick(product.origin_en, product.origin_ar)}
            />
            <Spec
              label={t('product.specs.process')}
              value={product.process ? t(`product.processes.${product.process}`) : '—'}
            />
            <Spec
              label={t('product.specs.altitude')}
              value={f.pick(product.altitude_en, product.altitude_ar)}
            />
            <Spec
              label={t('product.specs.variety')}
              value={f.pick(product.variety_en, product.variety_ar)}
            />
          </View>

          <View style={{ gap: 11 }}>
            <T variant="label" style={{ fontSize: 14 }}>
              {t('product.grind')}
            </T>
            <View style={styles.grindGrid}>
              {GRIND_OPTIONS.map((option) => (
                <SelectTile
                  key={option}
                  label={t(`product.grinds.${option}`)}
                  active={grind === option}
                  onPress={() => setGrind(option)}
                  style={styles.grindTile}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 11 }}>
            <T variant="label" style={{ fontSize: 14 }}>
              {t('product.weight')}
            </T>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              {BAG_WEIGHTS.map((w) => (
                <SelectTile
                  key={w}
                  label={t(`product.weights.${w}`)}
                  active={weight === w}
                  onPress={() => setWeight(w)}
                  style={{ flex: 1 }}
                />
              ))}
            </View>
          </View>

          {roastAge !== null ? (
            <View style={styles.freshness}>
              <View style={styles.freshnessDot} />
              <View style={{ flex: 1, gap: 4 }}>
                <T variant="label" color={colors.forest}>
                  {roastAge <= 0
                    ? t('product.roastedToday')
                    : t('product.roastedAgo', { count: roastAge })}
                </T>
                <T variant="caption" color="#3F6455">
                  {t('product.freshnessNote')}
                </T>
              </View>
            </View>
          ) : null}

          <View style={{ gap: 9 }}>
            <T variant="label" style={{ fontSize: 14 }}>
              {t('product.about')}
            </T>
            <T variant="body" color="#5F534C" style={{ lineHeight: 24 }}>
              {f.pick(product.about_en, product.about_ar)}
            </T>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => setQty((q) => Math.max(1, q - 1))}
            hitSlop={4}
            style={styles.stepperButton}
          >
            <T variant="h3" color={colors.brown} style={{ lineHeight: 24 }}>
              −
            </T>
          </Pressable>
          <Num variant="label" style={{ minWidth: 24, textAlign: 'center', fontSize: 15 }}>
            {f.num(qty)}
          </Num>
          <Pressable onPress={() => setQty((q) => q + 1)} hitSlop={4} style={styles.stepperButton}>
            <T variant="h3" color={colors.brown} style={{ lineHeight: 24 }}>
              +
            </T>
          </Pressable>
        </View>

        <PrimaryButton
          label={soldOut ? t('product.outOfStock') : t('product.addToCart')}
          disabled={soldOut}
          loading={adding}
          onPress={() => void addToCart()}
          style={{ flex: 1, height: 52 }}
          trailing={
            soldOut ? undefined : (
              <>
                <View style={styles.footerDivider} />
                <Num variant="label" color={colors.bg} style={{ fontSize: 15 }}>
                  {f.money(unitMinor * qty)}
                </Num>
              </>
            )
          }
        />
      </View>
    </View>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.spec}>
      <T variant="micro" color={colors.ink3}>
        {label}
      </T>
      <T variant="label">{value || '—'}</T>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { height: 300, backgroundColor: colors.surfaceAlt },
  heroActions: {
    position: 'absolute',
    start: 20,
    end: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heartButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(248,244,238,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { padding: 20, gap: 22 },
  merchantLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  merchantMark: { width: 22, height: 22, borderRadius: 7, backgroundColor: colors.canvas },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  noteChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 2 },
  noteChip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(197,139,85,0.14)',
  },

  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  spec: { width: '47.5%', padding: 13, borderRadius: 14, gap: 4 },

  grindGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  grindTile: { width: '47.5%' },

  freshness: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(31,77,58,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(31,77,58,0.16)',
  },
  freshnessDot: {
    width: 8,
    height: 8,
    borderRadius: 9,
    backgroundColor: colors.green,
    marginTop: 6,
  },

  footer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(33,23,18,0.08)',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: border.soft,
    borderRadius: 13,
    height: 52,
    paddingHorizontal: 4,
  },
  stepperButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  footerDivider: { width: 1, height: 18, backgroundColor: 'rgba(248,244,238,0.28)' },
});
