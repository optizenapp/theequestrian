#!/usr/bin/env tsx
/** One-off: fix E-A-V bullet format for a product override. */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function getArg(flag: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return match ? match.split('=').slice(1).join('=') : undefined;
}

async function main(): Promise<void> {
  if (process.argv.includes('--floral-prod')) {
    process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
    process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  }

  const handle = getArg('--handle')?.trim();
  const bulletsRaw = getArg('--bullets');
  if (!handle || !bulletsRaw) {
    console.error('Usage: npx tsx scripts/fix-product-bullets.ts --handle=... --bullets="A: x|B: y" [--floral-prod]');
    process.exit(1);
  }

  const bullets = bulletsRaw.split('|').map((b) => b.trim()).filter(Boolean);
  if (bullets.length < 3) {
    console.error('Need at least 3 bullets separated by |');
    process.exit(1);
  }

  const { sql } = await import('@/lib/db/client');
  const { invalidateProductOverrideCache } = await import('@/lib/content/product-overrides');

  await sql`
    UPDATE product_content_overrides
    SET bullet_points = ${JSON.stringify(bullets)}::jsonb,
        use_headless_bullets = TRUE,
        updated_at = NOW()
    WHERE product_handle = ${handle}
  `;

  invalidateProductOverrideCache();
  console.log(`Updated ${bullets.length} bullets for ${handle}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
