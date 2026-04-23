import { sql } from '@vercel/postgres';
import { Resend } from 'resend';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import type { EmailBlock } from '@/lib/email-platform/types';
import { getTemplateVersion } from '@/lib/email-platform/templates';
import { getAutoWeeklySettings, isAutoWeeklyFlowEnabled } from './settings';
import { ensureAutoWeeklyFlowTemplate, getAutoWeeklyFlowVersionId } from './template';
import { selectProductsForAutoWeekly } from './product-selection';
import { generateAutoWeeklyIntro } from './intro-generator';
import { generateAutoWeeklySubjectLine } from './subject-line-generator';
import { generateAutoWeeklyHeading } from './heading-generator';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APPROVAL_EMAIL = 'jono@theequestrian.com.au';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';
const ADMIN_CAMPAIGNS_URL = `${SITE_URL}/admin/email/campaigns`;

/** Send slots in AEST: day of week -> hour (0-23) */
const SEND_SLOTS: Record<number, number> = {
  1: 9,  // Monday 9am
  3: 14, // Wednesday 2pm
  5: 18, // Friday 6pm
  0: 8,  // Sunday 8am
};

/**
 * Get tomorrow's date in Australia/Sydney (using fixed AEST offset +10 for simplicity).
 */
function getTomorrowInSydney(): Date {
  const utc = new Date();
  const sydneyDate = new Date(utc.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const tomorrow = new Date(sydneyDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * Get the next send slot (scheduled_at) in UTC for tomorrow in Sydney, or null if tomorrow is not a send day.
 */
export function getNextSendSlotInUTC(): { scheduledAt: Date; label: string } | null {
  const tomorrow = getTomorrowInSydney();
  const day = tomorrow.getDay();
  const hour = SEND_SLOTS[day];
  if (hour == null) return null;

  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const date = String(tomorrow.getDate()).padStart(2, '0');
  const hourStr = String(hour).padStart(2, '0');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const label = `${dayNames[day]} ${tomorrow.getDate()} ${tomorrow.toLocaleString('en-AU', { month: 'short' })} ${year} at ${hour}:00 AEST`;

  const isoAEST = `${year}-${month}-${date}T${hourStr}:00:00+10:00`;
  const scheduledAt = new Date(isoAEST);
  return { scheduledAt, label };
}

async function getAllListIds(): Promise<string[]> {
  const result = await sql`
    SELECT id FROM email_lists ORDER BY created_at ASC
  `;
  return result.rows.map((r) => r.id as string);
}

/**
 * Format product data for the intro LLM context: title, price, compare-at, save %, vendor.
 */
function formatProductContextForIntro(
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
};

/**
 * Build one auto weekly campaign for the next send slot (tomorrow) and send approval email.
 * No-op if auto weekly flow is disabled via the master switch.
 */
export async function buildAutoWeeklyCampaign(): Promise<BuildResult> {
  const enabled = await isAutoWeeklyFlowEnabled();
  if (!enabled) {
    return {
      campaignId: null,
      scheduledAt: null,
      label: null,
      approvalEmailSent: false,
      skipped: true,
      skipReason: 'Auto weekly flow is disabled',
    };
  }

  const slot = getNextSendSlotInUTC();
  if (!slot) {
    return { campaignId: null, scheduledAt: null, label: null, approvalEmailSent: false };
  }

  const settings = await getAutoWeeklySettings();
  let versionId: string | null = settings.templateVersionId
    ? settings.templateVersionId
    : (await getAutoWeeklyFlowVersionId());
  if (!versionId) {
    const template = await ensureAutoWeeklyFlowTemplate();
    versionId = template?.versionId ?? null;
  }
  if (!versionId) {
    return {
      campaignId: null,
      scheduledAt: slot.scheduledAt,
      label: slot.label,
      approvalEmailSent: false,
      error: 'No template selected. Create or select an "Auto Weekly Flow" template in settings.',
    };
  }

  const templateVersion = await getTemplateVersion(versionId);
  const blocks = templateVersion?.blocks ?? [];
  const templateMetadata = (templateVersion?.metadata ?? {}) as Record<string, unknown>;
  const subjectPromptFromTemplate = typeof templateMetadata.subjectPrompt === 'string' && templateMetadata.subjectPrompt.trim() ? templateMetadata.subjectPrompt.trim() : null;
  const subjectPromptToUse = subjectPromptFromTemplate ?? settings.subjectPrompt;

  const llmIntroBlock = blocks.find((b): b is Extract<EmailBlock, { type: 'llmIntro' }> => b.type === 'llmIntro');
  const introPromptOverride = llmIntroBlock?.prompt?.trim() || null;
  const introPromptToUse = introPromptOverride ?? settings.introPrompt;
  const llmHeadingBlock = blocks.find((b): b is Extract<EmailBlock, { type: 'llmHeading' }> => b.type === 'llmHeading');
  const headingPromptToUse = llmHeadingBlock?.prompt?.trim() || null;
  const curatedBlock = blocks.find((b): b is Extract<EmailBlock, { type: 'curatedProducts' }> => b.type === 'curatedProducts');
  const curationPrompt = curatedBlock?.prompt?.trim() || null;

  const productHandles = await selectProductsForAutoWeekly(slot.scheduledAt, curationPrompt);
  const handles = productHandles.slice(0, 3);
  const products = await getProductsByHandles(handles);
  const productContext = formatProductContextForIntro(products);
  const [introText, subjectLine, generatedHeadingResult] = await Promise.all([
    generateAutoWeeklyIntro(
      { sendDate: slot.label, productContext },
      introPromptToUse
    ),
    generateAutoWeeklySubjectLine(
      { sendDate: slot.label, productContext },
      subjectPromptToUse
    ),
    llmHeadingBlock
      ? (headingPromptToUse
          ? generateAutoWeeklyHeading({ sendDate: slot.label, productContext }, headingPromptToUse)
          : Promise.resolve(llmHeadingBlock.text?.trim() || null))
      : Promise.resolve(null),
  ]);
  const generatedHeading = generatedHeadingResult?.trim() || null;

  const hasAudience =
    (settings.audience.listIds?.length ?? 0) > 0 || (settings.audience.segmentIds?.length ?? 0) > 0;
  const listIds = hasAudience
    ? (settings.audience.listIds ?? [])
    : await getAllListIds();
  const segmentIds = hasAudience ? (settings.audience.segmentIds ?? []) : [];

  const name = `Auto Weekly – ${slot.label}`;
  const metadata = {
    introText,
    subjectLine,
    ...(llmHeadingBlock && generatedHeading != null ? { generatedHeading } : {}),
    productHandles: handles,
  };

  const inserted = await sql`
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
      ${slot.scheduledAt.toISOString()},
      ${JSON.stringify(metadata)},
      'auto-weekly',
      NOW()
    )
    RETURNING id
  `;
  const campaignId = inserted.rows[0]?.id as string;

  let approvalEmailSent = false;
  if (RESEND_API_KEY) {
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'The Equestrian <support@theequestrian.com.au>',
      to: [APPROVAL_EMAIL],
      subject: `Email campaign ready for approval: ${name}`,
      html: `
        <p>A new auto weekly email campaign is ready for your approval.</p>
        <p><strong>${name}</strong></p>
        <p>Please review and approve (or edit then approve) at:</p>
        <p><a href="${ADMIN_CAMPAIGNS_URL}">${ADMIN_CAMPAIGNS_URL}</a></p>
        <p>If approved, it will be sent at the scheduled time. If not approved, it will not be sent.</p>
      `,
    });
    approvalEmailSent = !error;
    if (error) {
      console.error('[auto-weekly] Failed to send approval email:', error);
    }
  }

  return {
    campaignId,
    scheduledAt: slot.scheduledAt,
    label: slot.label,
    approvalEmailSent,
  };
}
