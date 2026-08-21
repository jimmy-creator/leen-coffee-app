import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatAddressLine } from '@leen/lib';
import { fetchAddresses, setDefaultAddress } from '../lib/queries';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { colors, border, font } from '../lib/theme';
import { onSurface, brandTint } from '@leen/ui/palette';
import { PinIcon } from '../components/icons';
import { BackButton, Card, EmptyState, PrimaryButton, T } from '../components/primitives';

type Address = Awaited<ReturnType<typeof fetchAddresses>>[number];

export default function Addresses() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useSession();

  const [addresses, setAddresses] = useState<Address[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setAddresses(await fetchAddresses());
    } catch {
      setAddresses([]);
    }
  }, [userId]);

  // Reload on focus so an address added in the modal shows up on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function makeDefault(id: number) {
    if (!userId) return;
    await setDefaultAddress(userId, id);
    await load();
  }

  async function remove(id: number) {
    await supabase.from('addresses').delete().eq('id', id);
    await load();
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => router.back()} />
        <T variant="h3" style={{ fontSize: 18 }}>
          {t('addresses.title')}
        </T>
      </View>

      {!userId ? (
        <EmptyState
          icon={<PinIcon size={26} color={colors.accent} />}
          title={t('profile.guest')}
          body={t('profile.guestBody')}
          action={<PrimaryButton label={t('auth.signIn')} onPress={() => router.push('/auth')} />}
        />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={<PinIcon size={26} color={colors.accent} />}
          title={t('addresses.emptyTitle')}
          body={t('addresses.emptyBody')}
          action={
            <PrimaryButton
              label={t('addresses.add')}
              onPress={() => router.push('/address-form')}
              style={{ paddingHorizontal: 24 }}
            />
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {addresses.map((address) => (
            <Card
              key={address.id}
              style={[
                styles.card,
                address.is_default && { borderColor: colors.brand, borderWidth: 1.5 },
              ]}
            >
              <View style={styles.cardHead}>
                <View style={{ gap: 5, flex: 1 }}>
                  <T variant="label" style={{ fontSize: 14 }}>
                    {address.label}
                  </T>
                  <T variant="caption" color={colors.ink2} style={{ lineHeight: 20 }}>
                    {formatAddressLine(address)}
                  </T>
                </View>
                {address.is_default ? (
                  <View style={styles.defaultBadge}>
                    <T variant="micro" color={colors.bg} style={{ fontSize: 10.5 }}>
                      {t('addresses.default')}
                    </T>
                  </View>
                ) : null}
              </View>

              <View style={styles.actions}>
                <Pressable onPress={() => void remove(address.id)} style={styles.action}>
                  <T variant="micro" style={{ fontSize: 12.5, fontFamily: font.semibold }}>
                    {t('common.delete')}
                  </T>
                </Pressable>
                {!address.is_default ? (
                  <Pressable onPress={() => void makeDefault(address.id)} style={styles.action}>
                    <T variant="micro" style={{ fontSize: 12.5, fontFamily: font.semibold }}>
                      {t('addresses.setDefault')}
                    </T>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          ))}

          <Pressable onPress={() => router.push('/address-form')} style={styles.addButton}>
            <T variant="label" color={colors.brandMid} style={{ fontSize: 14 }}>
              {t('addresses.add')}
            </T>
          </Pressable>
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
  scroll: { padding: 20, gap: 12 },
  card: { padding: 16, gap: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  defaultBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: brandTint(0.9),
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: border.hair,
  },
  action: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: border.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: onSurface(0.25),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
