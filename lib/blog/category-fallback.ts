import { sql } from '@/lib/db/client';

/**
 * Find a plausible category URL from collection_content using a path segment (e.g. collection handle or slug).
 */
export async function findBestCategoryPathForSegment(segment: string): Promise<string | null> {
  const cleaned = decodeURIComponent(segment || '')
    .replace(/\+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length > 120) return null;

  const result = await sql`
    SELECT url_path
    FROM collection_content
    WHERE url_path ILIKE ${`%/${cleaned}`}
       OR url_path ILIKE ${`/${cleaned}`}
    ORDER BY LENGTH(url_path) ASC
    LIMIT 1
  `;
  const rows = Array.isArray(result) ? result : [];
  const row = rows[0] as { url_path?: string } | undefined;
  return row?.url_path ?? null;
}
