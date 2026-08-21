import { palette, border, radius } from '@leen/ui/palette';

/**
 * Leen customer palette, re-exported from `@leen/ui` so the mobile app and the
 * three web apps cannot drift apart. Import from here inside this app; import
 * from `@leen/ui` anywhere else.
 */
export const colors = palette;
export { border, radius };

/**
 * IBM Plex Sans Arabic, loaded in the root layout. Arabic and Latin share the
 * family, which is the whole reason the design picked it — switching language
 * changes the script but not the typographic voice.
 */
export const font = {
  light: 'IBMPlexSansArabic_300Light',
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
} as const;

/**
 * Type ramp lifted from the design. Line heights are absolute rather than
 * multipliers: Arabic glyphs are taller than Latin at the same point size, and
 * a multiplier makes the two languages disagree about row heights.
 */
export const type = {
  display: { fontFamily: font.semibold, fontSize: 38, lineHeight: 44, letterSpacing: -0.7 },
  h1: { fontFamily: font.semibold, fontSize: 27, lineHeight: 34, letterSpacing: -0.5 },
  h2: { fontFamily: font.semibold, fontSize: 24, lineHeight: 31, letterSpacing: -0.4 },
  h3: { fontFamily: font.semibold, fontSize: 21, lineHeight: 28, letterSpacing: -0.2 },
  title: { fontFamily: font.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.15 },
  bodyLg: { fontFamily: font.regular, fontSize: 15, lineHeight: 24 },
  body: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 22 },
  label: { fontFamily: font.semibold, fontSize: 13.5, lineHeight: 18 },
  caption: { fontFamily: font.regular, fontSize: 12, lineHeight: 18 },
  micro: { fontFamily: font.medium, fontSize: 10.5, lineHeight: 14 },
  /** All-caps section kickers — "DELIVER TO", "THIS WEEK". */
  kicker: { fontFamily: font.semibold, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.7 },
} as const;

/** Spacing scale. The design lays out on a 4 px grid with 20 px page gutters. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  page: 20,
} as const;

/**
 * The design draws its screens inside a device frame with a 62 px top inset.
 * On a real device that space is the status bar and notch, which
 * `useSafeAreaInsets` reports — so screens add their own inset rather than
 * hard-coding 62.
 */
export const HEADER_TOP_PADDING = 14;

/** Height the tab bar occupies, so scroll views can clear it. */
export const TAB_BAR_HEIGHT = 96;
