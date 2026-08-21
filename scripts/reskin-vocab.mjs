/**
 * Third and last re-skin pass: retire the espresso-era vocabulary.
 *
 * The palette is green now, so a button tone called "cream" and comments about
 * "the espresso colour" describe an app that no longer exists. Names that lie
 * are worse than no names.
 *
 * `espressoOnly` in queries.ts is deliberately untouched — that is a roast
 * level, not a colour.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const files = globSync('apps/*-mobile/**/*.{ts,tsx}').filter((p) => !p.includes('node_modules'));

const SWAPS = [
  // PrimaryButton tone: espresso/cream -> brand/light, matching OutlineButton
  // where `light` already means "sits on a dark background".
  ["tone = 'espresso'", "tone = 'brand'"],
  ["tone?: 'espresso' | 'cream';", "tone?: 'brand' | 'light';"],
  ['tone="cream"', 'tone="light"'],
  ["const onCream = tone === 'cream';", "const onDark = tone === 'light';"],
  ['const foreground = onCream ? colors.ink : colors.bg;', 'const foreground = onDark ? colors.ink : colors.bg;'],
  ['onCream && { backgroundColor: colors.bg },', 'onDark && { backgroundColor: colors.bg },'],

  // Comments.
  [
    ' * espresso button, the outline button, pill chips, the selection tile, the',
    ' * brand button, the outline button, pill chips, the selection tile, the',
  ],
  [
    ' * They exist so that the espresso colour and the 14 px corner radius are',
    ' * They exist so that the brand green and the 14 px corner radius are',
  ],
  [
    "  /** `cream` inverts the button for the dark onboarding and confirmation screens. */",
    "  /** `light` inverts the button for the dark onboarding and confirmation screens. */",
  ],
  ['  /** `dark` sits on the espresso/forest headers. */', '  /** `dark` sits on the brand-green headers. */'],
  [
    '          the bottom so the buttons sit on solid espresso. */}',
    '          the bottom so the buttons sit on solid brand green. */}',
  ],
  [
    ' * Onboarding. Full-bleed roastery photograph, an espresso scrim so the type',
    ' * Onboarding. Full-bleed roastery photograph, a brand-green scrim so the type',
  ],
];

let touched = 0;

for (const file of files) {
  let src = readFileSync(file, 'utf8');
  const before = src;
  for (const [from, to] of SWAPS) src = src.split(from).join(to);
  if (src === before) continue;
  writeFileSync(file, src);
  touched++;
}

console.log('updated ' + touched + ' files');
