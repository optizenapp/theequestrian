import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeEmailBlocks,
  normalizeTemplateMetadata,
  renderTemplateBlocksHtml,
  renderTemplateContent,
} from '@/lib/email-platform/templates';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';

function toMoney(value: string | number | undefined): string {
  const parsed = typeof value === 'number' ? value : Number(value || 0);
  if (!Number.isFinite(parsed)) return '$0.00';
  return `$${parsed.toFixed(2)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const blocks = normalizeEmailBlocks(body?.blocks);
    const subjectTemplate =
      typeof body?.subjectTemplate === 'string' ? body.subjectTemplate : 'An update from The Equestrian';
    const metadata = normalizeTemplateMetadata(
      body?.metadata && typeof body.metadata === 'object'
        ? (body.metadata as Record<string, unknown>)
        : {}
    );
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
    const handle = typeof body?.handle === 'string' ? body.handle.trim() : '';

    let productTitle = 'Synthetic Combo Horse Rug - Eureka Mini';
    let productUrl = `${siteUrl}/products/sample-product`;
    let productImageUrl = `${siteUrl}/window.svg`;
    let productPrice = '$149.95';
    let productCompareAtPrice = '$199.95';
    let productSavePercent = '25%';
    let productCompareAtPriceStyle = '';
    let productSavePercentStyle = '';
    let productFreeShippingStyle = '';
    if (handle) {
      const product = await getProductByHandle(handle);
      if (product) {
        const canonical = await getProductCanonicalUrl(product);
        productTitle = product.title;
        productUrl = `${siteUrl}${canonical}`;
        productImageUrl = (product.images?.edges?.[0]?.node?.url || productImageUrl).split('?')[0];
        const priceValue = Number(product.priceRange?.minVariantPrice?.amount || 0);
        const compareValue = Number(product.compareAtPriceRange?.minVariantPrice?.amount || 0);
        const hasDiscount = compareValue > priceValue && priceValue > 0;
        productPrice = toMoney(priceValue);
        productCompareAtPrice = hasDiscount ? toMoney(compareValue) : '';
        productSavePercent = hasDiscount ? `${Math.round(((compareValue - priceValue) / compareValue) * 100)}%` : '';
        productCompareAtPriceStyle = hasDiscount ? '' : 'display:none;';
        productSavePercentStyle = hasDiscount ? '' : 'display:none;';
        productFreeShippingStyle = '';
      }
    }

    const htmlTemplate = renderTemplateBlocksHtml({ blocks, metadata });
    const rendered = renderTemplateContent({
      subjectTemplate,
      htmlTemplate,
      variables: {
        customerName: 'Jono',
        firstName: 'Jono',
        orderNumber: '3599',
        email: 'jono@example.com',
        productTitle,
        productUrl,
        productImageUrl,
        productPrice,
        productCompareAtPrice,
        productSavePercent,
        productCompareAtPriceStyle,
        productSavePercentStyle,
        productFreeShippingStyle,
        siteUrl,
        unsubscribeUrl: `${siteUrl}/api/email/unsubscribe?token=preview-token`,
      },
    });

    return NextResponse.json({ html: rendered.html, subject: rendered.subject });
  } catch (error) {
    console.error('Email template preview error:', error);
    return NextResponse.json({ error: 'Failed to render preview' }, { status: 500 });
  }
}
