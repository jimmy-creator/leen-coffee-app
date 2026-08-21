import { formatSar } from '@leen/lib';
import { createClient } from '@/lib/supabase/server';

/**
 * The roastery's order desk.
 *
 * Every row here comes back filtered by RLS to sub-orders belonging to a
 * roastery this account owns, so there is no `where merchant_id = …` to get
 * wrong — an unauthenticated visitor simply sees an empty table.
 */

export const dynamic = 'force-dynamic';

// Assigned to a const, not passed inline: a template literal in an argument
// position widens to `string`, and supabase-js reads the row type off the
// literal type of the select string.
const ORDER_DESK_COLUMNS = `
  id, status, subtotal_minor, commission_minor, created_at,
  orders ( code, fulfilment, payment_method, placed_at ),
  merchants ( name_en ),
  order_items ( id, name_en, grind, weight_g, qty, line_total_minor )
`;

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-danger-tint text-danger-ink',
  confirmed: 'bg-accent-tint text-brand-mid',
  roasting: 'bg-accent-tint text-brand-mid',
  ready: 'bg-live-tint text-brand-mid',
  picked_up: 'bg-live-tint text-brand-mid',
  delivered: 'bg-surface-alt text-ink-3',
  cancelled: 'bg-surface-alt text-ink-3',
};

export default async function MerchantOrders() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subOrders } = await supabase
    .from('sub_orders')
    .select(ORDER_DESK_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = subOrders ?? [];

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      <header className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-ink-3">LEEN · MERCHANT</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Orders</h1>
      </header>

      {!user ? (
        <div className="rounded-[18px] border border-hair bg-surface p-8 text-center">
          <p className="text-[15px] font-semibold text-ink">Sign in to see your orders</p>
          <p className="mt-2 text-[13px] text-ink-2">
            Use the same mobile number registered to your roastery.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[18px] border border-hair bg-surface p-8 text-center">
          <p className="text-[15px] font-semibold text-ink">No orders yet</p>
          <p className="mt-2 text-[13px] text-ink-2">
            New orders appear the moment a customer checks out.
          </p>
        </div>
      ) : (
        // Wide tables scroll inside their own container rather than pushing the
        // page sideways on a narrow screen.
        <div className="overflow-x-auto rounded-[18px] border border-hair bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-hair text-xs uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Items</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Subtotal</th>
                <th className="px-5 py-3 text-right font-medium">Commission</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((sub) => (
                <tr key={sub.id} className="border-b border-hair last:border-0">
                  <td className="px-5 py-4 font-semibold text-ink">{sub.orders?.code}</td>
                  <td className="px-5 py-4 text-ink-2">
                    {sub.order_items.map((item) => (
                      <div key={item.id}>
                        {item.qty}× {item.name_en}{' '}
                        <span className="text-ink-3">
                          ({item.grind.replace('_', ' ')}, {item.weight_g} g)
                        </span>
                      </div>
                    ))}
                  </td>
                  <td className="px-5 py-4 capitalize text-ink-2">
                    {sub.orders?.fulfilment}
                    <div className="text-xs text-ink-3">
                      {sub.orders?.payment_method?.replace(/_/g, ' ')}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATUS_STYLE[sub.status] ?? 'bg-surface-alt text-ink-3'
                      }`}
                    >
                      {sub.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-ink">
                    {formatSar(sub.subtotal_minor, 'en')}
                  </td>
                  <td className="px-5 py-4 text-right text-ink-2">
                    {formatSar(sub.commission_minor, 'en')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
