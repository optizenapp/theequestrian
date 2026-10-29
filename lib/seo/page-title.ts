import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/seo/site-identity';

const SITE_SUFFIX = new RegExp(`(\\s*\\|\\s*${SITE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})+\\s*$`, 'i');

/** "X | The Equestrian" exactly once, whether or not `raw` (often CMS copy) already ends with it. */
export function brandedTitle(raw: string): string {
  const base = raw.replace(SITE_SUFFIX, '').trim();
  return base ? `${base} | ${SITE_NAME}` : SITE_NAME;
}

/**
 * Metadata title that bypasses the root layout's `%s | The Equestrian` template,
 * so the site name can't be appended twice.
 */
export function pageTitle(raw: string): NonNullable<Metadata['title']> {
  return { absolute: brandedTitle(raw) };
}

/** Insert " – Page N" before the site name for paginated pages (page 1 unchanged). */
export function paginatedTitle(raw: string, pageNumber: number | null): string {
  if (!pageNumber || pageNumber <= 1) return brandedTitle(raw);
  const base = raw.replace(SITE_SUFFIX, '').trim();
  return brandedTitle(`${base} – Page ${pageNumber}`);
}

/** Prefix "Page N of M." on paginated descriptions so each page's snippet is distinct. */
export function paginatedDescription(description: string, pageNumber: number | null, totalPages: number | null): string {
  if (!pageNumber || pageNumber <= 1) return description;
  const of = totalPages && totalPages >= pageNumber ? ` of ${totalPages}` : '';
  return `Page ${pageNumber}${of}. ${description}`;
}
