/**
 * Saudi National Address formatting.
 *
 * Saudi Post issues every building a 4-digit building number, a street, a
 * district, a city, a 5-digit postal code and a 4-digit additional number.
 * Delivery in KSA depends on the district far more than on the street, so the
 * district is never omitted from a short label.
 */
export interface SaudiAddress {
  buildingNumber?: string | null;
  street: string;
  district: string;
  city: string;
  postalCode?: string | null;
  additionalNumber?: string | null;
}

/** One-line address for an order card or a driver's manifest. */
export function formatAddressLine(a: SaudiAddress): string {
  const head = [a.buildingNumber, a.street].filter(Boolean).join(' ');
  const tail = [a.district, a.city, a.postalCode].filter(Boolean).join(', ');
  return [head, tail].filter(Boolean).join(', ');
}

/** Short label for a chip or the "deliver to" header — district and city only. */
export function formatAddressShort(a: SaudiAddress): string {
  return [a.district, a.city].filter(Boolean).join(', ');
}

const SAUDI_MOBILE = /^(?:\+?966|0)?5\d{8}$/;

/** Whether a typed mobile number is a plausible Saudi mobile (05x / +9665x). */
export function isSaudiMobile(input: string): boolean {
  return SAUDI_MOBILE.test(input.replace(/[\s-]/g, ''));
}

/** Normalize any accepted Saudi mobile spelling to E.164 (`+9665XXXXXXXX`). */
export function toE164(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  const local = digits.replace(/^966/, '').replace(/^0/, '');
  if (!/^5\d{8}$/.test(local)) return null;
  return `+966${local}`;
}
