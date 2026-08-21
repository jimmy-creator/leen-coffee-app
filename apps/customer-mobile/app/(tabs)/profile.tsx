import { useEffect, useState, type ReactNode } from 'react';
import { I18nManager, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { localeNames, type Locale } from '@leen/i18n';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { useFormat } from '../../lib/format';
import { colors, border, font } from '../../lib/theme';
import { onSurface, accentTint } from '@leen/ui/palette';
import { ImageSlot } from '../../components/cards';
import { Card, OutlineButton, PrimaryButton, T } from '../../components/primitives';
import {
  BagIcon,
  BoxIcon,
  CardIcon,
  HelpIcon,
  PinIcon,
  StarIcon,
  SubscribeIcon,
  UserIcon,
} from '../../components/icons';

interface RowSpec {
  key: string;
  href: Href;
  icon: ReactNode;
  meta?: string;
}

export default function Profile() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { userId, signOut } = useSession();

  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [counts, setCounts] = useState({ orders: 0, subscriptions: 0, addresses: 0 });

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const [profile, loyalty, orders, subs, addresses] = await Promise.all([
        supabase.from('profiles').select('full_name, phone').eq('id', userId).maybeSingle(),
        supabase.from('loyalty_accounts').select('points').maybeSingle(),
        // `head: true` fetches the count without the rows — the profile only
        // renders the number.
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase.from('addresses').select('id', { count: 'exact', head: true }),
      ]);

      setName(profile.data?.full_name ?? null);
      setPhone(profile.data?.phone ?? null);
      setPoints(loyalty.data?.points ?? 0);
      setCounts({
        orders: orders.count ?? 0,
        subscriptions: subs.count ?? 0,
        addresses: addresses.count ?? 0,
      });
    })();
  }, [userId]);

  const rows: RowSpec[] = [
    {
      key: 'orders',
      href: '/orders',
      icon: <BoxIcon />,
      meta: f.num(counts.orders),
    },
    {
      key: 'subscriptions',
      href: '/(tabs)/subscribe',
      icon: <SubscribeIcon size={18} color={colors.brandMid} />,
      meta: t('subscriptions.activeCount', { count: counts.subscriptions }),
    },
    {
      key: 'rewards',
      href: '/loyalty',
      // Brass, not green — rewards are the one place the accent earns its keep.
      icon: <StarIcon size={16} color={colors.accent} />,
      meta: points === null ? undefined : `${f.num(points)} ${t('loyalty.points')}`,
    },
    {
      key: 'addresses',
      href: '/addresses',
      icon: <PinIcon size={18} color={colors.brandMid} />,
      meta: f.num(counts.addresses),
    },
    {
      key: 'payment',
      href: '/checkout',
      icon: <CardIcon />,
    },
    {
      key: 'support',
      href: '/(tabs)/profile',
      icon: <HelpIcon />,
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <T variant="h2">{t('profile.title')}</T>
        </View>

        {!userId ? (
          // Language has to stay reachable here. Gating it behind sign-in left a
          // guest — which is every first-time visitor, and anyone who tapped
          // "Browse as a guest" — with no way to switch out of Arabic at all.
          <View style={styles.body}>
            <Card style={styles.guestCard}>
              <View style={styles.guestIcon}>
                <UserIcon size={28} color={colors.accent} />
              </View>
              <T variant="title">{t('profile.guest')}</T>
              <T variant="body" color={colors.ink2} style={{ textAlign: 'center', maxWidth: 250 }}>
                {t('profile.guestBody')}
              </T>
              <PrimaryButton
                label={t('auth.signIn')}
                onPress={() => router.push('/auth')}
                style={{ paddingHorizontal: 30, alignSelf: 'stretch' }}
              />
            </Card>

            <LanguageCard />
          </View>
        ) : (
          <View style={styles.body}>
            <Card style={styles.identity}>
              <View style={styles.avatar}>
                <ImageSlot radius={999} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <T variant="title" style={{ fontSize: 16 }}>
                  {name ?? t('profile.title')}
                </T>
                {phone ? (
                  <T variant="caption" color={colors.ink2} style={{ writingDirection: 'ltr' }}>
                    {phone}
                  </T>
                ) : null}
              </View>
            </Card>

            <Card padded={false} style={{ overflow: 'hidden' }}>
              {rows.map((row, i) => (
                <Pressable
                  key={row.key}
                  onPress={() => router.push(row.href)}
                  style={({ pressed }) => [
                    styles.row,
                    i === rows.length - 1 && { borderBottomWidth: 0 },
                    pressed && { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <View style={styles.rowMark}>{row.icon}</View>
                  <T variant="bodyLg" style={{ flex: 1, fontFamily: font.medium, fontSize: 14 }}>
                    {t(`profile.rows.${row.key}`)}
                  </T>
                  {row.meta ? (
                    <T variant="caption" color={colors.ink3}>
                      {row.meta}
                    </T>
                  ) : null}
                  <T variant="bodyLg" color={colors.ink3}>
                    {I18nManager.isRTL ? '‹' : '›'}
                  </T>
                </Pressable>
              ))}
            </Card>

            <LanguageCard />

            <OutlineButton
              label={t('auth.signOut')}
              tone="danger"
              onPress={() => {
                void signOut().then(() => router.replace('/welcome'));
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Arabic / English switch. Rendered for signed-in customers *and* guests —
 * a first-time visitor has no account yet and still has to be able to read
 * the app.
 */
function LanguageCard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const current = (i18n.language as Locale) in localeNames ? (i18n.language as Locale) : 'ar';

  return (
    <Pressable onPress={() => router.push('/language')}>
      <Card style={styles.languageRow}>
        <T variant="bodyLg" style={{ fontFamily: font.medium, fontSize: 14 }}>
          {t('common.language')}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T variant="body" color={colors.ink2}>
            {localeNames[current]}
          </T>
          <T variant="bodyLg" color={colors.ink3}>
            {I18nManager.isRTL ? '‹' : '›'}
          </T>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  guestCard: { alignItems: 'center', gap: 14, paddingVertical: 32, paddingHorizontal: 24 },
  guestIcon: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: accentTint(0.14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  body: { paddingHorizontal: 20, gap: 20 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 17 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },

  row: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderBottomWidth: 1,
    borderBottomColor: onSurface(0.05),
  },
  rowMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 17,
  },
  segment: {
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
  },
  segmentItem: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8 },
  segmentItemActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
