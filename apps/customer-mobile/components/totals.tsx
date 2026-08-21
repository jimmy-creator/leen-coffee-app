import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../lib/format';
import { colors, font } from '../lib/theme';
import { Card, Num, T } from './primitives';

/**
 * The bill, exactly as `preview_cart_total` / `place_order` compute it.
 *
 * The shape mirrors the RPC's return columns rather than being remapped, so
 * there is no place for the two to disagree about what "total" means.
 */
export interface Totals {
  subtotal_minor: number;
  delivery_minor: number;
  vat_minor: number;
  discount_minor: number;
  total_minor: number;
}

export function TotalsCard({ totals }: { totals: Totals }) {
  const { t } = useTranslation();
  const f = useFormat();

  const rows: { key: string; value: string; good?: boolean; big?: boolean }[] = [
    { key: t('totals.subtotal'), value: f.money(totals.subtotal_minor) },
    {
      key: t('totals.delivery'),
      value: totals.delivery_minor ? f.money(totals.delivery_minor) : t('common.free'),
    },
    { key: t('totals.vat'), value: f.money(totals.vat_minor) },
  ];

  if (totals.discount_minor > 0) {
    rows.push({ key: t('totals.promo'), value: `− ${f.money(totals.discount_minor)}`, good: true });
  }
  rows.push({ key: t('totals.total'), value: f.money(totals.total_minor), big: true });

  return (
    <Card style={{ gap: 11 }}>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <T
            variant={row.big ? 'label' : 'caption'}
            color={row.big ? colors.ink : colors.ink2}
            style={row.big ? { fontSize: 15 } : undefined}
          >
            {row.key}
          </T>
          <Num
            variant={row.big ? 'h3' : 'body'}
            color={row.good ? colors.live : colors.ink}
            style={row.big ? { fontSize: 18 } : { fontFamily: font.medium, fontSize: 13 }}
          >
            {row.value}
          </Num>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
