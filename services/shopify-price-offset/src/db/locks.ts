import { Pool } from 'pg';

/**
 * Marketplace variant price locks.
 *
 * The lock rows live in the main application Postgres (the same DB used by
 * lib/db/client.ts and the vendor-sync webhook). The price-offset service has
 * historically used its own database, so we read the locks via a separate
 * connection pool driven by MAIN_DATABASE_URL (falling back to DATABASE_URL
 * when both DBs happen to be the same).
 */

let cachedPool: Pool | null = null;

function getMainPool(): Pool {
  if (cachedPool) return cachedPool;
  const url = process.env.MAIN_DATABASE_URL || process.env.DATABASE_URL || '';
  if (!url) {
    throw new Error('MAIN_DATABASE_URL or DATABASE_URL must be set to read price locks');
  }
  cachedPool = new Pool({ connectionString: url });
  return cachedPool;
}

export async function loadLockedVariantIds(): Promise<Set<string>> {
  try {
    const result = await getMainPool().query<{ variant_id: string }>(
      `SELECT variant_id FROM marketplace_price_locks`
    );
    return new Set(result.rows.map((r) => String(r.variant_id)));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('marketplace_price_locks') && msg.includes('does not exist')) {
      console.warn('[locks] marketplace_price_locks table missing — apply migration to enable lock support');
      return new Set();
    }
    throw e;
  }
}

export async function closeLockPool(): Promise<void> {
  if (cachedPool) {
    await cachedPool.end();
    cachedPool = null;
  }
}
