import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '../lib/session';
import { colors } from '../lib/theme';

const SEEN_ONBOARDING_KEY = 'leen.onboarded.v1';

/**
 * Entry point. Decides between onboarding and the app, then gets out of the way.
 *
 * Waits for `ready` so a returning customer is not bounced through the welcome
 * screen while the persisted session is still being read out of storage. Guests
 * who chose "Browse as a guest" have seen onboarding too, so they land straight
 * on Home on the next launch.
 */
export default function Index() {
  const router = useRouter();
  const { session, ready } = useSession();

  useEffect(() => {
    if (!ready) return;
    void (async () => {
      if (session) {
        router.replace('/(tabs)');
        return;
      }
      const seen = await AsyncStorage.getItem(SEEN_ONBOARDING_KEY);
      router.replace(seen ? '/(tabs)' : '/welcome');
    })();
  }, [ready, session, router]);

  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

export { SEEN_ONBOARDING_KEY };
