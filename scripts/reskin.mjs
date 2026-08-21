/**
 * Re-skin the mobile apps onto the client's forest-green identity.
 *
 * Mechanical, and deliberately so: it renames the old espresso-era tokens to
 * the new semantic ones, and converts every hand-written rgba() into the alpha
 * helper for the surface it sits on. After this runs there are no brand colour
 * literals left in screen code at all — which is the point, because doing this
 * by hand across twenty files is what made the rebrand expensive.
 *
 * One-shot. Kept in the repo as the record of how the palette moved.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const files = globSync('apps/*-mobile/**/*.{ts,tsx}').filter((p) => !p.includes('node_modules'));

// Old token -> new token. `brown` (quiet links) and `forest` (subscription
// surfaces) both land on brandMid: with a single-hue identity there is no
// second family to keep them apart, and they never meet on the same element.
const TOKENS = [
  ['colors.espresso', 'colors.brand'],
  ['colors.caramel', 'colors.accent'],
  ['colors.brown', 'colors.brandMid'],
  ['colors.forest', 'colors.brandMid'],
  ['colors.green', 'colors.live'],
  ['colors.gold', 'colors.accent'],
  ['colors.red', 'colors.danger'],
];

// Old channel triples -> the helper that now owns them.
const TINTS = [
  [/rgba\(248,\s*244,\s*238,\s*([\d.]+)\)/g, 'onBrand($1)'],
  [/rgba\(33,\s*23,\s*18,\s*([\d.]+)\)/g, 'onSurface($1)'],
  [/rgba\(197,\s*139,\s*85,\s*([\d.]+)\)/g, 'accentTint($1)'],
  [/rgba\(217,\s*144,\s*47,\s*([\d.]+)\)/g, 'accentTint($1)'],
  [/rgba\(201,\s*75,\s*75,\s*([\d.]+)\)/g, 'dangerTint($1)'],
  [/rgba\(46,\s*125,\s*91,\s*([\d.]+)\)/g, 'liveTint($1)'],
  [/rgba\(31,\s*77,\s*58,\s*([\d.]+)\)/g, 'brandTint($1)'],
  [/rgba\(59,\s*36,\s*24,\s*([\d.]+)\)/g, 'brandTint($1)'],
  [/rgba\(90,\s*56,\s*38,\s*([\d.]+)\)/g, 'brandTint($1)'],
];

// Stray hexes that predate the palette.
const HEXES = [
  ["'#5A3826'", 'colors.brandMid'],
  ["'#1F4D3A'", 'colors.brandMid'],
  ["'#F4EFE8'", 'colors.surfaceSoft'],
  ["'#EDE6DD'", 'colors.canvas'],
  ["'#EDE6DC'", 'colors.canvas'],
  ["'#E9E3DA'", 'colors.canvas'],
  ["'#8E2F2F'", 'colors.dangerInk'],
  ["'#96524F'", 'colors.dangerInk'],
  ["'#3F6455'", 'colors.ink2'],
  ["'#5F534C'", 'colors.ink2'],
  ["'#A79A90'", 'colors.ink4'],
  ["'#B5A79C'", 'colors.ink4'],
];

const HELPERS = ['onBrand', 'onSurface', 'brandTint', 'accentTint', 'liveTint', 'dangerTint'];

let touched = 0;

for (const file of files) {
  let src = readFileSync(file, 'utf8');
  const before = src;

  for (const [from, to] of TOKENS) src = src.split(from).join(to);
  for (const [re, to] of TINTS) src = src.replace(re, to);
  for (const [from, to] of HEXES) src = src.split(from).join(to);

  if (src === before) continue;

  const used = HELPERS.filter((h) => src.includes(h + '('));

  if (used.length > 0 && !src.includes("from '@leen/ui/palette'")) {
    const importLine = "import { " + used.join(', ') + " } from '@leen/ui/palette';";
    // Slot it beside the theme import so the colour imports stay together.
    const themeImport = /^import \{[^}]*\} from '(\.\.\/)*lib\/theme';$/m;
    src = themeImport.test(src)
      ? src.replace(themeImport, (m) => m + '\n' + importLine)
      : importLine + '\n' + src;
  }

  writeFileSync(file, src);
  touched++;
}

console.log('rewrote ' + touched + ' files');
