import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';

const allowedStatuses = new Set(['active', 'disabled', 'conflict', 'override']);
const allowedTypes = new Set(['301', '302', '307', '308']);
const allowedSources = new Set(['manual', 'csv']);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body?.status === 'string' ? body.status : undefined;
    const toPath = typeof body?.to === 'string' ? body.to : undefined;
    const type = typeof body?.type === 'string' ? body.type : undefined;
    const source = typeof body?.source === 'string' ? body.source : undefined;

    if (status && !allowedStatuses.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (type && !allowedTypes.has(type)) {
      return NextResponse.json({ error: 'Invalid redirect type' }, { status: 400 });
    }
    if (source && !allowedSources.has(source)) {
      return NextResponse.json({ error: 'Invalid redirect source' }, { status: 400 });
    }

    await sql`
      UPDATE manual_redirects
      SET status = COALESCE(${status}, status),
          to_path = COALESCE(${toPath}, to_path),
          redirect_type = COALESCE(${type}, redirect_type),
          source = COALESCE(${source}, source),
          updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Redirect status error:', error);
    return NextResponse.json({ error: 'Failed to update redirect' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await sql`
      DELETE FROM manual_redirects
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Redirect delete error:', error);
    return NextResponse.json({ error: 'Failed to delete redirect' }, { status: 500 });
  }
}
