import { sql } from '@/lib/db/client';

const MARKETPLACE_REST_SPACING_MS = 550;
const LOCAL_REST_SPACING_MS = 650;

let ensuredRateLimitTable = false;
let localAvailableAt = 0;
let localQueue: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureRateLimitTable(): Promise<void> {
  if (ensuredRateLimitTable) return;
  await sql`
    CREATE TABLE IF NOT EXISTS shopify_rest_rate_limits (
      key TEXT PRIMARY KEY,
      available_at TIMESTAMPTZ NOT NULL
    )
  `;
  ensuredRateLimitTable = true;
}

async function reserveDatabaseSlot(key: string): Promise<number> {
  await ensureRateLimitTable();

  const rows = (await sql`
    WITH reservation AS (
      INSERT INTO shopify_rest_rate_limits (key, available_at)
      VALUES (
        ${key},
        NOW() + (${MARKETPLACE_REST_SPACING_MS} * INTERVAL '1 millisecond')
      )
      ON CONFLICT (key)
      DO UPDATE SET
        available_at = GREATEST(
          shopify_rest_rate_limits.available_at,
          NOW()
        ) + (${MARKETPLACE_REST_SPACING_MS} * INTERVAL '1 millisecond')
      RETURNING available_at - (${MARKETPLACE_REST_SPACING_MS} * INTERVAL '1 millisecond') AS scheduled_at
    )
    SELECT GREATEST(
      0,
      EXTRACT(EPOCH FROM ((SELECT scheduled_at FROM reservation) - NOW())) * 1000
    )::INT AS wait_ms
  `) as unknown;

  const first = Array.isArray(rows) ? rows[0] : undefined;
  const waitValue =
    first && typeof first === 'object' ? (first as { wait_ms?: unknown }).wait_ms : 0;
  const waitMs = Number(waitValue ?? 0);
  return Number.isFinite(waitMs) ? waitMs : 0;
}

async function reserveLocalSlot(): Promise<void> {
  const run = localQueue.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, localAvailableAt - now);
    localAvailableAt = Math.max(now, localAvailableAt) + LOCAL_REST_SPACING_MS;
    if (waitMs > 0) await sleep(waitMs);
  });
  localQueue = run.catch(() => undefined);
  return run;
}

export async function throttleMarketplaceRestCall(key: string, label: string): Promise<void> {
  try {
    const waitMs = await reserveDatabaseSlot(key);
    if (waitMs > 0) await sleep(waitMs);
  } catch (error) {
    console.warn('[shopify-rest] DB throttle unavailable; using local throttle', label, error);
    await reserveLocalSlot();
  }
}
