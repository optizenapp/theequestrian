import { sql } from '@/lib/db/vercel-postgres';

/**
 * Published brands with meaningful SEO/editorial content (not bare placeholders).
 */
export async function listSeoReadyBrandHandles(): Promise<string[]> {
  try {
    const result = await sql`
      SELECT handle
      FROM brand_content
      WHERE status = 'published'
        AND COALESCE(products_count, 0) > 0
        AND LENGTH(TRIM(COALESCE(short_description, ''))) >= 80
        AND LENGTH(TRIM(COALESCE(long_description, ''))) >= 220
      ORDER BY handle ASC
    `;
    return result.rows.map((r) => r.handle as string);
  } catch (e) {
    console.error('[auto-campaigns] listSeoReadyBrandHandles failed:', e);
    return [];
  }
}

export function pickRotated<T>(items: T[], index: number): T | null {
  if (items.length === 0) return null;
  return items[index % items.length];
}
