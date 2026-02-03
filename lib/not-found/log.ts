import { headers } from 'next/headers';
import { sql } from '@vercel/postgres';

const ensureNotFoundTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS not_found_events (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};

export async function logServerNotFound() {
  try {
    const headerStore = headers();
    const path = headerStore.get('x-request-path') || '/';
    const referrer = headerStore.get('referer');
    const userAgent = headerStore.get('user-agent');

    await ensureNotFoundTable();
    await sql`
      INSERT INTO not_found_events (path, referrer, user_agent)
      VALUES (${path}, ${referrer}, ${userAgent})
    `;
  } catch (error) {
    console.error('Server 404 log error:', error);
  }
}
