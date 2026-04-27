import { sql } from '@vercel/postgres';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import type { EmailBlock } from '@/lib/email-platform/types';
import { getTemplateVersion } from '@/lib/email-platform/templates';
import { getAutoWeeklySettings, isAutoWeeklyFlowEnabled } from '@/lib/email-platform/auto-weekly/settings';
import {
  ensureAutoOnSaleFlowTemplate,
  ensureAutoWeeklyFlowTemplate,
  getAutoWeeklyFlowVersionId,
} from '@/lib/email-platform/auto-weekly/template';
import { generateAutoWeeklyIntro } from '@/lib/email-platform/auto-weekly/intro-generator';
import { generateAutoWeeklySubjectLine } from '@/lib/email-platform/auto-weekly/subject-line-generator';
import { generateAutoWeeklyHeading } from '@/lib/email-platform/auto-weekly/heading-generator';
import { sendSesEmail } from '@/lib/email-platform/ses-mailer';
import { getBrandContentByHandle } from '@/lib/content/brand-content';
import { getCollectionByHandle } from '@/lib/shopify/collections';
import type { CollectionWithParent } from '@/types/shopify';
import {
  getAutoCampaignCategoryPool,
  getAutoCampaignEnabledTypes,
  getAutoCampaignRotation,
  getAutoCampaignSlots,
  getAutoCampaignTemplatesByType,
  setAutoCampaignRotation,
} from './config';
import { listSeoReadyBrandHandles, pickRotated } from './eligible-brands';
import { selectProductHandlesForAutoType } from './select-handles';
import type { AutoCampaignType } from './types';
import type { BrandContentRow } from '@/lib/content/brand-content';
import { getSalePageByPath } from '@/lib/mapping/sale-mapping';

const APPROVAL_EMAIL = 'jono@theequestrian.com.au';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';
const ADMIN_AUTO_URL = `${SITE_URL}/admin/email/auto-campaigns`;
const ADMIN_CAMPAIGNS_URL = `${SITE_URL}/admin/email/campaigns`;
const CAMPAIGN_SITE_URL = 'https://www.theequestrian.com.au';
const BRAND_LOGO_PLACEHOLDER = 'https://www.theequestrian.com.au/email-logo.png';
export const HARDCODED_PROMPTS: Record<AutoCampaignType, { introPrompt: string; subjectPrompt: string; headingPrompt: string }> = {
  brand: {
    introPrompt:
      'Write 3-4 factual sentences for a brand sale email body with: 1) origin line, 2) growth line, 3) positioning line. Australian English. No hype, no rhetorical questions, no exclamation marks, no footer/sign-off.',
    subjectPrompt:
      'Write one straightforward subject line under 50 characters that includes the brand name and mentions sale/savings. No emojis and no ALL CAPS words.',
    headingPrompt: 'Write a one-line hero heading with the brand name prominent.',
  },
  on_sale: {
    introPrompt:
      'Write a short intro about limited-time equestrian savings and value. Mention urgency naturally and use only details from the product context.',
    subjectPrompt:
      'Write one concise subject line focused on equestrian sale products and savings. Keep it under 8 words where possible.',
    headingPrompt: 'Write a short heading for a sale-focused equestrian picks email.',
  },
  category: {
    introPrompt:
      'Write a short intro focused on this equestrian category and why these picks matter for riders. Keep tone helpful and expert.',
    subjectPrompt:
      'Write one concise subject line focused on this equestrian category collection and best picks.',
    headingPrompt: 'Write a short heading for this equestrian category showcase.',
  },
};

const CATEGORY_BANNED_WORDS =
  'elevate, game-changer, must-have, discover, unlock, unleash, curated, boasts, excited to announce, look no further, premium quality, top-notch, step up your game';

const ON_SALE_EXTRA_BANNED_WORDS =
  'massive sale, huge savings, unbeatable, limited time, selling fast, don\'t miss out, hurry, while stocks last';

const ON_SALE_BANNED_WORDS = `${CATEGORY_BANNED_WORDS}, ${ON_SALE_EXTRA_BANNED_WORDS}`;

/** Fixed CTA label for sitewide on-sale campaigns (on-sale-campaign-prompt spec). */
export const ON_SALE_CTA_LABEL = 'VIEW ALL SALE ITEMS HERE';

export function onSalePageUrlFromMapping(siteBase: string): string {
  const path = getSalePageByPath('/on-sale')?.url_path || '/on-sale';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteBase.replace(/\/$/, '')}${normalized}`;
}

function compactText(value: string | null | undefined, max = 500): string {
  if (!value) return '';
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function normalizeBrandSubjectLine(input: string): string {
  const unquoted = input.trim().replace(/^["'“”]+/, '').replace(/["'“”]+$/, '');
  const noTrailingPunctuation = unquoted.replace(/[.!?]+$/, '').trim();
  return toTitleCase(noTrailingPunctuation);
}

export function normalizeBrandDescriptionText(input: string): string {
  const strippedGreeting = input.trim().replace(/^hey there[:,]?\s*/i, '');
  const singleSpaced = strippedGreeting.replace(/\s+/g, ' ').trim();
  const sentences = singleSpaced.match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  return sentences.join('\n\n');
}

export function normalizeBrandHeading(input: string): string {
  return input.trim().replace(/^["'“”]+/, '').replace(/["'“”]+$/, '').trim();
}

function toBrandCtaLabel(brandTitle: string): string {
  return `VIEW ALL ${brandTitle.toUpperCase()} PRODUCTS HERE`;
}

function stripOuterQuotes(value: string): string {
  return value.trim().replace(/^["'“”]+/, '').replace(/["'“”]+$/, '').trim();
}

export function toCategoryCtaLabel(categoryDisplayName: string): string {
  const t = categoryDisplayName.trim().replace(/\s+/g, ' ');
  if (!t) return 'VIEW ALL CATEGORY PRODUCTS HERE';
  return `VIEW ALL ${t.toUpperCase()} HERE`;
}

function clampSubjectUnder50Chars(input: string): string {
  let s = stripOuterQuotes(input);
  s = s.replace(/[.!?]+$/, '').trim();
  if (s.length > 50) {
    s = s.slice(0, 50);
    const lastSpace = s.lastIndexOf(' ');
    if (lastSpace > 35) s = s.slice(0, lastSpace).trimEnd();
  }
  return s;
}

export function normalizeCategorySubjectLine(input: string): string {
  const cleaned = clampSubjectUnder50Chars(input);
  return cleaned ? toTitleCase(cleaned) : cleaned;
}

export function normalizeOnSaleSubjectLine(input: string): string {
  const cleaned = clampSubjectUnder50Chars(input);
  return cleaned ? toTitleCase(cleaned) : cleaned;
}

export function normalizeCategoryDescriptionText(input: string): string {
  const singleSpaced = input.trim().replace(/\s+/g, ' ').trim();
  const sentences =
    singleSpaced.match(/[^.!?]+[.!?]?/g)?.map((x) => x.trim()).filter(Boolean) ?? [];
  if (sentences.length <= 3) return sentences.join('\n\n');
  return sentences.slice(0, 3).join('\n\n');
}

export function normalizeCategoryHeading(input: string): string {
  return normalizeBrandHeading(input);
}

export function formatProductTypesFromProducts(
  products: Array<{ productType?: string | null }>
): string {
  const seen = new Set<string>();
  for (const p of products) {
    const t = p.productType?.trim();
    if (t) seen.add(t);
  }
  return Array.from(seen)
    .slice(0, 10)
    .map((t) => t.trim())
    .filter(Boolean)
    .join(', ');
}

export function formatVendorsFromProducts(
  products: Array<{ vendor?: string | null }>
): string {
  const seen = new Set<string>();
  for (const p of products) {
    const v = p.vendor?.trim();
    if (v) seen.add(v);
  }
  return Array.from(seen)
    .slice(0, 12)
    .map((v) => v.trim())
    .filter(Boolean)
    .join(', ');
}

/** Category sale campaign prompts (aligned with category-campaign-prompt spec). */
export function buildCategoryCampaignPrompts(input: {
  categoryHandle: string;
  categoryDisplayName: string;
  collectionDescription: string;
  productContext: string;
  vendorsFromProducts: string;
}): { introPrompt: string; subjectPrompt: string; headingPrompt: string } {
  const sitePath = `https://www.theequestrian.com.au/${input.categoryHandle}`;
  const baseContext = [
    `Category URL (public page): ${sitePath}`,
    `Category display name: ${input.categoryDisplayName}`,
    input.collectionDescription
      ? `Collection / category description from store (reference only; do not invent features not grounded here):\n${compactText(input.collectionDescription, 700)}`
      : '',
    input.vendorsFromProducts
      ? `Brands (vendors) represented among the selected on-sale products for this email: ${input.vendorsFromProducts}`
      : '',
    'Selected products for this email (reference only; stay factual):',
    input.productContext,
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    subjectPrompt: [
      'You are writing a subject line for The Equestrian (theequestrian.com.au), an Australian equestrian retailer.',
      `Context:\n${baseContext}`,
      'Write ONE email subject line only (no quotes, no JSON).',
      'Rules:',
      '- Max 50 characters',
      '- Must reference the category and the sale or savings',
      '- No emojis',
      '- No ALL CAPS words',
      '- Straightforward — what is marked down',
      '- Australian English spelling',
    ].join('\n'),
    headingPrompt: [
      'You are writing the page/email title line for The Equestrian.',
      `Context:\n${baseContext}`,
      'Write ONE line only: the email/page title (no quotes, no JSON).',
      'Rules:',
      '- Plain, searchable wording describing the category',
      '- May reference a mix of brands or regions stocked (Australian, European, etc.) when supported by context',
      '- No hype words, no rhetorical questions, no exclamation marks',
      '- Reads like a useful label, not marketing fluff',
    ].join('\n'),
    introPrompt: [
      'You are writing the body copy for The Equestrian (theequestrian.com.au), an Australian equestrian retailer.',
      `Context:\n${baseContext}`,
      'Write the category description block only (no subject, no title line, no CTA, no footer, no sign-off, no JSON).',
      'Exactly 3 sentences with these jobs:',
      'Sentence 1 — What is on sale: state the category, that items are marked down, and name 3–5 brands using "like" or "including". Keep factual.',
      'Sentence 2 — Why these products are worth a look: practical use cases and standout features across the category (grip, fabric, fit, durability, weather protection, etc.). Be specific; no generic praise.',
      'Sentence 3 — Low-pressure nudge: casual close, good timing, no countdown, no "don\'t miss out", no pressure.',
      'Rules:',
      '- Write like a knowledgeable mate; relaxed and helpful; zero fluff',
      `- Never use these words: ${CATEGORY_BANNED_WORDS}`,
      '- No rhetorical questions',
      '- No exclamation marks in the description',
      '- Keep sentences under 35 words each where possible',
      '- Australian English spelling (colour, favourite, etc.)',
      '- Only reference brands/features that appear in the context above — do not invent specs',
    ].join('\n'),
  };
}

/** Sitewide on-sale campaign prompts (aligned with on-sale-campaign-prompt spec). */
export function buildOnSaleCampaignPrompts(input: {
  onSalePageUrl: string;
  productContext: string;
  vendorsFromProducts: string;
  productTypesFromProducts: string;
}): { introPrompt: string; subjectPrompt: string; headingPrompt: string } {
  const baseContext = [
    `Public on-sale page (source of truth for what is marked down): ${input.onSalePageUrl}`,
    input.productTypesFromProducts
      ? `Product types / categories represented in the selected on-sale sample: ${input.productTypesFromProducts}`
      : '',
    input.vendorsFromProducts
      ? `Brands (vendors) in the selected on-sale products: ${input.vendorsFromProducts}`
      : '',
    'Selected on-sale products for this email (reference only; stay factual):',
    input.productContext,
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    subjectPrompt: [
      'You are writing a subject line for The Equestrian (theequestrian.com.au), an Australian equestrian retailer.',
      `Context:\n${baseContext}`,
      'Write ONE email subject line only (no quotes, no JSON).',
      'Rules:',
      '- Max 50 characters',
      '- Reference the breadth of the sale (sitewide / many categories and brands), not a single brand or niche category',
      '- No emojis',
      '- No ALL CAPS words',
      '- Straightforward',
      '- Australian English spelling',
    ].join('\n'),
    headingPrompt: [
      'You are writing the page/email title line for The Equestrian.',
      `Context:\n${baseContext}`,
      'Write ONE line only: specific, descriptive title for the selected sale products in this email (no quotes, no JSON).',
      'Rules:',
      '- Must be grounded in the selected product list, not vendors or generic sitewide sale wording',
      '- Mention 2-3 concrete product types or product names from the selected products when possible',
      '- Do not discuss vendors/brands unless the product name itself includes that brand',
      '- Do not say "across the site"',
      '- Reads like a useful summary, not a hype headline',
      '- No hype words, no rhetorical questions, no exclamation marks',
    ].join('\n'),
    introPrompt: [
      'You are writing the body copy for The Equestrian (theequestrian.com.au), an Australian equestrian retailer.',
      `Context:\n${baseContext}`,
      'Write the short intro text block only (no subject, no title line, no product list, no CTA, no footer, no sign-off, no JSON).',
      'Write 1 short sentence in the style: "Check out our latest on-sale products designed for both you and your horse."',
      'Rules:',
      '- Write like a knowledgeable mate; relaxed and helpful; zero fluff',
      `- Never use these words/phrases: ${ON_SALE_BANNED_WORDS}`,
      '- No rhetorical questions',
      '- No exclamation marks in the description',
      '- No scarcity or urgency tactics (no countdown, "limited time", "selling fast", "don\'t miss out", "hurry")',
      '- Australian English spelling (colour, favourite, etc.)',
      '- Do not start with "Hey there"',
      '- Do not use generic phrases like "a range of items across the site"',
      '- Do not discuss vendors; the product cards carry the product detail',
    ].join('\n'),
  };
}

export function normalizeOnSaleDescriptionText(input: string): string {
  const singleSpaced = input.trim().replace(/\s+/g, ' ').trim();
  const sentences =
    singleSpaced.match(/[^.!?]+[.!?]?/g)?.map((x) => x.trim()).filter(Boolean) ?? [];
  if (sentences.length <= 4) return sentences.join('\n\n');
  return sentences.slice(0, 4).join('\n\n');
}

export function normalizeOnSaleHeading(input: string): string {
  return normalizeBrandHeading(input);
}

function buildBrandFactsContext(brandHandle: string, brandTitle: string, brandContent: BrandContentRow | null): string {
  const lines = [
    `Brand handle: ${brandHandle}`,
    `Brand name: ${brandTitle}`,
    `Brand short description: ${compactText(brandContent?.short_description, 400)}`,
    `Brand long description: ${compactText(brandContent?.long_description, 700)}`,
    `Brand quick answer: ${compactText(brandContent?.quick_answer, 280)}`,
  ].filter((x) => !x.endsWith(': '));
  return lines.join('\n');
}

export function buildBrandCampaignPrompts(input: {
  brandHandle: string;
  brandTitle: string;
  brandContent: BrandContentRow | null;
}): { introPrompt: string; subjectPrompt: string; headingPrompt: string; brandFacts: string } {
  const brandFacts = buildBrandFactsContext(input.brandHandle, input.brandTitle, input.brandContent);
  return {
    introPrompt: [
      `Brand context for this campaign:\n${brandFacts}`,
      'Write the brand description block for The Equestrian.',
      'Rules:',
      '- 3-4 sentences max',
      '- sentence 1: origin line',
      '- sentence 2: growth/expansion line',
      '- sentence 3: positioning line compared to relevant equestrian brands',
      '- Australian English spelling',
      '- No hype words, no rhetorical questions, no exclamation marks',
      '- Keep tone factual and practical',
      '- Do not write sign-off, CTA, or footer copy',
    ].join('\n'),
    subjectPrompt: [
      `Brand context for this campaign:\n${brandFacts}`,
      `Write one subject line for ${input.brandTitle}.`,
      'Rules:',
      '- under 50 characters',
      '- must mention sale or savings',
      '- include the brand name',
      '- no emojis',
      '- no ALL CAPS words',
      '- straightforward and factual',
    ].join('\n'),
    headingPrompt: [
      `Brand context for this campaign:\n${brandFacts}`,
      `Write one short hero heading for ${input.brandTitle}.`,
      'Rules:',
      '- one line only',
      '- brand name prominent',
      '- concise, no fluff',
    ].join('\n'),
    brandFacts,
  };
}

function getTomorrowInSydney(): Date {
  const utc = new Date();
  const sydneyDate = new Date(utc.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const tomorrow = new Date(sydneyDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

function slotTimeUTC(tomorrow: Date, hour: number): Date {
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  const h = String(hour).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T${h}:00:00+10:00`);
}

function formatLabel(tomorrow: Date, hour: number): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = tomorrow.getDay();
  const year = tomorrow.getFullYear();
  return `${dayNames[day]} ${tomorrow.getDate()} ${tomorrow.toLocaleString('en-AU', { month: 'short' })} ${year} at ${hour}:00 AEST`;
}

async function getAllListIds(): Promise<string[]> {
  const result = await sql`SELECT id FROM email_lists ORDER BY created_at ASC`;
  return result.rows.map((r) => r.id as string);
}

export function formatProductContextForIntro(
  products: Array<{
    title?: string | null;
    vendor?: string | null;
    priceRange?: { minVariantPrice?: { amount?: string } };
    compareAtPriceRange?: { minVariantPrice?: { amount?: string } };
  }>
): string {
  return products
    .map((p, i) => {
      const title = p.title || 'Product';
      const price = p.priceRange?.minVariantPrice?.amount;
      const compareAt = p.compareAtPriceRange?.minVariantPrice?.amount;
      const priceStr = price ? `$${parseFloat(price).toFixed(2)}` : '';
      let saleStr = '';
      if (compareAt && price && parseFloat(compareAt) > parseFloat(price)) {
        const pct = Math.round((1 - parseFloat(price) / parseFloat(compareAt)) * 100);
        saleStr = ` (was $${parseFloat(compareAt).toFixed(2)}, Save ${pct}%)`;
      }
      const vendor = p.vendor ? ` | ${p.vendor}` : '';
      return `Product ${i + 1}: ${title} - ${priceStr}${saleStr}${vendor}`;
    })
    .join('\n');
}

export type BuildResult = {
  campaignId: string | null;
  scheduledAt: Date | null;
  label: string | null;
  approvalEmailSent: boolean;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  autoType?: AutoCampaignType | null;
};

type BuildNextSlotOptions = {
  typeOverride?: AutoCampaignType;
  sendApprovalEmail?: boolean;
  scheduledAtOverride?: Date;
};

export async function buildAutoCampaignForNextSlot(options: BuildNextSlotOptions = {}): Promise<BuildResult> {
  const { typeOverride, sendApprovalEmail = true, scheduledAtOverride } = options;
  const enabled = await isAutoWeeklyFlowEnabled();
  if (!enabled) {
    return {
      campaignId: null,
      scheduledAt: null,
      label: null,
      approvalEmailSent: false,
      skipped: true,
      skipReason: 'Auto campaigns flow is disabled',
    };
  }

  const tomorrow = getTomorrowInSydney();
  const slots = await getAutoCampaignSlots();
  let type: AutoCampaignType;
  let scheduledAt: Date;
  let label: string;
  if (typeOverride && scheduledAtOverride) {
    type = typeOverride;
    scheduledAt = scheduledAtOverride;
    const sydney = new Date(scheduledAt.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
    label = formatLabel(sydney, sydney.getHours());
  } else {
    const tomorrowSlots = slots.filter((s) => s.weekday === tomorrow.getDay());
    const slotDef = typeOverride
      ? tomorrowSlots.find((s) => s.type === typeOverride)
      : tomorrowSlots[0];
    if (!slotDef) {
      const reason = typeOverride
        ? `No ${typeOverride} send slot tomorrow`
        : 'No send slot tomorrow';
      return { campaignId: null, scheduledAt: null, label: null, approvalEmailSent: false, skipped: true, skipReason: reason };
    }
    scheduledAt = slotTimeUTC(tomorrow, slotDef.hour);
    label = formatLabel(tomorrow, slotDef.hour);
    type = slotDef.type;
  }
  const enabledTypes = await getAutoCampaignEnabledTypes();
  if (!enabledTypes[type]) {
    return {
      campaignId: null,
      scheduledAt,
      label,
      approvalEmailSent: false,
      skipped: true,
      skipReason: `${type} campaigns are disabled`,
      autoType: type,
    };
  }

  const dup = await sql`
    SELECT id FROM email_campaigns
    WHERE created_by IN ('auto-weekly', 'auto-campaign')
      AND scheduled_at = ${scheduledAt.toISOString()}
      AND (metadata->>'autoType') = ${type}
    LIMIT 1
  `;
  if (dup.rows[0]) {
    return {
      campaignId: null,
      scheduledAt,
      label,
      approvalEmailSent: false,
      skipped: true,
      skipReason: 'Campaign already built for this slot',
      autoType: type,
    };
  }

  const rotation = await getAutoCampaignRotation();
  const brands = await listSeoReadyBrandHandles();
  const categoryPool = await getAutoCampaignCategoryPool();

  let brandHandle: string | null = null;
  let categoryCollectionHandle: string | null = null;
  let brandLogoUrl: string | null = null;
  let categoryRotationOffset = 0;
  let handles: string[] = [];

  if (type === 'brand') {
    brandHandle = pickRotated(brands, rotation.brandIndex);
    if (!brandHandle) {
      return { campaignId: null, scheduledAt, label, approvalEmailSent: false, error: 'No SEO-ready brands found', autoType: type };
    }
    const brandCollection = await getCollectionByHandle(brandHandle, 1);
    brandLogoUrl = brandCollection?.image?.url || BRAND_LOGO_PLACEHOLDER;
  } else if (type === 'category') {
    if (categoryPool.length === 0) {
      return { campaignId: null, scheduledAt, label, approvalEmailSent: false, error: 'Category pool empty', autoType: type };
    }
    for (let offset = 0; offset < categoryPool.length; offset += 1) {
      const candidate = pickRotated(categoryPool, rotation.categoryIndex + offset);
      if (!candidate) continue;
      const candidateHandles = await selectProductHandlesForAutoType(type, {
        brandHandle: null,
        collectionHandle: candidate,
        scheduledAt,
      });
      if (candidateHandles.length === 0) continue;
      categoryCollectionHandle = candidate;
      categoryRotationOffset = offset;
      handles = candidateHandles;
      break;
    }
    if (!categoryCollectionHandle) {
      return {
        campaignId: null,
        scheduledAt,
        label,
        approvalEmailSent: false,
        error: 'No products found for any category in pool',
        autoType: type,
      };
    }
  }

  let categoryCollection: CollectionWithParent | null = null;
  if (type === 'category' && categoryCollectionHandle) {
    categoryCollection = await getCollectionByHandle(categoryCollectionHandle, 24);
  }

  const brandContent = brandHandle ? await getBrandContentByHandle(brandHandle) : null;
  const brandTitle = brandHandle ? brandContent?.title || brandHandle : '';
  const weekly = await getAutoWeeklySettings();
  const templatesByType = await getAutoCampaignTemplatesByType();
  const typeKey = type === 'on_sale' ? 'on_sale' : type;
  const typedVersion =
    typeKey === 'brand'
      ? templatesByType.brand
      : typeKey === 'on_sale'
        ? templatesByType.on_sale
        : templatesByType.category;

  let versionId =
    (typeof typedVersion === 'string' && typedVersion.trim() ? typedVersion.trim() : null) ||
    (type === 'on_sale' ? (await ensureAutoOnSaleFlowTemplate())?.versionId ?? null : null) ||
    weekly.templateVersionId ||
    (await getAutoWeeklyFlowVersionId());
  if (!versionId) {
    const template = await ensureAutoWeeklyFlowTemplate();
    versionId = template?.versionId ?? null;
  }
  if (!versionId) {
    return {
      campaignId: null,
      scheduledAt,
      label,
      approvalEmailSent: false,
      error: 'No template selected. Configure template in Auto Campaigns or Email settings.',
      autoType: type,
    };
  }

  if (handles.length === 0) {
    handles = await selectProductHandlesForAutoType(type, {
      brandHandle,
      collectionHandle: categoryCollectionHandle,
      scheduledAt,
    });
  }
  if (handles.length === 0) {
    return { campaignId: null, scheduledAt, label, approvalEmailSent: false, error: 'No products found for campaign', autoType: type };
  }

  const templateVersion = await getTemplateVersion(versionId);
  if (!templateVersion) {
    return {
      campaignId: null,
      scheduledAt,
      label,
      approvalEmailSent: false,
      error: 'Template version not found',
      autoType: type,
    };
  }

  const blocks = templateVersion.blocks ?? [];
  const templateMetadata = (templateVersion.metadata ?? {}) as Record<string, unknown>;
  const subjectPromptFromTemplate =
    typeof templateMetadata.subjectPrompt === 'string' && templateMetadata.subjectPrompt.trim()
      ? templateMetadata.subjectPrompt.trim()
      : null;
  const hardcoded = HARDCODED_PROMPTS[type];

  const llmIntroBlock = blocks.find((b): b is Extract<EmailBlock, { type: 'llmIntro' }> => b.type === 'llmIntro');
  const introPromptOverride = llmIntroBlock?.prompt?.trim() || null;
  const llmHeadingBlock = blocks.find((b): b is Extract<EmailBlock, { type: 'llmHeading' }> => b.type === 'llmHeading');
  const headingBlock = blocks.find((b): b is Extract<EmailBlock, { type: 'heading' }> => b.type === 'heading');

  const brandPromptPack =
    type === 'brand' && brandHandle
      ? buildBrandCampaignPrompts({
          brandHandle,
          brandTitle,
          brandContent,
        })
      : null;

  const products = await getProductsByHandles(handles);
  let productContext = formatProductContextForIntro(products);
  const extraContext =
    type === 'brand' && brandHandle
      ? `Brand page: /brands/${brandHandle}`
      : type === 'category' && categoryCollectionHandle
        ? `Category collection: ${categoryCollectionHandle}`
        : type === 'on_sale'
          ? 'Focus: on-sale products.'
          : '';
  if (extraContext) productContext = `${extraContext}\n${productContext}`;

  const vendorsLine = formatVendorsFromProducts(products);
  const categoryDisplayName =
    type === 'category' && categoryCollectionHandle
      ? categoryCollection?.title?.trim() || toTitleCase(categoryCollectionHandle.replace(/-/g, ' '))
      : '';
  const categoryPromptPack =
    type === 'category' && categoryCollectionHandle
      ? buildCategoryCampaignPrompts({
          categoryHandle: categoryCollectionHandle,
          categoryDisplayName,
          collectionDescription: categoryCollection?.description || '',
          productContext,
          vendorsFromProducts: vendorsLine,
        })
      : null;

  const onSalePromptPack =
    type === 'on_sale'
      ? buildOnSaleCampaignPrompts({
          onSalePageUrl: onSalePageUrlFromMapping(CAMPAIGN_SITE_URL),
          productContext,
          vendorsFromProducts: vendorsLine,
          productTypesFromProducts: formatProductTypesFromProducts(products),
        })
      : null;

  const subjectPromptToUse =
    subjectPromptFromTemplate ??
    (brandPromptPack?.subjectPrompt ||
      categoryPromptPack?.subjectPrompt ||
      onSalePromptPack?.subjectPrompt ||
      hardcoded.subjectPrompt);

  const introPromptToUse =
    introPromptOverride ??
    (brandPromptPack?.introPrompt ||
      categoryPromptPack?.introPrompt ||
      onSalePromptPack?.introPrompt ||
      hardcoded.introPrompt);

  const headingPromptToUse =
    llmHeadingBlock?.prompt?.trim() ||
    brandPromptPack?.headingPrompt ||
    categoryPromptPack?.headingPrompt ||
    onSalePromptPack?.headingPrompt ||
    hardcoded.headingPrompt;

  const [introText, subjectLine] = await Promise.all([
    generateAutoWeeklyIntro({ sendDate: label, productContext }, introPromptToUse),
    generateAutoWeeklySubjectLine({ sendDate: label, productContext }, subjectPromptToUse),
  ]);
  const headingPromptWithSubject = [
    headingPromptToUse,
    '',
    `Generated subject line for this campaign: ${subjectLine || '(none)'}`,
    'The H2 heading must be different from the subject line. Do not reuse the same wording; write a complementary title for the email body.',
  ].join('\n');
  const generatedHeadingResult =
    llmHeadingBlock || headingBlock
      ? await generateAutoWeeklyHeading({ sendDate: label, productContext }, headingPromptWithSubject)
      : null;
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
  const generatedHeadingRaw = generatedHeadingResult?.trim() || null;
  const generatedHeading =
    type === 'brand' && generatedHeadingRaw
      ? normalizeBrandHeading(generatedHeadingRaw)
      : type === 'category' && generatedHeadingRaw
        ? normalizeCategoryHeading(generatedHeadingRaw)
        : type === 'on_sale' && generatedHeadingRaw
          ? normalizeOnSaleHeading(generatedHeadingRaw)
          : generatedHeadingRaw;

  const hasAudience =
    (weekly.audience.listIds?.length ?? 0) > 0 || (weekly.audience.segmentIds?.length ?? 0) > 0;
  const listIds = hasAudience ? (weekly.audience.listIds ?? []) : await getAllListIds();
  const segmentIds = hasAudience ? (weekly.audience.segmentIds ?? []) : [];

  const nameParts =
    type === 'brand'
      ? `Brand — ${brandTitle}`
      : type === 'on_sale'
        ? 'On sale picks'
        : `Category — ${categoryCollectionHandle}`;
  const name = `Auto: ${nameParts} – ${label}`;

  const metadata: Record<string, unknown> = {
    autoType: type,
    introText: finalIntroText,
    subjectLine: finalSubjectLine,
    productHandles: handles,
    siteUrl: CAMPAIGN_SITE_URL,
    ...(type === 'brand' && brandTitle
      ? {
          ctaLabel: toBrandCtaLabel(brandTitle),
          ctaUrl: `${CAMPAIGN_SITE_URL}/brands/${brandHandle}`,
        }
      : {}),
    ...(type === 'category' && categoryCollectionHandle
      ? {
          ctaLabel: toCategoryCtaLabel(categoryDisplayName),
          ctaUrl: `${CAMPAIGN_SITE_URL}/${categoryCollectionHandle}`,
        }
      : {}),
    ...(type === 'on_sale'
      ? {
          ctaLabel: ON_SALE_CTA_LABEL,
          ctaUrl: onSalePageUrlFromMapping(CAMPAIGN_SITE_URL),
        }
      : {}),
    ...(type === 'brand' ? { logoUrl: brandLogoUrl || BRAND_LOGO_PLACEHOLDER } : {}),
    ...(brandHandle ? { brandHandle } : {}),
    ...(categoryCollectionHandle ? { categoryCollectionHandle } : {}),
    ...(generatedHeading != null ? { generatedHeading } : {}),
  };

  let inserted;
  try {
    inserted = await sql`
      INSERT INTO email_campaigns (
        name,
        status,
        template_version_id,
        audience,
        scheduled_at,
        metadata,
        created_by,
        updated_at
      )
      VALUES (
        ${name},
        'pending_approval',
        ${versionId},
        ${JSON.stringify({ listIds, segmentIds })},
        ${scheduledAt.toISOString()},
        ${JSON.stringify(metadata)},
        'auto-campaign',
        NOW()
      )
      RETURNING id
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (!message.includes('email_campaigns_status_check')) throw error;
    // Backward-compatible fallback for DBs whose campaign status constraint predates pending_approval.
    inserted = await sql`
      INSERT INTO email_campaigns (
        name,
        status,
        template_version_id,
        audience,
        scheduled_at,
        metadata,
        created_by,
        updated_at
      )
      VALUES (
        ${name},
        'draft',
        ${versionId},
        ${JSON.stringify({ listIds, segmentIds })},
        ${scheduledAt.toISOString()},
        ${JSON.stringify(metadata)},
        'auto-campaign',
        NOW()
      )
      RETURNING id
    `;
  }
  const campaignId = inserted.rows[0]?.id as string;

  if (type === 'brand') {
    await setAutoCampaignRotation({ ...rotation, brandIndex: rotation.brandIndex + 1 });
  } else if (type === 'category') {
    await setAutoCampaignRotation({
      ...rotation,
      categoryIndex: rotation.categoryIndex + categoryRotationOffset + 1,
    });
  }

  let approvalEmailSent = false;
  if (sendApprovalEmail) {
    try {
      await sendSesEmail({
        from: process.env.SES_AWS_FROM_EMAIL || 'support@theequestrian.com.au',
        to: [APPROVAL_EMAIL],
        subject: `Email campaign ready for approval: ${name}`,
        html: `
          <p>A new automated email campaign is ready for your approval.</p>
          <p><strong>${name}</strong> (${type})</p>
          <p>Configure auto campaigns: <a href="${ADMIN_AUTO_URL}">${ADMIN_AUTO_URL}</a></p>
          <p>Review and approve: <a href="${ADMIN_CAMPAIGNS_URL}">${ADMIN_CAMPAIGNS_URL}</a></p>
        `,
      });
      approvalEmailSent = true;
    } catch (error) {
      console.error('[auto-campaigns] Failed to send approval email:', error);
    }
  }

  return { campaignId, scheduledAt, label, approvalEmailSent, autoType: type };
}

export type BatchBuildResult = {
  results: BuildResult[];
  approvalEmailSent: boolean;
};

export async function buildAutoCampaignsForTomorrowAllTypes(options: { scheduledAtOverride?: Date } = {}): Promise<BatchBuildResult> {
  const { scheduledAtOverride } = options;
  const types: AutoCampaignType[] = ['brand', 'on_sale', 'category'];
  const results: BuildResult[] = [];
  for (const type of types) {
    results.push(
      await buildAutoCampaignForNextSlot({
        typeOverride: type,
        sendApprovalEmail: false,
        scheduledAtOverride,
      })
    );
  }

  const built = results.filter((r) => r.campaignId && r.autoType) as Array<BuildResult & { campaignId: string; autoType: AutoCampaignType }>;
  if (built.length === 0) return { results, approvalEmailSent: false };

  let approvalEmailSent = false;
  try {
    const rows = built
      .map((r) => `<li><strong>${r.autoType}</strong>: ${r.label ?? ''} — campaign ${r.campaignId}</li>`)
      .join('');
    await sendSesEmail({
      from: process.env.SES_AWS_FROM_EMAIL || 'support@theequestrian.com.au',
      to: [APPROVAL_EMAIL],
      subject: `Auto campaigns ready for approval (${built.length})`,
      html: `
        <p>Automated campaigns are ready for approval.</p>
        <ul>${rows}</ul>
        <p>Configure auto campaigns: <a href="${ADMIN_AUTO_URL}">${ADMIN_AUTO_URL}</a></p>
        <p>Review and approve: <a href="${ADMIN_CAMPAIGNS_URL}">${ADMIN_CAMPAIGNS_URL}</a></p>
      `,
    });
    approvalEmailSent = true;
  } catch (error) {
    console.error('[auto-campaigns] Failed to send consolidated approval email:', error);
  }
  return { results, approvalEmailSent };
}
