import { getCanonicalSiteUrl } from '@/lib/seo/site-url';

type SaleSearchParams = { [key: string]: string | string[] | undefined };

export type SaleCursor = { kind: 'none' } | { kind: 'invalid' } | { kind: 'page'; index: number; cursor: string };

/** `?cursor=page:N` (zero-based). Empty / `page:0` are page 1; anything else malformed is invalid. */
export function parseSaleCursor(sp: SaleSearchParams): SaleCursor {
  const raw = typeof sp.cursor === 'string' ? sp.cursor.trim() : '';
  if (!raw) return { kind: 'none' };
  const match = raw.match(/^page:(\d+)$/);
  if (!match) return { kind: 'invalid' };
  const index = parseInt(match[1], 10);
  return index > 0 ? { kind: 'page', index, cursor: raw } : { kind: 'none' };
}

export function salePageNumber(cursor: SaleCursor): number {
  return cursor.kind === 'page' ? cursor.index + 1 : 1;
}

/** Clean `/on-sale`; deeper pages with no filter / sort params are self-canonical. */
export function saleCanonicalUrl(sp: SaleSearchParams): string {
  const base = `${getCanonicalSiteUrl()}/on-sale`;
  const cursor = parseSaleCursor(sp);
  const onlyCursor = Object.keys(sp).every((key) => key === 'cursor' || sp[key] === undefined);
  if (cursor.kind !== 'page' || !onlyCursor) return base;
  return `${base}?${new URLSearchParams({ cursor: cursor.cursor }).toString()}`;
}
