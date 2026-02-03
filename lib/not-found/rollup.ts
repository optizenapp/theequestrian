import { sql } from '@vercel/postgres';

const ensureTables = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS not_found_events (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS not_found_daily (
      day DATE PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};

export async function rollupNotFoundEvents(days = 30) {
  await ensureTables();
  const result = await sql`
    SELECT DATE(created_at) as day, COUNT(*)::int as hits
    FROM not_found_events
    WHERE created_at >= NOW() - ${`${days} days`}::interval
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `;

  for (const row of result.rows) {
    await sql`
      INSERT INTO not_found_daily (day, hits, updated_at)
      VALUES (${row.day}, ${row.hits}, NOW())
      ON CONFLICT (day) DO UPDATE
      SET hits = EXCLUDED.hits,
          updated_at = NOW()
    `;
  }

  return result.rows.length;
}
