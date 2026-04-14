import { sql } from '@vercel/postgres';
import { Resend } from 'resend';
import { getTemplateVersion, renderTemplateContent, addUtmParamsToEmailHtml, proxyEmailImages } from '@/lib/email-platform/templates';
import { buildUnsubscribeUrl } from '@/lib/email-platform/unsubscribe';

const resend = new Resend(process.env.RESEND_API_KEY);

function extractResendId(sendResult: unknown): string | null {
  if (!sendResult || typeof sendResult !== 'object') {
    return null;
  }
  const root = sendResult as Record<string, unknown>;
  if (typeof root.id === 'string' && root.id) {
    return root.id;
  }
  if (root.data && typeof root.data === 'object') {
    const nested = root.data as Record<string, unknown>;
    if (typeof nested.id === 'string' && nested.id) {
      return nested.id;
    }
  }
  return null;
}

export async function shouldSuppressContact(contactId: string): Promise<{ suppress: boolean; reason?: string }> {
  const subscription = await sql`
    SELECT status
    FROM email_subscriptions
    WHERE contact_id = ${contactId}
    LIMIT 1
  `;
  const status = (subscription.rows[0]?.status as string | undefined) || 'pending';
  if (status !== 'subscribed') {
    return { suppress: true, reason: `subscription_status_${status}` };
  }
  return { suppress: false };
}

export async function isFrequencyCapped(input: {
  contactId: string;
  maxEmails: number;
  windowDays: number;
}): Promise<boolean> {
  const result = await sql`
    SELECT COUNT(*) AS send_count
    FROM email_sends
    WHERE contact_id = ${input.contactId}
      AND status IN ('sent', 'delivered')
      AND created_at >= NOW() - (${input.windowDays} || ' days')::INTERVAL
  `;
  const sendCount = Number(result.rows[0]?.send_count || 0);
  return sendCount >= input.maxEmails;
}

export async function queueCampaignRecipients(campaignId: string, contactIds: string[]): Promise<number> {
  let queued = 0;
  for (const contactId of contactIds) {
    const contactResult = await sql`
      SELECT c.primary_email
      FROM email_contacts c
      WHERE c.id = ${contactId}
      LIMIT 1
    `;
    const email = contactResult.rows[0]?.primary_email as string | undefined;
    if (!email) {
      continue;
    }

    await sql`
      INSERT INTO email_campaign_recipients (campaign_id, contact_id, email, status)
      VALUES (${campaignId}, ${contactId}, ${email}, 'queued')
      ON CONFLICT (campaign_id, contact_id)
      DO NOTHING
    `;
    queued += 1;
  }
  return queued;
}

export async function sendQueuedCampaignRecipients(input: {
  campaignId: string;
  defaultSiteUrl?: string;
  frequencyCapCount?: number;
  frequencyCapDays?: number;
}): Promise<{ sent: number; failed: number; skipped: number }> {
  const defaultSiteUrl = input.defaultSiteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';
  const frequencyCapCount = input.frequencyCapCount ?? 3;
  const frequencyCapDays = input.frequencyCapDays ?? 7;

  const campaignResult = await sql`
    SELECT id, name, status, template_version_id, metadata
    FROM email_campaigns
    WHERE id = ${input.campaignId}
    LIMIT 1
  `;
  const campaignStatus = (campaignResult.rows[0]?.status as string | undefined) || 'draft';
  if (campaignStatus === 'cancelled') {
    throw new Error('Campaign is cancelled and cannot be sent');
  }
  if (campaignStatus === 'completed') {
    throw new Error('Campaign is already completed and cannot be sent again. Duplicate the campaign to send again.');
  }
  const campaignName = (campaignResult.rows[0]?.name as string | undefined) || 'campaign';
  const templateVersionId = campaignResult.rows[0]?.template_version_id as string | undefined;
  const campaignMetadata = (campaignResult.rows[0]?.metadata as Record<string, unknown> | undefined) || {};
  const campaignSubjectLine =
    typeof campaignMetadata.subjectLine === 'string' && campaignMetadata.subjectLine.trim().length > 0
      ? campaignMetadata.subjectLine.trim()
      : null;
  if (!templateVersionId) {
    throw new Error('Campaign has no template version');
  }
  const templateVersion = await getTemplateVersion(templateVersionId);
  if (!templateVersion) {
    throw new Error('Template version not found');
  }

  let htmlTemplateToUse = templateVersion.htmlTemplate;
  const introText = campaignMetadata.introText;
  const generatedHeading = campaignMetadata.generatedHeading;
  const productHandles = campaignMetadata.productHandles;
  const hasIntro = typeof introText === 'string' && introText.length > 0;
  const hasHeading = typeof generatedHeading === 'string' && generatedHeading.length > 0;
  const validHandles =
    Array.isArray(productHandles) && productHandles.every((x: unknown): x is string => typeof x === 'string')
      ? productHandles
      : undefined;
  if (hasIntro || hasHeading || (validHandles && validHandles.length > 0)) {
    const { buildCampaignHtmlWithOverrides } = await import('@/lib/email-platform/auto-weekly/render');
    htmlTemplateToUse = await buildCampaignHtmlWithOverrides({
      blocks: templateVersion.blocks,
      templateMetadata: templateVersion.metadata,
      overrides: {
        introText: hasIntro ? introText : undefined,
        generatedHeading: hasHeading ? generatedHeading : undefined,
        productHandles: validHandles?.length ? validHandles : undefined,
      },
      siteUrl: defaultSiteUrl,
    });
  }

  await sql`
    UPDATE email_campaigns
    SET status = 'processing',
        started_at = COALESCE(started_at, NOW()),
        updated_at = NOW()
    WHERE id = ${input.campaignId}
  `;

  const recipients = await sql`
    SELECT id, contact_id, email
    FROM email_campaign_recipients
    WHERE campaign_id = ${input.campaignId}
      AND status = 'queued'
    ORDER BY created_at ASC
    LIMIT 5000
  `;

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let index = 0; index < recipients.rows.length; index += 1) {
    if (index === 0 || index % 20 === 0) {
      const statusCheck = await sql`
        SELECT status
        FROM email_campaigns
        WHERE id = ${input.campaignId}
        LIMIT 1
      `;
      const liveStatus = (statusCheck.rows[0]?.status as string | undefined) || 'draft';
      if (liveStatus === 'cancelled') {
        const cancelledQueued = await sql`
          UPDATE email_campaign_recipients
          SET status = 'cancelled',
              skip_reason = 'campaign_cancelled',
              updated_at = NOW()
          WHERE campaign_id = ${input.campaignId}
            AND status = 'queued'
        `;
        skipped += Number(cancelledQueued.rowCount || 0);
        break;
      }
    }

    const row = recipients.rows[index];
    const recipientId = row.id as string;
    const contactId = row.contact_id as string;
    const email = row.email as string;

    const suppress = await shouldSuppressContact(contactId);
    if (suppress.suppress) {
      await sql`
        UPDATE email_campaign_recipients
        SET status = 'skipped',
            skip_reason = ${suppress.reason || 'suppressed'},
            updated_at = NOW()
        WHERE id = ${recipientId}
      `;
      skipped += 1;
      continue;
    }

    if (await isFrequencyCapped({ contactId, maxEmails: frequencyCapCount, windowDays: frequencyCapDays })) {
      await sql`
        UPDATE email_campaign_recipients
        SET status = 'skipped',
            skip_reason = ${`frequency_cap_${frequencyCapCount}_in_${frequencyCapDays}_days`},
            updated_at = NOW()
        WHERE id = ${recipientId}
      `;
      skipped += 1;
      continue;
    }

    const variables = {
      customerName: '',
      siteUrl: defaultSiteUrl,
      email,
      unsubscribeUrl: await buildUnsubscribeUrl(contactId),
    };
    const renderedRaw = renderTemplateContent({
      subjectTemplate: templateVersion.subjectTemplate,
      htmlTemplate: htmlTemplateToUse,
      variables,
    });
    const subject = campaignSubjectLine ?? renderedRaw.subject;
    const renderedHtml = proxyEmailImages(
      addUtmParamsToEmailHtml(
        renderedRaw.html,
        {
          source: 'email',
          medium: 'newsletter',
          campaign: campaignName,
        },
        defaultSiteUrl
      ),
      defaultSiteUrl
    );
    const rendered = { ...renderedRaw, subject, html: renderedHtml };

    const sendRecord = await sql`
      INSERT INTO email_sends (
        contact_id,
        recipient_email,
        campaign_recipient_id,
        template_version_id,
        status,
        subject,
        metadata,
        updated_at
      )
      VALUES (
        ${contactId},
        ${email},
        ${recipientId},
        ${templateVersion.id},
        'queued',
        ${subject},
        ${JSON.stringify({ campaignId: input.campaignId })},
        NOW()
      )
      RETURNING id
    `;
    const sendId = sendRecord.rows[0]?.id as string;

    try {
      const providerResult = await resend.emails.send({
        from: `${templateVersion.fromName || 'The Equestrian'} <${templateVersion.fromEmail || 'support@theequestrian.com.au'}>`,
        to: email,
        subject,
        html: rendered.html,
        headers: {
          'List-Unsubscribe': `<${variables.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags: [
          { name: 'campaign_id', value: input.campaignId },
          { name: 'campaign_recipient_id', value: recipientId },
          { name: 'template_version_id', value: templateVersion.id },
        ],
      });
      const providerMessageId = extractResendId(providerResult);

      await sql`
        UPDATE email_campaign_recipients
        SET status = 'sent',
            provider_message_id = ${providerMessageId},
            sent_at = NOW(),
            updated_at = NOW()
        WHERE id = ${recipientId}
      `;

      await sql`
        UPDATE email_sends
        SET status = 'sent',
            provider_message_id = ${providerMessageId},
            sent_at = NOW(),
            updated_at = NOW()
        WHERE id = ${sendId}
      `;
      sent += 1;
    } catch (error) {
      await sql`
        UPDATE email_campaign_recipients
        SET status = 'failed',
            skip_reason = ${error instanceof Error ? error.message : String(error)},
            updated_at = NOW()
        WHERE id = ${recipientId}
      `;
      await sql`
        UPDATE email_sends
        SET status = 'failed',
            error_message = ${error instanceof Error ? error.message : String(error)},
            updated_at = NOW()
        WHERE id = ${sendId}
      `;
      failed += 1;
    }
  }

  const remaining = await sql`
    SELECT COUNT(*) AS queued_count
    FROM email_campaign_recipients
    WHERE campaign_id = ${input.campaignId}
      AND status = 'queued'
  `;
  const queuedCount = Number(remaining.rows[0]?.queued_count || 0);
  const finalStatusCheck = await sql`
    SELECT status
    FROM email_campaigns
    WHERE id = ${input.campaignId}
    LIMIT 1
  `;
  const currentStatus = (finalStatusCheck.rows[0]?.status as string | undefined) || 'draft';
  const status = currentStatus === 'cancelled' ? 'cancelled' : queuedCount > 0 ? 'processing' : 'completed';

  await sql`
    UPDATE email_campaigns
    SET status = ${status},
        completed_at = CASE WHEN ${status} IN ('completed', 'cancelled') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = ${input.campaignId}
  `;

  return { sent, failed, skipped };
}

export async function markSuppressedByEmail(email: string, reason: string): Promise<void> {
  const contact = await sql`
    SELECT id
    FROM email_contacts
    WHERE primary_email = ${email.toLowerCase()}
    LIMIT 1
  `;
  const contactId = contact.rows[0]?.id as string | undefined;
  if (!contactId) {
    return;
  }
  await sql`
    INSERT INTO email_subscriptions (contact_id, status, source, suppression_reason, updated_at)
    VALUES (${contactId}, 'suppressed', 'provider_event', ${reason}, NOW())
    ON CONFLICT (contact_id)
    DO UPDATE SET
      status = 'suppressed',
      suppression_reason = EXCLUDED.suppression_reason,
      updated_at = NOW()
  `;
}
