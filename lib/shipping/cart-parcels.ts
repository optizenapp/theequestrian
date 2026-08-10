import { tagsIndicateFreeShipping } from '@/lib/shipping/free-shipping';
import {
  getVendorFreeShippingThreshold,
  resolveShippingOffset,
  type ShippingRates,
} from '@/lib/shipping/rates';
import {
  isMappedWarehouse,
  resolveWarehouseLabel,
} from '@/lib/shipping/vendor-warehouse-locations';

export type CartParcelLineInput = {
  lineId: string;
  vendor: string;
  tags: string[];
  lineTotal: number;
  quantity: number;
};

export type CartParcelEstimate = {
  key: string;
  index: number;
  locationLabel: string;
  locationMapped: boolean;
  merchandiseTotal: number;
  shippingEstimate: number | null;
  freeShippingThreshold: number | null;
  amountToFreeShipping: number | null;
  lineIds: string[];
};

export type CartParcelsResult = {
  parcels: CartParcelEstimate[];
  parcelCount: number;
  totalShippingEstimate: number | null;
};

function vendorKey(vendor: string): string {
  const trimmed = vendor.trim();
  return trimmed.length > 0 ? trimmed : 'Unknown';
}

/** One shipping rate per vendor group (parcel), using parcel merchandise for thresholds. */
export function estimateCartParcels(
  lines: CartParcelLineInput[],
  rates: ShippingRates
): CartParcelsResult {
  const groups = new Map<
    string,
    { vendor: string; tags: Set<string>; merchandiseTotal: number; lineIds: string[] }
  >();

  for (const line of lines) {
    const key = vendorKey(line.vendor);
    const existing = groups.get(key);
    if (existing) {
      existing.merchandiseTotal += line.lineTotal;
      existing.lineIds.push(line.lineId);
      for (const tag of line.tags) existing.tags.add(tag);
    } else {
      groups.set(key, {
        vendor: key,
        tags: new Set(line.tags),
        merchandiseTotal: line.lineTotal,
        lineIds: [line.lineId],
      });
    }
  }

  const parcels: CartParcelEstimate[] = [];
  let index = 0;
  let knownTotal = 0;
  let allKnown = true;

  for (const group of groups.values()) {
    index += 1;
    const tags = [...group.tags];
    const locationLabel = resolveWarehouseLabel(group.vendor);
    const locationMapped = isMappedWarehouse(group.vendor);
    const threshold = getVendorFreeShippingThreshold(group.vendor, rates);

    let shippingEstimate: number | null = null;
    if (tagsIndicateFreeShipping(tags)) {
      shippingEstimate = 0;
    } else {
      const { shippingOffset } = resolveShippingOffset(
        group.vendor,
        tags,
        rates,
        undefined,
        group.merchandiseTotal
      );
      shippingEstimate = shippingOffset;
    }

    let amountToFreeShipping: number | null = null;
    if (
      threshold != null &&
      shippingEstimate != null &&
      shippingEstimate > 0 &&
      group.merchandiseTotal < threshold
    ) {
      amountToFreeShipping = Math.round((threshold - group.merchandiseTotal) * 100) / 100;
    }

    if (shippingEstimate == null) allKnown = false;
    else knownTotal += shippingEstimate;

    parcels.push({
      key: group.vendor,
      index,
      locationLabel,
      locationMapped,
      merchandiseTotal: group.merchandiseTotal,
      shippingEstimate,
      freeShippingThreshold: threshold,
      amountToFreeShipping,
      lineIds: group.lineIds,
    });
  }

  return {
    parcels,
    parcelCount: parcels.length,
    totalShippingEstimate: allKnown ? knownTotal : null,
  };
}
