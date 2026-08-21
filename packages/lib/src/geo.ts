import type { LatLng } from '@leen/types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. Good enough for delivery radius checks. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Whether a drop-off falls inside a roastery's delivery radius. */
export function isWithinRadius(origin: LatLng, target: LatLng, radiusKm: number): boolean {
  return distanceKm(origin, target) <= radiusKm;
}
