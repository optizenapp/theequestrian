import { NextRequest, NextResponse } from 'next/server';
import { getReviewEmailSettings } from '@/lib/reviews/email-settings';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';
import { renderReviewEmailHtml, type ReviewEmailRenderData } from '@/lib/reviews/email-template';
import { defaultReviewEmailBlocks, type ReviewEmailBlock } from '@/lib/reviews/email-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const handle = typeof body?.handle === 'string' ? body.handle.trim() : '';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';

    let productImageUrl = `${siteUrl}/window.svg`;
    let productUrl = `${siteUrl}/products/sample-product#reviews`;
    let productTitle = 'Synthetic Combo Horse Rug - Eureka Mini';

    if (handle) {
      const product = await getProductByHandle(handle);
      if (product) {
        const canonical = await getProductCanonicalUrl(product);
        productUrl = `${siteUrl}${canonical}#reviews`;
        const rawImageUrl = product.images?.edges?.[0]?.node?.url || productImageUrl;
        productImageUrl = rawImageUrl.split('?')[0];
        productTitle = product.title;
      }
    }

    const savedSettings = await getReviewEmailSettings();
    const blocks: ReviewEmailBlock[] = Array.isArray(body.blocks)
      ? (body.blocks as ReviewEmailBlock[])
      : savedSettings.blocks || defaultReviewEmailBlocks;

    const settings = {
      ...savedSettings,
      blocks,
      brandPrimary: body.brandPrimary || savedSettings.brandPrimary,
      brandDark: body.brandDark || savedSettings.brandDark,
      headerBackground: body.headerBackground || savedSettings.headerBackground,
      logoUrl: body.logoUrl !== undefined ? body.logoUrl : savedSettings.logoUrl,
      fromName: body.fromName || savedSettings.fromName,
    };

    const data: ReviewEmailRenderData = {
      customerName: 'Jono',
      orderNumber: '3599',
      siteUrl,
      productTitle,
      productUrl,
      productImageUrl,
      products: [
        {
          title: productTitle,
          imageUrl: productImageUrl,
          url: productUrl,
          handle: handle || 'sample-product',
        },
      ],
    };

    const html = await renderReviewEmailHtml({ settings, data, mode: 'preview' });

    return NextResponse.json({ html });
  } catch (error) {
    console.error('Preview render error:', error);
    return NextResponse.json({ error: 'Failed to render preview' }, { status: 500 });
  }
}
