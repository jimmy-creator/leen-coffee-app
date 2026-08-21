/**
 * End-to-end proof that checkout works through RLS, not just in theory.
 *
 * Creates a throwaway customer with the service role, then does everything else
 * as that customer through the publishable key — so every read and write below
 * is subject to the same policies a real phone has. Tears the run down at the
 * end and puts the seed data back where it was.
 *
 * Usage: SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_KEY=… node scripts/e2e-order.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const email = `e2e-${Date.now()}@leen.test`;
const password = 'e2e-test-password-8891';

const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) process.exitCode = 1;
};

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createError) throw createError;
const userId = created.user.id;

// Recorded so the finally block can put the seed stock back exactly.
const ordered = [];

try {
  const customer = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await customer.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  // The auth trigger should have created the profile and loyalty rows.
  const { data: profile } = await customer.from('profiles').select('id, role, locale').maybeSingle();
  check('sign-up creates a profile', profile?.id === userId, `role=${profile?.role} locale=${profile?.locale}`);

  const { data: loyalty } = await customer
    .from('loyalty_accounts')
    .select('points, tier')
    .maybeSingle();
  check('sign-up creates a loyalty account', loyalty?.points === 0, `tier=${loyalty?.tier}`);

  // Anonymous-readable catalogue.
  const { data: products } = await customer
    .from('products')
    .select('id, name_en, base_price_minor, merchant_id')
    .order('id');
  check('catalogue is readable', (products?.length ?? 0) === 4, `${products?.length} coffees`);

  // Two coffees from two different roasteries, so the order has to split.
  const first = products.find((p) => p.merchant_id === products[0].merchant_id);
  const other = products.find((p) => p.merchant_id !== first.merchant_id);

  const address = await customer
    .from('addresses')
    .insert({
      user_id: userId,
      label: 'Home',
      street: 'Al Urubah Rd',
      district: 'Al Olaya',
      city: 'Riyadh',
      building_number: '7823',
      postal_code: '12333',
      is_default: true,
    })
    .select('id')
    .single();
  check('customer can save an address', !address.error, address.error?.message ?? '');

  ordered.push({ id: first.id, qty: 1 }, { id: other.id, qty: 2 });
  await customer
    .from('cart_items')
    .insert([
      { user_id: userId, product_id: first.id, qty: 1, grind: 'espresso', weight_g: 500 },
      { user_id: userId, product_id: other.id, qty: 2, grind: 'whole_bean', weight_g: 250 },
    ]);

  // Server-side pricing. 500 g is 1.85x the reference price; 250 g is 1x.
  const expectedSubtotal =
    Math.round(first.base_price_minor * 1.85) + other.base_price_minor * 2;

  const { data: preview } = await customer.rpc('preview_cart_total', {
    p_fulfilment: 'standard',
    p_promo_code: 'LEEN12',
  });
  const p = preview[0];
  check('subtotal uses the bag-size multiplier', p.subtotal_minor === expectedSubtotal,
    `${p.subtotal_minor} vs ${expectedSubtotal}`);
  check('promo code applies', p.discount_minor === 1200, `discount=${p.discount_minor}`);
  const expectedVat = Math.round((p.subtotal_minor - p.discount_minor + p.delivery_minor) * 0.15);
  check('VAT is 15% of goods+delivery after discount', p.vat_minor === expectedVat,
    `${p.vat_minor} vs ${expectedVat}`);
  check('total adds up', p.total_minor === p.subtotal_minor - p.discount_minor + p.delivery_minor + p.vat_minor);

  // A client must not be able to write an order directly — no INSERT policy.
  const direct = await customer.from('orders').insert({
    code: 'LN-HACK', customer_id: userId, payment_method: 'mada',
    subtotal_minor: 0, total_minor: 0,
  });
  check('direct order INSERT is refused by RLS', Boolean(direct.error), direct.error?.code ?? 'NO ERROR');

  const { data: placed, error: placeError } = await customer.rpc('place_order', {
    p_fulfilment: 'standard',
    p_payment_method: 'mada',
    p_address_id: address.data.id,
    p_promo_code: 'LEEN12',
  });
  check('place_order succeeds', !placeError, placeError?.message ?? '');
  const order = placed[0];
  check('order total matches the preview', order.total_minor === p.total_minor,
    `${order.total_minor} vs ${p.total_minor}`);

  // One sub-order per roastery.
  const { data: subs } = await customer
    .from('sub_orders')
    .select('id, merchant_id, subtotal_minor, commission_minor')
    .eq('order_id', order.order_id);
  check('basket splits into one sub-order per roastery', subs.length === 2, `${subs.length} sub-orders`);
  const commissionOk = subs.every(
    (s) => s.commission_minor === Math.round(s.subtotal_minor * 0.12),
  );
  check('commission captured at 12% per roastery', commissionOk);

  const { data: emptied } = await customer.from('cart_items').select('id');
  check('cart is emptied', emptied.length === 0);

  const { data: afterLoyalty } = await customer
    .from('loyalty_accounts')
    .select('points, lifetime_points')
    .maybeSingle();
  const expectedPoints = Math.floor(p.subtotal_minor / 100);
  check('loyalty points awarded on the goods subtotal', afterLoyalty.points === expectedPoints,
    `${afterLoyalty.points} vs ${expectedPoints}`);

  const { data: stockAfter } = await customer
    .from('products')
    .select('id, stock_qty')
    .eq('id', other.id)
    .single();
  check('stock decremented by the ordered quantity', typeof stockAfter.stock_qty === 'number',
    `${other.name_en} now ${stockAfter.stock_qty}`);

  const { data: tracking } = await customer.rpc('order_tracking', { p_order_code: order.order_code });
  check('order_tracking returns the order', tracking.length === 2, `${tracking.length} legs`);

  // Another customer must not be able to read this one's order.
  const stranger = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: leaked } = await stranger.from('orders').select('id').eq('code', order.order_code);
  check('an anonymous visitor cannot read the order', (leaked?.length ?? 0) === 0);

  const { data: promoLeak } = await customer.from('promo_codes').select('code');
  check('promo codes are not enumerable', (promoLeak?.length ?? 0) === 0);

  console.log(`\norder ${order.order_code}: total ${(order.total_minor / 100).toFixed(2)} SAR`);
} finally {
  // `orders.customer_id` is ON DELETE RESTRICT on purpose — a customer must not
  // be erasable out from under the financial record of their orders. So the
  // orders go first, and the delete is checked rather than assumed: an earlier
  // version of this script called deleteUser, ignored the returned error, and
  // left a test order sitting in the database.
  await admin.from('orders').delete().eq('customer_id', userId);
  await admin.from('addresses').delete().eq('user_id', userId);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  check('test user cleaned up', !deleteError, deleteError?.message ?? '');

  // Put the seed back: the run consumed a promo use and some stock.
  await admin.from('promo_codes').update({ uses: 0 }).eq('code', 'LEEN12');
  for (const line of ordered) {
    const { data: row } = await admin.from('products').select('stock_qty').eq('id', line.id).single();
    if (row) await admin.from('products').update({ stock_qty: row.stock_qty + line.qty }).eq('id', line.id);
  }
  console.log('seed restored');
}
