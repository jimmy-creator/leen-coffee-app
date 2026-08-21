import type { BagWeight, GrindOption, MinorUnits, RoastLevel } from '@leen/types';

/**
 * Price multiplier per bag size. Deliberately sub-linear: a 1 kg bag is 3.4×
 * a 250 g bag, not 4×, because packing and shipping do not scale with weight.
 * The 250 g price stored on `products.base_price_minor` is the reference.
 */
export const WEIGHT_MULTIPLIER: Record<BagWeight, number> = {
  250: 1,
  500: 1.85,
  1000: 3.4,
};

export const BAG_WEIGHTS: BagWeight[] = [250, 500, 1000];

export const GRIND_OPTIONS: GrindOption[] = ['whole_bean', 'espresso', 'filter', 'turkish'];

/** Price for one bag of a given size, in halalas. */
export function variantPriceMinor(basePriceMinor: MinorUnits, weight: BagWeight): MinorUnits {
  return Math.round(basePriceMinor * WEIGHT_MULTIPLIER[weight]);
}

/** Price for a cart line: one variant, `qty` times. */
export function lineTotalMinor(
  basePriceMinor: MinorUnits,
  weight: BagWeight,
  qty: number,
): MinorUnits {
  return variantPriceMinor(basePriceMinor, weight) * qty;
}

/**
 * Leen's freshness promise: nothing older than 21 days leaves a roastery.
 * The customer app surfaces the roast date on every bag, so this is the single
 * definition of "still sellable" that the merchant and admin apps also use.
 */
export const MAX_ROAST_AGE_DAYS = 21;

/** Whole days elapsed since roasting. Negative for a future-dated roast. */
export function daysSinceRoast(roastedOn: string | Date, now: Date = new Date()): number {
  const roasted = typeof roastedOn === 'string' ? new Date(roastedOn) : roastedOn;
  const ms = now.getTime() - roasted.getTime();
  return Math.floor(ms / 86_400_000);
}

export function isWithinFreshnessWindow(roastedOn: string | Date, now: Date = new Date()): boolean {
  const age = daysSinceRoast(roastedOn, now);
  return age >= 0 && age <= MAX_ROAST_AGE_DAYS;
}

/** Ordering used wherever roast levels are listed, lightest first. */
export const ROAST_ORDER: RoastLevel[] = ['light', 'medium', 'medium_dark', 'dark'];
