import { NextRequest, NextResponse } from 'next/server';
import { createSegment, listSegments } from '@/lib/email-platform/segments';
import type { SegmentRuleGroup } from '@/lib/email-platform/types';
import { logEmailAudit } from '@/lib/email-platform/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 1000);
    const segments = await listSegments(limit);
    return NextResponse.json({ segments });
  } catch (error) {
    console.error('Failed to list segments:', error);
    return NextResponse.json({ error: 'Failed to list segments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const rules: SegmentRuleGroup =
      body?.rules && typeof body.rules === 'object'
        ? (body.rules as SegmentRuleGroup)
        : { mode: 'all', conditions: [] };
    const result = await createSegment({
      name,
      description: typeof body?.description === 'string' ? body.description : undefined,
      rules,
    });
    await logEmailAudit({
      actor: 'admin',
      action: 'segment_created',
      entityType: 'email_segment',
      entityId: result.id,
      payload: { name, rules },
    });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error('Failed to create segment:', error);
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 });
  }
}
