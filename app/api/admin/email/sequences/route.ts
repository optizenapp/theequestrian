import { NextRequest, NextResponse } from 'next/server';
import { createSequence, listSequences } from '@/lib/email-platform/sequences';
import { logEmailAudit } from '@/lib/email-platform/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 1000);
    const sequences = await listSequences(limit);
    return NextResponse.json({ sequences });
  } catch (error) {
    console.error('Failed to list sequences:', error);
    return NextResponse.json({ error: 'Failed to list sequences' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const triggerType =
      body?.triggerType === 'first_order' ||
      body?.triggerType === 'repeat_customer' ||
      body?.triggerType === 'product_type_purchased' ||
      body?.triggerType === 'ltv_threshold_crossed' ||
      body?.triggerType === 'winback_eligible'
        ? body.triggerType
        : 'new_customer';

    const steps = Array.isArray(body?.steps)
      ? body.steps
          .filter((value: unknown) => typeof value === 'object' && !!value)
          .map((value: unknown) => {
            const record = value as { stepType?: string; config?: Record<string, unknown> };
            const stepType =
              record.stepType === 'wait' || record.stepType === 'send_email' || record.stepType === 'condition_gate'
                ? record.stepType
                : 'wait';
            return {
              stepType,
              config: record.config && typeof record.config === 'object' ? record.config : {},
            };
          })
      : [];

    const created = await createSequence({
      name,
      triggerType,
      triggerConfig: typeof body?.triggerConfig === 'object' && body.triggerConfig ? body.triggerConfig : {},
      entryRules: typeof body?.entryRules === 'object' && body.entryRules ? body.entryRules : undefined,
      stopRules: typeof body?.stopRules === 'object' && body.stopRules ? body.stopRules : undefined,
      steps,
    });
    await logEmailAudit({
      actor: 'admin',
      action: 'sequence_created',
      entityType: 'email_sequence',
      entityId: created.sequenceId,
      payload: { name, triggerType, stepCount: steps.length },
    });
    return NextResponse.json({ ok: true, ...created });
  } catch (error) {
    console.error('Failed to create sequence:', error);
    return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 });
  }
}
