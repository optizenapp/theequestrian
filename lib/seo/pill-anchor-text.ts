/**
 * Pill link anchor text and collection display labels (breadcrumbs, pills, headings).
 * Horse / rugs uses an explicit map; elsewhere we normalize legacy Shopify product_type strings.
 */

/** Exact labels for /horse/rugs/* child pills (handle → visible anchor text). */
export const HORSE_RUGS_PILL_LABELS: Record<string, string> = {
  accessories: 'Rug Accessories',
  cotton: 'Cotton Horse Rugs',
  flag: 'Flag Rugs',
  hoods: 'Horse Rug Hoods',
  mesh: 'Fly & Mesh Rugs',
  rain: 'Rain Horse Rugs',
  riding: 'Exercise Rugs',
  summer: 'Summer Horse Rugs',
  'tail-protectors': 'Tail Protectors',
  travel: 'Travel Horse Rugs',
  winter: 'Winter Horse Rugs',
};

const TRAILING_FILLER = /\s+(collection|products|range)\s*$/i;
const LEADING_FILLER = /^(shop|browse)\s+/i;
const LEGACY_TYPE_PREFIX = /^[A-Z][A-Z\s&]*:\s*/u;
const TRAILING_DEMOGRAPHIC =
  /\s+(mens|men'?s?|ladies|ladies'|womens|women'?s?|childs?|kids)\s*$/i;

const HANDLE_LABELS: Record<string, string> = {
  mens: "Men's",
  womens: "Women's",
  ladies: "Women's",
  kids: 'Kids',
  childs: 'Kids',
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Conservative cleanup: remove trailing Collection/Products/Range and leading Shop/Browse.
 */
export function normalizePillLabel(label: string): string {
  let s = label.trim();
  if (!s) return s;
  s = s.replace(LEADING_FILLER, '');
  s = s.replace(TRAILING_FILLER, '').trim();
  return s;
}

/** Human-readable label from a URL handle (e.g. mens → Men's, fly-veils → Fly Veils). */
export function titleFromHandle(handle: string): string {
  const key = handle.toLowerCase();
  if (HANDLE_LABELS[key]) return HANDLE_LABELS[key];
  return handle
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export interface CollectionLabelOptions {
  parentHandle?: string;
  categoryHandle?: string;
}

/**
 * Turn legacy mapping product_type strings into concise display labels.
 * e.g. "CLOTHING: Clothing Mens" on /clothing/mens → "Men's"
 */
export function resolveCollectionDisplayLabel(
  rawLabel: string,
  handle?: string,
  options?: CollectionLabelOptions
): string {
  let label = normalizePillLabel(rawLabel).trim();
  if (!label && handle) return titleFromHandle(handle);

  if (LEGACY_TYPE_PREFIX.test(label)) {
    label = label.replace(LEGACY_TYPE_PREFIX, '').trim();
  }

  const parentHandle = options?.parentHandle;
  const categoryHandle = options?.categoryHandle;

  if (handle && parentHandle) {
    const parentTitle = titleFromHandle(parentHandle);
    const childTitle = titleFromHandle(handle);
    const handleWords = handle.replace(/-/g, ' ');
    const redundant = new RegExp(
      `^${escapeRegex(parentTitle)}\\s+(${escapeRegex(handleWords)}|${escapeRegex(childTitle.replace(/'/g, "'?"))})$`,
      'i'
    );
    if (redundant.test(label) || /^clothing\s+(mens|womens|ladies|kids|childs?)$/i.test(label)) {
      return childTitle;
    }
  }

  label = label.replace(TRAILING_DEMOGRAPHIC, '').trim();

  if (parentHandle) {
    const parentTitle = titleFromHandle(parentHandle);
    label = label.replace(new RegExp(`^${escapeRegex(parentTitle)}\\s+`, 'i'), '').trim();
  }

  if (categoryHandle === 'clothing') {
    label = label.replace(/^clothing\s+/i, '').trim();
  }

  if (categoryHandle === 'horse') {
    label = label.replace(/^horse\s+/i, '').trim();
  }

  if (!label && handle) return titleFromHandle(handle);
  return label;
}

export function resolvePillAnchorText(args: {
  basePath: string;
  handle: string;
  label: string;
}): string {
  const { basePath, handle, label } = args;
  if (basePath === '/horse/rugs') {
    const mapped = HORSE_RUGS_PILL_LABELS[handle];
    if (mapped) return mapped;
  }

  const segments = basePath.replace(/^\//, '').split('/').filter(Boolean);
  const categoryHandle = segments[0];
  const parentHandle = segments[segments.length - 1];

  return resolveCollectionDisplayLabel(label, handle, {
    parentHandle,
    categoryHandle,
  });
}
