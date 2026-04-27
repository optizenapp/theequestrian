import { sql } from '@vercel/postgres';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import { queueCampaignRecipients, sendQueuedCampaignRecipients } from '@/lib/email-platform/sending';
import { getAutoCampaignResendConfig } from './config';
import { generateResendSubjectLine } from './resend-subject';

function formatProductContext(
  products: Array<{
    title?: string | null;
    vendor?: string | null;
    priceRange?: { minVariantPrice?: { amount?: string } };
  }>
): string {
  return products
    .map((p, i) => {
      const title = p.title || 'Product';
      const price = p.priceRange?.minVariantPrice?.amount;
      const priceStr = price ? `$${parseFloat(price).toFixed(2)}` : '';
      const vendor = p.vendor ? ` | ${p.vendor}` : '';
      return `Product ${i + 1}: ${title} - ${priceStr}${vendor}`;
    })
    .join('\n');
}

export type ResendProcessResult = {
  processed: number;
  details: Array<{ parentId: string; childId?: string; skipped?: string }>;
};

export async function processAutoCampaignResends(): Promise<ResendProcessResult> {
  const cfg = await getAutoCampaignResendConfig();
  const details: ResendProcessResult['details'] = [];
  if (!cfg.enabled) {
    return { processed: 0, details };
  }

  const due = await sql`
    SELECT id, name, metadata, template_version_id
    FROM email_campaigns c
    WHERE c.status = 'completed'
      AND c.created_by IN ('auto-weekly', 'auto-campaign')
      AND (c.metadata->>'resendWave') IS NULL
      AND (c.metadata->>'resendNoTargets') IS NULL
      AND (c.metadata->>'autoType') IS NOT NULL
      AND c.completed_at IS NOT NULL
      AND c.completed_at <= NOW() - make_interval(hours => ${cfg.delayHours})
      AND NOT EXISTS (
        SELECT 1 FROM email_campaigns r
        WHERE r.metadata->>'parentCampaignId' = c.id::text
      )
    LIMIT 10
  `;

  let processed = 0;
  for (const row of due.rows) {
    const parentId = row.id as string;
    const parentName = String(row.name || 'Campaign');
    const meta = (row.metadata as Record<string, unknown>) || {};
    const handles = Array.isArray(meta.productHandles)
      ? (meta.productHandles as unknown[]).filter((h): h is string => typeof h === 'string')
      : [];
    const products = handles.length > 0 ? await getProductsByHandles(handles) : [];
    const productContext = formatProductContext(products);
    const originalSubject =
      typeof meta.subjectLine === 'string' && meta.subjectLine.trim()
        ? meta.subjectLine.trim()
        : parentName;

    const contacts = await sql`
      SELECT DISTINCT r.contact_id
      FROM email_campaign_recipients r
      INNER JOIN email_sends s ON s.campaign_recipient_id = r.id
      WHERE r.campaign_id = ${parentId}
        AND r.status IN ('sent', 'delivered')
        AND s.opened_at IS NULL
    `;
    const contactIds = contacts.rows.map((r) => r.contact_id as string);
    if (contactIds.length === 0) {
      await sql`
        UPDATE email_campaigns
        SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ resendNoTargets: true })},
            updated_at = NOW()
        WHERE id = ${parentId}
      `;
      details.push({ parentId, skipped: 'no_non_openers' });
      continue;
    }

    const newSubject = await generateResendSubjectLine({ originalSubject, productContext });
    const childMeta: Record<string, unknown> = {
      autoType: meta.autoType,
      productHandles: meta.productHandles,
      introText: meta.introText,
      generatedHeading: meta.generatedHeading,
      brandHandle: meta.brandHandle,
      categoryCollectionHandle: meta.categoryCollectionHandle,
      parentCampaignId: parentId,
      resendWave: 1,
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
        ${`Auto resend (non-openers): ${parentName}`},
        'processing',
        ${row.template_version_id as string},
        ${JSON.stringify({ listIds: [], segmentIds: [] })},
        NULL,
        ${JSON.stringify(childMeta)},
        'auto-resend',
        NOW()
      )
      RETURNING id
    `;
    const childId = inserted.rows[0]?.id as string;
    if (!childId) {
      details.push({ parentId, skipped: 'insert_failed' });
      continue;
    }

    await queueCampaignRecipients(childId, contactIds);
    await sendQueuedCampaignRecipients({ campaignId: childId });
    processed += 1;
    details.push({ parentId, childId });
  }

  return { processed, details };
}
