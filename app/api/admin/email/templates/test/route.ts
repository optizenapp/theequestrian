import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  normalizeEmailBlocks,
  normalizeTemplateMetadata,
  renderTemplateBlocksHtml,
  renderTemplateContent,
  addUtmParamsToEmailHtml,
  proxyEmailImages,
} from '@/lib/email-platform/templates';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';

const resend = new Resend(process.env.RESEND_API_KEY);

function toMoney(value: string | number | undefined): string {
  const parsed = typeof value === 'number' ? value : Number(value || 0);
  if (!Number.isFinite(parsed)) return '$0.00';
  return `$${parsed.toFixed(2)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    if (!to) {
      return NextResponse.json({ error: 'Missing test email address' }, { status: 400 });
    }

    const blocks = normalizeEmailBlocks(body?.blocks);
    const subjectTemplate =
      typeof body?.subjectTemplate === 'string' ? body.subjectTemplate : 'An update from The Equestrian';
    const fromName =
      typeof body?.fromName === 'string' && body.fromName.trim()
        ? body.fromName.trim()
        : 'The Equestrian';
    const fromEmail =
      typeof body?.fromEmail === 'string' && body.fromEmail.trim()
        ? body.fromEmail.trim()
        : 'support@theequestrian.com.au';
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
        email: to,
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

    const htmlWithUtm = proxyEmailImages(
      addUtmParamsToEmailHtml(rendered.html, {
        source: 'email',
        medium: 'newsletter',
        campaign: 'test-email',
      }),
      siteUrl
    );

    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: `[TEST] ${rendered.subject}`,
      html: htmlWithUtm,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Email template test send failed:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
