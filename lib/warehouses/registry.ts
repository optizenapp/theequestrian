/**
 * Warehouse registry — location-facing hubs keyed by URL slug.
 * Vendor names are internal match keys only; never show to customers.
 */

export type WarehouseDefinition = {
  slug: string;
  /** Customer-facing place name */
  displayName: string;
  /** Short hero line */
  shortDescription: string;
  /** Exact Shopify product.vendor strings (case-insensitive match) */
  vendorNames: string[];
};

export const WAREHOUSE_REGISTRY: WarehouseDefinition[] = [
  {
    slug: 'tuggerah',
    displayName: 'Tuggerah, NSW',
    shortDescription:
      'Shop gear dispatched from our Tuggerah, NSW warehouse. Add enough from this warehouse for free shipping on this parcel.',
    vendorNames: ['Trailrace Equestrian Outfitters', 'Trailrace'],
  },
  {
    slug: 'goulburn',
    displayName: 'Goulburn, NSW',
    shortDescription:
      'Shop gear dispatched from our Goulburn, NSW warehouse. Add enough from this warehouse for free shipping on this parcel.',
    vendorNames: [
      'Living Horse Tails Jewellery By Monika',
      'Living Horse Tails Jewellery by Monika',
      'Living Horse Tales Jewellery By Monika',
    ],
  },
  {
    slug: 'heatherbrae',
    displayName: 'Heatherbrae, NSW',
    shortDescription:
      'Shop gear dispatched from our Heatherbrae, NSW warehouse. Add enough from this warehouse for free shipping on this parcel.',
    vendorNames: ['Toptac International', 'Toptac'],
  },
  {
    slug: 'north-west-victoria',
    displayName: 'Rural north-west Victoria',
    shortDescription:
      'Shop gear dispatched from our rural north-west Victoria warehouse. Add enough from this warehouse for free shipping on this parcel.',
    vendorNames: ['JNK Collective', 'JNK'],
  },
  {
    slug: 'cambooya',
    displayName: 'Cambooya, QLD',
    shortDescription:
      'Shop gear dispatched from our Cambooya, QLD warehouse. Add enough from this warehouse for free shipping on this parcel.',
    vendorNames: ['Exclusively Equine'],
  },
  {
    slug: 'macclesfield',
    displayName: 'Macclesfield, SA',
    shortDescription:
      'Shop gear dispatched from our Macclesfield, SA warehouse. Add enough from this warehouse for free shipping on this parcel.',
    vendorNames: ['Little Equine Co', 'Little Equine Co.', 'Little Equine'],
  },
  {
    slug: 'nsw',
    displayName: 'NSW',
    shortDescription:
      'Shop gear dispatched from our NSW warehouse. Add enough from this warehouse for free shipping on this parcel.',
    vendorNames: ['CAN Animal Care'],
  },
  {
    slug: 'adelaide-hills',
    displayName: 'Adelaide Hills, SA',
    shortDescription:
      'Shop gear dispatched from our Adelaide Hills, SA warehouse. Add enough from this warehouse for free shipping on this parcel.',
    vendorNames: ['QJ Riding Wear'],
  },
];

function normalizeVendorKey(vendor: string): string {
  return vendor.trim().toLowerCase().replace(/\s+/g, ' ');
}

const vendorToSlug = new Map<string, string>();
for (const wh of WAREHOUSE_REGISTRY) {
  for (const name of wh.vendorNames) {
    vendorToSlug.set(normalizeVendorKey(name), wh.slug);
  }
}

export function listWarehouses(): WarehouseDefinition[] {
  return WAREHOUSE_REGISTRY;
}

export function getWarehouseBySlug(slug: string): WarehouseDefinition | null {
  const key = slug.trim().toLowerCase();
  return WAREHOUSE_REGISTRY.find((w) => w.slug === key) ?? null;
}

export function getWarehouseSlugForVendor(vendor: string | null | undefined): string | null {
  if (!vendor?.trim()) return null;
  return vendorToSlug.get(normalizeVendorKey(vendor)) ?? null;
}

export function getWarehouseHrefForVendor(vendor: string | null | undefined): string | null {
  const slug = getWarehouseSlugForVendor(vendor);
  return slug ? `/warehouses/${slug}` : null;
}

export function warehouseHref(slug: string): string {
  return `/warehouses/${slug}`;
}
