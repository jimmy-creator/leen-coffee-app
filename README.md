# Leen Coffee · لين

A marketplace for Saudi specialty coffee. One basket across dozens of independent
roasteries, with the roast date shown before you buy.

Six apps on one Supabase database, in a pnpm + Turborepo workspace — the same
shape as `aljahis`, which this project is modelled on.

```
apps/
  customer-mobile   Expo · the customer app (built from the Claude design)
  merchant-mobile   Expo · the roastery's order board
  delivery-mobile   Expo · the rider's job board
  customer-web      Next.js · public storefront
  merchant-web      Next.js · roastery order desk
  admin-web         Next.js · operations console
packages/
  types             domain vocabulary (roast levels, order statuses, money)
  lib               money, locale, coffee, geo, Arabic search, Saudi addresses
  i18n              en/ar UI strings
  ui                design tokens — one palette for native and web
  api-client        typed Supabase clients + generated database types
supabase/
  migrations        schema, RLS, RPCs
  seed.sql          the roasteries and coffees from the design
```

## Getting started

```bash
nvm use                 # Node 22
pnpm install
pnpm build              # builds packages, then the three web apps
pnpm typecheck
pnpm --filter @leen/lib test
```

Each app reads its own `.env.local`; copy `.env.example` and fill it in. The
Supabase URL and publishable key are safe in client bundles — every table is
behind RLS and the key carries no privileges of its own. The service role key
and the database password are not, and belong only in Edge Function secrets.

Run one app:

```bash
pnpm --filter @leen/customer-mobile start
pnpm --filter @leen/customer-web dev      # :3000
pnpm --filter @leen/merchant-web dev      # :3001
pnpm --filter @leen/admin-web dev         # :3002
```

## The database is the boundary

The rule this codebase is built around: **the client says what it wants, never
what it costs.**

`orders` has no INSERT policy at all. The only way to create one is
`place_order`, a `SECURITY DEFINER` function that reads the customer's cart,
prices it from the product rows, applies VAT and any promo, splits the basket
into one sub-order per roastery, captures commission, decrements stock, awards
loyalty points and empties the cart — in a single transaction. A client that
could write an order directly could write itself a total of zero.

Everything else follows from that:

- **Money is integer halalas.** 1 SAR = 100. Never a float, never `numeric` in
  the app layer. `@leen/lib` owns every conversion and format.
- **Bag prices are derived, not stored.** `products.base_price_minor` is the
  250 g reference; 500 g is ×1.85 and 1 kg is ×3.4. The multipliers live in
  `@leen/lib/coffee.ts` and in `private.weight_multiplier()` — change both.
- **VAT is 15% of goods + delivery, after any discount**, rounded to a whole
  halala. `calcVatMinor` and `private.vat_minor` agree by construction.
- **Loyalty tier follows lifetime points**, so redeeming points never demotes a
  customer who already earned the standing.
- **Snapshots.** Order line items copy the product name and price; orders copy
  the delivery address. A merchant renaming a bean, or a customer editing their
  address, must not rewrite history.

`scripts/e2e-order.mjs` proves all of this against the live database, as a real
signed-in customer going through RLS — including that a direct `INSERT` into
`orders` is refused and that promo codes are not enumerable.

## Brand

The identity is the client's logo (`brand/leen-coffee-logo.pdf`): a lotus mark
and wordmark in white on a deep forest green, **#1C3819**. There is no second
brand hue, so the warmth a coffee product needs comes from a single brass
accent (**#C8A45C**) used sparingly, and from neutrals that are warm rather
than blue-grey.

`brand/mark-white.png` and `brand/lockup-white.png` are transparent masters
lifted from that PDF. App icons are generated from them:

```bash
pnpm brand:build       # regenerate every app icon from the masters
pnpm brand:contrast    # WCAG check across the palette
```

The icon uses the lotus alone, not the full lockup — at 48 px on a home screen
the wordmark is an illegible smudge, while the lotus is distinctive at any size.
The lockup is used for the splash, where there is room to read it.

**Tints go through the alpha helpers in `@leen/ui/palette`, never as a literal
`rgba()` in a screen.** Re-skinning this app from its first palette meant
rewriting about a hundred hand-written rgba values across twenty files; the
helpers (`onBrand`, `onSurface`, `brandTint`, `accentTint`, `liveTint`,
`dangerTint`) exist so the next change is one file. The web apps get the same
values as CSS variables from `@leen/ui/tokens.css`.

One palette rule worth knowing: `ink3` is tertiary text _and_ inactive-but-
tappable controls, held at 3:1 against every surface. `ink4` is lighter and is
for genuinely disabled elements only — an inactive tab is still a control
somebody has to be able to read.

## Demo catalogue

`supabase/seed.sql` holds the three roasteries and four coffees from the
signed-off design — that is the canonical fixture. On top of it,
`scripts/seed-demo-catalogue.mjs` adds ten more Saudi roasteries and forty
more coffees so the app looks populated when it is being shown, and generates
a placeholder image for every roastery and product:

```bash
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… pnpm db:seed:demo
```

The imagery is drawn locally rather than pulled from a stock service. A
hotlinked picsum URL breaks the moment the demo is shown on a locked-down
network, and looks nothing like coffee. These are a bag silhouette coloured by
roast level and a gradient cover carrying the lotus, uploaded to Supabase
Storage under `<merchant_id>/…` — the layout the storage policies key
ownership on, so a merchant can manage its own uploads later.

Safe to re-run: roasteries match on name, coffees on (roastery, name).

## Demo sign-in

Phone auth is enabled on the project with fixed test numbers. Supabase matches
a test number before it reaches the SMS provider, so sign-in works with no
Twilio account attached.

|       |                      |
| ----- | -------------------- |
| Phone | **+966 50 000 0000** |
| Code  | **123456**           |

`+966500000001` and `+966500000002` take the same code, for testing two sessions
at once. All three sit in the 50-00000-0X block, which STC has never allocated —
a test number is short-circuited before the provider, so one that collided with a
real subscriber would stop that person receiving genuine codes.

A number of all zeros cannot be used: Saudi mobiles are always `9665XXXXXXXX`,
and the phone field rejects anything else before it sends.

```bash
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… pnpm db:seed:user
```

That gives the account two saved addresses, 1,240 loyalty points at Qahwa Gold
with ledger history, an active Explorer subscription, and one delivered order —
so Profile, Rewards, Orders and Tracking all have something real on them rather
than showing zeros.

## Row level security

Every table in `public` has RLS enabled. Two rules, without exception:

1. `auth.uid()` is always wrapped as `(select auth.uid())`. Unwrapped, Postgres
   treats it as volatile and re-evaluates it per candidate row.
2. Role checks go through `SECURITY DEFINER` helpers in the `private` schema
   rather than an inline `exists (select 1 from profiles …)`, which would be
   filtered by profiles' own policies and is a recursion hazard.

`private` is not in `[api] schemas`, so PostgREST never exposes those helpers —
that, not a revoked `EXECUTE`, is what keeps them off the API surface. (Revoking
`EXECUTE` from `authenticated` breaks every policy that calls one; see
`0006_grant_policy_helpers.sql`.)

Guard triggers cover what policies cannot express: a merchant cannot list itself
on the storefront or set its own commission rate, a rider cannot approve itself,
and nobody can promote their own profile to `admin`.

## Arabic

Arabic is the default locale, not an afterthought.

- **Layout mirrors.** `I18nManager.forceRTL` plus a reload — React Native only
  re-lays-out on a fresh start, so switching language without the reload
  translates the text and leaves the layout backwards.
- **Digits.** `Intl.NumberFormat` with `numberingSystem: 'arab'`, not a
  substitution table — a table breaks on decimal separators and grouping.
- **Search folds letter forms.** أ/إ/آ → ا, ة → ه, ى → ي, diacritics stripped, so
  "قهوه" finds "قهوة". Implemented twice on purpose: `normalizeQuery` in
  `@leen/lib` for the client, `private.normalize_search()` as the trigger that
  maintains `products.search_key`. Change both together.
- **Numbers that must stay LTR** — prices, phone numbers, ratings — go through
  the `<Num>` primitive.

## Infrastructure

| What         | Where                                                  |
| ------------ | ------------------------------------------------------ |
| Database     | Supabase project `nwedptckqbcktdqgoixr` (eu-central-1) |
| Customer app | EAS `@jimmycreators-team/leen-customer`                |
| Merchant app | EAS `@jimmycreators-team/leen-merchant`                |
| Rider app    | EAS `@jimmycreators-team/leen-delivery`                |

The Supabase project is temporary — it moves to the client's own account once
the build settles. Nothing outside `supabase/` hard-codes the project ref, so
that migration is a change of environment variables and one `supabase link`.

## Working on the schema

```bash
supabase link --project-ref nwedptckqbcktdqgoixr
supabase db push                        # apply migrations
pnpm --filter @leen/api-client build    # after regenerating types
supabase gen types typescript --linked --schema public \
  > packages/api-client/src/database.types.ts
```

A note that will save an afternoon: supabase-js infers row types from the
**literal** type of the select string. Build a column list with `+` and every
result collapses to `GenericStringError`; pass a template literal inline and it
widens to `string` and every row becomes `never`. Assign it to a `const` and
pass that.
