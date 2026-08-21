import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchProducts, type SearchFilters } from '../../lib/queries';
import { useFormat } from '../../lib/format';
import { colors, border, font } from '../../lib/theme';
import { ProductRow } from '../../components/cards';
import { SearchIcon } from '../../components/icons';
import { Chip, EmptyState, OutlineButton, Skeleton, T } from '../../components/primitives';

type Product = Awaited<ReturnType<typeof searchProducts>>[number];

/** The five filter pills from the design, mapped to what they mean to the query. */
const FILTERS = [
  { key: 'saudiOrigin', label: 'search.filters.saudiOrigin' },
  { key: 'lightRoast', label: 'search.filters.lightRoast' },
  { key: 'underEighty', label: 'search.filters.underEighty' },
  { key: 'espresso', label: 'search.filters.espresso' },
  { key: 'freeDelivery', label: 'search.filters.freeDelivery' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function Explore() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const params = useLocalSearchParams<{ category?: string }>();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Set<FilterKey>>(new Set());
  const [results, setResults] = useState<Product[] | null>(null);

  const filters = useMemo<SearchFilters>(
    () => ({
      categorySlug: params.category ?? null,
      saudiOnly: active.has('saudiOrigin'),
      lightRoastOnly: active.has('lightRoast'),
      espressoOnly: active.has('espresso'),
      // "Under 80 SAR" compares against the 250 g reference price, which is what
      // the product cards quote.
      maxPriceMinor: active.has('underEighty') ? 8000 : null,
    }),
    [active, params.category],
  );

  const run = useCallback(async () => {
    try {
      setResults(await searchProducts(query, filters));
    } catch {
      setResults([]);
    }
  }, [query, filters]);

  // Debounced so a customer typing "خولاني" fires one query, not six.
  useEffect(() => {
    const id = setTimeout(() => void run(), 260);
    return () => clearTimeout(id);
  }, [run]);

  function toggle(key: FilterKey) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearAll() {
    setQuery('');
    setActive(new Set());
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor={colors.ink3}
          returnKeyType="search"
          style={styles.input}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTERS.map((filter) => (
            <Chip
              key={filter.key}
              label={t(filter.label)}
              active={active.has(filter.key)}
              compact
              onPress={() => toggle(filter.key)}
            />
          ))}
        </ScrollView>
      </View>

      {results === null ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} style={{ height: 98, borderRadius: 16 }} />
          ))}
        </View>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<SearchIcon size={26} color={colors.caramel} />}
          title={t('search.emptyTitle')}
          body={t('search.emptyBody')}
          action={<OutlineButton label={t('search.clearFilters')} onPress={clearAll} />}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <T variant="caption" color={colors.ink2}>
              {t('search.resultCount', { count: results.length })}
            </T>
          }
          renderItem={({ item }) => (
            <ProductRow product={item} onPress={() => router.push(`/product/${item.id}`)} />
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
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(33,23,18,0.06)',
  },
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
  list: { padding: 20, gap: 12 },
});
