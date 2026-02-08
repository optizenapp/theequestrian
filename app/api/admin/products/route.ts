import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';

const normalizePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
};

export async function GET(request: NextRequest) {
  try {
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
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const categoryPath = normalizePath(searchParams.get('categoryPath')?.trim() || '');
    const limit = Number(searchParams.get('limit') || 10);
    const offset = Number(searchParams.get('offset') || 0);

    let productTypes: string[] = [];
    if (categoryPath) {
      const parts = categoryPath.replace(/^\//, '').split('/').filter(Boolean);
      productTypes = await getProductTypesForCollection(parts[0] || '', parts[1], parts[2]);
    }

    let query = `
      SELECT p.id, p.handle, p.title, p.vendor, p.product_type
      FROM products p
    `;
    let countQuery = `
      SELECT COUNT(*)::int as total
      FROM products p
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (categoryPath) {
      query += ` LEFT JOIN product_category_assignments pca ON pca.product_id = p.id`;
      countQuery += ` LEFT JOIN product_category_assignments pca ON pca.product_id = p.id`;
    }

    query += ' WHERE 1=1';
    countQuery += ' WHERE 1=1';

    if (search) {
      query += ` AND (handle ILIKE $${paramIndex} OR title ILIKE $${paramIndex})`;
      countQuery += ` AND (handle ILIKE $${paramIndex} OR title ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (categoryPath) {
      if (productTypes.length > 0) {
        query += ` AND (p.product_type = ANY($${paramIndex}) OR pca.category_path = $${paramIndex + 1})`;
        countQuery += ` AND (p.product_type = ANY($${paramIndex}) OR pca.category_path = $${paramIndex + 1})`;
        params.push(productTypes, categoryPath);
        paramIndex += 2;
      } else {
        query += ` AND pca.category_path = $${paramIndex}`;
        countQuery += ` AND pca.category_path = $${paramIndex}`;
        params.push(categoryPath);
        paramIndex++;
      }
    }

    query += ` ORDER BY shopify_created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const { rows } = await sql.query(query, params);
    const countResult = await sql.query(countQuery, params);
    const totalCount = countResult.rows[0]?.total ?? 0;
    return NextResponse.json({ products: rows, totalCount });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
