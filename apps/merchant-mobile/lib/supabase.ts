import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database, LeenClient } from '@leen/api-client';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local at the repo root, or check the eas.json build profile.',
  );
}

/**
 * Typed Supabase client with AsyncStorage-backed session persistence.
 *
 * The `LeenClient` annotation is load-bearing, not decoration: without it TS
 * tries to name the inferred type through a path inside node_modules and fails
 * with "cannot be named without a reference to…".
 */
export const supabase: LeenClient = createClient<Database>(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // There is no URL to read a session out of in a native app.
    detectSessionInUrl: false,
  },
});
