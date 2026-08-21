/**
 * Replace the generated placeholder artwork with real photography.
 *
 * Sourced from Openverse, filtered to `cc0,pdm` — public domain and CC0 only.
 * That filter is the point: a commercial client should not inherit an
 * attribution obligation from demo seed data, and CC-BY images would create one
 * on every screen they appear.
 *
 * Roastery logos are left as the generated lotus. A random photograph makes a
 * poor logo, and the lotus is the actual brand mark.
 *
 * Every image used is recorded in docs/photo-credits.json with its source URL
 * and licence, so the provenance is checkable later even though none of it
 * requires attribution.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/seed-demo-photos.mjs
 *
 * Idempotent, but re-running fetches a fresh set — pass --keep to skip rows
 * that already have a photograph.
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const keepExisting = process.argv.includes('--keep');

if (!url || !serviceKey) {
  console.error('need SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const OPENVERSE = 'https://api.openverse.org/v1/images/';

/**
 * Several narrow queries rather than one broad one: "coffee" alone returns
 * latte art and cafe signage, which reads as stock filler. These describe the
 * two things actually being illustrated.
 */
const COVER_QUERIES = [
  'coffee roastery',
  'coffee shop interior',
  'coffee roasting machine',
  'cafe counter',
  'coffee sacks warehouse',
];

const PRODUCT_QUERIES = [
  'coffee beans',
  'roasted coffee beans',
  'coffee bag packaging',
  'espresso beans',
  'ground coffee',
  'coffee scoop beans',
  'arabica beans',
];

/** Pull a pool of CC0/public-domain images for a set of queries. */
async function pool(queries, wanted) {
  const seen = new Set();
  const out = [];

  for (const q of queries) {
    if (out.length >= wanted) break;
    const params = new URLSearchParams({
      q,
      license: 'cc0,pdm',
      size: 'large',
      page_size: '20',
      mature: 'false',
    });

    let json;
    try {
      const res = await fetch(`${OPENVERSE}?${params}`, {
        headers: { 'User-Agent': 'leen-coffee-seed/1.0' },
      });
      if (!res.ok) continue;
      json = await res.json();
    } catch {
      continue;
    }

    for (const r of json.results ?? []) {
      const src = r.url;
      if (!src || seen.has(src)) continue;
      seen.add(src);
      out.push({
        src,
        title: r.title ?? null,
        creator: r.creator ?? null,
        license: r.license,
        source: r.foreign_landing_url ?? null,
        query: q,
      });
      if (out.length >= wanted) break;
    }
  }

  return out;
}

/** Download and crop to the target box. Returns null if the fetch fails. */
async function render(src, width, height) {
  try {
    const res = await fetch(src, { headers: { 'User-Agent': 'leen-coffee-seed/1.0' } });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());

    return await sharp(input)
      // `attention` picks the crop around the busiest region, which for a bag
      // or a pile of beans is the subject rather than the tabletop.
      .resize(width, height, { fit: 'cover', position: sharp.strategy.attention })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
}

async function upload(bucket, path, body) {
  const { error } = await db.storage
    .from(bucket)
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/* ------------------------------------------------------------------------- */

const { data: merchants } = await db.from('merchants').select('id, name_en, cover_url').order('id');

const { data: products } = await db
  .from('products')
  .select('id, name_en, merchant_id, image_url')
  .order('id');

const merchantTargets = (merchants ?? []).filter(
  (m) => !keepExisting || !m.cover_url?.includes('.jpg'),
);
const productTargets = (products ?? []).filter(
  (p) => !keepExisting || !p.image_url?.includes('.jpg'),
);

console.log(
  `fetching photos for ${merchantTargets.length} roasteries, ${productTargets.length} coffees`,
);

const covers = await pool(COVER_QUERIES, merchantTargets.length + 6);
const shots = await pool(PRODUCT_QUERIES, productTargets.length + 12);

console.log(`pool: ${covers.length} covers, ${shots.length} product shots`);

const credits = [];

let coverIndex = 0;
for (const m of merchantTargets) {
  let image = null;
  // Walk the pool rather than failing on one dead link — some Openverse
  // records point at hosts that have since gone away.
  while (!image && coverIndex < covers.length) {
    const candidate = covers[coverIndex++];
    image = await render(candidate.src, 1200, 675);
    if (image) {
      const publicUrl = await upload('merchant-branding', `${m.id}/cover.jpg`, image);
      await db.from('merchants').update({ cover_url: publicUrl }).eq('id', m.id);
      credits.push({ kind: 'merchant-cover', subject: m.name_en, ...candidate });
      console.log(`cover  ${m.name_en}`);
    }
  }
  if (!image) console.log(`cover  ${m.name_en} — pool exhausted, keeping placeholder`);
}

let shotIndex = 0;
for (const p of productTargets) {
  let image = null;
  while (!image && shotIndex < shots.length) {
    const candidate = shots[shotIndex++];
    image = await render(candidate.src, 800, 800);
    if (image) {
      const publicUrl = await upload('product-images', `${p.merchant_id}/${p.id}.jpg`, image);
      await db.from('products').update({ image_url: publicUrl }).eq('id', p.id);
      credits.push({ kind: 'product', subject: p.name_en, ...candidate });
    }
  }
  // The pool is smaller than the catalogue, so wrap and reuse. Two coffees
  // sharing a photograph is fine for demo filler; a grey box is not.
  if (!image && shots.length > 0) shotIndex = 0;
}

console.log(`\nproducts photographed: ${credits.filter((c) => c.kind === 'product').length}`);

mkdirSync('docs', { recursive: true });
writeFileSync(
  'docs/photo-credits.json',
  JSON.stringify(
    {
      note:
        'Demo seed photography from Openverse, filtered to CC0 and public domain. ' +
        'No attribution is required; this file exists so the provenance stays checkable.',
      generated_by: 'scripts/seed-demo-photos.mjs',
      images: credits,
    },
    null,
    2,
  ) + '\n',
);
console.log('wrote docs/photo-credits.json');
