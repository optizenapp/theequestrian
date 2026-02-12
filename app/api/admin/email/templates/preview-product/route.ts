import { NextRequest, NextResponse } from 'next/server';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const handle = typeof body?.handle === 'string' ? body.handle.trim() : '';
    if (!handle) {
      return NextResponse.json({ error: 'Missing product handle' }, { status: 400 });
    }

    const product = await getProductByHandle(handle);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const canonical = await getProductCanonicalUrl(product);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
    return NextResponse.json({
      product: {
        title: product.title,
        imageUrl: product.images?.edges?.[0]?.node?.url || null,
        url: `${siteUrl}${canonical}`,
      },
    });
  } catch (error) {
    console.error('Email template preview product error:', error);
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 });
  }
}
