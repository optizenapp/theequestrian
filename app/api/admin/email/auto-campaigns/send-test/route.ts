import { NextRequest, NextResponse } from 'next/server';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import { getTemplateVersion } from '@/lib/email-platform/templates';
import { renderTemplateContent } from '@/lib/email-platform/templates';
import { sendSesEmail } from '@/lib/email-platform/ses-mailer';
import { generateAutoWeeklyIntro } from '@/lib/email-platform/auto-weekly/intro-generator';
import { generateAutoWeeklySubjectLine } from '@/lib/email-platform/auto-weekly/subject-line-generator';
import { generateAutoWeeklyHeading } from '@/lib/email-platform/auto-weekly/heading-generator';
import { buildCampaignHtmlWithOverrides } from '@/lib/email-platform/auto-weekly/render';
import { getAutoWeeklyFlowVersionId } from '@/lib/email-platform/auto-weekly/template';
import { getAutoWeeklySettings } from '@/lib/email-platform/auto-weekly/settings';
import { getAutoCampaignSelections, getAutoCampaignTemplatesByType } from '@/lib/email-platform/auto-campaigns/config';
import { selectProductHandlesForAutoType } from '@/lib/email-platform/auto-campaigns/select-handles';
import {
  HARDCODED_PROMPTS,
  ON_SALE_CTA_LABEL,
  buildBrandCampaignPrompts,
  buildCategoryCampaignPrompts,
  buildOnSaleCampaignPrompts,
  formatProductContextForIntro,
  formatProductTypesFromProducts,
  formatVendorsFromProducts,
  normalizeBrandDescriptionText,
  normalizeBrandHeading,
  normalizeBrandSubjectLine,
  normalizeCategoryDescriptionText,
  normalizeCategoryHeading,
  normalizeCategorySubjectLine,
  normalizeOnSaleDescriptionText,
  normalizeOnSaleHeading,
  normalizeOnSaleSubjectLine,
  onSalePageUrlFromMapping,
  toCategoryCtaLabel,
  toTitleCase,
} from '@/lib/email-platform/auto-campaigns/build-one';
import type { AutoCampaignSelections, AutoCampaignType } from '@/lib/email-platform/auto-campaigns/types';
import { getBrandContentByHandle } from '@/lib/content/brand-content';
import { getCollectionByHandle } from '@/lib/shopify/collections';
import type { CollectionWithParent } from '@/types/shopify';

function isType(value: unknown): value is AutoCampaignType {
  return value === 'brand' || value === 'on_sale' || value === 'category';
}

function parseSelectionOverride(body: Record<string, unknown>): AutoCampaignSelections | null {
  if (!body.selections || typeof body.selections !== 'object') return null;
  const selections = body.selections as Record<string, unknown>;
  return {
    brandHandle: typeof selections.brandHandle === 'string' && selections.brandHandle.trim()
      ? selections.brandHandle.trim()
      : null,
    categoryCollectionHandle:
      typeof selections.categoryCollectionHandle === 'string' && selections.categoryCollectionHandle.trim()
        ? selections.categoryCollectionHandle.trim()
        : null,
  };
}

const BRAND_LOGO_PLACEHOLDER = 'https://www.theequestrian.com.au/email-logo.png';
const CAMPAIGN_SITE_URL = 'https://www.theequestrian.com.au';
const ON_SALE_COLLECTION_HANDLE = 'on-sale';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    const type = body?.type;
    if (!to) return NextResponse.json({ error: 'Missing test email address' }, { status: 400 });
    if (!isType(type)) return NextResponse.json({ error: 'Missing or invalid campaign type' }, { status: 400 });

    const scheduledAt = new Date();
    const weekly = await getAutoWeeklySettings();
    const templatesByType = await getAutoCampaignTemplatesByType();
    const typedVersion = type === 'brand' ? templatesByType.brand : type === 'on_sale' ? templatesByType.on_sale : templatesByType.category;
    const versionId = (typedVersion && typedVersion.trim()) || weekly.templateVersionId || (await getAutoWeeklyFlowVersionId());
    if (!versionId) return NextResponse.json({ error: 'No template version configured' }, { status: 400 });

    const selections = parseSelectionOverride(body) ?? (await getAutoCampaignSelections());
    const brandHandle = type === 'brand' ? selections.brandHandle : null;
    const collectionHandle = type === 'category' ? selections.categoryCollectionHandle : null;
    if (type === 'brand' && !brandHandle) {
      return NextResponse.json({ error: 'No brand selected for brand campaign' }, { status: 400 });
    }
    if (type === 'category' && !collectionHandle) {
      return NextResponse.json({ error: 'No category selected for category campaign' }, { status: 400 });
    }
    if (type === 'category' && collectionHandle === ON_SALE_COLLECTION_HANDLE) {
      return NextResponse.json({ error: 'On-sale cannot be selected for category campaigns' }, { status: 400 });
    }
    let handles = await selectProductHandlesForAutoType(type, {
      brandHandle,
      collectionHandle,
      scheduledAt,
    });
    if (handles.length === 0) return NextResponse.json({ error: 'No products found for test email' }, { status: 400 });

    const products = await getProductsByHandles(handles);
    let productContext = formatProductContextForIntro(products);
    if (type === 'brand' && brandHandle) productContext = `Brand page: /brands/${brandHandle}\n${productContext}`;
    if (type === 'category' && collectionHandle) productContext = `Category collection: ${collectionHandle}\n${productContext}`;
    if (type === 'on_sale') productContext = `Focus: on-sale products.\n${productContext}`;

    let categoryCollection: CollectionWithParent | null = null;
    if (type === 'category' && collectionHandle) {
      categoryCollection = await getCollectionByHandle(collectionHandle, 24);
    }

    const brandContent = type === 'brand' && brandHandle ? await getBrandContentByHandle(brandHandle) : null;
    const brandTitle = type === 'brand' && brandHandle ? brandContent?.title || brandHandle : '';
    const brandCollection =
      type === 'brand' && brandHandle ? await getCollectionByHandle(brandHandle, 1) : null;
    const brandLogoUrl =
      type === 'brand' ? brandCollection?.image?.url || BRAND_LOGO_PLACEHOLDER : null;
    const brandPromptPack =
      type === 'brand' && brandHandle
        ? buildBrandCampaignPrompts({ brandHandle, brandTitle, brandContent })
        : null;
    const categoryDisplayName =
      type === 'category' && collectionHandle
        ? categoryCollection?.title?.trim() || toTitleCase(collectionHandle.replace(/-/g, ' '))
        : '';
    const categoryPromptPack =
      type === 'category' && collectionHandle
        ? buildCategoryCampaignPrompts({
            categoryHandle: collectionHandle,
            categoryDisplayName,
            collectionDescription: categoryCollection?.description || '',
            productContext,
            vendorsFromProducts: formatVendorsFromProducts(products),
          })
        : null;
    const onSalePromptPack =
      type === 'on_sale'
        ? buildOnSaleCampaignPrompts({
            onSalePageUrl: onSalePageUrlFromMapping(CAMPAIGN_SITE_URL),
            productContext,
            vendorsFromProducts: formatVendorsFromProducts(products),
            productTypesFromProducts: formatProductTypesFromProducts(products),
          })
        : null;
    const prompt = HARDCODED_PROMPTS[type];
    const introPrompt =
      brandPromptPack?.introPrompt ||
      categoryPromptPack?.introPrompt ||
      onSalePromptPack?.introPrompt ||
      prompt.introPrompt;
    const subjectPrompt =
      brandPromptPack?.subjectPrompt ||
      categoryPromptPack?.subjectPrompt ||
      onSalePromptPack?.subjectPrompt ||
      prompt.subjectPrompt;
    const headingPrompt =
      brandPromptPack?.headingPrompt ||
      categoryPromptPack?.headingPrompt ||
      onSalePromptPack?.headingPrompt ||
      prompt.headingPrompt;
    const [introText, subjectLine, heading] = await Promise.all([
      generateAutoWeeklyIntro({ sendDate: scheduledAt.toISOString(), productContext }, introPrompt),
      generateAutoWeeklySubjectLine({ sendDate: scheduledAt.toISOString(), productContext }, subjectPrompt),
      generateAutoWeeklyHeading({ sendDate: scheduledAt.toISOString(), productContext }, headingPrompt),
    ]);
    const finalIntroText =
      type === 'brand'
        ? normalizeBrandDescriptionText(introText || '')
        : type === 'category'
          ? normalizeCategoryDescriptionText(introText || '')
          : type === 'on_sale'
            ? normalizeOnSaleDescriptionText(introText || '')
            : introText;
    const finalSubjectLine =
      type === 'brand'
        ? normalizeBrandSubjectLine(subjectLine || '')
        : type === 'category'
          ? normalizeCategorySubjectLine(subjectLine || '')
          : type === 'on_sale'
            ? normalizeOnSaleSubjectLine(subjectLine || '')
            : subjectLine;
    const finalHeading =
      type === 'brand' && heading
        ? normalizeBrandHeading(heading)
        : type === 'category' && heading
          ? normalizeCategoryHeading(heading)
          : type === 'on_sale' && heading
            ? normalizeOnSaleHeading(heading)
            : heading;

    const templateVersion = await getTemplateVersion(versionId);
    if (!templateVersion) return NextResponse.json({ error: 'Template version not found' }, { status: 404 });
    const html = await buildCampaignHtmlWithOverrides({
      blocks: templateVersion.blocks,
      templateMetadata: {
        ...(templateVersion.metadata || {}),
        ...(brandLogoUrl ? { logoUrl: brandLogoUrl } : {}),
      },
      overrides: {
        introText: finalIntroText,
        generatedHeading: finalHeading || undefined,
        productHandles: handles,
        ...(type === 'brand' && brandTitle
          ? {
              ctaLabel: `VIEW ALL ${brandTitle.toUpperCase()} PRODUCTS HERE`,
              ctaUrl: `${CAMPAIGN_SITE_URL}/brands/${brandHandle}`,
            }
          : {}),
        ...(type === 'category' && collectionHandle
          ? {
              ctaLabel: toCategoryCtaLabel(categoryDisplayName),
              ctaUrl: `${CAMPAIGN_SITE_URL}/${collectionHandle}`,
            }
          : {}),
        ...(type === 'on_sale'
          ? {
              ctaLabel: ON_SALE_CTA_LABEL,
              ctaUrl: onSalePageUrlFromMapping(CAMPAIGN_SITE_URL),
            }
          : {}),
      },
      siteUrl: CAMPAIGN_SITE_URL,
    });
    const rendered = renderTemplateContent({
      subjectTemplate: finalSubjectLine,
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
      subject: `[TEST][AUTO ${type}] ${finalSubjectLine}`,
      html: rendered.html,
    });

    return NextResponse.json({
      ok: true,
      to,
      type,
      subjectLine: finalSubjectLine,
      productHandles: handles,
      introText: finalIntroText,
      ...(brandHandle ? { brandHandle } : {}),
      ...(brandTitle ? { brandTitle } : {}),
      ...(type === 'category' && collectionHandle ? { categoryCollectionHandle: collectionHandle } : {}),
    });
  } catch (error) {
    console.error('[auto-campaigns send-test] Failed:', error);
    return NextResponse.json({ error: 'Failed to send auto campaign test email' }, { status: 500 });
  }
}
