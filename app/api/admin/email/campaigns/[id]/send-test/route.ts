import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTemplateVersion, renderTemplateContent } from '@/lib/email-platform/templates';
import { buildCampaignHtmlWithOverrides } from '@/lib/email-platform/auto-weekly/render';
import { sendSesEmail } from '@/lib/email-platform/ses-mailer';
import { ON_SALE_CTA_LABEL, onSalePageUrlFromMapping } from '@/lib/email-platform/auto-campaigns/build-one';
const CAMPAIGN_SITE_URL = 'https://www.theequestrian.com.au';
const AUTO_BRAND_LOGO_PLACEHOLDER = 'https://www.theequestrian.com.au/email-logo.png';

function stripOuterQuotes(value: string): string {
  return value.trim().replace(/^["'“”]+/, '').replace(/["'“”]+$/, '').trim();
}

function brandLabelFromHandle(handle: string): string {
  return handle
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    if (!to) {
      return NextResponse.json({ error: 'Missing test email address' }, { status: 400 });
    }

    const campaignResult = await sql`
      SELECT id, name, template_version_id, metadata, status
      FROM email_campaigns
      WHERE id = ${id}
      LIMIT 1
    `;
    const campaign = campaignResult.rows[0];
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const templateVersionId = campaign.template_version_id as string | null;
    if (!templateVersionId) {
      return NextResponse.json({ error: 'Campaign has no template version' }, { status: 400 });
    }
    const templateVersion = await getTemplateVersion(templateVersionId);
    if (!templateVersion) {
      return NextResponse.json({ error: 'Template version not found' }, { status: 404 });
    }

    const metadata = (campaign.metadata as Record<string, unknown> | null) || {};
    const introText = typeof metadata.introText === 'string' ? metadata.introText : null;
    const generatedHeading =
      typeof metadata.generatedHeading === 'string' ? stripOuterQuotes(metadata.generatedHeading) : null;
    const productHandles = Array.isArray(metadata.productHandles)
      ? metadata.productHandles.filter((x): x is string => typeof x === 'string')
      : null;
    const brandHandle =
      typeof metadata.brandHandle === 'string' && metadata.brandHandle.trim().length > 0
        ? metadata.brandHandle.trim()
        : null;
    const categoryCollectionHandle =
      typeof metadata.categoryCollectionHandle === 'string' &&
      metadata.categoryCollectionHandle.trim().length > 0
        ? metadata.categoryCollectionHandle.trim()
        : null;
    const isBrandAuto = metadata.autoType === 'brand';
    const isCategoryAuto = metadata.autoType === 'category';
    const isOnSaleAuto = metadata.autoType === 'on_sale';
    const logoUrl =
      typeof metadata.logoUrl === 'string' && metadata.logoUrl.trim().length > 0
        ? metadata.logoUrl.trim()
        : isBrandAuto
          ? AUTO_BRAND_LOGO_PLACEHOLDER
          : null;
    const ctaLabel =
      typeof metadata.ctaLabel === 'string' && metadata.ctaLabel.trim().length > 0
        ? metadata.ctaLabel.trim()
        : isBrandAuto && brandHandle
          ? `VIEW ALL ${brandLabelFromHandle(brandHandle)} PRODUCTS HERE`
          : isCategoryAuto && categoryCollectionHandle
            ? `VIEW ALL ${brandLabelFromHandle(categoryCollectionHandle)} HERE`
            : isOnSaleAuto
              ? ON_SALE_CTA_LABEL
              : undefined;
    const ctaUrl =
      typeof metadata.ctaUrl === 'string' && metadata.ctaUrl.trim().length > 0
        ? metadata.ctaUrl.trim()
        : isBrandAuto && brandHandle
          ? `${CAMPAIGN_SITE_URL}/brands/${brandHandle}`
          : isCategoryAuto && categoryCollectionHandle
            ? `${CAMPAIGN_SITE_URL}/${categoryCollectionHandle}`
            : isOnSaleAuto
              ? onSalePageUrlFromMapping(CAMPAIGN_SITE_URL)
              : undefined;
    const subjectLine =
      typeof metadata.subjectLine === 'string' && metadata.subjectLine.trim().length > 0
        ? metadata.subjectLine.trim()
        : templateVersion.subjectTemplate || 'The Equestrian';

    const html = await buildCampaignHtmlWithOverrides({
      blocks: templateVersion.blocks,
      templateMetadata: {
        ...(templateVersion.metadata || {}),
        ...(logoUrl ? { logoUrl } : {}),
      },
      overrides: {
        introText,
        generatedHeading,
        productHandles,
        ctaLabel,
        ctaUrl,
      },
      siteUrl: CAMPAIGN_SITE_URL,
    });
    const rendered = renderTemplateContent({
      subjectTemplate: subjectLine,
      htmlTemplate: html,
      variables: {
        siteUrl: CAMPAIGN_SITE_URL,
        email: to,
        customerName: '',
        unsubscribeUrl: `${CAMPAIGN_SITE_URL}/api/email/unsubscribe?token=preview-token`,
      },
    });

    await sendSesEmail({
      from: `The Equestrian <${process.env.SES_AWS_FROM_EMAIL || 'support@theequestrian.com.au'}>`,
      to: [to],
      subject: `[TEST] ${subjectLine}`,
      html: rendered.html,
    });

    return NextResponse.json({
      ok: true,
      campaignId: campaign.id,
      campaignName: campaign.name,
      to,
      subject: subjectLine,
      status: campaign.status,
    });
  } catch (error) {
    console.error('[campaign send-test] Failed:', error);
    return NextResponse.json({ error: 'Failed to send campaign test email' }, { status: 500 });
  }
}
