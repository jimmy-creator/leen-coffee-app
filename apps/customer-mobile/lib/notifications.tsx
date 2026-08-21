import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import type { Tables } from '@leen/api-client';
import { supabase } from './supabase';
import { useSession } from './session';
import { colors } from './theme';

export type LeenNotification = Tables<'notifications'>;

interface NotificationValue {
  items: LeenNotification[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationValue>({
  items: [],
  unread: 0,
  loading: true,
  refresh: async () => {},
  markAllRead: async () => {},
});

/**
 * How a notification behaves while the app is open.
 *
 * Banners are shown in the foreground on purpose: the whole point of "your
 * order is on the way" is that it reaches the customer, and swallowing it
 * because they happen to be browsing would be the wrong call.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register this device for push and store the token against the account.
 *
 * Returns null rather than throwing on every ordinary reason it cannot work —
 * a simulator, a declined permission prompt — because none of those should
 * interrupt someone who just wanted to browse coffee.
 */
export async function registerForPush(userId: string): Promise<string | null> {
  // Push needs real hardware; a simulator has no APNs/FCM token to give.
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    // Android 8+ ignores any notification that arrives without a channel.
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.brand,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    // Only ask once — asking again after a refusal is how apps get muted.
    if (!existing.canAskAgain) return null;
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
        { onConflict: 'token' },
      );

    return token;
  } catch {
    // No network, or a build without the native module. Not worth surfacing.
    return null;
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { userId, ready } = useSession();
  const [items, setItems] = useState<LeenNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setItems(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);

  // Register for push once there is an account to attach the token to.
  useEffect(() => {
    if (userId) void registerForPush(userId);
  }, [userId]);

  /**
   * New rows arrive over realtime, so the bell's unread count moves without the
   * customer pulling to refresh. RLS applies here too — this stream only
   * carries rows the account's own policies already allow.
   */
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // A push that lands while the app is open should also update the list.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => void refresh());
    return () => sub.remove();
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null);
  }, [userId]);

  const value = useMemo<NotificationValue>(
    () => ({
      items,
      unread: items.filter((n) => !n.read_at).length,
      loading,
      refresh,
      markAllRead,
    }),
    [items, loading, refresh, markAllRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationValue {
  return useContext(NotificationContext);
}
