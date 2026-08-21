/**
 * Populate the demo catalogue: ten more roasteries, forty more coffees, and a
 * generated placeholder image for every roastery and product — including the
 * three roasteries and four coffees already in `supabase/seed.sql`, which had
 * no imagery at all.
 *
 * The images are drawn here rather than pulled from a stock service. Hotlinking
 * picsum or unsplash means the storefront breaks the moment the demo is shown
 * somewhere with a locked-down network, and the results look nothing like a
 * coffee catalogue. These are on-brand: a bag silhouette keyed to the roast
 * level, and a gradient cover carrying the lotus mark.
 *
 * Idempotent — matches roasteries on name and coffees on (roastery, name), so
 * re-running updates rather than duplicating.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/seed-demo-catalogue.mjs
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { MERCHANTS, CATEGORY_FOR_ROAST } from './demo-catalogue.mjs';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('need SUPABASE_URL and SUPABASE_SERVICE_KEY (the secret key, never committed)');
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const lotus = readFileSync('brand/mark-white.png');

/* ---------------------------------------------------------------------------
 * imagery
 * ------------------------------------------------------------------------- */

/** Brand-family fields, cycled so ten roasteries do not all look identical. */
const FIELDS = [
  ['#1C3819', '#2C5127'],
  ['#122611', '#1C3819'],
  ['#2C5127', '#3E6B36'],
  ['#3A2E14', '#6E5A28'],
  ['#1C3819', '#3E6B36'],
  ['#233A2C', '#37543F'],
  ['#2E2A18', '#5A4E28'],
  ['#16301A', '#274A2A'],
  ['#2C5127', '#4A7A3E'],
  ['#1F2E26', '#334A3C'],
];

/** Bag colour by roast — darker bean, darker bag. */
const BAG = {
  light: { body: '#D9C9A3', fold: '#BFAE86', label: '#FFFFFF' },
  medium: { body: '#B08D45', fold: '#96762F', label: '#FBF6EA' },
  medium_dark: { body: '#7A5A2E', fold: '#5E441F', label: '#F3EADA' },
  dark: { body: '#3E2C18', fold: '#2A1D0F', label: '#E8DCC6' },
};

const svg = (w, h, body) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`,
  );

/** Roastery cover: a diagonal gradient with the lotus set into the corner. */
async function cover(index) {
  const [from, to] = FIELDS[index % FIELDS.length];
  const base = svg(
    1200,
    675,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
     </linearGradient></defs>
     <rect width="1200" height="675" fill="url(#g)"/>
     <circle cx="1010" cy="120" r="240" fill="#FFFFFF" opacity="0.04"/>
     <circle cx="150" cy="600" r="180" fill="#FFFFFF" opacity="0.03"/>`,
  );

  const mark = await sharp(lotus).resize({ width: 460 }).toBuffer();

  return sharp(base)
    .composite([{ input: mark, left: 660, top: 180 }])
    .png()
    .toBuffer();
}

/** Roastery logo: the lotus on the roastery's field, rounded off. */
async function logo(index) {
  const [from] = FIELDS[index % FIELDS.length];
  const mark = await sharp(lotus).resize({ width: 300, height: 300, fit: 'inside' }).toBuffer();
  return sharp(svg(512, 512, `<rect width="512" height="512" rx="128" fill="${from}"/>`))
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

/** Product shot: a coffee bag whose colour tracks the roast level. */
async function bag(roast, index) {
  const c = BAG[roast] ?? BAG.medium;
  const [ground] = FIELDS[index % FIELDS.length];

  const art = svg(
    800,
    800,
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="#F6F5F0"/><stop offset="100%" stop-color="#E2E2D6"/>
     </linearGradient></defs>
     <rect width="800" height="800" fill="url(#bg)"/>
     <ellipse cx="400" cy="690" rx="210" ry="34" fill="${ground}" opacity="0.12"/>
     <!-- bag body -->
     <rect x="252" y="212" width="296" height="452" rx="26" fill="${c.body}"/>
     <!-- folded top, drawn darker so the bag reads as a bag and not a rectangle -->
     <path d="M252 238 L252 196 Q400 160 548 196 L548 238 Z" fill="${c.fold}"/>
     <!-- label panel -->
     <rect x="296" y="352" width="208" height="150" rx="14" fill="${c.label}" opacity="0.94"/>
     <rect x="322" y="470" width="156" height="8" rx="4" fill="${ground}" opacity="0.28"/>`,
  );

  const mark = await sharp(lotus).resize({ width: 118 }).toBuffer();
  const tinted = await sharp(mark)
    .composite([
      {
        input: svg(1, 1, `<rect width="1" height="1" fill="${ground}"/>`),
        tile: true,
        blend: 'in',
      },
    ])
    .toBuffer();

  return sharp(art)
    .composite([{ input: tinted, left: 341, top: 372 }])
    .png()
    .toBuffer();
}

/* ---------------------------------------------------------------------------
 * upload
 * ------------------------------------------------------------------------- */

/** Objects are stored as `<merchant_id>/<file>` — the layout the storage RLS
 *  policies key ownership on, so a merchant can later manage its own uploads. */
async function upload(bucket, path, body) {
  const { error } = await db.storage
    .from(bucket)
    .upload(path, body, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/* ---------------------------------------------------------------------------
 * seed
 * ------------------------------------------------------------------------- */

const { data: categories } = await db.from('categories').select('id, slug');
const categoryId = Object.fromEntries((categories ?? []).map((c) => [c.slug, c.id]));

/** Insert or fetch a roastery by name — this script must be safe to re-run. */
async function upsertMerchant(m, index) {
  const { data: existing } = await db
    .from('merchants')
    .select('id')
    .eq('name_en', m.name_en)
    .maybeSingle();

  const row = {
    name_en: m.name_en,
    name_ar: m.name_ar,
    tagline_en: m.tagline_en,
    tagline_ar: m.tagline_ar,
    city_en: m.city_en,
    city_ar: m.city_ar,
    district_en: m.district_en,
    district_ar: m.district_ar,
    rating: m.rating,
    rating_count: 40 + index * 17,
    eta_min_minutes: m.eta[0],
    eta_max_minutes: m.eta[1],
    established_year: m.year,
    lat: m.lat,
    lng: m.lng,
    is_active: true,
    is_open: true,
  };

  if (existing) {
    await db.from('merchants').update(row).eq('id', existing.id);
    return existing.id;
  }
  const { data, error } = await db.from('merchants').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

async function upsertProduct(merchantId, spec, index) {
  const [
    nameEn,
    nameAr,
    notesEn,
    notesAr,
    roast,
    process,
    originEn,
    originAr,
    altEn,
    altAr,
    varEn,
    varAr,
    price,
  ] = spec;

  const { data: existing } = await db
    .from('products')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('name_en', nameEn)
    .maybeSingle();

  const roastedOn = new Date();
  // Spread roast dates over the last fortnight so "fresh roast" has an order
  // to sort by and the freshness badge shows a range of ages.
  roastedOn.setDate(roastedOn.getDate() - (index % 12));

  const row = {
    merchant_id: merchantId,
    category_id: categoryId[CATEGORY_FOR_ROAST[roast]] ?? null,
    name_en: nameEn,
    name_ar: nameAr,
    notes_en: notesEn,
    notes_ar: notesAr,
    about_en: `${nameEn} from ${originEn}. ${process === 'natural' ? 'Dried in the fruit on raised beds' : process === 'washed' ? 'Fully washed and dried on patios' : 'Carefully processed'}, then roasted to order. Tasting notes of ${notesEn.toLowerCase()}.`,
    about_ar: `${nameAr} من ${originAr}. تُعالج بعناية ثم تُحمّص عند الطلب، بنكهات ${notesAr}.`,
    roast_level: roast,
    process,
    origin_en: originEn,
    origin_ar: originAr,
    altitude_en: altEn,
    altitude_ar: altAr,
    variety_en: varEn,
    variety_ar: varAr,
    base_price_minor: price,
    roasted_on: roastedOn.toISOString().slice(0, 10),
    stock_qty: 20 + ((index * 13) % 80),
    is_active: true,
    is_featured: index % 3 === 0,
  };

  if (existing) {
    await db.from('products').update(row).eq('id', existing.id);
    return existing.id;
  }
  const { data, error } = await db.from('products').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

let merchantIndex = 0;
let productCount = 0;

for (const m of MERCHANTS) {
  const id = await upsertMerchant(m, merchantIndex);

  const coverUrl = await upload('merchant-branding', `${id}/cover.png`, await cover(merchantIndex));
  const logoUrl = await upload('merchant-branding', `${id}/logo.png`, await logo(merchantIndex));
  await db.from('merchants').update({ cover_url: coverUrl, logo_url: logoUrl }).eq('id', id);

  let i = 0;
  for (const spec of m.products) {
    const productId = await upsertProduct(id, spec, merchantIndex * 4 + i);
    const imageUrl = await upload(
      'product-images',
      `${id}/${productId}.png`,
      await bag(spec[4], merchantIndex),
    );
    await db.from('products').update({ image_url: imageUrl }).eq('id', productId);
    i++;
    productCount++;
  }

  console.log(`${m.name_en.padEnd(18)} ${m.products.length} coffees`);
  merchantIndex++;
}

/* The design's original three roasteries and four coffees had no imagery. Give
 * them the same treatment so the storefront has no empty tiles left. */
const { data: bare } = await db
  .from('merchants')
  .select('id, name_en, products ( id, roast_level )')
  .is('cover_url', null);

let extra = FIELDS.length;
for (const m of bare ?? []) {
  const coverUrl = await upload('merchant-branding', `${m.id}/cover.png`, await cover(extra));
  const logoUrl = await upload('merchant-branding', `${m.id}/logo.png`, await logo(extra));
  await db.from('merchants').update({ cover_url: coverUrl, logo_url: logoUrl }).eq('id', m.id);

  for (const p of m.products ?? []) {
    const imageUrl = await upload(
      'product-images',
      `${m.id}/${p.id}.png`,
      await bag(p.roast_level, extra),
    );
    await db.from('products').update({ image_url: imageUrl }).eq('id', p.id);
  }
  console.log(`${m.name_en.padEnd(18)} backfilled imagery`);
  extra++;
}

const [{ count: merchants }, { count: products }] = await Promise.all([
  db.from('merchants').select('id', { count: 'exact', head: true }),
  db.from('products').select('id', { count: 'exact', head: true }),
]);

console.log(`\n${merchants} roasteries, ${products} coffees, all with imagery`);
