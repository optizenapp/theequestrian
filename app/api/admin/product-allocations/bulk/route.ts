import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { createManualRedirect } from '@/lib/redirects/manual';
import { upsertProductAllocation } from '@/lib/db/product-allocations';

const ensureProductAllocationTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS product_category_assignments (
      id SERIAL PRIMARY KEY,
      product_id TEXT NOT NULL UNIQUE,
      product_handle TEXT NOT NULL UNIQUE,
      canonical_path TEXT NOT NULL UNIQUE,
      category_path TEXT NOT NULL,
      top_level TEXT NOT NULL,
      parent_category TEXT,
      subcategory_handle TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_pca_category_path ON product_category_assignments(category_path)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pca_product_handle ON product_category_assignments(product_handle)`;
};

const getProductsByIds = async (productIds: string[]) => {
  if (!productIds.length) return [];
  const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
  const result = await sql.query(
    `SELECT id, handle FROM products WHERE id IN (${placeholders})`,
    productIds
  );
  return result.rows as Array<{ id: string; handle: string }>;
};

const getProductsBySearch = async (search: string) => {
  const term = `%${search}%`;
  const result = await sql`
    SELECT id, handle
    FROM products
    WHERE handle ILIKE ${term}
       OR title ILIKE ${term}
    ORDER BY shopify_created_at DESC
  `;
  return result.rows as Array<{ id: string; handle: string }>;
};

export async function POST(request: NextRequest) {
  try {
    await ensureProductAllocationTable();
    const body = await request.json();
    const categoryPath = typeof body?.categoryPath === 'string' ? body.categoryPath.trim() : '';
    const search = typeof body?.search === 'string' ? body.search.trim() : '';
    const productIds = Array.isArray(body?.productIds)
      ? body.productIds.filter((id: unknown) => typeof id === 'string')
      : [];

    if (!categoryPath) {
      return NextResponse.json({ error: 'Missing categoryPath' }, { status: 400 });
    }

    if (!search && productIds.length === 0) {
      return NextResponse.json({ error: 'Missing search or productIds' }, { status: 400 });
    }

    const products = productIds.length > 0
      ? await getProductsByIds(productIds)
      : await getProductsBySearch(search);

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found' }, { status: 404 });
    }

    const ids = products.map((product) => product.id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const existingResult = await sql.query(
      `SELECT product_id, canonical_path FROM product_category_assignments WHERE product_id IN (${placeholders})`,
      ids
    );
    const existingMap = new Map<string, string>();
    for (const row of existingResult.rows) {
      existingMap.set(row.product_id, row.canonical_path);
    }

    let updatedCount = 0;
    let redirectCount = 0;

    for (const product of products) {
      const previousCanonical = existingMap.get(product.id) || null;
      const allocation = await upsertProductAllocation({
        productId: product.id,
        productHandle: product.handle,
        categoryPath,
      });
      updatedCount += 1;
      if (previousCanonical && previousCanonical !== allocation.canonical_path) {
        await createManualRedirect(previousCanonical, allocation.canonical_path, '301', 'allocation');
        redirectCount += 1;
      }
    }

    return NextResponse.json({ updatedCount, redirectCount, total: products.length });
  } catch (error) {
    console.error('Error bulk allocating:', error);
    if (error instanceof Error && error.message.includes('Category path')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to bulk allocate' }, { status: 500 });
  }
}
