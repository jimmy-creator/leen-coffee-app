import { supabase } from './supabase';

/**
 * The roastery's order board.
 *
 * A merchant only ever sees sub-orders for roasteries they own — that is
 * enforced by RLS, not by these queries, so a bug here leaks nothing.
 */

const BOARD_COLUMNS = `
  id, status, subtotal_minor, eta_minutes, created_at, rider_id, merchant_id,
  orders ( code, fulfilment, placed_at ),
  order_items ( id, name_en, name_ar, grind, weight_g, qty, line_total_minor )
`;

/** The statuses a sub-order moves through inside the roastery, in order. */
export const MERCHANT_FLOW = ['pending', 'confirmed', 'roasting', 'ready'] as const;
export type MerchantStatus = (typeof MERCHANT_FLOW)[number];

/** The next status this sub-order should advance to, or null when done here. */
export function nextStatus(current: string): MerchantStatus | null {
  const i = MERCHANT_FLOW.indexOf(current as MerchantStatus);
  if (i < 0 || i >= MERCHANT_FLOW.length - 1) return null;
  return MERCHANT_FLOW[i + 1] ?? null;
}

/** The roasteries this account owns. Most merchants have exactly one. */
export async function fetchMyMerchants() {
  const { data, error } = await supabase
    .from('merchants')
    .select('id, name_en, name_ar, is_open, is_active');
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrderBoard() {
  const { data, error } = await supabase
    .from('sub_orders')
    .select(BOARD_COLUMNS)
    // Oldest first: the order that has been waiting longest is the one to work.
    .order('created_at', { ascending: true })
    .in('status', ['pending', 'confirmed', 'roasting', 'ready']);
  if (error) throw error;
  return data ?? [];
}

export async function advanceSubOrder(subOrderId: number, to: MerchantStatus) {
  const now = new Date().toISOString();

  // Stamp the matching timestamp column so the customer's tracking screen and
  // any later fulfilment report have real times, not just a current status.
  // Written as a literal per branch rather than a dynamic key so the update
  // stays type-checked against the table.
  const patch =
    to === 'confirmed'
      ? { status: to, confirmed_at: now }
      : to === 'ready'
        ? { status: to, ready_at: now }
        : { status: to };

  const { error } = await supabase.from('sub_orders').update(patch).eq('id', subOrderId);
  if (error) throw error;
}

/** Open/closed toggle. The admin's `is_active` listing switch is separate. */
export async function setOpen(merchantId: number, isOpen: boolean) {
  const { error } = await supabase
    .from('merchants')
    .update({ is_open: isOpen })
    .eq('id', merchantId);
  if (error) throw error;
}
