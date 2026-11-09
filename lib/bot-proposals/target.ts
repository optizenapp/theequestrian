import { sql } from '@/lib/db/vercel-postgres';
import type { ProposalTarget } from './types';

const NON_PRODUCT_ROOTS = new Set(['brands', 'news', 'search', 'cart', 'pages', 'collections']);

function productHandleFromPath(path: string): string | null {
  const segments = path.split('?')[0].split('/').filter(Boolean);
  if (segments[0] === 'products' && segments[1]) return segments[1];
  if (segments.length >= 3 && !NON_PRODUCT_ROOTS.has(segments[0])) return segments[segments.length - 1];
  return null;
}

/** Which editable table a storefront path maps to. Mirrors the SEO bot's own resolution. */
export async function resolveTarget(pagePath: string): Promise<ProposalTarget> {
  const path = pagePath.split('?')[0].replace(/\/+$/, '') || '/';
  const brand = path.match(/^\/brands\/([^/]+)$/);
  if (brand) return { type: 'brand', key: brand[1] };

  const category = await sql`SELECT url_path FROM collection_content WHERE url_path = ${path} LIMIT 1`;
  if (category.rows.length > 0) return { type: 'category', key: path };

  const handle = productHandleFromPath(path);
  if (handle) return { type: 'product', key: handle };
  return { type: 'none', key: null };
}
