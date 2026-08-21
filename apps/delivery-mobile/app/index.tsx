import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatSar } from '@leen/lib';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import {
  acceptJob,
  advanceJob,
  fetchAvailableJobs,
  fetchMyJobs,
  fetchMyRiderProfile,
  nextStatus,
  readAddressSnapshot,
  setOnline,
} from '../lib/deliveries';
import { colors, border, font } from '../lib/theme';
import { onBrand, brandTint, accentTint, dangerTint } from '@leen/ui/palette';
import { Card, EmptyState, Num, OutlineButton, PrimaryButton, T } from '../components/primitives';

type Job = Awaited<ReturnType<typeof fetchAvailableJobs>>[number];
type RiderProfile = Awaited<ReturnType<typeof fetchMyRiderProfile>>;

const ADVANCE_LABEL: Record<string, string> = {
  ready: 'Picked up',
  picked_up: 'Delivered',
};

export default function Jobs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, ready, signOut } = useSession();

  const [profile, setProfile] = useState<RiderProfile>(null);
  const [mine, setMine] = useState<Job[]>([]);
  const [available, setAvailable] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !userId) router.replace('/sign-in');
  }, [ready, userId, router]);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [p, m, a] = await Promise.all([
        fetchMyRiderProfile(),
        fetchMyJobs(userId),
        fetchAvailableJobs(),
      ]);
      setProfile(p);
      setMine(m);
      setAvailable(a);
    } catch {
      setAvailable([]);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Jobs are first-come-first-served, so the board has to stay live or a rider
  // spends their day tapping jobs somebody else already took.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('rider-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_orders' }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  async function claim(job: Job) {
    setNotice(null);
    try {
      const won = await acceptJob(job.id);
      if (!won) setNotice('Another rider took that one.');
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not accept that job.');
    }
  }

  if (profile && !profile.is_approved) {
    return (
      <View style={styles.root}>
        <EmptyState
          icon={<View style={styles.mark} />}
          title="Waiting for approval"
          body="Leen reviews every rider before the first delivery. You will be able to accept jobs as soon as that is done."
          action={<OutlineButton label="Sign out" tone="danger" onPress={() => void signOut()} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1, gap: 3 }}>
          <T variant="kicker" color={onBrand(0.6)}>
            LEEN · RIDER
          </T>
          <T variant="h3" color={colors.bg}>
            {profile?.is_online ? 'You are online' : 'You are offline'}
          </T>
        </View>
        {userId ? (
          <Switch
            value={profile?.is_online ?? false}
            onValueChange={(v) => {
              setProfile((p) => (p ? { ...p, is_online: v } : p));
              void setOnline(userId, v).then(load);
            }}
            trackColor={{ true: colors.accent, false: onBrand(0.25) }}
          />
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load().then(() => setRefreshing(false));
            }}
          />
        }
      >
        {notice ? (
          <View style={styles.notice}>
            <T variant="caption" color={colors.dangerInk}>
              {notice}
            </T>
          </View>
        ) : null}

        {mine.length > 0 ? (
          <>
            <T variant="label" color={colors.ink2}>
              Carrying now
            </T>
            {mine.map((job) => {
              const next = nextStatus(job.status);
              return (
                <Card key={job.id} style={{ gap: 12 }}>
                  <JobHeader job={job} />
                  {next ? (
                    <PrimaryButton
                      label={ADVANCE_LABEL[job.status] ?? 'Advance'}
                      onPress={() => void advanceJob(job.id, next).then(load)}
                      style={{ height: 48, backgroundColor: colors.brandMid }}
                    />
                  ) : (
                    <View style={styles.pendingRoastery}>
                      <T variant="caption" color={colors.brandMid}>
                        The roastery is still preparing this order
                      </T>
                    </View>
                  )}
                </Card>
              );
            })}
          </>
        ) : null}

        <T variant="label" color={colors.ink2}>
          Available
        </T>

        {available.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
            <T variant="label">Nothing waiting</T>
            <T variant="caption" color={colors.ink2}>
              New jobs appear here as roasteries confirm orders.
            </T>
          </Card>
        ) : (
          available.map((job) => (
            <Card key={job.id} style={{ gap: 12 }}>
              <JobHeader job={job} />
              <PrimaryButton
                label="Accept"
                onPress={() => void claim(job)}
                style={{ height: 48, backgroundColor: colors.brandMid }}
              />
            </Card>
          ))
        )}

        <Pressable onPress={() => void signOut()} style={{ alignSelf: 'center', padding: 12 }}>
          <T variant="caption" color={colors.danger} style={{ fontFamily: font.semibold }}>
            Sign out
          </T>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function JobHeader({ job }: { job: Job }) {
  // The snapshot is the address as it was at checkout, which is what the rider
  // must navigate to even if the customer has since edited the saved address.
  const snapshot = readAddressSnapshot(job.orders?.address_snapshot);

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1, gap: 3 }}>
          <T variant="kicker" color={colors.ink3}>
            {job.orders?.code ?? ''}
          </T>
          <T variant="label">{job.merchants?.name_en ?? ''}</T>
        </View>
        {job.orders?.payment_method === 'cash_on_delivery' ? (
          <View style={styles.cashPill}>
            <T variant="micro" color={colors.dangerInk}>
              COLLECT CASH
            </T>
          </View>
        ) : null}
      </View>

      <View style={styles.legRow}>
        <View style={[styles.legDot, { backgroundColor: colors.accent }]} />
        <T variant="caption" color={colors.ink2} style={{ flex: 1 }}>
          {[job.merchants?.district_en, job.merchants?.city_en].filter(Boolean).join(', ')}
        </T>
      </View>
      <View style={styles.legRow}>
        <View style={[styles.legDot, { backgroundColor: colors.live }]} />
        <T variant="caption" color={colors.ink2} style={{ flex: 1 }}>
          {snapshot
            ? [snapshot.street, snapshot.district, snapshot.city].filter(Boolean).join(', ')
            : 'Pickup at the roastery'}
        </T>
      </View>

      <View style={styles.cardFoot}>
        <T variant="caption" color={colors.ink2}>
          Order value
        </T>
        <Num variant="label">{formatSar(job.orders?.total_minor ?? 0, 'en')}</Num>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.brandMid,
  },
  list: { padding: 20, gap: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cashPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: dangerTint(0.12),
  },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  legDot: { width: 8, height: 8, borderRadius: 999 },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: border.hair,
    paddingTop: 10,
    marginTop: 2,
  },
  pendingRoastery: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: accentTint(0.1),
    alignItems: 'center',
  },
  notice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: dangerTint(0.09),
  },
  mark: {
    width: 26,
    height: 34,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: brandTint(0.28),
    transform: [{ rotate: '-18deg' }],
  },
});
