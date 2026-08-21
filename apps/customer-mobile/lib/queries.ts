import { normalizeQuery } from '@leen/lib';
import { supabase } from './supabase';

/**
 * Every read the customer app makes, in one place.
 *
 * The column lists are explicit rather than `select('*')`: the storefront reads
 * these tables on every screen, and shipping columns nobody renders is bandwidth
 * a customer on mobile data pays for.
 *
 * Each list is a SINGLE template literal — never assembled with `+`. supabase-js
 * derives the row type from the *literal* type of the select string, and
 * concatenating two literals produces plain `string`, which makes every result
 * collapse to `GenericStringError`. A multi-line template literal keeps the
 * literal type intact and stays readable.
 */

const PRODUCT_CARD_COLUMNS = `
  id, name_en, name_ar, notes_en, notes_ar, roast_level, base_price_minor,
  image_url, roasted_on, stock_qty, merchant_id,
  merchants ( id, name_en, name_ar )
`;

const PRODUCT_DETAIL_COLUMNS = `
  id, name_en, name_ar, notes_en, notes_ar, about_en, about_ar, roast_level, process,
  origin_en, origin_ar, altitude_en, altitude_ar, variety_en, variety_ar,
  base_price_minor, image_url, roasted_on, stock_qty, merchant_id,
  merchants ( id, name_en, name_ar, logo_url )
`;

const MERCHANT_CARD_COLUMNS = `
  id, name_en, name_ar, city_en, city_ar, district_en, district_ar,
  rating, eta_min_minutes, eta_max_minutes, cover_url, logo_url
`;

const MERCHANT_LIST_COLUMNS = `
  id, name_en, name_ar, tagline_en, tagline_ar, city_en, city_ar,
  district_en, district_ar, rating, rating_count,
  eta_min_minutes, eta_max_minutes, cover_url, logo_url, is_open
`;

const MERCHANT_DETAIL_COLUMNS = `
  id, name_en, name_ar, tagline_en, tagline_ar, about_en, about_ar,
  city_en, city_ar, district_en, district_ar, rating, rating_count,
  eta_min_minutes, eta_max_minutes, established_year, cover_url, logo_url, is_open
`;

const MY_ORDER_COLUMNS = `
  id, code, status, placed_at, total_minor,
  sub_orders (
    id, status,
    merchants ( name_en, name_ar ),
    order_items ( id, name_en, name_ar, qty )
  )
`;

export async function fetchHomeFeed() {
  // Three independent reads; run them together so the home screen waits for the
  // slowest rather than the sum of all three.
  const [banners, merchants, fresh] = await Promise.all([
    supabase
      .from('banners')
      .select(
        'id, kicker_en, kicker_ar, title_en, title_ar, subtitle_en, subtitle_ar, image_url, target_path',
      )
      .order('sort_order')
      .limit(5),
    supabase
      .from('merchants')
      .select(MERCHANT_CARD_COLUMNS)
      .order('rating', { ascending: false })
      .limit(10),
    supabase
      .from('products')
      .select(PRODUCT_CARD_COLUMNS)
      // "Fresh roast" means the most recently roasted lots, so this is ordered
      // by roast date, not by when the row happened to be created.
      .order('roasted_on', { ascending: false, nullsFirst: false })
      .limit(8),
  ]);

  const error = banners.error ?? merchants.error ?? fresh.error;
  if (error) throw error;

  return {
    banners: banners.data ?? [],
    merchants: merchants.data ?? [],
    freshRoast: fresh.data ?? [],
  };
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name_en, name_ar')
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export interface SearchFilters {
  categorySlug?: string | null;
  /**
   * Saudi-origin lots only. Matched on the origin text, which is where the
   * country actually lives — there is no separate country column.
   */
  saudiOnly?: boolean;
  lightRoastOnly?: boolean;
  /** "Under 80 SAR" — compared against the 250 g reference price. */
  maxPriceMinor?: number | null;
  espressoOnly?: boolean;
}

export async function searchProducts(query: string, filters: SearchFilters = {}) {
  let q = supabase.from('products').select(PRODUCT_CARD_COLUMNS).limit(50);

  const needle = normalizeQuery(query);
  if (needle) {
    // `search_key` is the diacritic-folded column the database maintains by
    // trigger, so "قهوه" matches "قهوة" and "khawlani" matches "Khawlani".
    q = q.like('search_key', `%${needle}%`);
  }

  if (filters.saudiOnly) {
    q = q.or('origin_en.ilike.%Saudi%,origin_ar.ilike.%السعودية%');
  }
  if (filters.lightRoastOnly) {
    q = q.eq('roast_level', 'light');
  }
  if (filters.espressoOnly) {
    // "Espresso" as a filter means a roast dark enough to pull as espresso.
    q = q.in('roast_level', ['medium_dark', 'dark']);
  }
  if (filters.maxPriceMinor) {
    q = q.lt('base_price_minor', filters.maxPriceMinor);
  }
  if (filters.categorySlug && filters.categorySlug !== 'all') {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filters.categorySlug)
      .maybeSingle();
    if (cat) q = q.eq('category_id', cat.id);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Every listed roastery, for the "Roasters near you → See all" page.
 *
 * Ordered by rating rather than distance despite the section's name: the app
 * does not yet know where the customer is until they save an address, and
 * "near you" ordered arbitrarily would be worse than "best first". Sorting by
 * real distance is a change to make once addresses carry coordinates for
 * everyone — `merchants.lat/lng` and `addresses.lat/lng` are both already
 * populated, and `distanceKm` in `@leen/lib` is waiting for it.
 */
export async function fetchAllMerchants() {
  const { data, error } = await supabase
    .from('merchants')
    .select(MERCHANT_LIST_COLUMNS)
    .order('rating', { ascending: false })
    .order('rating_count', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMerchant(id: number) {
  const [merchant, products] = await Promise.all([
    supabase.from('merchants').select(MERCHANT_DETAIL_COLUMNS).eq('id', id).single(),
    supabase.from('products').select(PRODUCT_CARD_COLUMNS).eq('merchant_id', id),
  ]);

  if (merchant.error) throw merchant.error;
  if (products.error) throw products.error;
  return { merchant: merchant.data, products: products.data ?? [] };
}

export async function fetchProduct(id: number) {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_DETAIL_COLUMNS)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAddresses() {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Make one address the default.
 *
 * Two statements rather than one: a partial unique index allows exactly one
 * default row per customer, so the old default has to be cleared before the new
 * one is set or the second write collides with the index.
 */
export async function setDefaultAddress(userId: string, addressId: number) {
  await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);

  const { error } = await supabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addressId);
  if (error) throw error;
}

export async function fetchSubscriptionPlans() {
  const { data, error } = await supabase.from('subscription_plans').select('*').order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function fetchMySubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'id, frequency, grind, status, next_delivery_on, subscription_plans ( name_en, name_ar, price_minor )',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchLoyalty() {
  const [account, rewards] = await Promise.all([
    supabase.from('loyalty_accounts').select('points, lifetime_points, tier').maybeSingle(),
    supabase.from('rewards').select('*').order('sort_order'),
  ]);
  if (account.error) throw account.error;
  if (rewards.error) throw rewards.error;
  return { account: account.data, rewards: rewards.data ?? [] };
}

export async function fetchMyOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(MY_ORDER_COLUMNS)
    .order('placed_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

/** Everything the tracking screen shows, rider included, in one call. */
export async function fetchOrderTracking(code: string) {
  const { data, error } = await supabase.rpc('order_tracking', { p_order_code: code });
  if (error) throw error;
  return data ?? [];
}

/** Price the current cart. Delivery, VAT, promo and total all come from here. */
export async function previewCartTotal(fulfilment: string, promoCode: string | null) {
  const { data, error } = await supabase.rpc('preview_cart_total', {
    p_fulfilment: fulfilment,
    // The RPC parameters are optional, so 'no promo' is undefined, not null.
    p_promo_code: promoCode ?? undefined,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function placeOrder(args: {
  addressId: number | null;
  fulfilment: string;
  paymentMethod: string;
  promoCode: string | null;
}) {
  const { data, error } = await supabase.rpc('place_order', {
    // Pickup orders genuinely have no address; the parameter is optional.
    p_address_id: args.addressId ?? undefined,
    p_fulfilment: args.fulfilment,
    p_payment_method: args.paymentMethod,
    p_promo_code: args.promoCode ?? undefined,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function redeemReward(rewardId: number) {
  const { error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId });
  if (error) throw error;
}
