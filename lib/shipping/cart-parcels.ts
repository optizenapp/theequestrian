import {
  isMappedWarehouse,
  resolveWarehouseLabel,
} from '@/lib/shipping/vendor-warehouse-locations';
import { getWarehouseSlugForVendor } from '@/lib/warehouses/registry';

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
  warehouseSlug: string | null;
  merchandiseTotal: number;
  shippingEstimate: number | null;
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

/** Group cart lines into warehouse parcels (rates come from Collective API/cache). */
export function groupCartParcels(lines: CartParcelLineInput[]): CartParcelsResult {
  const groups = new Map<
    string,
    { vendor: string; merchandiseTotal: number; lineIds: string[] }
  >();

  for (const line of lines) {
    const key = vendorKey(line.vendor);
    const existing = groups.get(key);
    if (existing) {
      existing.merchandiseTotal += line.lineTotal;
      existing.lineIds.push(line.lineId);
    } else {
      groups.set(key, {
        vendor: key,
        merchandiseTotal: line.lineTotal,
        lineIds: [line.lineId],
      });
    }
  }

  const parcels: CartParcelEstimate[] = [];
  let index = 0;

  for (const group of groups.values()) {
    index += 1;
    parcels.push({
      key: group.vendor,
      index,
      locationLabel: resolveWarehouseLabel(group.vendor),
      locationMapped: isMappedWarehouse(group.vendor),
      warehouseSlug: getWarehouseSlugForVendor(group.vendor),
      merchandiseTotal: group.merchandiseTotal,
      shippingEstimate: null,
      lineIds: group.lineIds,
    });
  }

  return {
    parcels,
    parcelCount: parcels.length,
    totalShippingEstimate: null,
  };
}

/** @deprecated Use groupCartParcels — rates come from Collective, not Postgres offsets. */
export function estimateCartParcels(
  lines: CartParcelLineInput[],
  _rates?: unknown
): CartParcelsResult {
  return groupCartParcels(lines);
}
