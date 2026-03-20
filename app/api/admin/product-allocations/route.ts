import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { sql } from '@vercel/postgres';
import { createManualRedirect } from '@/lib/redirects/manual';
import {
  getProductAllocationByHandle,
  getProductAllocationByProductId,
  listProductAllocations,
  upsertProductAllocation,
} from '@/lib/db/product-allocations';
import { clearCategoryCache } from '@/lib/shopify/products';

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

export async function GET(request: NextRequest) {
  try {
    await ensureProductAllocationTable();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || undefined;
    const limit = Number(searchParams.get('limit') || 50);
    const offset = Number(searchParams.get('offset') || 0);
    const allocations = await listProductAllocations({ search, limit, offset });
    return NextResponse.json({ allocations });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    return NextResponse.json({ error: 'Failed to fetch allocations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureProductAllocationTable();
    const body = await request.json();
    const productIdInput = typeof body?.productId === 'string' ? body.productId.trim() : '';
    const productHandleInput = typeof body?.productHandle === 'string' ? body.productHandle.trim() : '';
    const categoryPath = typeof body?.categoryPath === 'string' ? body.categoryPath.trim() : '';

    if (!productHandleInput) {
      return NextResponse.json({ error: 'Missing productHandle' }, { status: 400 });
    }
    if (!categoryPath) {
      return NextResponse.json({ error: 'Missing categoryPath' }, { status: 400 });
    }

    let productId = productIdInput;
    if (!productId) {
      const result = await sql`
        SELECT id
        FROM products
        WHERE handle = ${productHandleInput}
        LIMIT 1
      `;
      productId = result.rows[0]?.id || '';
    }

    if (!productId) {
      return NextResponse.json({ error: 'Product not found in database' }, { status: 404 });
    }

    const existing =
      (await getProductAllocationByProductId(productId)) ||
      (await getProductAllocationByHandle(productHandleInput));

    const allocation = await upsertProductAllocation({
      productId,
      productHandle: productHandleInput,
      categoryPath,
    });

    let redirectCreated = false;
    if (existing?.canonical_path && existing.canonical_path !== allocation.canonical_path) {
      await createManualRedirect(existing.canonical_path, allocation.canonical_path, '301', 'allocation');
      redirectCreated = true;
    }

    revalidatePath(allocation.category_path);
    clearCategoryCache();

    return NextResponse.json({ allocation, redirectCreated });
  } catch (error) {
    console.error('Error saving allocation:', error);
    if (error instanceof Error && error.message.includes('Category path')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save allocation' }, { status: 500 });
  }
}
