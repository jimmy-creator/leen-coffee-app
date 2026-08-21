/**
 * WCAG contrast check for the Leen palette.
 *
 * A rebrand is exactly where text quietly becomes unreadable, so every
 * foreground/background pair the app actually renders is checked here rather
 * than eyeballed. Body text wants 4.5:1; large text and non-text UI want 3:1.
 */
const P = {
  brand: '#1C3819',
  brandDeep: '#122611',
  brandMid: '#2C5127',
  accent: '#C8A45C',
  live: '#4C9A5E',
  danger: '#C0452F',
  dangerInk: '#8E2F22',
  bg: '#F6F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#EAEAE1',
  surfaceSoft: '#F0EFE8',
  ink: '#171C15',
  ink2: '#566052',
  ink3: '#7F887C',
  ink4: '#A6AE9F',
  onBrand: '#F6F5F0',
};

const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [label, foreground, background, minimum]
const PAIRS = [
  ['body ink on page', P.ink, P.bg, 4.5],
  ['body ink on card', P.ink, P.surface, 4.5],
  ['secondary text on page', P.ink2, P.bg, 4.5],
  ['tertiary text on page', P.ink3, P.bg, 3.0],
  // ink4 is disabled-state only, which WCAG 1.4.3/1.4.11 exempt. Inactive
  // tab glyphs are NOT disabled and use ink3, which is checked below.
  ['inactive tab glyph', P.ink3, P.bg, 3.0],
  ['link on page', P.brandMid, P.bg, 4.5],
  ['cream on brand button', P.onBrand, P.brand, 4.5],
  ['cream on brandMid card', P.onBrand, P.brandMid, 4.5],
  ['cream on brandDeep', P.onBrand, P.brandDeep, 4.5],
  ['accent on brand header', P.accent, P.brand, 3.0],
  ['danger text on page', P.dangerInk, P.bg, 4.5],
  ['live pill text on page', P.brandMid, P.bg, 4.5],
  ['ink on surfaceAlt', P.ink, P.surfaceAlt, 4.5],
  ['tertiary on surfaceSoft', P.ink3, P.surfaceSoft, 3.0],
  ['tertiary on surfaceAlt', P.ink3, P.surfaceAlt, 3.0],
];

let worst = Infinity;
let failed = 0;

for (const [label, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  worst = Math.min(worst, r / min);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(26)} ${r.toFixed(2)}:1  (needs ${min})`);
}

console.log(`\n${failed === 0 ? 'all pairs pass' : failed + ' pair(s) below target'}`);
process.exitCode = failed === 0 ? 0 : 1;
