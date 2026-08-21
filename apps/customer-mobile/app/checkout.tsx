import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatAddressLine } from '@leen/lib';
import type { FulfilmentMethod, PaymentMethod } from '@leen/types';
import { fetchAddresses, placeOrder, previewCartTotal } from '../lib/queries';
import { useCart } from '../lib/cart';
import { useSession } from '../lib/session';
import { useFormat } from '../lib/format';
import { colors, font } from '../lib/theme';
import { PinIcon } from '../components/icons';
import { BackButton, Card, Num, OptionRow, PrimaryButton, T } from '../components/primitives';
import { TotalsCard, type Totals } from '../components/totals';

type Address = Awaited<ReturnType<typeof fetchAddresses>>[number];

const SHIP_OPTIONS: FulfilmentMethod[] = ['standard', 'express', 'pickup'];
const PAY_OPTIONS: PaymentMethod[] = ['mada', 'apple_pay', 'stc_pay', 'cash_on_delivery'];

export default function Checkout() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { userId } = useSession();
  const { refresh } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [fulfilment, setFulfilment] = useState<FulfilmentMethod>('standard');
  const [payment, setPayment] = useState<PaymentMethod>('mada');
  const [totals, setTotals] = useState<Totals | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checkout writes an order, which needs an account. A guest who reaches here
  // is sent to sign in and comes back with their basket intact — the cart merge
  // in CartProvider is what makes that safe.
  useEffect(() => {
    if (!userId) router.replace('/auth');
  }, [userId, router]);

  useEffect(() => {
    if (!userId) return;
    void fetchAddresses()
      .then((rows) => {
        setAddresses(rows);
        setAddressId(rows.find((a) => a.is_default)?.id ?? rows[0]?.id ?? null);
      })
      .catch(() => setAddresses([]));
  }, [userId]);

  const price = useCallback(async () => {
    try {
      setTotals(await previewCartTotal(fulfilment, null));
    } catch {
      setTotals(null);
    }
  }, [fulfilment]);

  useEffect(() => {
    void price();
  }, [price]);

  const selected = addresses.find((a) => a.id === addressId) ?? null;
  // Pickup is collected from the roastery, so it needs no address at all.
  const needsAddress = fulfilment !== 'pickup';
  const canPlace = Boolean(totals) && (!needsAddress || Boolean(selected)) && !placing;

  async function submit() {
    setPlacing(true);
    setError(null);
    try {
      const result = await placeOrder({
        addressId: needsAddress ? addressId : null,
        fulfilment,
        paymentMethod: payment,
        promoCode: null,
      });
      await refresh();
      router.replace({
        pathname: '/order-confirmed',
        params: { code: result?.order_code ?? '' },
      });
    } catch (e) {
      // The RPC raises with a readable message for the cases a customer can act
      // on — empty cart, an item that just sold out, a closed roastery.
      setError(e instanceof Error ? e.message : t('checkout.failed'));
      setPlacing(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => router.back()} />
        <T variant="h3" style={{ fontSize: 18 }}>
          {t('checkout.title')}
        </T>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {needsAddress ? (
          <View style={{ gap: 11 }}>
            <T
              variant="caption"
              color={colors.ink2}
              style={{ fontFamily: font.semibold, fontSize: 13 }}
            >
              {t('checkout.deliveryAddress')}
            </T>
            <Pressable onPress={() => router.push('/addresses')}>
              <Card style={styles.addressCard}>
                <View style={styles.pinBadge}>
                  <PinIcon />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  {selected ? (
                    <>
                      <T variant="label">{selected.label}</T>
                      <T variant="caption" color={colors.ink2}>
                        {formatAddressLine(selected)}
                      </T>
                    </>
                  ) : (
                    <T variant="label" color={colors.ink2}>
                      {t('checkout.noAddress')}
                    </T>
                  )}
                </View>
                <T variant="caption" color={colors.brown} style={{ fontFamily: font.semibold }}>
                  {selected ? t('common.change') : t('addresses.add')}
                </T>
              </Card>
            </Pressable>
          </View>
        ) : null}

        <View style={{ gap: 11 }}>
          <T
            variant="caption"
            color={colors.ink2}
            style={{ fontFamily: font.semibold, fontSize: 13 }}
          >
            {t('checkout.deliveryMethod')}
          </T>
          <View style={{ gap: 9 }}>
            {SHIP_OPTIONS.map((option) => (
              <OptionRow
                key={option}
                active={fulfilment === option}
                onPress={() => setFulfilment(option)}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <T variant="label">{t(`checkout.ship.${option}`)}</T>
                  <T variant="caption" color={colors.ink2}>
                    {t(`checkout.ship.${option}Sub`)}
                  </T>
                </View>
                <Num variant="label" style={{ fontSize: 13 }}>
                  {option === 'pickup'
                    ? t('common.free')
                    : f.money(option === 'express' ? 2900 : 1500)}
                </Num>
              </OptionRow>
            ))}
          </View>
        </View>

        <View style={{ gap: 11 }}>
          <T
            variant="caption"
            color={colors.ink2}
            style={{ fontFamily: font.semibold, fontSize: 13 }}
          >
            {t('checkout.payment')}
          </T>
          <View style={{ gap: 9 }}>
            {PAY_OPTIONS.map((option) => (
              <OptionRow
                key={option}
                active={payment === option}
                onPress={() => setPayment(option)}
              >
                <T variant="label" style={{ flex: 1 }}>
                  {t(`checkout.pay.${option}`)}
                </T>
                <View style={styles.payBadge}>
                  <T variant="micro" color={colors.ink3} style={{ letterSpacing: 0.6 }}>
                    {t(`checkout.payBadge.${option}`)}
                  </T>
                </View>
              </OptionRow>
            ))}
          </View>
        </View>

        {totals ? (
          <View style={{ gap: 8 }}>
            <TotalsCard totals={totals} />
            <T variant="caption" color={colors.ink3} style={{ paddingHorizontal: 4 }}>
              {t('checkout.vatNote')}
            </T>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <T variant="caption" color="#8E2F2F">
              {error}
            </T>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <PrimaryButton
          label={placing ? t('checkout.placing') : t('checkout.placeOrder')}
          disabled={!canPlace}
          loading={placing}
          onPress={() => void submit()}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(33,23,18,0.06)',
  },
  scroll: { padding: 20, gap: 22, paddingBottom: 24 },

  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    borderRadius: 16,
  },
  pinBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(197,139,85,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
  },
  errorBox: {
    padding: 13,
    borderRadius: 13,
    backgroundColor: 'rgba(201,75,75,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(201,75,75,0.25)',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(33,23,18,0.08)',
  },
});
