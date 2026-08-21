/**
 * The Leen palette, taken from the client's logo (`brand/leen-coffee-logo.pdf`).
 *
 * The identity is two colours: a deep forest green and white. Everything below
 * is built around that green — there is no second brand hue, so the warmth a
 * coffee product needs comes from one brass accent used sparingly, and from
 * neutrals that are warm rather than blue-grey.
 *
 * Tints go through the `alpha` helpers at the bottom, never as a literal
 * `rgba(...)` in a screen. Re-skinning this app once meant rewriting ~100
 * hand-written rgba values scattered across twenty files; the helpers exist so
 * the next change is this file alone.
 */

export const palette = {
  /** #1C3819, sampled from the logo. Primary CTAs, headers, active states. */
  brand: '#1C3819',
  /** Pressed states and the deepest surfaces. */
  brandDeep: '#122611',
  /** A lighter forest for surfaces that must read as related but distinct — the
   *  subscription card, quiet links, the rider's call button. */
  brandMid: '#2C5127',

  /** Brass. The single warm note: rewards, ratings, highlights. Used sparingly —
   *  it earns its attention by being rare. */
  accent: '#C8A45C',

  /** Live delivery and success. Deliberately brighter and yellower than `brand`
   *  so "in progress" never reads as brand chrome. */
  live: '#4C9A5E',

  danger: '#C0452F',
  /** Danger text on a danger tint — the plain danger red is too light to read. */
  dangerInk: '#8E2F22',

  /** App background. Warm off-white; pure white goes cold next to this green. */
  bg: '#F6F5F0',
  surface: '#FFFFFF',
  /** Image placeholders and inset rows. */
  surfaceAlt: '#EAEAE1',
  /** Quiet chips and list rows. */
  surfaceSoft: '#F0EFE8',
  /** Subtotal strips inside cards. */
  surfaceMuted: '#FAFAF5',
  /** The plate behind the artwork; also skeleton fills. */
  canvas: '#E2E2D6',

  ink: '#171C15',
  ink2: '#566052',
  /** Tertiary text, placeholders, and inactive-but-tappable controls such as
   *  unselected tab icons. Held at 3:1 against every surface — an inactive tab
   *  is still a control someone has to be able to read.  */
  ink3: '#7F887C',
  /** Genuinely disabled only: a sold-out add button, a reward you cannot
   *  afford. Below 3:1 on purpose, which WCAG exempts for disabled controls —
   *  do not reach for this to mean 'quiet'. Use ink3. */
  ink4: '#A6AE9F',

  white: '#FFFFFF',
} as const;

/* ---------------------------------------------------------------------------
 * Alpha helpers
 *
 * `onBrand` is for content sitting on the green; `onSurface` for content on the
 * light background. Both take the opacity so a screen never has to know the
 * underlying channel values.
 * ------------------------------------------------------------------------- */

/** Cream content on a brand-green field: text, hairlines, glass fills. */
export const onBrand = (a = 1): string => `rgba(246, 245, 240, ${a})`;

/** Ink content on a light field: hairlines, scrims, quiet fills. */
export const onSurface = (a = 1): string => `rgba(23, 28, 21, ${a})`;

/** A tint of the brand green — section fills, selected-row washes. */
export const brandTint = (a = 1): string => `rgba(28, 56, 25, ${a})`;

/** A tint of the brass accent — reward pills, rating chips, empty-state art. */
export const accentTint = (a = 1): string => `rgba(200, 164, 92, ${a})`;

/** A tint of the live green — the pulsing dot, "on the way" banners. */
export const liveTint = (a = 1): string => `rgba(76, 154, 94, ${a})`;

/** A tint of the danger red — error cards, destructive outlines. */
export const dangerTint = (a = 1): string => `rgba(192, 69, 47, ${a})`;

/** Hairlines and card borders, expressed against the ink colour. */
export const border = {
  hair: onSurface(0.07),
  soft: onSurface(0.12),
  strong: onSurface(0.16),
  dashed: onSurface(0.22),
} as const;

/** Corner radii used across cards, buttons and sheets. */
export const radius = {
  chip: 999,
  sm: 10,
  md: 13,
  lg: 16,
  xl: 18,
  xxl: 20,
  sheet: 24,
} as const;

export type PaletteKey = keyof typeof palette;
