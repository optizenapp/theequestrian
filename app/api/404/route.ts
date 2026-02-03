import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { upsertNotFoundRollup } from '@/lib/not-found/rollup-store';

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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body?.path === 'string' ? body.path : null;
    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    await ensureNotFoundTable();
    const referrer = typeof body?.referrer === 'string' ? body.referrer : null;
    const userAgent = request.headers.get('user-agent');

    await sql`
      INSERT INTO not_found_events (path, referrer, user_agent)
      VALUES (${path}, ${referrer}, ${userAgent})
    `;
    await upsertNotFoundRollup({
      path,
      referrer,
      source: 'internal',
      hitIncrement: 1,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('404 logger error:', error);
    return NextResponse.json({ error: 'Failed to log 404' }, { status: 500 });
  }
}
