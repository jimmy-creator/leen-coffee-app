/**
 * Second pass over the re-skin.
 *
 * The first pass swapped `rgba(...)` for helper calls but left the surrounding
 * quotes in place, turning every one into a string literal —
 * `backgroundColor: 'brandTint(0.62)'` renders nothing. This unwraps them, and
 * converts the JSX attribute form to an expression container.
 *
 * Also mops up the double-quoted hex literals the first pass missed, since it
 * only matched the single-quoted form.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const files = globSync('apps/*-mobile/**/*.{ts,tsx}').filter((p) => !p.includes('node_modules'));

const HELPERS = '(?:onBrand|onSurface|brandTint|accentTint|liveTint|dangerTint)';

const HEX_TO_TOKEN = {
  '#8E2F2F': 'colors.dangerInk',
  '#96524F': 'colors.dangerInk',
  '#3F6455': 'colors.ink2',
  '#5F534C': 'colors.ink2',
  '#A79A90': 'colors.ink4',
  '#B5A79C': 'colors.ink4',
};

let touched = 0;

for (const file of files) {
  let src = readFileSync(file, 'utf8');
  const before = src;

  // JSX attribute: color="onBrand(0.72)" -> color={onBrand(0.72)}
  src = src.replace(new RegExp('="(' + HELPERS + '\\([^"]*\\))"', 'g'), '={$1}');

  // Object literal / prop value: 'brandTint(0.62)' -> brandTint(0.62)
  src = src.replace(new RegExp("'(" + HELPERS + "\\([^']*\\))'", 'g'), '$1');
  src = src.replace(new RegExp('"(' + HELPERS + '\\([^"]*\\))"', 'g'), '$1');

  // Double-quoted hexes the first pass skipped.
  for (const [hex, token] of Object.entries(HEX_TO_TOKEN)) {
    src = src.replace(new RegExp('="' + hex + '"', 'g'), '={' + token + '}');
    src = src.split('"' + hex + '"').join(token);
    src = src.split("'" + hex + "'").join(token);
  }

  if (src === before) continue;
  writeFileSync(file, src);
  touched++;
}

console.log('fixed ' + touched + ' files');
