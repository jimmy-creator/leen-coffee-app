import { useTranslation } from 'react-i18next';
import { formatSar, formatCount, pickLocale } from '@leen/lib';
import type { Locale as AppLocale } from '@leen/i18n';
import type { Locale as ContentLocale } from '@leen/types';

/**
 * Locale-aware formatting.
 *
 * Two different notions of "locale" meet here and they are not the same thing:
 *
 *   * The **UI locale** is one of nine, and decides how numbers and dates are
 *     formatted.
 *   * The **content locale** is only ever `en` or `ar`, because merchant-supplied
 *     text — product names, tasting notes — exists in the database as an
 *     `_en` / `_ar` pair and nothing else. A Tamil reader gets the English
 *     product name, which is the honest fallback rather than a machine
 *     translation of a coffee's tasting notes.
 */

/** BCP-47 tag for Intl, per UI locale. */
const INTL_TAG: Record<AppLocale, string> = {
  ar: 'ar-SA',
  en: 'en-SA',
  ur: 'ur-PK',
  hi: 'hi-IN',
  bn: 'bn-BD',
  ta: 'ta-IN',
  ml: 'ml-IN',
  fil: 'fil-PH',
  'fa-AF': 'fa-AF',
};

/**
 * Which locales render digits in Arabic-Indic form.
 *
 * Arabic does, and the design calls for it. Urdu and Dari are written in the
 * same script but overwhelmingly use Western digits in modern commercial
 * contexts, so they stay Latin — script and numeral system are separate
 * questions, and getting this wrong makes a price look foreign to the reader.
 */
const ARABIC_DIGITS: AppLocale[] = ['ar'];

export function useFormat() {
  const { i18n } = useTranslation();

  const raw = i18n.language as AppLocale;
  const locale: AppLocale = raw in INTL_TAG ? raw : 'ar';

  /** Only `ar` has translated content in the database; everything else reads English. */
  const contentLocale: ContentLocale = locale === 'ar' ? 'ar' : 'en';

  const tag = INTL_TAG[locale];
  const numbering = ARABIC_DIGITS.includes(locale) ? 'arab' : 'latn';

  return {
    locale: contentLocale,
    uiLocale: locale,
    isArabic: locale === 'ar',
    /** Halalas → "SAR 78.00" / "٧٨٫٠٠ ر.س". */
    money: (minor: number) => formatSar(minor, contentLocale),
    /** Plain integer in the UI locale's digits. */
    num: (n: number) => new Intl.NumberFormat(tag, { numberingSystem: numbering }).format(n),
    /** Resolve an `_en` / `_ar` column pair. */
    pick: (en: string | null | undefined, ar: string | null | undefined) =>
      pickLocale(en, ar, contentLocale),
    /** "14:35", for delivery ETAs. */
    time: (d: Date) =>
      new Intl.DateTimeFormat(tag, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        numberingSystem: numbering,
      }).format(d),
    /** "21 Aug" — subscription next-delivery dates, order history. */
    date: (d: Date) =>
      new Intl.DateTimeFormat(tag, {
        day: 'numeric',
        month: 'short',
        numberingSystem: numbering,
      }).format(d),
  };
}

export type Formatter = ReturnType<typeof useFormat>;

// `formatCount` is superseded by the Intl call above, which knows the UI locale
// rather than assuming en/ar. Re-exported so other apps can still reach it.
export { formatCount };
