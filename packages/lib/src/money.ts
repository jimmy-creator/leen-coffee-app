import { VAT_RATE, type MinorUnits } from '@leen/types';

/**
 * All money in Leen is stored as an integer number of halalas (1 SAR = 100).
 * These helpers are the only sanctioned way to convert and format it, so
 * floating-point drift never reaches the database or an invoice.
 */

const HALALAS_PER_SAR = 100;

/** Convert a major-unit decimal (user input `78.5`) to halalas (`7850`). */
export function toMinorUnits(sar: number): MinorUnits {
  return Math.round(sar * HALALAS_PER_SAR);
}

/** Convert halalas (`7850`) back to a major-unit number (`78.5`). */
export function toMajorUnits(minor: MinorUnits): number {
  return minor / HALALAS_PER_SAR;
}

/**
 * VAT on a taxable base, rounded to the nearest halala.
 *
 * Saudi VAT applies to the goods subtotal *and* the delivery fee, so callers
 * must pass the combined figure — not the goods subtotal alone.
 */
export function calcVatMinor(taxableBaseMinor: MinorUnits): MinorUnits {
  return Math.round(taxableBaseMinor * VAT_RATE);
}

/**
 * Platform commission on a merchant's slice of an order. Derived on the server
 * at payment capture — a client-supplied value is never trusted.
 */
export function calcCommissionMinor(subtotalMinor: MinorUnits, ratePercent: number): MinorUnits {
  return Math.round((subtotalMinor * ratePercent) / 100);
}

/**
 * Format halalas for display, e.g. `SAR 78.00` / `٧٨٫٠٠ ر.س`.
 * Display only — never feed the result back into arithmetic.
 */
export function formatSar(minor: MinorUnits, locale: 'en' | 'ar' = 'ar'): string {
  const intlLocale = locale === 'ar' ? 'ar-SA' : 'en-SA';
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'SAR',
    numberingSystem: locale === 'ar' ? 'arab' : 'latn',
  }).format(toMajorUnits(minor));
}

/** Render a plain integer in the locale's digits (Arabic-Indic for `ar`). */
export function formatCount(n: number, locale: 'en' | 'ar' = 'ar'): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
    numberingSystem: locale === 'ar' ? 'arab' : 'latn',
  }).format(n);
}
