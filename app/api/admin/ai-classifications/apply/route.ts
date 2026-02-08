import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { getProductByHandle } from '@/lib/shopify/products';
import { getProductCanonicalUrl } from '@/lib/shopify/products';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopify_id, product_type } = body;

    if (!shopify_id || !product_type) {
      return NextResponse.json(
        { error: 'Missing shopify_id or product_type' },
        { status: 400 }
      );
    }

    // Get product handle from database
    const classificationResult = await sql`
      SELECT handle FROM ai_product_classifications
      WHERE shopify_id = ${shopify_id}
    `;

    if (classificationResult.rows.length === 0) {
      return NextResponse.json({ error: 'Classification not found' }, { status: 404 });
    }

    const handle = classificationResult.rows[0].handle;

    // Update product type in Shopify via Admin API
    const mutation = `
      mutation updateProductType($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            productType
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        id: shopify_id,
        productType: product_type,
      },
    };

    const response = await shopifyAdminFetch<any>({ query: mutation, variables });

    if (response.productUpdate?.userErrors?.length > 0) {
      const errors = response.productUpdate.userErrors
        .map((e: any) => e.message)
        .join(', ');
      return NextResponse.json({ error: `Shopify error: ${errors}` }, { status: 400 });
    }

    // Get the new canonical URL for the product
    const product = await getProductByHandle(handle);
    if (product) {
      const canonicalUrl = await getProductCanonicalUrl({
        id: product.id,
        handle: product.handle,
        productType: product_type,
        metafield: product.metafield,
      });

      // Only create redirect if the canonical URL is NOT /products/{handle}
      if (canonicalUrl !== `/products/${handle}`) {
        // Create redirect from /products/{handle} to new category URL
        await sql`
          INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
          VALUES (${`/products/${handle}`}, ${canonicalUrl}, ${'301'}, ${'auto'}, ${'active'}, NOW())
          ON CONFLICT (from_path) DO UPDATE
          SET to_path = EXCLUDED.to_path,
              redirect_type = EXCLUDED.redirect_type,
              source = 'auto',
              status = 'active',
              updated_at = NOW()
        `;
      }
    }

    // Update status in database to 'applied'
    await sql`
      UPDATE ai_product_classifications
      SET status = 'applied', updated_at = NOW()
      WHERE shopify_id = ${shopify_id}
    `;

    return NextResponse.json({
      success: true,
      product: response.productUpdate?.product,
      redirect_created: product && await getProductCanonicalUrl({
        id: product.id,
        handle: product.handle,
        productType: product_type,
        metafield: product.metafield,
      }) !== `/products/${handle}`,
    });
  } catch (error) {
    console.error('Error applying classification to Shopify:', error);
    return NextResponse.json(
      { error: 'Failed to apply classification to Shopify' },
      { status: 500 }
    );
  }
}
