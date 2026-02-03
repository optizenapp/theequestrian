import { sql } from '@vercel/postgres';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';
import { listManualRedirects } from './manual';

const getLastSegment = (value: string) => {
  const withoutQuery = value.split('?')[0];
  const parts = withoutQuery.split('/').filter(Boolean);
  return parts.length ? decodeURIComponent(parts[parts.length - 1]) : '';
};

const findCategoryMatch = async (path: string) => {
  const result = await sql`
    SELECT url_path
    FROM collection_content
    WHERE url_path = ${path}
    LIMIT 1
  `;
  return result.rows[0]?.url_path ?? null;
};

export async function auditManualRedirects() {
  const redirects = await listManualRedirects(500);
  const conflicts: Array<{
    id: number;
    from_path: string;
    to_path: string;
    conflict_target: string;
  }> = [];

  for (const redirect of redirects) {
    const fromPath = redirect.from_path as string;
    let conflictTarget: string | null = null;

    const categoryMatch = await findCategoryMatch(fromPath);
    if (categoryMatch) {
      conflictTarget = categoryMatch;
    } else {
      const handle = getLastSegment(fromPath);
      if (handle) {
        const product = await getProductByHandle(handle);
        if (product) {
          const canonical = getProductCanonicalUrl(product);
          if (canonical === fromPath) {
            conflictTarget = canonical;
          }
        }
      }
    }

    if (conflictTarget) {
      conflicts.push({
        id: redirect.id,
        from_path: fromPath,
        to_path: redirect.to_path,
        conflict_target: conflictTarget,
      });
      await sql`
        UPDATE manual_redirects
        SET status = 'conflict',
            conflict_target = ${conflictTarget},
            last_checked = NOW(),
            updated_at = NOW()
        WHERE id = ${redirect.id}
      `;
    } else {
      await sql`
        UPDATE manual_redirects
        SET status = 'active',
            conflict_target = NULL,
            last_checked = NOW(),
            updated_at = NOW()
        WHERE id = ${redirect.id}
      `;
    }
  }

  return conflicts;
}
