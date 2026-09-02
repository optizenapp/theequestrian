import { sql } from '@/lib/db/vercel-postgres';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import {
  queueCampaignRecipients,
  sendQueuedCampaignRecipients,
} from '@/lib/email-platform/sending';
import { generateResendSubjectLine } from './resend-subject';

export type ResendNonOpenersResult = {
  childCampaignId: string | null;
  recipientCount: number;
  sent: number;
  failed: number;
  skipped: number;
  reason?: 'no_non_openers' | 'insert_failed';
};

type ProductLite = {
  title?: string | null;
  vendor?: string | null;
  priceRange?: { minVariantPrice?: { amount?: string } };
};

function formatProductContext(products: ProductLite[]): string {
  return products
    .map((product, index) => {
      const title = product.title || 'Product';
      const price = product.priceRange?.minVariantPrice?.amount;
      const priceStr = price ? `$${parseFloat(price).toFixed(2)}` : '';
      const vendor = product.vendor ? ` | ${product.vendor}` : '';
      return `Product ${index + 1}: ${title} - ${priceStr}${vendor}`;
    })
    .join('\n');
}

async function loadParentCampaign(parentCampaignId: string) {
  const result = await sql`
    SELECT id, name, status, template_version_id, metadata
    FROM email_campaigns
    WHERE id = ${parentCampaignId}
    LIMIT 1
  `;
  return result.rows[0] || null;
}

async function loadNonOpenerContactIds(parentCampaignId: string): Promise<string[]> {
  const result = await sql`
    SELECT DISTINCT r.contact_id
    FROM email_campaign_recipients r
    INNER JOIN email_sends s ON s.campaign_recipient_id = r.id
    WHERE r.campaign_id = ${parentCampaignId}
      AND r.status IN ('sent', 'delivered')
      AND s.opened_at IS NULL
  `;
  return result.rows
    .map((row) => row.contact_id as string | null)
    .filter((value): value is string => Boolean(value));
}

export async function resendNonOpenersForCampaign(input: {
  parentCampaignId: string;
  actor?: string;
  /** When true, queue recipients and return; caller starts send separately (avoids Vercel timeouts). */
  deferSend?: boolean;
}): Promise<ResendNonOpenersResult> {
  const empty: ResendNonOpenersResult = {
    childCampaignId: null,
    recipientCount: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  const parent = await loadParentCampaign(input.parentCampaignId);
  if (!parent) {
    throw new Error('Campaign not found');
  }
  if (String(parent.status || '') !== 'completed') {
    throw new Error('Only completed campaigns can resend to non-openers');
  }
  if (!parent.template_version_id) {
    throw new Error('Campaign has no template version to resend');
  }

  const meta = (parent.metadata as Record<string, unknown>) || {};
  const handles = Array.isArray(meta.productHandles)
    ? (meta.productHandles as unknown[]).filter((value): value is string => typeof value === 'string')
    : [];
  const products = handles.length > 0 ? await getProductsByHandles(handles) : [];
  const productContext = formatProductContext(products as ProductLite[]);
  const originalSubject =
    typeof meta.subjectLine === 'string' && meta.subjectLine.trim().length > 0
      ? meta.subjectLine.trim()
      : String(parent.name || 'Campaign');

  const contactIds = await loadNonOpenerContactIds(input.parentCampaignId);
  if (contactIds.length === 0) {
    return { ...empty, reason: 'no_non_openers' };
  }

  let newSubject: string;
  try {
    newSubject = await generateResendSubjectLine({ originalSubject, productContext });
  } catch (error) {
    console.warn('[resend-non-openers] subject generation failed; using fallback', error);
    newSubject = 'Still interested? Your picks inside';
  }
  const childMeta: Record<string, unknown> = {
    ...meta,
    parentCampaignId: input.parentCampaignId,
    resendWave: typeof meta.resendWave === 'number' ? meta.resendWave + 1 : 1,
    subjectLine: newSubject,
    resendNonOpeners: true,
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
      ${`Resend (non-openers): ${parent.name}`},
      'processing',
      ${parent.template_version_id as string},
      ${JSON.stringify({ listIds: [], segmentIds: [] })},
      NULL,
      ${JSON.stringify(childMeta)},
      ${input.actor || 'manual-resend'},
      NOW()
    )
    RETURNING id
  `;
  const childCampaignId = (inserted.rows[0]?.id as string | undefined) ?? null;
  if (!childCampaignId) {
    return { ...empty, reason: 'insert_failed' };
  }

  const recipientCount = await queueCampaignRecipients(childCampaignId, contactIds);
  if (input.deferSend) {
    return {
      childCampaignId,
      recipientCount,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const sendResult = await sendQueuedCampaignRecipients({ campaignId: childCampaignId });
  return {
    childCampaignId,
    recipientCount,
    sent: sendResult.sent,
    failed: sendResult.failed,
    skipped: sendResult.skipped,
  };
}
