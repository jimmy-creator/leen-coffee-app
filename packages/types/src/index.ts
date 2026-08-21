/**
 * Domain vocabulary shared by every Leen Coffee app.
 *
 * These are hand-written business types. The generated Postgres row types live
 * in `@leen/api-client` (`database.types.ts`) — import those when you need the
 * exact shape of a table; import these when you need the concept.
 */

/** Supported UI locales. Arabic is the default: Leen is a Saudi product. */
export type Locale = 'en' | 'ar';

/**
 * Money is stored as an integer count of halalas (1 SAR = 100 halalas) so no
 * float ever reaches the database. Use the `@leen/lib` money helpers to convert.
 */
export type MinorUnits = number;

/** ISO-4217. Leen sells in Saudi Riyal only. */
export const CURRENCY = 'SAR' as const;

/** Saudi VAT, applied to the goods + delivery subtotal at checkout. */
export const VAT_RATE = 0.15 as const;

/** Who a signed-in account acts as. One row per user in `public.profiles`. */
export type UserRole = 'customer' | 'merchant' | 'rider' | 'admin';

/** How dark the bean was roasted — drives the badge on every product card. */
export type RoastLevel = 'light' | 'medium' | 'medium_dark' | 'dark';

/** Post-harvest processing, shown on the product spec grid. */
export type ProcessMethod = 'washed' | 'natural' | 'honey' | 'anaerobic' | 'pulped_natural';

/**
 * Grind the roaster performs before packing. `whole_bean` is the default —
 * ground coffee stales fast, so we only grind to order.
 */
export type GrindOption = 'whole_bean' | 'espresso' | 'filter' | 'turkish';

/** Bag sizes Leen sells. Price scales by the variant's multiplier, not linearly. */
export type BagWeight = 250 | 500 | 1000;

/** How the customer receives the order. Pickup is free. */
export type FulfilmentMethod = 'standard' | 'express' | 'pickup';

/** Payment rails available in Saudi Arabia. */
export type PaymentMethod = 'mada' | 'apple_pay' | 'stc_pay' | 'cash_on_delivery';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

/**
 * Order lifecycle. A `sub_order` (one merchant's slice of a basket) walks this
 * same ladder independently — one basket can span several roasters.
 */
export type OrderStatus =
  'pending' | 'confirmed' | 'roasting' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';

/** Subscription cadence offered on the Subscribe tab. */
export type SubscriptionFrequency = 'weekly' | 'biweekly' | 'monthly';

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

/** Leen Rewards tiers, ascending. */
export type LoyaltyTier = 'qahwa_bronze' | 'qahwa_silver' | 'qahwa_gold' | 'qahwa_black';

/** A `_en` / `_ar` pair as it comes back from Postgres. */
export interface Localized {
  en: string;
  ar: string | null;
}

/** WGS-84 point. Stored as two numeric columns, never as a string. */
export interface LatLng {
  lat: number;
  lng: number;
}
