import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { matchesQuery } from '@leen/lib';
import { fetchAllMerchants } from '../lib/queries';
import { useFormat } from '../lib/format';
import { colors, border, font } from '../lib/theme';
import { onSurface } from '@leen/ui/palette';
import { MerchantWideCard } from '../components/cards';
import { SearchIcon } from '../components/icons';
import { BackButton, EmptyState, OutlineButton, Skeleton, T } from '../components/primitives';

type Merchant = Awaited<ReturnType<typeof fetchAllMerchants>>[number];

/**
 * Every roastery on Leen.
 *
 * Reached from "Roasters near you → See all", which used to hand off to Explore
 * — a product search, so tapping through a roastery heading landed you in a
 * list of coffees. This answers the question that was actually asked.
 */
export default function Roasters() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();

  const [merchants, setMerchants] = useState<Merchant[] | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setMerchants(await fetchAllMerchants());
    } catch {
      setMerchants([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Filtered on the device, not the server. The whole list is a handful of
   * roasteries and is already in memory — a round trip per keystroke would be
   * slower and would break while offline. `matchesQuery` folds Arabic letter
   * forms, so "محمصه" finds "محمصة".
   */
  const visible = useMemo(() => {
    if (!merchants) return null;
    if (!query.trim()) return merchants;
    return merchants.filter((m) =>
      [m.name_en, m.name_ar, m.city_en, m.city_ar, m.district_en, m.district_ar]
        .filter(Boolean)
        .some((field) => matchesQuery(field as string, query)),
    );
  }, [merchants, query]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.back()} />
          <T variant="h3" style={{ fontSize: 18 }}>
            {t('roasters.title')}
          </T>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('roasters.searchPlaceholder')}
          placeholderTextColor={colors.ink3}
          style={styles.input}
        />
      </View>

      {visible === null ? (
        <View style={{ padding: 20, gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 250, borderRadius: 18 }} />
          ))}
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<SearchIcon size={26} color={colors.accent} />}
          title={t('roasters.emptyTitle')}
          body={t('roasters.emptyBody')}
          action={
            query ? (
              <OutlineButton label={t('search.clearFilters')} onPress={() => setQuery('')} />
            ) : undefined
          }
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <T variant="caption" color={colors.ink2}>
              {t('roasters.count', { count: visible.length })}
            </T>
          }
          renderItem={({ item }) => (
            <MerchantWideCard merchant={item} onPress={() => router.push(`/store/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 13,
    borderBottomWidth: 1,
    borderBottomColor: onSurface(0.06),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: border.soft,
    backgroundColor: colors.surface,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.ink,
  },
  list: { padding: 20, gap: 14 },
});
