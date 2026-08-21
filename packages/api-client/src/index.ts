import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types.js';

/**
 * Supabase client factories shared across the six Leen apps, typed against the
 * generated schema. Regenerate the types after any migration with:
 *   pnpm db:types            (local stack)
 *   supabase gen types typescript --linked --schema public > packages/api-client/src/database.types.ts
 */

export type LeenClient = SupabaseClient<Database>;

export function createAnonClient(url: string, anonKey: string): LeenClient {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

/**
 * Service-role client — bypasses RLS entirely. SERVER ONLY: Edge Functions and
 * Next.js server routes. Importing this into a client bundle would ship the key
 * to the browser.
 */
export function createServiceClient(url: string, serviceRoleKey: string): LeenClient {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type { Database, Json, SupabaseClient };

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums = Database['public']['Enums'];

/** Row shapes the apps refer to often enough to deserve a name. */
export type Merchant = Tables<'merchants'>;
export type Product = Tables<'products'>;
export type Address = Tables<'addresses'>;
export type CartItem = Tables<'cart_items'>;
export type Order = Tables<'orders'>;
export type SubOrder = Tables<'sub_orders'>;
export type OrderItem = Tables<'order_items'>;
export type SubscriptionPlan = Tables<'subscription_plans'>;
export type Subscription = Tables<'subscriptions'>;
export type LoyaltyAccount = Tables<'loyalty_accounts'>;
export type Reward = Tables<'rewards'>;
export type Banner = Tables<'banners'>;
export type Profile = Tables<'profiles'>;
