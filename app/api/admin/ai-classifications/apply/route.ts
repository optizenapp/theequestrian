import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

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

    // Update product type in Shopify via Admin API
    const mutation = `
      mutation updateProductType($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            productType
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

    // Update status in database to 'applied'
    await sql`
      UPDATE ai_product_classifications
      SET status = 'applied', updated_at = NOW()
      WHERE shopify_id = ${shopify_id}
    `;

    return NextResponse.json({
      success: true,
      product: response.productUpdate?.product,
    });
  } catch (error) {
    console.error('Error applying classification to Shopify:', error);
    return NextResponse.json(
      { error: 'Failed to apply classification to Shopify' },
      { status: 500 }
    );
  }
}
