/**
 * Normalize a query so Arabic search behaves the way a Saudi customer expects.
 *
 * Arabic text is written with several interchangeable letter forms — أ/إ/آ for
 * alef, ة/ه for teh marbuta, ى/ي for alef maksura — and optional diacritics.
 * A customer typing "قهوه" should still find "قهوة". Postgres `ilike` will not
 * do that for us, so both the stored search key and the query pass through here.
 */
export function normalizeQuery(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, '') // strip harakat + dagger alef
    .replace(/ـ/g, '') // tatweel
    .replace(/[آأإٱ]/g, 'ا') // alef forms -> ا
    .replace(/ة/g, 'ه') // ة -> ه
    .replace(/ى/g, 'ي') // ى -> ي
    .replace(/\s+/g, ' ');
}

/** Whether a haystack matches a normalized needle. Empty needle matches all. */
export function matchesQuery(haystack: string, needle: string): boolean {
  const q = normalizeQuery(needle);
  if (!q) return true;
  return normalizeQuery(haystack).includes(q);
}
