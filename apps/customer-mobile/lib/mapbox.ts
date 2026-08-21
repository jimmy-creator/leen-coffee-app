import type { LatLng } from '@leen/types';

/**
 * Mapbox, without a native map SDK.
 *
 * The picker is built on the Static Images API rather than @rnmapbox/maps or
 * react-native-maps on purpose: those are native modules, so adding one means
 * every tester needs a fresh development build before they can open the address
 * screen at all. A static tile plus the Web Mercator maths below gives a
 * draggable, zoomable map that runs in the client already installed.
 *
 * If the app later needs turn-by-turn or live driver tracking, that is the
 * point to take the native dependency — this covers "drop a pin on your
 * building", which is what an address form needs.
 */

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export const hasMapbox = Boolean(TOKEN);

/** Riyadh. Where the map opens when there is no location to centre on. */
export const DEFAULT_CENTER: LatLng = { lat: 24.7136, lng: 46.6753 };

export const MIN_ZOOM = 10;
export const MAX_ZOOM = 18;

/** Mapbox serves 512 px tiles; the Mercator maths below assumes that. */
const TILE_SIZE = 512;

const worldSize = (zoom: number): number => TILE_SIZE * 2 ** zoom;

/** Longitude → absolute world-pixel x at a zoom level. */
const lngToX = (lng: number, zoom: number): number => ((lng + 180) / 360) * worldSize(zoom);

/** Latitude → absolute world-pixel y. Mercator, so it is not linear in lat. */
const latToY = (lat: number, zoom: number): number => {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  const merc = Math.log(Math.tan(Math.PI / 4 + rad / 2));
  return (0.5 - merc / (2 * Math.PI)) * worldSize(zoom);
};

const xToLng = (x: number, zoom: number): number => (x / worldSize(zoom)) * 360 - 180;

const yToLat = (y: number, zoom: number): number => {
  const merc = (0.5 - y / worldSize(zoom)) * (2 * Math.PI);
  return (2 * (Math.atan(Math.exp(merc)) - Math.PI / 4) * 180) / Math.PI;
};

/**
 * Shift a centre by a screen-pixel delta.
 *
 * Dragging the map right should reveal what is to the *west*, so the centre
 * moves opposite to the finger — hence the subtraction.
 */
export function panCenter(center: LatLng, zoom: number, dx: number, dy: number): LatLng {
  const x = lngToX(center.lng, zoom) - dx;
  const y = latToY(center.lat, zoom) - dy;
  return { lat: yToLat(y, zoom), lng: xToLng(x, zoom) };
}

/** A static map tile centred on `center`. Retina, so it is not soft on a phone. */
export function staticMapUrl(
  center: LatLng,
  zoom: number,
  width: number,
  height: number,
): string | null {
  if (!TOKEN) return null;
  // Mapbox caps a static request at 1280 px per side before the @2x multiplier.
  const w = Math.min(1280, Math.round(width));
  const h = Math.min(1280, Math.round(height));
  const lng = center.lng.toFixed(6);
  const lat = center.lat.toFixed(6);
  const z = zoom.toFixed(2);

  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `${lng},${lat},${z},0/${w}x${h}@2x?access_token=${TOKEN}&attribution=false&logo=false`
  );
}

export interface ReverseGeocodeResult {
  /** Best-effort street line, e.g. "Al Urubah Rd". */
  street: string | null;
  /** Saudi National Address district — the field delivery actually keys on. */
  district: string | null;
  city: string | null;
  postalCode: string | null;
  buildingNumber: string | null;
  /** The full formatted line Mapbox returned, for the confirmation label. */
  label: string | null;
}

interface GeocodeFeature {
  properties?: {
    name?: string;
    full_address?: string;
    context?: Record<string, { name?: string } | undefined>;
  };
}

/**
 * Turn a dropped pin into address fields.
 *
 * Mapbox's Saudi coverage names districts as `neighborhood` and occasionally as
 * `locality`, so both are tried before giving up — leaving the district blank
 * is the one thing that would make the address undeliverable.
 */
export async function reverseGeocode(
  point: LatLng,
  language: 'en' | 'ar',
): Promise<ReverseGeocodeResult | null> {
  if (!TOKEN) return null;

  const params = new URLSearchParams({
    longitude: String(point.lng),
    latitude: String(point.lat),
    access_token: TOKEN,
    language,
    limit: '1',
  });

  try {
    const res = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`);
    if (!res.ok) return null;

    const json = (await res.json()) as { features?: GeocodeFeature[] };
    const feature = json.features?.[0];
    if (!feature) return null;

    const ctx = feature.properties?.context ?? {};
    const pick = (...keys: string[]): string | null => {
      for (const k of keys) {
        const name = ctx[k]?.name;
        if (name) return name;
      }
      return null;
    };

    return {
      street: pick('street') ?? feature.properties?.name ?? null,
      district: pick('neighborhood', 'locality'),
      city: pick('place', 'region'),
      postalCode: pick('postcode'),
      buildingNumber: pick('address_number'),
      label: feature.properties?.full_address ?? feature.properties?.name ?? null,
    };
  } catch {
    return null;
  }
}
