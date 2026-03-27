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

/** First block = visible before "Read more"; marker consumed by CollectionDescription; rest stays in DOM, hidden until expanded. */
const shortDescription = `<p>Browse our range of <strong>horse rugs</strong> designed for every season, climate and riding need.</p>
<!--read-more-trigger-->
<p>From lightweight summer rugs to insulated winter turnout rugs, choosing the right option helps keep your horse comfortable, protected and performing at their best.</p>

<p>Whether you’re looking for waterproof protection, breathable materials or specialised rugs for travel and exercise, you’ll find options to suit all conditions. Our collection includes trusted brands and high-quality designs built for durability, fit and performance.</p>`;

const longDescription = `<h2>How to Choose the Right Horse Rug</h2>

<p>
Choosing the right horse rug depends on your horse's environment, activity level and the climate. Key factors to consider include rug weight, waterproofing, breathability and overall fit.
</p>

<h3>Rug Weight Guide</h3>
<ul>
<li><strong>Lightweight (0–100g):</strong> Ideal for mild weather and rain protection</li>
<li><strong>Mediumweight (150–250g):</strong> Suitable for cooler temperatures</li>
<li><strong>Heavyweight (300g+):</strong> Best for cold winter conditions</li>
</ul>

<h3>Fit and Comfort</h3>
<p>
A well-fitted rug prevents rubbing and ensures freedom of movement. Look for adjustable straps, secure closures and breathable materials for all-day comfort.
</p>

<h2>Horse Rugs for Different Conditions</h2>

<p>
Different environments require different rug types. Heavier rugs are suited to colder weather, while lightweight and breathable options are better for warmer conditions. Waterproof rugs are essential for wet climates, and specialised rugs can be used for travel or exercise.
</p>

<p>
In colder conditions, heavier rugs provide insulation, while lighter options are better suited to warmer climates.
<a href="/horse/rugs/winter">Winter rugs</a> are ideal for protecting horses during colder months.
</p>

<h2>Quality Horse Rugs from Trusted Brands</h2>

<p>
We stock horse rugs from leading equestrian brands known for quality, durability and performance. Each rug is designed to provide comfort, protection and a secure fit, helping you care for your horse in all conditions.
</p>

<h2>Horse Rug FAQs</h2>

<h3>How do I measure my horse for a rug?</h3>
<p>
Measure from the centre of the chest to the rear of the hindquarters to determine the correct rug size.
</p>

<h3>What weight rug should I use?</h3>
<p>
This depends on temperature, your horse's coat and whether they are clipped. Heavier rugs are used in colder conditions.
</p>

<h3>When should I use a fly rug?</h3>
<p>
Fly rugs are used in warmer weather to protect against insects and UV exposure.
</p>

<h3>Can a horse wear a rug all day?</h3>
<p>
Yes, but it's important to check fit regularly and ensure the horse does not overheat.
</p>`;

async function main() {
  const result = await sql`
    UPDATE collection_content
    SET
      short_description = ${shortDescription},
      long_description = ${longDescription},
      faq_items = '[]'::jsonb,
      generated_by = 'manual',
      version = COALESCE(version, 1) + 1
    WHERE url_path = '/horse/rugs'
    RETURNING id, url_path, version
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
