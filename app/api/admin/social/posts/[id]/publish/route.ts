import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { publishStandaloneSocialPost } from '@/lib/social/standalone-publisher';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const result = await publishStandaloneSocialPost(id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, externalPostId: result.externalPostId, externalUrl: result.externalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish social post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
