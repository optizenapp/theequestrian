import { NextRequest, NextResponse } from 'next/server';
import { deleteCartUpsellOffer, updateCartUpsellOffer } from '@/lib/cart-upsells/db';
import type { CartUpsellOfferInput, CartUpsellTriggerType } from '@/lib/cart-upsells/types';

export const dynamic = 'force-dynamic';

const TRIGGER_TYPES = new Set<CartUpsellTriggerType>([
  'product_handle',
  'product_type',
  'vendor',
]);

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parsePatch(body: unknown): Partial<CartUpsellOfferInput> | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const update: Partial<CartUpsellOfferInput> = {};
  if (typeof b.name === 'string') update.name = b.name;
  if (typeof b.enabled === 'boolean') update.enabled = b.enabled;
  if (typeof b.priority === 'number') update.priority = b.priority;
  if (typeof b.headline === 'string') update.headline = b.headline;
  if (typeof b.maxProducts === 'number') update.maxProducts = b.maxProducts;
  if (
    typeof b.triggerType === 'string' &&
    TRIGGER_TYPES.has(b.triggerType as CartUpsellTriggerType)
  ) {
    update.triggerType = b.triggerType as CartUpsellTriggerType;
  }
  if (Array.isArray(b.triggerValues)) {
    update.triggerValues = b.triggerValues.filter((v): v is string => typeof v === 'string');
  }
  if (Array.isArray(b.candidateHandles)) {
    update.candidateHandles = b.candidateHandles.filter(
      (v): v is string => typeof v === 'string'
    );
  }
  return Object.keys(update).length > 0 ? update : null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const update = parsePatch(await request.json());
    if (!update) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
    const offer = await updateCartUpsellOffer(id, update);
    if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ offer });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[admin/upsells] PATCH', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const ok = await deleteCartUpsellOffer(id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/upsells] DELETE', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}