import { NextRequest, NextResponse } from 'next/server';
import type { EmailBlock } from '@/lib/email-platform/types';
import { renderTemplateBlocksHtml, renderTemplateContent } from '@/lib/email-platform/templates';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const blocks = Array.isArray(body?.blocks) ? (body.blocks as EmailBlock[]) : [];
    const subjectTemplate =
      typeof body?.subjectTemplate === 'string' ? body.subjectTemplate : 'An update from The Equestrian';
    const metadata =
      body?.metadata && typeof body.metadata === 'object'
        ? (body.metadata as Record<string, unknown>)
        : {};
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
    const handle = typeof body?.handle === 'string' ? body.handle.trim() : '';

    let productTitle = 'Synthetic Combo Horse Rug - Eureka Mini';
    let productUrl = `${siteUrl}/products/sample-product`;
    let productImageUrl = `${siteUrl}/window.svg`;
    if (handle) {
      const product = await getProductByHandle(handle);
      if (product) {
        const canonical = await getProductCanonicalUrl(product);
        productTitle = product.title;
        productUrl = `${siteUrl}${canonical}`;
        productImageUrl = (product.images?.edges?.[0]?.node?.url || productImageUrl).split('?')[0];
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
