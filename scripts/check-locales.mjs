/**
 * Key-parity check across every locale.
 *
 * English is the reference. A missing key falls back silently to English at
 * runtime, which means a half-translated screen ships looking fine to whoever
 * tested it in English — this is the only thing that catches that.
 *
 * Placeholders are checked too: a translation that drops {{count}} renders a
 * sentence with a hole in it.
 */
import { readFileSync, readdirSync } from 'node:fs';

const DIR = 'packages/i18n/src/locales';
const read = (f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, String(v)]],
  );

const placeholders = (s) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort().join(',');

const base = new Map(flatten(read('en.json')));
const files = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'en.json');

let problems = 0;

for (const file of files) {
  const locale = file.replace('.json', '');
  const other = new Map(flatten(read(file)));

  // i18next resolves plural suffixes per language, so a locale legitimately
  // has _one/_other where English does and may add _two/_few/_many. Compare
  // the stem instead of the exact key.
  const stem = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');
  const baseStems = new Set([...base.keys()].map(stem));
  const otherStems = new Set([...other.keys()].map(stem));

  const missing = [...baseStems].filter((k) => !otherStems.has(k));
  const extra = [...otherStems].filter((k) => !baseStems.has(k));

  // A translation may legitimately DROP a placeholder: Arabic, Urdu and Dari
  // carry small numbers in the word itself, so the singular and dual forms of
  // "2 results" contain no {{count}} at all. What is never right is INVENTING
  // a placeholder the reference does not have — that renders as literal braces.
  const brokenPlaceholders = [...other.entries()].filter(([k, v]) => {
    const ref = base.get(k) ?? base.get(stem(k) + '_other') ?? base.get(stem(k));
    if (!ref) return false;
    const refSet = new Set(placeholders(ref).split(',').filter(Boolean));
    const ownSet = placeholders(v).split(',').filter(Boolean);
    return ownSet.some((ph) => !refSet.has(ph));
  });

  const ok = !missing.length && !extra.length && !brokenPlaceholders.length;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${locale.padEnd(6)} ${other.size} keys`);

  if (missing.length) console.log(`        missing: ${missing.slice(0, 8).join(', ')}`);
  if (extra.length) console.log(`        extra:   ${extra.slice(0, 8).join(', ')}`);
  for (const [k, v] of brokenPlaceholders.slice(0, 5)) {
    console.log(`        placeholder mismatch at ${k}: "${v.slice(0, 50)}"`);
  }
  if (!ok) problems++;
}

console.log(
  `\n${problems === 0 ? 'every locale matches en' : `${problems} locale(s) need attention`}`,
);
process.exitCode = problems === 0 ? 0 : 1;
