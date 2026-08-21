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
import { onBrand, onSurface, brandTint, accentTint } from '@leen/ui/palette';
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
  cartQty = 0,
  style,
}: {
  product: ProductLike;
  onPress: () => void;
  onAdd?: () => void;
  showMerchant?: boolean;
  /** How many of this product are already in the cart, across all variants. */
  cartQty?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const soldOut = product.stock_qty <= 0;
  const inCart = cartQty > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.8 }, style]}
    >
      <View style={styles.gridImage}>
        <ImageSlot uri={product.image_url} />
        <View style={styles.roastBadge}>
          <T variant="micro" color={colors.brandMid} style={{ letterSpacing: 0.6 }}>
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
              // Once something is in the cart the control widens into a pill
              // carrying the count, so the customer can see what they have
              // without opening the cart. Tapping still adds one.
              accessibilityLabel={
                inCart ? t('product.inCartAdd', { count: cartQty }) : t('product.addToCart')
              }
              style={({ pressed }) => [
                inCart ? styles.addPill : styles.addButton,
                soldOut && { backgroundColor: colors.surfaceAlt },
                pressed && { opacity: 0.7 },
              ]}
            >
              {inCart ? (
                <>
                  {/* Sold out turns the pill into a light disabled chip, so the
                      count has to follow the glyph colour or it vanishes. */}
                  <Num
                    variant="micro"
                    color={soldOut ? colors.ink4 : colors.bg}
                    style={{ fontSize: 12.5 }}
                  >
                    {f.num(cartQty)}
                  </Num>
                  <View
                    style={[styles.pillDivider, soldOut && { backgroundColor: onSurface(0.15) }]}
                  />
                </>
              ) : null}
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
            <Num variant="caption" color={colors.brandMid} style={{ fontFamily: font.medium }}>
              {f.num(merchant.rating)}
            </Num>
          </View>
          <View style={styles.dot} />
          <T variant="caption" color={colors.brandMid} style={{ fontFamily: font.medium }}>
            {`${f.num(merchant.eta_min_minutes)}–${f.num(merchant.eta_max_minutes)}`}
          </T>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wideCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: border.hair,
    overflow: 'hidden',
  },
  wideCover: { height: 140, backgroundColor: colors.surfaceAlt },
  closedVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: onSurface(0.45),
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  wideHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: accentTint(0.16),
  },
  wideMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },

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
    borderColor: brandTint(0.28),
    transform: [{ rotate: '-18deg' }],
  },

  gridCard: {
    // No `flex` here on purpose — the caller owns the width. Mixing the flex
    // shorthand with a flexGrow/flexBasis override is unreliable in Yoga.
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
    backgroundColor: onBrand(0.92),
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
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Same height as the square so the footer baseline does not shift when the
  // first bag goes in; it only grows sideways.
  addPill: {
    height: 30,
    minWidth: 30,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pillDivider: { width: 1, height: 14, backgroundColor: onBrand(0.3) },

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
  dot: { width: 3, height: 3, borderRadius: 3, backgroundColor: onSurface(0.2) },
});

interface MerchantListItem extends MerchantLike {
  tagline_en: string | null;
  tagline_ar: string | null;
  rating_count: number;
  is_open: boolean;
}

/**
 * Full-width roastery card for the "all roasters" list.
 *
 * Separate from `MerchantCard` rather than a variant of it: the carousel card
 * is fixed at 216 px wide and stacks its cover above the text, which is right
 * for scanning sideways and wrong for a vertical list. This one runs the cover
 * full-bleed and has room for the tagline, which is what tells a customer why
 * they would tap one roastery over another.
 */
export function MerchantWideCard({
  merchant,
  onPress,
}: {
  merchant: MerchantListItem;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const city = f.pick(merchant.city_en, merchant.city_ar);
  const district = f.pick(merchant.district_en, merchant.district_ar);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wideCard, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.wideCover}>
        <ImageSlot uri={merchant.cover_url} />
        {!merchant.is_open ? (
          <View style={styles.closedVeil}>
            <View style={styles.closedPill}>
              <T variant="micro" color={colors.ink}>
                {t('store.closed')}
              </T>
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 15, gap: 7 }}>
        <View style={styles.wideHead}>
          <T variant="title" style={{ flex: 1, fontSize: 16 }} numberOfLines={1}>
            {f.pick(merchant.name_en, merchant.name_ar)}
          </T>
          <View style={styles.ratingPill}>
            <StarIcon />
            <Num variant="caption" style={{ fontFamily: font.semibold, fontSize: 12 }}>
              {f.num(merchant.rating)}
            </Num>
          </View>
        </View>

        <T variant="caption" color={colors.ink2} numberOfLines={2}>
          {f.pick(merchant.tagline_en, merchant.tagline_ar)}
        </T>

        <View style={styles.wideMeta}>
          <T variant="caption" color={colors.ink3} numberOfLines={1} style={{ flex: 1 }}>
            {district ? `${city} · ${district}` : city}
          </T>
          <View style={styles.dot} />
          <T variant="caption" color={colors.brandMid} style={{ fontFamily: font.medium }}>
            {`${f.num(merchant.eta_min_minutes)}–${f.num(merchant.eta_max_minutes)}`}
          </T>
        </View>
      </View>
    </Pressable>
  );
}
