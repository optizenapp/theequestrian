import { NextRequest, NextResponse } from 'next/server';
import {
  createCartUpsellOffer,
  listCartUpsellOffers,
} from '@/lib/cart-upsells/db';
import type { CartUpsellOfferInput, CartUpsellTriggerType } from '@/lib/cart-upsells/types';

export const dynamic = 'force-dynamic';

const TRIGGER_TYPES = new Set<CartUpsellTriggerType>([
  'product_handle',
  'product_type',
  'vendor',
]);

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function parseCreateBody(body: unknown): CartUpsellOfferInput | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const triggerType = b.triggerType;
  if (typeof triggerType !== 'string' || !TRIGGER_TYPES.has(triggerType as CartUpsellTriggerType)) {
    return null;
  }
  if (typeof b.name !== 'string') return null;
  return {
    name: b.name,
    enabled: typeof b.enabled === 'boolean' ? b.enabled : true,
    priority: typeof b.priority === 'number' ? b.priority : 100,
    headline: typeof b.headline === 'string' ? b.headline : undefined,
    triggerType: triggerType as CartUpsellTriggerType,
    triggerValues: parseStringArray(b.triggerValues),
    candidateHandles: parseStringArray(b.candidateHandles),
    maxProducts: typeof b.maxProducts === 'number' ? b.maxProducts : 3,
  };
}

export async function GET() {
  try {
    const offers = await listCartUpsellOffers();
    return NextResponse.json({ offers });
  } catch (error) {
    console.error('[admin/upsells] GET', error);
    return NextResponse.json({ error: 'Failed to list upsells' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = parseCreateBody(await request.json());
    if (!input) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const offer = await createCartUpsellOffer(input);
    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[admin/upsells] POST', error);
    return NextResponse.json({ error: 'Failed to create upsell' }, { status: 500 });
  }
}