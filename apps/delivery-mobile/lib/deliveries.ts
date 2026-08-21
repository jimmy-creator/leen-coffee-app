import type { Json } from '@leen/api-client';
import { supabase } from './supabase';

/**
 * The rider's job board and the deliveries they are already carrying.
 *
 * Claiming a job goes through the `rider_accept` RPC rather than a direct
 * UPDATE: it locks the row with `for update skip locked`, which is what stops
 * two riders who tapped the same job at the same moment from both getting it.
 */

const JOB_COLUMNS = `
  id, status, rider_id, eta_minutes, rider_fee_minor, created_at,
  merchants ( id, name_en, name_ar, district_en, district_ar, city_en, city_ar, phone ),
  orders ( code, fulfilment, address_snapshot, total_minor, payment_method )
`;

/**
 * The delivery address as it stood when the order was placed.
 *
 * Stored as jsonb on `orders.address_snapshot`, so it survives the customer
 * later editing or deleting the saved address — the rider must navigate to
 * where the order was actually sent, not to wherever that address points now.
 */
export interface AddressSnapshot {
  label?: string;
  building_number?: string | null;
  street?: string;
  district?: string;
  city?: string;
  postal_code?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/** Narrow the jsonb column to the snapshot shape, or null if it is absent. */
export function readAddressSnapshot(value: Json | null | undefined): AddressSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as AddressSnapshot;
}

/** Statuses the rider drives, in order, once they are carrying the order. */
export const RIDER_FLOW = ['ready', 'picked_up', 'delivered'] as const;
export type RiderStatus = (typeof RIDER_FLOW)[number];

export function nextStatus(current: string): RiderStatus | null {
  const i = RIDER_FLOW.indexOf(current as RiderStatus);
  if (i < 0 || i >= RIDER_FLOW.length - 1) return null;
  return RIDER_FLOW[i + 1] ?? null;
}

export async function fetchMyRiderProfile() {
  const { data, error } = await supabase
    .from('riders')
    .select('id, vehicle, plate, rating, is_online, is_approved')
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Unclaimed jobs. Only roasteries that have at least confirmed the order show
 * up — there is nothing for a rider to plan around while it is still `pending`.
 */
export async function fetchAvailableJobs() {
  const { data, error } = await supabase
    .from('sub_orders')
    .select(JOB_COLUMNS)
    .is('rider_id', null)
    .in('status', ['confirmed', 'roasting', 'ready'])
    .order('created_at', { ascending: true })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

/** Jobs this rider is already carrying. */
export async function fetchMyJobs(riderId: string) {
  const { data, error } = await supabase
    .from('sub_orders')
    .select(JOB_COLUMNS)
    .eq('rider_id', riderId)
    .in('status', ['confirmed', 'roasting', 'ready', 'picked_up'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Returns false when another rider got there first. */
export async function acceptJob(subOrderId: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('rider_accept', { p_sub_order_id: subOrderId });
  if (error) throw error;
  return data === true;
}

export async function advanceJob(subOrderId: number, to: RiderStatus) {
  const now = new Date().toISOString();

  // Literal per branch rather than a dynamic key, so the update stays
  // type-checked against the table.
  const patch =
    to === 'picked_up'
      ? { status: to, picked_up_at: now }
      : to === 'delivered'
        ? { status: to, delivered_at: now }
        : { status: to };

  const { error } = await supabase.from('sub_orders').update(patch).eq('id', subOrderId);
  if (error) throw error;
}

export async function setOnline(riderId: string, online: boolean) {
  const { error } = await supabase
    .from('riders')
    .update({ is_online: online, location_updated_at: new Date().toISOString() })
    .eq('id', riderId);
  if (error) throw error;
}
