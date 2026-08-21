# Customer app — screens

Source of truth for the design:
<https://claude.ai/design/p/f10618c2-9ec8-4768-94bd-5f58b3684058?file=Leen+Coffee.dc.html>

A copy is checked in at `docs/leen-customer-app.design.html`. It is a clickable
prototype, not a spec — where the prototype and a real backend disagree, this
file records which way it was resolved and why.

## Route map

| Design screen | Route                                       | Notes                                                          |
| ------------- | ------------------------------------------- | -------------------------------------------------------------- |
| Onboarding    | `app/welcome.tsx`                           | Sets `leen.onboarded.v1`, so a guest is not shown it twice     |
| Sign in       | `app/auth.tsx`                              | Fixed `+966`, no country picker                                |
| OTP           | `app/otp.tsx`                               | Six digits, not the prototype's four                           |
| Home          | `app/(tabs)/index.tsx`                      | Banner, categories, roasteries, fresh roast, subscription card |
| Search        | `app/(tabs)/explore.tsx`                    | Debounced; filters map onto real columns                       |
| Roaster       | `app/store/[id].tsx`                        | Cover, identity card, stats, tabs, grid                        |
| Product       | `app/product/[id].tsx`                      | Grind, bag size, specs, freshness, sticky add bar              |
| Cart          | `app/(tabs)/cart.tsx`                       | Grouped by roastery; totals priced server-side                 |
| Checkout      | `app/checkout.tsx`                          | Address, delivery method, payment, totals                      |
| Confirmed     | `app/order-confirmed.tsx`                   | `replace`, gesture disabled — no re-ordering by swiping back   |
| Tracking      | `app/track/[code].tsx`                      | Live over realtime; status ladder from `sub_orders`            |
| Subscriptions | `app/(tabs)/subscribe.tsx`                  | Plans, cadence, and the customer's own subscriptions           |
| Rewards       | `app/loyalty.tsx`                           | Points ring, tier, redeemable rewards                          |
| Profile       | `app/(tabs)/profile.tsx`                    | Counts, language switch, sign out                              |
| Addresses     | `app/addresses.tsx`, `app/address-form.tsx` | Saudi National Address fields                                  |

Not in the design, added because the app needs them: `app/orders.tsx` (order
history — the profile row had nowhere to go) and `app/index.tsx` (the launch
router that decides between onboarding and the tabs).

## Where the build departs from the prototype

**Four-digit OTP → six.** Supabase phone auth issues six digits. The design's
four cells were a mock.

**Static demo data → the database.** The prototype hard-codes three roasteries
and four coffees; those are now `supabase/seed.sql`, and every screen reads them
through RLS.

**"Advance status (demo)" button, gone.** In the prototype it stepped the
tracking timeline by hand. The real screen subscribes to `sub_orders` over
realtime and moves when the roastery or rider actually moves it.

**Totals are not computed on the device.** The prototype does the arithmetic in
the component. The cart and checkout screens call `preview_cart_total`, so the
figures on screen are the ones `place_order` will write a moment later. A signed-
out guest gets a local estimate using the same `@leen/lib` helpers, and is sent
to sign in before checkout.

**Apple and Nafath sign-in are visible but disabled.** Both are in the design and
both need credentials the client has to issue — Apple is a store requirement once
any third-party sign-in ships, and Nafath is the Saudi national identity
provider. They are rendered at reduced opacity rather than faked into signing
someone in.

**Map is an abstraction, not a map.** The tracking screen draws the same stylized
street grid the design used. A real map needs a tile-provider key; when there is
one, that block is the only thing that changes.

**Shimmer skeletons are static.** The prototype's shimmer sweeps left-to-right,
which reads backwards in Arabic. The skeletons are steady tinted blocks.

**Product images.** Nothing in the seed has a photograph yet, and a roastery will
list before its photographer delivers. `ImageSlot` renders a tinted block with
the bean mark, which reads as "photo pending" rather than as a broken image.

## Interaction details worth keeping

- The 250 g price is the reference everywhere a card quotes a price; the product
  page scales it when a larger bag is chosen.
- The default bag on the product page is 500 g — what most customers buy — and
  the default grind is whole bean, because ground coffee stales fast.
- A guest can fill a basket. On sign-in it merges into the server cart and the
  local copy is dropped, so nothing is lost between browsing and buying.
- The cart badge hides at zero rather than showing "0".
- Tapping a category on Home hands off to Explore. Home stays a curated feed;
  filtering the whole catalogue is Explore's job.
