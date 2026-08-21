import en from './locales/en.json' with { type: 'json' };
import ar from './locales/ar.json' with { type: 'json' };

/**
 * Shared UI chrome strings. Merchant-supplied content — product names, tasting
 * notes, roastery descriptions — is NOT translated here; it comes from the
 * database as an `_en` / `_ar` column pair and is resolved with `pickLocale`.
 */
export const resources = {
  en: { translation: en },
  ar: { translation: ar },
} as const;

export type Locale = keyof typeof resources;

export const supportedLocales: Locale[] = ['en', 'ar'];

/** Arabic is the default: Leen is a Saudi product sold to Saudi customers. */
export const defaultLocale: Locale = 'ar';

export const rtlLocales: Locale[] = ['ar'];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export { en, ar };
