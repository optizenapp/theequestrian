import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import { logEmailAudit } from '@/lib/email-platform/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 1000);
    const result = await sql`
      SELECT
        l.id,
        l.name,
        l.description,
        l.created_at,
        COUNT(m.contact_id)::INTEGER AS members_count
      FROM email_lists l
      LEFT JOIN email_list_memberships m ON m.list_id = l.id
      GROUP BY l.id
      ORDER BY l.created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      lists: result.rows.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        description: (row.description as string | null) ?? null,
        membersCount: Number(row.members_count || 0),
        createdAt: new Date(row.created_at as string).toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to load email lists:', error);
    return NextResponse.json({ error: 'Failed to load email lists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : null;
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO email_lists (name, description, updated_at)
      VALUES (${name}, ${description}, NOW())
      RETURNING id
    `;
    const id = inserted.rows[0]?.id as string;
    await logEmailAudit({
      actor: 'admin',
      action: 'list_created',
      entityType: 'email_list',
      entityId: id,
      payload: { name, description },
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('Failed to create email list:', error);
    return NextResponse.json({ error: 'Failed to create email list' }, { status: 500 });
  }
}
