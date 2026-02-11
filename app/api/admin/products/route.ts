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
          title
          vendor
          productType
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

async function getFrontendSearchHandles(search: string): Promise<string[]> {
  const products: Array<{
    id: string;
    handle: string;
    title: string;
    vendor: string | null;
    productType: string | null;
  }> = [];
  const seenHandles = new Set<string>();
  let hasNextPage = true;
  let cursor: string | null = null;
  const maxPages = 40;
  let pages = 0;

  while (hasNextPage && pages < maxPages) {
    const data: {
      products: {
        edges: Array<{ node: { id: string; handle: string; title: string; vendor: string | null; productType: string | null } }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await shopifyFetch<{
      products: {
        edges: Array<{ node: { id: string; handle: string; title: string; vendor: string | null; productType: string | null } }>;
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
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const categoryPath = normalizePath(searchParams.get('categoryPath')?.trim() || '');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 10), 1), 250);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);
    const categoryLike = `${categoryPath}/%`;

    let products: Array<{
      id: string;
      handle: string;
      title: string;
      vendor: string | null;
      product_type: string | null;
      is_published_headless: boolean;
    }> = [];
    let totalCount = 0;

    if (search) {
      let frontendProducts = await getFrontendSearchHandles(search);
      if (frontendProducts.length === 0) {
        return NextResponse.json({ products: [], totalCount: 0 });
      }

      if (categoryPath) {
        const categoryRows = await sql`
          SELECT product_id
          FROM product_category_assignments
          WHERE category_path = ${categoryPath}
             OR category_path LIKE ${categoryLike}
        ` as Array<{ product_id: string }>;
        const allowedIds = new Set(categoryRows.map((row) => row.product_id));
        frontendProducts = frontendProducts.filter((row) => allowedIds.has(row.id));
      }

      const handles = frontendProducts.map((p) => p.handle);
      const visibilityRows = handles.length > 0
        ? await sql`
            SELECT product_handle, is_published_headless
            FROM product_content_overrides
            WHERE product_handle = ANY(${handles})
          ` as Array<{ product_handle: string; is_published_headless: boolean }>
        : [];
      const visibilityMap = new Map(visibilityRows.map((row) => [row.product_handle, row.is_published_headless]));

      const mapped = frontendProducts.map((row) => ({
        id: row.id,
        handle: row.handle,
        title: row.title,
        vendor: row.vendor,
        product_type: row.productType,
        is_published_headless: visibilityMap.get(row.handle) ?? true,
      }));

      totalCount = mapped.length;
      products = mapped.slice(offset, offset + limit);
    } else if (categoryPath) {
      products = await sql`
        SELECT
          p.id,
          p.handle,
          p.title,
          p.vendor,
          p.product_type,
          COALESCE(pco.is_published_headless, true) AS is_published_headless
        FROM products p
        LEFT JOIN product_content_overrides pco
          ON pco.product_id = p.id OR pco.product_handle = p.handle
        WHERE EXISTS (
          SELECT 1
          FROM product_category_assignments pca
          WHERE pca.product_id = p.id
            AND (pca.category_path = ${categoryPath} OR pca.category_path LIKE ${categoryLike})
        )
        ORDER BY p.shopify_created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      ` as typeof products;

      const countRows = await sql`
        SELECT COUNT(*)::int AS total
        FROM products p
        WHERE EXISTS (
          SELECT 1
          FROM product_category_assignments pca
          WHERE pca.product_id = p.id
            AND (pca.category_path = ${categoryPath} OR pca.category_path LIKE ${categoryLike})
        )
      ` as Array<{ total: number }>;
      totalCount = Number(countRows[0]?.total ?? 0);
    } else {
      products = await sql`
        SELECT
          p.id,
          p.handle,
          p.title,
          p.vendor,
          p.product_type,
          COALESCE(pco.is_published_headless, true) AS is_published_headless
        FROM products p
        LEFT JOIN product_content_overrides pco
          ON pco.product_id = p.id OR pco.product_handle = p.handle
        ORDER BY p.shopify_created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      ` as typeof products;

      const countRows = await sql`
        SELECT COUNT(*)::int AS total
        FROM products
      ` as Array<{ total: number }>;
      totalCount = Number(countRows[0]?.total ?? 0);
    }

    return NextResponse.json({ products, totalCount });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
