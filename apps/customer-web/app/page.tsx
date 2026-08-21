import { formatSar, pickLocale, variantPriceMinor } from '@leen/lib';
import { createClient } from '@/lib/supabase/server';

/**
 * The public storefront.
 *
 * A Server Component reading through the anon key: every table it touches is
 * behind RLS with a policy that grants `anon` select on listed rows only, so
 * this page is safe to render for a visitor with no session at all — which is
 * also what makes it cacheable.
 */

const LOCALE = 'ar' as const;

// Assigned to a const, not passed inline: a template literal in an argument
// position widens to `string`, and supabase-js reads the row type off the
// literal type of the select string.
const ROASTERY_COLUMNS = `
  id, name_en, name_ar, tagline_en, tagline_ar, city_en, city_ar,
  district_en, district_ar, rating, eta_min_minutes, eta_max_minutes
`;

const COFFEE_COLUMNS = `
  id, name_en, name_ar, notes_en, notes_ar, roast_level,
  base_price_minor, roasted_on,
  merchants ( name_en, name_ar )
`;

export const revalidate = 300;

export default async function Home() {
  const supabase = await createClient();

  const [roasteries, coffees] = await Promise.all([
    supabase
      .from('merchants')
      .select(ROASTERY_COLUMNS)
      .order('rating', { ascending: false })
      .limit(9),
    supabase
      .from('products')
      .select(COFFEE_COLUMNS)
      .order('roasted_on', { ascending: false, nullsFirst: false })
      .limit(8),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      <header className="mb-12 flex flex-col gap-3">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-ink-3">LEEN · لين</p>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-ink">
          قهوة سعودية مختصة، من المحمصة إلى بابك.
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-2">
          سلة واحدة من عشرات المحامص السعودية المستقلة، مع تاريخ التحميص قبل الشراء.
        </p>
      </header>

      <section className="mb-14">
        <h2 className="mb-5 text-lg font-semibold tracking-tight text-ink">محامص قريبة منك</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(roasteries.data ?? []).map((m) => (
            <article
              key={m.id}
              className="rounded-[18px] border border-hair bg-surface p-5 transition hover:border-line"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-ink">
                  {pickLocale(m.name_en, m.name_ar, LOCALE)}
                </h3>
                <span className="shrink-0 rounded-full bg-accent-tint px-2.5 py-1 text-xs font-semibold text-ink">
                  {m.rating} ★
                </span>
              </div>
              <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
                {pickLocale(m.tagline_en, m.tagline_ar, LOCALE)}
              </p>
              <p className="text-xs text-ink-3">
                {[
                  pickLocale(m.city_en, m.city_ar, LOCALE),
                  pickLocale(m.district_en, m.district_ar, LOCALE),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                {' — '}
                {m.eta_min_minutes}–{m.eta_max_minutes} دقيقة
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-ink">تحميص طازج</h2>
          <p className="text-[13px] text-ink-2">محمّصة خلال آخر خمسة أيام</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(coffees.data ?? []).map((p) => (
            <article
              key={p.id}
              className="flex flex-col rounded-[16px] border border-hair bg-surface p-4"
            >
              <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-surface-alt">
                <span className="text-xs uppercase tracking-widest text-ink-3">
                  {p.roast_level.replace('_', ' ')}
                </span>
              </div>
              <p className="mb-1 text-[11px] text-ink-3">
                {pickLocale(p.merchants?.name_en, p.merchants?.name_ar, LOCALE)}
              </p>
              <h3 className="mb-1 text-sm font-semibold leading-snug text-ink">
                {pickLocale(p.name_en, p.name_ar, LOCALE)}
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-ink-2">
                {pickLocale(p.notes_en, p.notes_ar, LOCALE)}
              </p>
              {/* The card quotes the 250 g reference price, same as the app. */}
              <p className="mt-auto text-[15px] font-semibold text-ink">
                {formatSar(variantPriceMinor(p.base_price_minor, 250), LOCALE)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
