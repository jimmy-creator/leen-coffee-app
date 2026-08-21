import { Image } from 'expo-image';
import {
  Pressable,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { variantPriceMinor } from '@leen/lib';
import { useFormat } from '../lib/format';
import { colors, border, font } from '../lib/theme';
import { Num, T } from './primitives';
import { StarIcon } from './icons';

/**
 * Placeholder for imagery that has not been uploaded yet.
 *
 * Every product and roastery in the seed ships without a photo, and a merchant
 * onboarding today will have listings live before their photographer delivers.
 * A tinted block with the bean mark reads as "photo pending" rather than as a
 * broken image.
 */
export function ImageSlot({
  uri,
  style,
  radius = 0,
}: {
  uri?: string | null;
  /** ImageStyle, not ViewStyle: it has to satisfy both branches below. */
  style?: StyleProp<ImageStyle>;
  radius?: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: '100%', height: '100%', borderRadius: radius }, style]}
        contentFit="cover"
        transition={180}
      />
    );
  }
  return (
    <View style={[styles.slot, { borderRadius: radius }, style]}>
      <View style={styles.slotBean} />
    </View>
  );
}

interface ProductLike {
  id: number;
  name_en: string;
  name_ar: string | null;
  notes_en: string | null;
  notes_ar: string | null;
  roast_level: string;
  base_price_minor: number;
  image_url: string | null;
  stock_qty: number;
  merchants?: { name_en: string; name_ar: string | null } | null;
}

/** The two-up grid card used on Home and the roastery page. */
export function ProductCard({
  product,
  onPress,
  onAdd,
  showMerchant = true,
  style,
}: {
  product: ProductLike;
  onPress: () => void;
  onAdd?: () => void;
  showMerchant?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const soldOut = product.stock_qty <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.8 }, style]}
    >
      <View style={styles.gridImage}>
        <ImageSlot uri={product.image_url} />
        <View style={styles.roastBadge}>
          <T variant="micro" color={colors.brown} style={{ letterSpacing: 0.6 }}>
            {t(`product.roasts.${product.roast_level}`)}
          </T>
        </View>
      </View>

      <View style={styles.gridBody}>
        {showMerchant && product.merchants ? (
          <T variant="micro" color={colors.ink3} numberOfLines={1}>
            {f.pick(product.merchants.name_en, product.merchants.name_ar)}
          </T>
        ) : null}

        <T variant="label" numberOfLines={2}>
          {f.pick(product.name_en, product.name_ar)}
        </T>

        <T variant="caption" color={colors.ink2} numberOfLines={1}>
          {f.pick(product.notes_en, product.notes_ar)}
        </T>

        <View style={styles.gridFooter}>
          {/* The card quotes the 250 g price — the reference the product page
              then scales when the customer picks a bigger bag. */}
          <Num variant="title">{f.money(variantPriceMinor(product.base_price_minor, 250))}</Num>
          {onAdd ? (
            <Pressable
              onPress={onAdd}
              disabled={soldOut}
              hitSlop={6}
              style={({ pressed }) => [
                styles.addButton,
                soldOut && { backgroundColor: colors.surfaceAlt },
                pressed && { opacity: 0.7 },
              ]}
            >
              <T
                variant="title"
                color={soldOut ? colors.ink4 : colors.bg}
                style={{ lineHeight: 22 }}
              >
                +
              </T>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** The horizontal result row used on Explore. */
export function ProductRow({ product, onPress }: { product: ProductLike; onPress: () => void }) {
  const f = useFormat();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <View style={styles.rowImage}>
        <ImageSlot uri={product.image_url} radius={12} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        {product.merchants ? (
          <T variant="micro" color={colors.ink3}>
            {f.pick(product.merchants.name_en, product.merchants.name_ar)}
          </T>
        ) : null}
        <T variant="label" numberOfLines={1}>
          {f.pick(product.name_en, product.name_ar)}
        </T>
        <T variant="caption" color={colors.ink2} numberOfLines={1}>
          {f.pick(product.notes_en, product.notes_ar)}
        </T>
        <Num variant="label" style={{ fontSize: 14.5, marginTop: 2 }}>
          {f.money(variantPriceMinor(product.base_price_minor, 250))}
        </Num>
      </View>
    </Pressable>
  );
}

interface MerchantLike {
  id: number;
  name_en: string;
  name_ar: string | null;
  city_en: string | null;
  city_ar: string | null;
  district_en: string | null;
  district_ar: string | null;
  rating: number;
  eta_min_minutes: number;
  eta_max_minutes: number;
  cover_url: string | null;
}

/** The wide roastery card in the "Roasters near you" carousel. */
export function MerchantCard({
  merchant,
  onPress,
}: {
  merchant: MerchantLike;
  onPress: () => void;
}) {
  const f = useFormat();
  const city = f.pick(merchant.city_en, merchant.city_ar);
  const district = f.pick(merchant.district_en, merchant.district_ar);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.merchantCard, pressed && { opacity: 0.85 }]}
    >
      <View style={{ height: 112 }}>
        <ImageSlot uri={merchant.cover_url} />
      </View>
      <View style={{ padding: 13, gap: 7 }}>
        <T variant="label" numberOfLines={1}>
          {f.pick(merchant.name_en, merchant.name_ar)}
        </T>
        <T variant="caption" color={colors.ink2} numberOfLines={1}>
          {district ? `${city} · ${district}` : city}
        </T>
        <View style={styles.merchantMeta}>
          <View style={styles.inlineRow}>
            <StarIcon />
            <Num variant="caption" color={colors.brown} style={{ fontFamily: font.medium }}>
              {f.num(merchant.rating)}
            </Num>
          </View>
          <View style={styles.dot} />
          <T variant="caption" color={colors.brown} style={{ fontFamily: font.medium }}>
            {`${f.num(merchant.eta_min_minutes)}–${f.num(merchant.eta_max_minutes)}`}
          </T>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A coffee-bean silhouette: a rounded blob with the centre crease.
  slotBean: {
    width: 26,
    height: 34,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(90,56,38,0.28)',
    transform: [{ rotate: '-18deg' }],
  },

  gridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: border.hair,
    overflow: 'hidden',
  },
  gridImage: { height: 120, backgroundColor: colors.surfaceAlt },
  roastBadge: {
    position: 'absolute',
    top: 9,
    start: 9,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(248,244,238,0.92)',
  },
  gridBody: { padding: 12, gap: 6, flex: 1 },
  gridFooter: {
    marginTop: 'auto',
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    gap: 13,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: border.hair,
    alignItems: 'center',
  },
  rowImage: { width: 74, height: 74, borderRadius: 12, overflow: 'hidden' },

  merchantCard: {
    width: 216,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: border.hair,
    overflow: 'hidden',
  },
  merchantMeta: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 3, height: 3, borderRadius: 3, backgroundColor: 'rgba(33,23,18,0.2)' },
});
