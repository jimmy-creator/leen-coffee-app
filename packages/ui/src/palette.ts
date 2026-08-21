/**
 * The Leen palette, straight off the customer-app design.
 *
 * Kept as plain hex here (not CSS vars) so the Expo apps — which have no CSS —
 * import the same constants the web apps compile into `tokens.css`. One source
 * of truth: change a colour here and it moves everywhere.
 */
export const palette = {
  /** Deep roasted espresso — primary CTAs, active chips, the tab bar accent. */
  espresso: '#3B2418',
  /** Body ink on light surfaces. */
  ink: '#211712',
  /** Secondary text. */
  ink2: '#75675F',
  /** Tertiary text, kickers, placeholders. */
  ink3: '#8A7A6E',
  /** Disabled / inactive glyphs. */
  ink4: '#9A8A7E',
  /** Links and quiet actions on light surfaces. */
  brown: '#5A3826',
  /** Warm caramel accent — rewards, highlights, empty-state art. */
  caramel: '#C58B55',
  /** Subscription green. */
  forest: '#1F4D3A',
  /** Success / live states. */
  green: '#2E7D5B',
  /** Errors and destructive actions. */
  red: '#C94B4B',
  /** Rating stars. */
  gold: '#D9902F',

  /** App background. */
  bg: '#F8F4EE',
  /** The page behind the phone frame; also used for quiet fills. */
  canvas: '#E7DFD4',
  /** Cards. */
  surface: '#FFFFFF',
  /** Image placeholders and inset rows. */
  surfaceAlt: '#F1EBE3',
  /** Quiet chips and list rows. */
  surfaceSoft: '#F4EFE8',
  /** Subtotal strips inside cards. */
  surfaceMuted: '#FBF8F4',

  white: '#FFFFFF',
} as const;

/** Hairlines and card borders, expressed against the ink colour. */
export const border = {
  hair: 'rgba(33,23,18,0.07)',
  soft: 'rgba(33,23,18,0.12)',
  strong: 'rgba(33,23,18,0.16)',
  dashed: 'rgba(33,23,18,0.22)',
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
