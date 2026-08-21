/**
 * Run a .sql file against the linked Supabase project through the Management
 * API. We reach for this instead of psql because the CLI's own `db execute`
 * path wants Docker, which this workstation does not have.
 *
 * Usage: SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... node scripts/run-sql.mjs <file>
 */
import { readFileSync } from 'node:fs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const file = process.argv[2];

if (!token || !ref || !file) {
  console.error('need SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF and a file argument');
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: readFileSync(file, 'utf8') }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}
console.log(text.slice(0, 2000));
