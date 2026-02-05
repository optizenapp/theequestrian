import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auditManualRedirects } from '@/lib/redirects/audit';

export async function POST() {
  try {
    const conflicts = await auditManualRedirects();
    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Redirect audit error:', error);
    return NextResponse.json({ error: 'Failed to audit redirects' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await sql`
      SELECT id, from_path, to_path, redirect_type, status, conflict_target, last_checked, updated_at
      FROM manual_redirects
      WHERE status = 'conflict'
      ORDER BY updated_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ conflicts: result.rows });
  } catch (error) {
    console.error('Redirect conflicts error:', error);
    return NextResponse.json({ error: 'Failed to load conflicts' }, { status: 500 });
  }
}
