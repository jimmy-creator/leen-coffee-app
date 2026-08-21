import { useCallback, useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../lib/notifications';
import { useSession } from '../lib/session';
import { useFormat } from '../lib/format';
import { colors, border, font } from '../lib/theme';
import { onSurface, brandTint } from '@leen/ui/palette';
import { BellIcon } from '../components/icons';
import { BackButton, Card, EmptyState, PrimaryButton, T } from '../components/primitives';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { userId } = useSession();
  const { items, unread, loading, refresh, markAllRead } = useNotifications();

  // Opening the screen is the read receipt — leaving a badge up after someone
  // has looked at the list is just noise.
  useEffect(() => {
    if (unread > 0) void markAllRead();
    // Deliberately only on mount: marking read again on every re-render would
    // fight the optimistic update above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => void refresh(), [refresh]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => router.back()} />
        <T variant="h3" style={{ fontSize: 18 }}>
          {t('notifications.title')}
        </T>
      </View>

      {!userId ? (
        <EmptyState
          icon={<BellIcon size={26} color={colors.accent} />}
          title={t('profile.guest')}
          body={t('profile.guestBody')}
          action={<PrimaryButton label={t('auth.signIn')} onPress={() => router.push('/auth')} />}
        />
      ) : items.length === 0 && !loading ? (
        <EmptyState
          icon={<BellIcon size={26} color={colors.accent} />}
          title={t('notifications.emptyTitle')}
          body={t('notifications.emptyBody')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        >
          {items.map((n) => {
            const unreadRow = !n.read_at;
            return (
              <Pressable
                key={n.id}
                disabled={!n.path}
                onPress={() => n.path && router.push(n.path as Href)}
              >
                <Card style={[styles.card, unreadRow && styles.cardUnread]}>
                  <View style={styles.iconWrap}>
                    <BellIcon size={16} color={colors.brandMid} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <T variant="label" numberOfLines={2}>
                      {f.pick(n.title_en, n.title_ar)}
                    </T>
                    {n.body_en || n.body_ar ? (
                      <T variant="caption" color={colors.ink2}>
                        {f.pick(n.body_en, n.body_ar)}
                      </T>
                    ) : null}
                    <T variant="micro" color={colors.ink3}>
                      {f.date(new Date(n.created_at))}
                    </T>
                  </View>
                  {unreadRow ? <View style={styles.dot} /> : null}
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
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
    borderBottomColor: onSurface(0.06),
  },
  list: { padding: 20, gap: 12 },
  card: { flexDirection: 'row', gap: 13, padding: 15, alignItems: 'flex-start' },
  cardUnread: { borderColor: colors.brandMid, backgroundColor: brandTint(0.03) },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.brandMid, marginTop: 6 },
});
