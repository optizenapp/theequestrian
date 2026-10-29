import { getCanonicalSiteUrl } from '@/lib/seo/site-url';

export const BRAND_PAGE_SIZE = 36;

type BrandSearchParams = { [key: string]: string | string[] | undefined };

export type BrandCursor = { kind: 'none' } | { kind: 'invalid' } | { kind: 'offset'; offset: number; cursor: string };

/** `?cursor=dbbrand:N` → offset. Empty / `dbbrand:0` are page 1; anything else malformed is invalid. */
export function parseBrandCursor(sp: BrandSearchParams): BrandCursor {
  const raw = typeof sp.cursor === 'string' ? sp.cursor.trim() : '';
  if (!raw) return { kind: 'none' };
  const match = raw.match(/^dbbrand:(\d+)$/);
  if (!match) return { kind: 'invalid' };
  const offset = parseInt(match[1], 10);
  return offset > 0 ? { kind: 'offset', offset, cursor: raw } : { kind: 'none' };
}

export function brandPageNumber(cursor: BrandCursor): number {
  return cursor.kind === 'offset' ? Math.floor(cursor.offset / BRAND_PAGE_SIZE) + 1 : 1;
}

function isDefaultBrandView(sp: BrandSearchParams): boolean {
  if (sp.brand !== undefined || sp.size !== undefined || sp.color !== undefined) return false;
  return sp.sort === undefined || sp.sort === 'featured';
}

/** Clean brand URL; deeper unfiltered default-sort pages within range are self-canonical. */
export function brandCanonicalUrl(handle: string, sp: BrandSearchParams, totalCount: number | null): string {
  const base = `${getCanonicalSiteUrl()}/brands/${handle}`;
  const cursor = parseBrandCursor(sp);
  if (cursor.kind !== 'offset' || !isDefaultBrandView(sp)) return base;
  if (totalCount !== null && cursor.offset >= totalCount) return base;
  return `${base}?${new URLSearchParams({ cursor: cursor.cursor }).toString()}`;
}
