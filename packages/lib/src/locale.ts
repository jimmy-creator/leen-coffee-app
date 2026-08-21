import type { Locale } from '@leen/types';

/**
 * Pick the localized value from a record's `_en` / `_ar` pair.
 *
 * Falls back to English when the Arabic is missing — merchants onboard in one
 * language first, and a half-filled listing should still render.
 */
export function pickLocale(
  en: string | null | undefined,
  ar: string | null | undefined,
  locale: Locale,
): string {
  if (locale === 'ar' && ar) return ar;
  return en ?? ar ?? '';
}

/** Locales that lay out right-to-left. */
export function isRtl(locale: Locale): boolean {
  return locale === 'ar';
}
