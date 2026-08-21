/**
 * Alias /brands/{handle} → canonical hub. Used by middleware 301s, sync, and merge.
 * Edge-safe: no Node APIs.
 */
export type BrandHubMergeSpec = {
  alias: string;
  canonical: string;
  rewriteBrands?: Array<{ from: string; to: string }>;
};

/** Live duplicate hubs still present in brand_content (stub vs canonical). */
export const BRAND_HUB_MERGES: BrandHubMergeSpec[] = [
  {
    alias: 'thinline-global',
    canonical: 'thinline-global-australia',
    rewriteBrands: [{ from: 'Thinline Global', to: 'ThinLine Global Australia' }],
  },
  {
    alias: 'kep',
    canonical: 'kep-italia',
    rewriteBrands: [{ from: 'KEP', to: 'KEP Italia' }],
  },
  {
    alias: 'dyon-european-classic-equestrian-gear',
    canonical: 'dyon',
  },
  {
    alias: 'dyon-1',
    canonical: 'dyon',
    rewriteBrands: [{ from: 'Dyon', to: "Dy'On European Classic Equestrian Gear" }],
  },
  {
    alias: 'hairy-pony-grooming-products',
    canonical: 'hairy-pony',
    rewriteBrands: [{ from: 'Hairy Pony Grooming Products', to: 'Hairy Pony' }],
  },
  {
    alias: 'advantage',
    canonical: 'advantage-pet',
    rewriteBrands: [{ from: 'Advantage', to: 'Advantage Pet' }],
  },
  {
    alias: 'advocate',
    canonical: 'advocate-pet',
    rewriteBrands: [{ from: 'Advocate', to: 'Advocate Pet' }],
  },
  {
    alias: 'ippico',
    canonical: 'ippico-equestrian',
    rewriteBrands: [{ from: 'Ippico', to: 'Ippico Equestrian' }],
  },
  {
    alias: 'cavalor-equicare',
    canonical: 'cavalor',
    rewriteBrands: [{ from: 'Cavalor Equicare', to: 'Cavalor' }],
  },
  {
    alias: 'living-horse-tales-jewellery-by-monika',
    canonical: 'living-horse-tails-by-monika',
  },
];

const HISTORICAL_ALIASES: Record<string, string> = {
  'kentucky-horsewear': 'kentucky',
  'ego-7': 'ego7',
  hairy: 'hairy-pony',
  'carr-day-martin': 'cdm',
  'carr-and-day-martin': 'cdm',
};

export const BRAND_HUB_CONSOLIDATIONS: Record<string, string> = {
  ...HISTORICAL_ALIASES,
  ...Object.fromEntries(BRAND_HUB_MERGES.map((row) => [row.alias, row.canonical])),
};

function normalizeHubHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/^brands\//, '');
}

export function resolveCanonicalBrandHubHandle(handle: string): string {
  const key = normalizeHubHandle(handle);
  if (!key) return key;
  return BRAND_HUB_CONSOLIDATIONS[key] || key;
}

export function isAliasBrandHub(handle: string): boolean {
  const key = normalizeHubHandle(handle);
  return Boolean(key && BRAND_HUB_CONSOLIDATIONS[key]);
}
