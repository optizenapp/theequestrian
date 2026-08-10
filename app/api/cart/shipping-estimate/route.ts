import { NextRequest, NextResponse } from 'next/server';
import {
  getCollectiveShippingRatesByVariantIds,
} from '@/lib/db/collective-shipping-rates';
import { quoteCollectiveShipping } from '@/lib/shipping/collective-rates';
import { tagsIndicateFreeShipping } from '@/lib/shipping/free-shipping';
import {
  isMappedWarehouse,
  resolveWarehouseLabel,
} from '@/lib/shipping/vendor-warehouse-locations';
import { getWarehouseSlugForVendor } from '@/lib/warehouses/registry';

type BodyLine = {
  lineId?: unknown;
  vendor?: unknown;
  tags?: unknown;
  lineTotal?: unknown;
  quantity?: unknown;
  variantId?: unknown;
};

type ParsedLine = {
  lineId: string;
  vendor: string;
  tags: string[];
  lineTotal: number;
  quantity: number;
  variantId?: string;
};

function parseLines(raw: unknown): ParsedLine[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const lines: ParsedLine[] = [];
  for (const item of raw as BodyLine[]) {
    if (typeof item.lineId !== 'string' || !item.lineId) return null;
    const vendor = typeof item.vendor === 'string' ? item.vendor : '';
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((t): t is string => typeof t === 'string')
      : [];
    const lineTotal = typeof item.lineTotal === 'number' ? item.lineTotal : Number(item.lineTotal);
    const quantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity);
    const variantId = typeof item.variantId === 'string' ? item.variantId : undefined;
    if (!Number.isFinite(lineTotal) || !Number.isFinite(quantity)) return null;
    lines.push({ lineId: item.lineId, vendor, tags, lineTotal, quantity, variantId });
  }
  return lines;
}

function vendorKey(vendor: string): string {
  const trimmed = vendor.trim();
  return trimmed.length > 0 ? trimmed : 'Unknown';
}

function stripGid(id: string): string {
  const parts = id.split('/');
  return parts[parts.length - 1] || id;
}

type ParcelGroup = {
  vendor: string;
  tags: Set<string>;
  merchandiseTotal: number;
  lineIds: string[];
  lineItems: Array<{ variantId: string; quantity: number }>;
};

function groupByVendor(lines: ParsedLine[]): Map<string, ParcelGroup> {
  const groups = new Map<string, ParcelGroup>();
  for (const line of lines) {
    const key = vendorKey(line.vendor);
    const existing = groups.get(key);
    const variantId = line.variantId;
    if (existing) {
      existing.merchandiseTotal += line.lineTotal;
      existing.lineIds.push(line.lineId);
      for (const tag of line.tags) existing.tags.add(tag);
      if (variantId) {
        existing.lineItems.push({ variantId, quantity: line.quantity });
      }
    } else {
      groups.set(key, {
        vendor: key,
        tags: new Set(line.tags),
        merchandiseTotal: line.lineTotal,
        lineIds: [line.lineId],
        lineItems: variantId ? [{ variantId, quantity: line.quantity }] : [],
      });
    }
  }
  return groups;
}

/**
 * Estimate from cached Collective rates (qty × cached unit rate).
 * Accurate for flat Collective rates; used when live quote is unavailable.
 */
function estimateFromCache(
  lineItems: Array<{ variantId: string; quantity: number }>,
  cache: Map<string, { standard_rate_aud: number }>
): number | null {
  if (lineItems.length === 0) return null;
  let total = 0;
  for (const item of lineItems) {
    const row = cache.get(stripGid(item.variantId));
    if (!row) return null;
    const unit = Number(row.standard_rate_aud);
    if (!Number.isFinite(unit)) return null;
    total += unit * item.quantity;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Prefer live Collective Carrier Service quotes (draftOrderCalculate) per vendor parcel.
 * Falls back to collective_shipping_rates cache (no vendor_shipping_rates thresholds).
 */
async function estimateParcels(lines: ParsedLine[]) {
  const groups = groupByVendor(lines);
  const allVariantIds = lines
    .map((l) => l.variantId)
    .filter((id): id is string => Boolean(id));
  const cache = await getCollectiveShippingRatesByVariantIds(allVariantIds);

  const parcels = [];
  let index = 0;
  let knownTotal = 0;
  let allKnown = true;

  for (const group of groups.values()) {
    index += 1;
    const locationLabel = resolveWarehouseLabel(group.vendor);
    const locationMapped = isMappedWarehouse(group.vendor);
    let shippingEstimate: number | null = null;

    if (tagsIndicateFreeShipping([...group.tags])) {
      shippingEstimate = 0;
    } else if (group.lineItems.length > 0) {
      try {
        const quote = await quoteCollectiveShipping({ lineItems: group.lineItems });
        shippingEstimate = quote.standard?.amount ?? null;
      } catch (error) {
        console.error('[shipping-estimate] Collective quote failed', group.vendor, error);
        shippingEstimate = estimateFromCache(group.lineItems, cache);
      }
      if (shippingEstimate == null) {
        shippingEstimate = estimateFromCache(group.lineItems, cache);
      }
    }

    if (shippingEstimate == null) allKnown = false;
    else knownTotal += shippingEstimate;

    parcels.push({
      index,
      locationLabel,
      locationMapped,
      warehouseSlug: getWarehouseSlugForVendor(group.vendor),
      merchandiseTotal: group.merchandiseTotal,
      shippingEstimate,
      lineIds: group.lineIds,
    });
  }

  return {
    parcels,
    parcelCount: parcels.length,
    totalShippingEstimate: allKnown ? knownTotal : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { lines?: unknown };
    const lines = parseLines(body.lines);
    if (!lines) {
      return NextResponse.json({ error: 'Invalid lines' }, { status: 400 });
    }

    const result = await estimateParcels(lines);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[shipping-estimate]', error);
    return NextResponse.json({ error: 'Failed to estimate shipping' }, { status: 500 });
  }
}
