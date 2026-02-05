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
    const currentStatus = typeof redirect.status === 'string' ? redirect.status : 'active';
    let conflictTarget: string | null = null;

    const categoryMatch = await findCategoryMatch(fromPath);
    if (categoryMatch) {
      conflictTarget = categoryMatch;
    } else {
      const handle = getLastSegment(fromPath);
      if (handle) {
        const product = await getProductByHandle(handle);
        if (product) {
          const canonical = await getProductCanonicalUrl(product);
          if (canonical === fromPath) {
            conflictTarget = canonical;
          }
        }
      }
    }

    if (conflictTarget) {
      const statusToKeep =
        currentStatus === 'override' || currentStatus === 'disabled' ? currentStatus : 'conflict';
      if (statusToKeep === 'conflict') {
        conflicts.push({
          id: redirect.id,
          from_path: fromPath,
          to_path: redirect.to_path,
          conflict_target: conflictTarget,
        });
      }
      await sql`
        UPDATE manual_redirects
        SET status = ${statusToKeep},
            conflict_target = ${conflictTarget},
            last_checked = NOW(),
            updated_at = NOW()
        WHERE id = ${redirect.id}
      `;
    } else {
      const statusToSet =
        currentStatus === 'conflict' || currentStatus === 'override' ? 'active' : currentStatus;
      await sql`
        UPDATE manual_redirects
        SET status = ${statusToSet},
            conflict_target = NULL,
            last_checked = NOW(),
            updated_at = NOW()
        WHERE id = ${redirect.id}
      `;
    }
  }

  return conflicts;
}
