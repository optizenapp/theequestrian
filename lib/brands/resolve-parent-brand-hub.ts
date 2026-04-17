import { slugFromBrandName } from '@/lib/brands/brand-slug';

export type BrandContentHubRow = {
  handle: string;
  title: string;
  breadcrumb_label: string | null;
};

export type ParentBrandResolution = {
  parentBrand: string;
  hubHandle: string;
  source: 'child_handle' | 'title_match' | 'breadcrumb_match' | 'slug_new';
};

export function normalizeBrandKeyForMatch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Last CSV row wins duplicate `normalized_handle` keys. */
export function parseParentRollupCsvRows(rows: Record<string, string>[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows) {
    const nh = (r.normalized_handle || r.normalizedHandle || '').trim();
    const pb = (r.parent_brand || r.parentBrand || '').trim().replace(/\s+/g, ' ');
    if (!nh || !pb) continue;
    map.set(nh, pb);
  }
  return map;
}

export function groupRollupHandlesByParentBrand(rollup: Map<string, string>): Map<string, string[]> {
  const byParent = new Map<string, string[]>();
  for (const [nh, parentRaw] of rollup) {
    const parent = parentRaw.trim().replace(/\s+/g, ' ');
    if (!parent) continue;
    const arr = byParent.get(parent) ?? [];
    arr.push(nh.trim());
    byParent.set(parent, arr);
  }
  for (const [p, list] of byParent) {
    byParent.set(p, [...new Set(list)].sort((a, b) => a.localeCompare(b)));
  }
  return byParent;
}

export function resolveParentBrandHubHandles(
  byParent: Map<string, string[]>,
  brandRows: BrandContentHubRow[]
): { parentToResolution: Map<string, ParentBrandResolution>; warnings: string[] } {
  const byHandle = new Map<string, BrandContentHubRow>();
  const titleToHandle = new Map<string, string>();
  const crumbToHandle = new Map<string, string>();
  for (const row of brandRows) {
    byHandle.set(row.handle, row);
    const nt = normalizeBrandKeyForMatch(row.title);
    if (nt && !titleToHandle.has(nt)) titleToHandle.set(nt, row.handle);
    const nb = row.breadcrumb_label ? normalizeBrandKeyForMatch(row.breadcrumb_label) : '';
    if (nb && !crumbToHandle.has(nb)) crumbToHandle.set(nb, row.handle);
  }

  const parentToResolution = new Map<string, ParentBrandResolution>();
  const warnings: string[] = [];
  const hubOwner = new Map<string, string>();

  function isFree(h: string, parent: string): boolean {
    const o = hubOwner.get(h);
    return !o || o === parent;
  }

  function claim(h: string, parent: string): void {
    hubOwner.set(h, parent);
  }

  function rowMatchesParent(h: string, parent: string): boolean {
    const row = byHandle.get(h);
    if (!row) return true;
    const p = normalizeBrandKeyForMatch(parent);
    if (normalizeBrandKeyForMatch(row.title) === p) return true;
    if (row.breadcrumb_label && normalizeBrandKeyForMatch(row.breadcrumb_label) === p) return true;
    return slugFromBrandName(parent) === h;
  }

  function pickSlug(parent: string): string {
    const base = slugFromBrandName(parent);
    for (let suffix = 0; suffix < 200; suffix++) {
      const candidate = suffix === 0 ? base : `${base}-${suffix}`;
      if (!isFree(candidate, parent)) continue;
      const row = byHandle.get(candidate);
      if (!row || rowMatchesParent(candidate, parent)) return candidate;
    }
    return `${base}-200`;
  }

  const parentKeys = [...byParent.keys()].sort((a, b) => a.localeCompare(b));
  for (const parent of parentKeys) {
    const childHandles = byParent.get(parent) ?? [];
    let chosen = false;
    for (const nh of childHandles) {
      if (!byHandle.has(nh)) continue;
      if (!isFree(nh, parent)) {
        warnings.push(
          `Child handle "${nh}" for parent brand "${parent}" is already mapped to another parent; skipping reuse.`
        );
        continue;
      }
      claim(nh, parent);
      parentToResolution.set(parent, { parentBrand: parent, hubHandle: nh, source: 'child_handle' });
      chosen = true;
      break;
    }
    if (chosen) continue;

    const nk = normalizeBrandKeyForMatch(parent);
    const th = titleToHandle.get(nk);
    if (th && isFree(th, parent)) {
      claim(th, parent);
      parentToResolution.set(parent, { parentBrand: parent, hubHandle: th, source: 'title_match' });
      continue;
    }

    const ch = crumbToHandle.get(nk);
    if (ch && isFree(ch, parent)) {
      claim(ch, parent);
      parentToResolution.set(parent, { parentBrand: parent, hubHandle: ch, source: 'breadcrumb_match' });
      continue;
    }

    const slug = pickSlug(parent);
    claim(slug, parent);
    parentToResolution.set(parent, { parentBrand: parent, hubHandle: slug, source: 'slug_new' });
  }

  return { parentToResolution, warnings };
}
