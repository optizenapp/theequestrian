import { NextRequest, NextResponse } from 'next/server';
import { deleteProductAllocation } from '@/lib/db/product-allocations';
import { sql } from '@vercel/postgres';

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
};

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    await ensureProductAllocationTable();
    const { productId } = await params;
    await deleteProductAllocation(productId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting allocation:', error);
    return NextResponse.json({ error: 'Failed to delete allocation' }, { status: 500 });
  }
}
