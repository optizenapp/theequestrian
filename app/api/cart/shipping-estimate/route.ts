import { NextRequest, NextResponse } from 'next/server';
import {
  estimateCartParcels,
  type CartParcelLineInput,
} from '@/lib/shipping/cart-parcels';
import { loadShippingRates } from '@/lib/shipping/rates';

type BodyLine = {
  lineId?: unknown;
  vendor?: unknown;
  tags?: unknown;
  lineTotal?: unknown;
  quantity?: unknown;
};

function parseLines(raw: unknown): CartParcelLineInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const lines: CartParcelLineInput[] = [];
  for (const item of raw as BodyLine[]) {
    if (typeof item.lineId !== 'string' || !item.lineId) return null;
    const vendor = typeof item.vendor === 'string' ? item.vendor : '';
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((t): t is string => typeof t === 'string')
      : [];
    const lineTotal = typeof item.lineTotal === 'number' ? item.lineTotal : Number(item.lineTotal);
    const quantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity);
    if (!Number.isFinite(lineTotal) || !Number.isFinite(quantity)) return null;
    lines.push({ lineId: item.lineId, vendor, tags, lineTotal, quantity });
  }
  return lines;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { lines?: unknown };
    const lines = parseLines(body.lines);
    if (!lines) {
      return NextResponse.json({ error: 'Invalid lines' }, { status: 400 });
    }

    const rates = await loadShippingRates();
    const result = estimateCartParcels(lines, rates);
    return NextResponse.json({
      parcels: result.parcels.map((p) => ({
        index: p.index,
        locationLabel: p.locationLabel,
        locationMapped: p.locationMapped,
        merchandiseTotal: p.merchandiseTotal,
        shippingEstimate: p.shippingEstimate,
        freeShippingThreshold: p.freeShippingThreshold,
        amountToFreeShipping: p.amountToFreeShipping,
        lineIds: p.lineIds,
      })),
      parcelCount: result.parcelCount,
      totalShippingEstimate: result.totalShippingEstimate,
    });
  } catch (error) {
    console.error('[shipping-estimate]', error);
    return NextResponse.json({ error: 'Failed to estimate shipping' }, { status: 500 });
  }
}
