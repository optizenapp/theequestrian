import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getProductByHandle } from '@/lib/shopify/products';
import type { ShopifyProduct } from '@/types/shopify';

const ensureProductContentTable = async () => {
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_pco_product_handle ON product_content_overrides(product_handle)`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_title BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_meta_title BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_meta_description BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_top_description BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_bottom_description BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS description_html TEXT`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS bullet_points JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS slug_override TEXT`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_description BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_bullets BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_slug BOOLEAN DEFAULT false`;
};

const getProductFromDb = async (handle: string): Promise<Partial<ShopifyProduct> | null> => {
  const result = await sql`
    SELECT id, handle, title, description
    FROM products
    WHERE handle = ${handle}
    LIMIT 1
  `;
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    handle: row.handle,
    title: row.title,
    descriptionHtml: row.description || '',
  };
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    await ensureProductContentTable();
    const { handle } = await params;
    let product: ShopifyProduct | Partial<ShopifyProduct> | null = await getProductByHandle(handle, { cache: 'no-store' });
    if (!product) {
      product = await getProductFromDb(handle);
    }
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const overrideResult = await sql`
      SELECT *
      FROM product_content_overrides
      WHERE product_handle = ${handle}
      LIMIT 1
    `;

    return NextResponse.json({
      product: {
        id: product.id,
        handle: product.handle,
        title: product.title,
        descriptionHtml: product.descriptionHtml || '',
        images: product.images?.edges?.map((edge) => edge.node) || [],
      },
      override: overrideResult.rows[0] || null,
    });
  } catch (error) {
    console.error('Error fetching product content:', error);
    return NextResponse.json({ error: 'Failed to fetch product content' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    await ensureProductContentTable();
    const { handle } = await params;
    const body = await request.json();

    const productResult = await sql`
      SELECT id
      FROM products
      WHERE handle = ${handle}
      LIMIT 1
    `;
    const productId = productResult.rows[0]?.id ?? null;

    const result = await sql`
      INSERT INTO product_content_overrides (
        product_id,
        product_handle,
        title_override,
        meta_title,
        meta_description,
        description_html,
        bullet_points,
        slug_override,
        use_headless_title,
        use_headless_meta_title,
        use_headless_meta_description,
        use_headless_description,
        use_headless_bullets,
        use_headless_slug,
        updated_at
      ) VALUES (
        ${productId},
        ${handle},
        ${String(body?.title_override || '')},
        ${String(body?.meta_title || '')},
        ${String(body?.meta_description || '')},
        ${String(body?.description_html || '')},
        ${JSON.stringify(body?.bullet_points || [])},
        ${String(body?.slug_override || '')},
        ${Boolean(body?.use_headless_title)},
        ${Boolean(body?.use_headless_meta_title)},
        ${Boolean(body?.use_headless_meta_description)},
        ${Boolean(body?.use_headless_description)},
        ${Boolean(body?.use_headless_bullets)},
        ${Boolean(body?.use_headless_slug)},
        NOW()
      )
      ON CONFLICT (product_handle) DO UPDATE
      SET
        product_id = EXCLUDED.product_id,
        title_override = EXCLUDED.title_override,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        description_html = EXCLUDED.description_html,
        bullet_points = EXCLUDED.bullet_points,
        slug_override = EXCLUDED.slug_override,
        use_headless_title = EXCLUDED.use_headless_title,
        use_headless_meta_title = EXCLUDED.use_headless_meta_title,
        use_headless_meta_description = EXCLUDED.use_headless_meta_description,
        use_headless_description = EXCLUDED.use_headless_description,
        use_headless_bullets = EXCLUDED.use_headless_bullets,
        use_headless_slug = EXCLUDED.use_headless_slug,
        updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({ override: result.rows[0] });
  } catch (error) {
    console.error('Error updating product content:', error);
    return NextResponse.json({ error: 'Failed to update product content' }, { status: 500 });
  }
}
