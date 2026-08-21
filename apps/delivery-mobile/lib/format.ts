import { useTranslation } from 'react-i18next';
import { formatSar, formatCount, pickLocale } from '@leen/lib';
import type { Locale } from '@leen/types';

/**
 * Locale-aware formatting hooks.
 *
 * Arabic in this app uses Arabic-Indic digits (٠١٢٣…) everywhere the design
 * shows them, which `Intl.NumberFormat` handles once you ask for the `arab`
 * numbering system. Doing it by hand with a digit-substitution table — as the
 * prototype did — breaks on decimal separators and grouping.
 */
export function useFormat() {
  const { i18n } = useTranslation();
  const locale = (i18n.language === 'ar' ? 'ar' : 'en') as Locale;
  const isArabic = locale === 'ar';

  return {
    locale,
    isArabic,
    /** Halalas → "SAR 78.00" / "٧٨٫٠٠ ر.س". */
    money: (minor: number) => formatSar(minor, locale),
    /** Plain integer in the locale's digits. */
    num: (n: number) => formatCount(n, locale),
    /** Resolve an `_en` / `_ar` column pair. */
    pick: (en: string | null | undefined, ar: string | null | undefined) =>
      pickLocale(en, ar, locale),
    /** "14:35" in the locale's digits, for delivery ETAs. */
    time: (d: Date) =>
      new Intl.DateTimeFormat(isArabic ? 'ar-SA' : 'en-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        numberingSystem: isArabic ? 'arab' : 'latn',
      }).format(d),
    /** "21 Aug" — used on subscription next-delivery dates. */
    date: (d: Date) =>
      new Intl.DateTimeFormat(isArabic ? 'ar-SA' : 'en-SA', {
        day: 'numeric',
        month: 'short',
        numberingSystem: isArabic ? 'arab' : 'latn',
      }).format(d),
  };
}

export type Formatter = ReturnType<typeof useFormat>;
