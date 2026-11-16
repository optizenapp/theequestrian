import { NextRequest, NextResponse } from 'next/server';
import { suggestUpsellHandles } from '@/lib/cart-upsells/ai-suggest';
import type { CartUpsellTriggerType } from '@/lib/cart-upsells/types';

export const dynamic = 'force-dynamic';

const TRIGGER_TYPES = new Set<CartUpsellTriggerType>([
  'product_handle',
  'product_type',
  'vendor',
]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      triggerType?: unknown;
      triggerValues?: unknown;
      limit?: unknown;
    };
    const triggerType = body.triggerType;
    if (
      typeof triggerType !== 'string' ||
      !TRIGGER_TYPES.has(triggerType as CartUpsellTriggerType)
    ) {
      return NextResponse.json({ error: 'Invalid triggerType' }, { status: 400 });
    }
    const triggerValues = Array.isArray(body.triggerValues)
      ? body.triggerValues.filter((v): v is string => typeof v === 'string')
      : [];
    const result = await suggestUpsellHandles({
      triggerType: triggerType as CartUpsellTriggerType,
      triggerValues,
      limit: typeof body.limit === 'number' ? body.limit : 8,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[admin/upsells/suggest]', error);
    return NextResponse.json({ error: 'Suggest failed' }, { status: 500 });
  }
}