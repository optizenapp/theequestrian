import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';

export const dynamic = 'force-dynamic';

/**
 * Live product types from Neon `products` (what cart lines actually carry).
 * Optional ?q= filters by substring (case-insensitive).
 */
export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    const limitRaw = Number(request.nextUrl.searchParams.get('limit') || 80);
    const limit = Math.min(200, Math.max(10, Number.isFinite(limitRaw) ? limitRaw : 80));

    const result = q
      ? await sql.query(
          `SELECT product_type AS type, COUNT(*)::int AS count
           FROM products
           WHERE product_type IS NOT NULL
             AND TRIM(product_type) <> ''
             AND product_type ILIKE $1
           GROUP BY product_type
           ORDER BY count DESC, product_type ASC
           LIMIT $2`,
          [`%${q}%`, limit]
        )
      : await sql.query(
          `SELECT product_type AS type, COUNT(*)::int AS count
           FROM products
           WHERE product_type IS NOT NULL
             AND TRIM(product_type) <> ''
           GROUP BY product_type
           ORDER BY count DESC, product_type ASC
           LIMIT $1`,
          [limit]
        );

    const types = (result.rows as Array<{ type: string; count: number }>).map((row) => ({
      type: row.type,
      count: row.count,
    }));

    return NextResponse.json({ types, count: types.length, query: q || null });
  } catch (error) {
    console.error('[admin/upsells/product-types]', error);
    return NextResponse.json({ error: 'Failed to load product types' }, { status: 500 });
  }
}