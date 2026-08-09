import { NextRequest, NextResponse } from 'next/server';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';
import { resolveProductFreeShipping } from '@/lib/shipping/free-shipping';

function toMoney(value: string | number | undefined): string {
  const parsed = typeof value === 'number' ? value : Number(value || 0);
  if (!Number.isFinite(parsed)) return '$0.00';
  return `$${parsed.toFixed(2)}`;
}

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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';
    const priceValue = Number(product.priceRange?.minVariantPrice?.amount || 0);
    const compareValue = Number(product.compareAtPriceRange?.minVariantPrice?.amount || 0);
    const hasDiscount = compareValue > priceValue && priceValue > 0;
    const savePercent = hasDiscount ? `${Math.round(((compareValue - priceValue) / compareValue) * 100)}%` : '';
    const freeShippingBadge = await resolveProductFreeShipping({
      vendor: product.vendor || '',
      tags: product.tags || [],
      price: priceValue,
    });

    return NextResponse.json({
      product: {
        title: product.title,
        imageUrl: product.images?.edges?.[0]?.node?.url || null,
        url: `${siteUrl}${canonical}`,
        price: toMoney(priceValue),
        compareAtPrice: hasDiscount ? toMoney(compareValue) : '',
        savePercent,
        freeShippingBadge,
      },
    });
  } catch (error) {
    console.error('Email template preview product error:', error);
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 });
  }
}
