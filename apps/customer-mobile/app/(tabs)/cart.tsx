import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calcVatMinor, variantPriceMinor } from '@leen/lib';
import { useCart, type CartLine } from '../../lib/cart';
import { useSession } from '../../lib/session';
import { previewCartTotal } from '../../lib/queries';
import { useFormat } from '../../lib/format';
import { colors, border, font } from '../../lib/theme';
import { onSurface } from '@leen/ui/palette';
import { BagIcon } from '../../components/icons';
import {
  Card,
  EmptyState,
  Num,
  OutlineButton,
  PrimaryButton,
  T,
} from '../../components/primitives';
import { TotalsCard, type Totals } from '../../components/totals';

/** Standard delivery is what the cart quotes; checkout lets the customer change it. */
const CART_FULFILMENT = 'standard';
const STANDARD_DELIVERY_MINOR = 1500;

/**
 * Group cart lines by roastery. A Leen basket routinely spans two or three
 * roasters, each shipping separately, so the cart shows one card per roastery
 * with its own subtotal and ETA — the same split `place_order` makes server-side.
 */
function groupByMerchant(lines: CartLine[]) {
  const groups = new Map<
    number,
    {
      name_en: string;
      name_ar: string | null;
      etaMin: number;
      etaMax: number;
      lines: CartLine[];
      subtotal: number;
    }
  >();

  for (const line of lines) {
    if (!line.product) continue;
    const { merchantId, merchantNameEn, merchantNameAr, etaMinMinutes, etaMaxMinutes } =
      line.product;
    const existing = groups.get(merchantId) ?? {
      name_en: merchantNameEn,
      name_ar: merchantNameAr,
      etaMin: etaMinMinutes,
      etaMax: etaMaxMinutes,
      lines: [],
      subtotal: 0,
    };
    existing.lines.push(line);
    existing.subtotal += variantPriceMinor(line.product.basePriceMinor, line.weightG) * line.qty;
    groups.set(merchantId, existing);
  }

  return [...groups.entries()].map(([id, g]) => ({ id, ...g }));
}

export default function CartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { userId } = useSession();
  const { lines, setQty, subtotalMinor } = useCart();

  const [promo, setPromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);

  const groups = useMemo(() => groupByMerchant(lines), [lines]);

  /**
   * Signed in, the bill comes from the database so the figures on screen are
   * the ones the order will actually be written with. A guest has no server
   * cart to price, so the same arithmetic runs locally — deliberately using the
   * shared `@leen/lib` helpers, which is the same VAT rule the RPC applies.
   */
  const price = useCallback(async () => {
    if (lines.length === 0) {
      setTotals(null);
      return;
    }
    if (userId) {
      try {
        const t1 = await previewCartTotal(CART_FULFILMENT, appliedPromo);
        if (t1) {
          setTotals(t1);
          // The server returning zero for a code the customer typed is how we
          // learn it was not valid.
          setPromoError(Boolean(appliedPromo) && t1.discount_minor === 0);
          return;
        }
      } catch {
        // fall through to the local estimate
      }
    }
    const vat = calcVatMinor(subtotalMinor + STANDARD_DELIVERY_MINOR);
    setTotals({
      subtotal_minor: subtotalMinor,
      delivery_minor: STANDARD_DELIVERY_MINOR,
      vat_minor: vat,
      discount_minor: 0,
      total_minor: subtotalMinor + STANDARD_DELIVERY_MINOR + vat,
    });
  }, [lines.length, userId, appliedPromo, subtotalMinor]);

  useEffect(() => {
    void price();
  }, [price]);

  if (lines.length === 0) {
    return (
      <View style={styles.root}>
        <Header insets={insets.top} title={t('cart.title')} />
        <EmptyState
          icon={<BagIcon size={28} color={colors.accent} />}
          title={t('cart.emptyTitle')}
          body={t('cart.emptyBody')}
          action={
            <PrimaryButton
              label={t('cart.startShopping')}
              onPress={() => router.push('/(tabs)')}
              style={{ paddingHorizontal: 26 }}
            />
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header insets={insets.top} title={t('cart.title')} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {groups.map((g) => (
          <Card key={g.id} padded={false} style={{ overflow: 'hidden' }}>
            <View style={styles.groupHead}>
              <View style={styles.inlineRow}>
                <View style={styles.merchantMark} />
                <T variant="label">{f.pick(g.name_en, g.name_ar)}</T>
              </View>
              <T variant="caption" color={colors.ink3}>
                {`${f.num(g.etaMin)}–${f.num(g.etaMax)}`}
              </T>
            </View>

            {g.lines.map((line) => (
              <View key={`${line.productId}:${line.grind}:${line.weightG}`} style={styles.line}>
                <View style={styles.lineThumb} />
                <View style={{ flex: 1, gap: 3 }}>
                  <T variant="label" numberOfLines={2}>
                    {f.pick(line.product?.nameEn, line.product?.nameAr)}
                  </T>
                  <T variant="caption" color={colors.ink2}>
                    {`${t(`product.grinds.${line.grind}`)} · ${t(`product.weights.${line.weightG}`)}`}
                  </T>
                  <Num variant="label" style={{ fontSize: 14, marginTop: 2 }}>
                    {f.money(
                      line.product
                        ? variantPriceMinor(line.product.basePriceMinor, line.weightG) * line.qty
                        : 0,
                    )}
                  </Num>
                </View>

                <View style={styles.stepper}>
                  <Pressable
                    hitSlop={4}
                    onPress={() =>
                      void setQty(line.productId, line.grind, line.weightG, line.qty - 1)
                    }
                    style={styles.stepperButton}
                  >
                    <T variant="title" color={colors.brandMid} style={{ lineHeight: 20 }}>
                      −
                    </T>
                  </Pressable>
                  <Num variant="body" style={{ minWidth: 18, textAlign: 'center' }}>
                    {f.num(line.qty)}
                  </Num>
                  <Pressable
                    hitSlop={4}
                    onPress={() =>
                      void setQty(line.productId, line.grind, line.weightG, line.qty + 1)
                    }
                    style={styles.stepperButton}
                  >
                    <T variant="title" color={colors.brandMid} style={{ lineHeight: 20 }}>
                      +
                    </T>
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={styles.groupFoot}>
              <T variant="caption" color={colors.ink2}>
                {t('cart.merchantSubtotal')}
              </T>
              <Num variant="label">{f.money(g.subtotal)}</Num>
            </View>
          </Card>
        ))}

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={promo}
              onChangeText={(v) => {
                setPromo(v);
                setPromoError(false);
              }}
              placeholder={t('cart.promoPlaceholder')}
              placeholderTextColor={colors.ink3}
              autoCapitalize="characters"
              style={styles.promoInput}
            />
            <OutlineButton
              label={t('cart.apply')}
              onPress={() => setAppliedPromo(promo.trim() || null)}
              style={{ height: 50 }}
            />
          </View>
          {promoError ? (
            <T variant="caption" color={colors.danger}>
              {t('cart.promoInvalid')}
            </T>
          ) : null}
          {appliedPromo && totals && totals.discount_minor > 0 ? (
            <T variant="caption" color={colors.live}>
              {t('cart.promoApplied')}
            </T>
          ) : null}
        </View>

        {totals ? <TotalsCard totals={totals} /> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <PrimaryButton
          label={t('cart.checkout')}
          onPress={() => router.push('/checkout')}
          trailing={
            totals ? (
              <Num variant="label" color={colors.bg} style={{ fontSize: 15 }}>
                {f.money(totals.total_minor)}
              </Num>
            ) : undefined
          }
        />
      </View>
    </View>
  );
}

function Header({ insets, title }: { insets: number; title: string }) {
  return (
    <View style={[styles.header, { paddingTop: insets + 12 }]}>
      <T variant="h3" style={{ fontSize: 18 }}>
        {title}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: onSurface(0.06),
  },
  scroll: { padding: 20, gap: 16, paddingBottom: 24 },

  groupHead: {
    padding: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: onSurface(0.06),
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  merchantMark: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.canvas },

  line: {
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: onSurface(0.05),
  },
  lineThumb: { width: 58, height: 58, borderRadius: 11, backgroundColor: colors.surfaceAlt },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: border.soft,
    borderRadius: 10,
    height: 34,
    paddingHorizontal: 2,
  },
  stepperButton: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },

  groupFoot: {
    paddingVertical: 11,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
  },

  promoInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: onSurface(0.22),
    fontFamily: font.medium,
    fontSize: 13.5,
    color: colors.ink,
  },

  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: onSurface(0.08),
  },
});
