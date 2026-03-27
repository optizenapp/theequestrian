/**
 * Pill link anchor text for category / subcategory navigation (SEO brief).
 * Horse / rugs uses an explicit map; elsewhere we only strip weak filler words.
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
  return normalizePillLabel(label);
}
