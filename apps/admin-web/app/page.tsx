import { formatSar } from '@leen/lib';
import { createClient } from '@/lib/supabase/server';

/**
 * Operations console.
 *
 * Every read here is governed by the `private.is_admin()` policies: signed in as
 * anything other than an admin, the counts come back as zero and the tables
 * empty. The page does not gate itself — the database does.
 */

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `head: true` with an exact count fetches the number without the rows.
  const [merchantCount, pendingMerchants, productCount, orderCount, riders, recentOrders] =
    await Promise.all([
      supabase.from('merchants').select('id', { count: 'exact', head: true }),
      supabase
        .from('merchants')
        .select('id, name_en, name_ar, city_en, created_at')
        .eq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('riders').select('id', { count: 'exact', head: true }).eq('is_approved', false),
      supabase
        .from('orders')
        .select('id, code, status, total_minor, placed_at, payment_method')
        .order('placed_at', { ascending: false })
        .limit(10),
    ]);

  const stats = [
    { label: 'Roasteries', value: merchantCount.count ?? 0 },
    { label: 'Coffees listed', value: productCount.count ?? 0 },
    { label: 'Orders', value: orderCount.count ?? 0 },
    { label: 'Riders awaiting approval', value: riders.count ?? 0 },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      <header className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-ink-3">LEEN · ADMIN</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Operations</h1>
      </header>

      {!user ? (
        <div className="rounded-[18px] border border-hair bg-surface p-8 text-center">
          <p className="text-[15px] font-semibold text-ink">Sign in required</p>
          <p className="mt-2 text-[13px] text-ink-2">
            This console is limited to accounts with the admin role.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[18px] border border-hair bg-surface p-5">
                <p className="text-xs uppercase tracking-wider text-ink-3">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">
              Roasteries awaiting listing
            </h2>
            {(pendingMerchants.data ?? []).length === 0 ? (
              <p className="rounded-[18px] border border-hair bg-surface p-6 text-[13px] text-ink-2">
                Nothing waiting for review.
              </p>
            ) : (
              <ul className="divide-y divide-hair overflow-hidden rounded-[18px] border border-hair bg-surface">
                {(pendingMerchants.data ?? []).map((m) => (
                  <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink">{m.name_en}</p>
                      <p className="text-xs text-ink-3">{m.city_en}</p>
                    </div>
                    {/*
                      Listing is an admin write guarded by a database trigger, so
                      it needs a mutation route rather than a link. Wired up with
                      the rest of the admin actions.
                    */}
                    <span className="rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold text-ink-3">
                      Awaiting review
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">Recent orders</h2>
            <div className="overflow-x-auto rounded-[18px] border border-hair bg-surface">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-hair text-xs uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-5 py-3 font-medium">Order</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Payment</th>
                    <th className="px-5 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentOrders.data ?? []).map((order) => (
                    <tr key={order.id} className="border-b border-hair last:border-0">
                      <td className="px-5 py-4 font-semibold text-ink">{order.code}</td>
                      <td className="px-5 py-4 capitalize text-ink-2">
                        {order.status.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-4 capitalize text-ink-2">
                        {order.payment_method.replace(/_/g, ' ')}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-ink">
                        {formatSar(order.total_minor, 'en')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
