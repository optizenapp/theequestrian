import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { shopifyFetch } from '@/lib/shopify/client';

const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts($query: String!, $first: Int!, $after: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        node {
          id
          handle
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const normalizePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
};

const ensureOverridesTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS product_content_overrides (
      id SERIAL PRIMARY KEY,
      product_id TEXT,
      product_handle TEXT NOT NULL UNIQUE,
      title_override TEXT,
      meta_title TEXT,
      meta_description TEXT,
      description_html TEXT,
      bullet_points JSONB DEFAULT '[]'::jsonb,
      slug_override TEXT,
      top_description_html TEXT,
      bottom_description_html TEXT,
      use_headless_title BOOLEAN DEFAULT false,
      use_headless_meta_title BOOLEAN DEFAULT false,
      use_headless_meta_description BOOLEAN DEFAULT false,
      use_headless_description BOOLEAN DEFAULT false,
      use_headless_bullets BOOLEAN DEFAULT false,
      use_headless_slug BOOLEAN DEFAULT false,
      use_headless_top_description BOOLEAN DEFAULT false,
      use_headless_bottom_description BOOLEAN DEFAULT false,
      is_published_headless BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS is_published_headless BOOLEAN NOT NULL DEFAULT true`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pco_product_id ON product_content_overrides(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pco_product_handle ON product_content_overrides(product_handle)`;
};

type ProductRow = { id: string; handle: string };

async function getFrontendSearchHandles(search: string): Promise<string[]> {
  const products: Array<{ id: string; handle: string }> = [];
  const seenHandles = new Set<string>();
  let hasNextPage = true;
  let cursor: string | null = null;
  const maxPages = 40;
  let pages = 0;

  while (hasNextPage && pages < maxPages) {
    const data = await shopifyFetch<{
      products: {
        edges: Array<{ node: { id: string; handle: string } }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>({
      query: SEARCH_PRODUCTS_QUERY,
      variables: { query: `title:*${search}*`, first: 250, after: cursor },
      cache: 'no-store',
    });

    for (const edge of data.products.edges) {
      const product = edge.node;
      if (!seenHandles.has(product.handle)) {
        seenHandles.add(product.handle);
        products.push(product);
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
    pages += 1;
  }

  return products;
}

async function getProductsBySearchAndCategory(search: string, categoryPath: string): Promise<ProductRow[]> {
  const normalizedCategory = normalizePath(categoryPath);
  const categoryLike = `${normalizedCategory}/%`;

  if (search) {
    let matchedProducts = await getFrontendSearchHandles(search);
    if (matchedProducts.length === 0) return [];

    if (normalizedCategory) {
      const categoryRows = await sql`
        SELECT product_id
        FROM product_category_assignments
        WHERE category_path = ${normalizedCategory}
           OR category_path LIKE ${categoryLike}
      ` as Array<{ product_id: string }>;
      const allowedIds = new Set(categoryRows.map((row) => row.product_id));
      matchedProducts = matchedProducts.filter((product) => allowedIds.has(product.id));
    }

    return matchedProducts;
  }

  if (normalizedCategory) {
    return await sql`
      SELECT p.id, p.handle
      FROM products p
      WHERE EXISTS (
        SELECT 1
        FROM product_category_assignments pca
        WHERE pca.product_id = p.id
          AND (pca.category_path = ${normalizedCategory} OR pca.category_path LIKE ${categoryLike})
      )
      ORDER BY p.shopify_created_at DESC
    ` as ProductRow[];
  }

  return [];
}

async function getProductsByIds(productIds: string[]): Promise<ProductRow[]> {
  if (productIds.length === 0) return [];
  return await sql`
    SELECT id, handle
    FROM products
    WHERE id = ANY(${productIds})
    ORDER BY shopify_created_at DESC
  ` as ProductRow[];
}

export async function POST(request: NextRequest) {
  try {
    await ensureOverridesTable();
    const body = await request.json();

    const published = Boolean(body?.published);
    const search = typeof body?.search === 'string' ? body.search.trim() : '';
    const categoryPath = typeof body?.categoryPath === 'string' ? body.categoryPath.trim() : '';
    const productIds = Array.isArray(body?.productIds)
      ? body.productIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];

    if (productIds.length === 0 && !search && !categoryPath) {
      return NextResponse.json(
        { error: 'Provide productIds or search/categoryPath for bulk publish update.' },
        { status: 400 }
      );
    }

    const products = productIds.length > 0
      ? await getProductsByIds(productIds)
      : await getProductsBySearchAndCategory(search, categoryPath);

    if (products.length === 0) {
      return NextResponse.json({ matched: 0, updated: 0 });
    }

    for (const product of products) {
      await sql`
        INSERT INTO product_content_overrides (
          product_id,
          product_handle,
          is_published_headless,
          updated_at
        ) VALUES (
          ${product.id},
          ${product.handle},
          ${published},
          NOW()
        )
        ON CONFLICT (product_handle) DO UPDATE
        SET
          product_id = EXCLUDED.product_id,
          is_published_headless = EXCLUDED.is_published_headless,
          updated_at = NOW()
      `;
    }

    return NextResponse.json({
      matched: products.length,
      updated: products.length,
      published,
    });
  } catch (error) {
    console.error('Error updating publish visibility:', error);
    return NextResponse.json({ error: 'Failed to update product publish visibility' }, { status: 500 });
  }
}
