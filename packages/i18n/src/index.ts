import en from './locales/en.json' with { type: 'json' };
import ar from './locales/ar.json' with { type: 'json' };
import ur from './locales/ur.json' with { type: 'json' };
import hi from './locales/hi.json' with { type: 'json' };
import bn from './locales/bn.json' with { type: 'json' };
import ta from './locales/ta.json' with { type: 'json' };
import ml from './locales/ml.json' with { type: 'json' };
import fil from './locales/fil.json' with { type: 'json' };
import faAF from './locales/fa-AF.json' with { type: 'json' };

/**
 * Shared UI chrome strings. Merchant-supplied content — product names, tasting
 * notes, roastery descriptions — is NOT translated here; it comes from the
 * database as an `_en` / `_ar` column pair and is resolved with `pickLocale`.
 *
 * The language list is not arbitrary. Saudi Arabia's delivery and hospitality
 * workforce is overwhelmingly South and Southeast Asian, so Urdu, Hindi,
 * Bengali, Tamil, Malayalam, Filipino and Dari are the languages a large share
 * of both customers and riders actually read. They are first-class here rather
 * than an afterthought.
 */
export const resources = {
  en: { translation: en },
  ar: { translation: ar },
  ur: { translation: ur },
  hi: { translation: hi },
  bn: { translation: bn },
  ta: { translation: ta },
  ml: { translation: ml },
  fil: { translation: fil },
  'fa-AF': { translation: faAF },
} as const;

export type Locale = keyof typeof resources;

export const supportedLocales: Locale[] = [
  'ar',
  'en',
  'ur',
  'hi',
  'bn',
  'ta',
  'ml',
  'fil',
  'fa-AF',
];

/** Arabic is the default: Leen is a Saudi product sold to Saudi customers. */
export const defaultLocale: Locale = 'ar';

/**
 * Locales that lay out right-to-left. Urdu and Dari use the Perso-Arabic
 * script; the rest of the added languages are left-to-right despite several
 * using non-Latin scripts, which is a distinction worth keeping straight —
 * script and direction are not the same question.
 */
export const rtlLocales: Locale[] = ['ar', 'ur', 'fa-AF'];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

/**
 * How each language names itself. Always the endonym: someone who cannot read
 * the current interface language needs to find their own in a list, and
 * "Urdu" is no help to a reader who only reads اردو.
 */
export const localeNames: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  ur: 'اردو',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  ml: 'മലയാളം',
  fil: 'Filipino',
  'fa-AF': 'دری',
};

/** Short label for a compact toggle, where the full endonym will not fit. */
export const localeShortNames: Record<Locale, string> = {
  ar: 'ع',
  en: 'EN',
  ur: 'اردو',
  hi: 'हि',
  bn: 'বাং',
  ta: 'த',
  ml: 'മ',
  fil: 'FIL',
  'fa-AF': 'دری',
};

export { en, ar, ur, hi, bn, ta, ml, fil, faAF };
