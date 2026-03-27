#!/usr/bin/env tsx
/**
 * One-off: sync /horse/rugs collection_content with approved SEO copy.
 * Run: npx tsx scripts/update-horse-rugs-collection-content.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

/** Same Neon account; production site reads from floral-wind pooler (see user / Vercel prod DB). */
const FLORAL_WIND_POOLER =
  'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) {
    return process.env.CUSTOM_DATABASE_URL;
  }
  if (process.argv.includes('--floral-prod')) {
    const user = process.env.POSTGRES_USER || 'neondb_owner';
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) {
      throw new Error('POSTGRES_PASSWORD required in .env.local for --floral-prod');
    }
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${FLORAL_WIND_POOLER}/neondb?sslmode=require&channel_binding=require`;
  }
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing POSTGRES_URL or DATABASE_URL');
  }
  return connectionString;
}

const connectionString = resolveConnectionString();

const sql = neon(connectionString);

/** SEO `<title>` / Google snippet — not the on-page H1 */
const metaTitle = 'Horse Rugs Australia – Winter, Summer, Waterproof & More';

/** Visible H1 (distinct from meta title) */
const h1Title = 'Horse Rugs for Every Season & Condition';

/** First block = visible before "Read more"; marker consumed by CollectionDescription; rest stays in DOM, hidden until expanded. */
const shortDescription = `<p>Browse our range of <strong>horse rugs</strong> designed for every season, climate and riding need.</p>
<!--read-more-trigger-->
<p>From lightweight summer rugs to insulated winter turnout rugs, choosing the right option helps keep your horse comfortable, protected and performing at their best.</p>

<p>Whether you’re looking for waterproof protection, breathable materials or specialised rugs for travel and exercise, you’ll find options to suit all conditions. Our collection includes trusted brands and high-quality designs built for durability, fit and performance.</p>`;

const longDescription = `<h2>Types of Horse Rugs Explained</h2>

<p>
Horse rugs come in a range of styles designed for different conditions, uses and levels of protection. From lightweight summer rugs to specialised therapy and travel rugs, choosing the right type ensures your horse stays comfortable and protected year-round.
</p>

<h3>Summer and Lightweight Rugs</h3>
<p>
In warmer conditions, <strong>summer horse rugs</strong> and breathable cotton rugs help protect against heat, insects and UV exposure without causing overheating. Lightweight designs are ideal for everyday use and stable environments.
</p>

<h3>Winter and Waterproof Rugs</h3>
<p>
For colder weather, insulated and waterproof rugs provide essential protection. Hybrid rainsheets and turnout rugs are designed to keep horses dry and warm during wet and windy conditions.
</p>

<h3>Specialist Rugs and Accessories</h3>
<p>
Some rugs are designed for specific purposes, including <strong>horse towel rugs</strong> for drying, therapy rugs for recovery, and neck sweats for conditioning. Tail wraps, bibs and other accessories also play an important role in horse care and transport.
</p>

<h2>Shop Horse Rugs by Brand</h2>

<p>
Browse horse rugs from trusted equestrian brands known for quality, fit and durability. Shop leading options including
<a href="/brands/zilco">Zilco horse rugs</a>,
<a href="/brands/kentucky-horsewear">Kentucky Horsewear</a>,
<a href="/brands/shanga">Shanga</a> and
<a href="/brands/wild-horse">Wild Horse</a>.
</p>

<h2>Horse Rug FAQs</h2>

<h3>What is a horse towel rug used for?</h3>
<p>
A horse towel rug is used to dry horses after washing or exercise. It helps wick moisture away while keeping the horse warm.
</p>

<h3>What is the difference between a rug and a horse blanket?</h3>
<p>
Horse rugs and horse blankets are often used interchangeably. In Australia and the UK, “rug” is more commonly used, while “blanket” is more common in the US.
</p>

<h3>What is a hybrid rainsheet?</h3>
<p>
A hybrid rainsheet combines waterproof protection with breathable materials, making it suitable for changing weather conditions.
</p>

<h3>What are neck sweats used for?</h3>
<p>
Neck sweats are used to help shape and condition a horse’s neck, often used in training and preparation.
</p>`;

async function main() {
  const result = await sql`
    UPDATE collection_content
    SET
      meta_title = ${metaTitle},
      h1_title = ${h1Title},
      short_description = ${shortDescription},
      long_description = ${longDescription},
      faq_items = '[]'::jsonb,
      generated_by = 'manual',
      version = COALESCE(version, 1) + 1
    WHERE url_path = '/horse/rugs'
    RETURNING id, url_path, version, meta_title, h1_title
  `;

  if (!result.length) {
    console.error('No row updated — missing url_path /horse/rugs?');
    process.exit(1);
  }

  console.log('Updated:', result[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
