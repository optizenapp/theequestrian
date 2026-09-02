import { sql } from '@/lib/db/vercel-postgres';
import { getTemplateVersion, renderTemplateContent, addUtmParamsToEmailHtml, proxyEmailImages } from '@/lib/email-platform/templates';
import { buildUnsubscribeUrl } from '@/lib/email-platform/unsubscribe';
import { sendSesEmail } from '@/lib/email-platform/ses-mailer';

type SequenceStepRecord = {
  id: string;
  step_order: number;
  step_type: 'wait' | 'send_email' | 'condition_gate';
  config: Record<string, unknown>;
};

type EnrollmentRecord = {
  id: string;
  contact_id: string;
  sequence_id: string;
  sequence_version_id: string;
  current_step_order: number;
};

export async function listSequences(limit = 100): Promise<
  Array<{
    id: string;
    name: string;
    status: string;
    triggerType: string;
    activeVersionId: string | null;
    updatedAt: string;
  }>
> {
  const result = await sql`
    SELECT id, name, status, trigger_type, active_version_id, updated_at
    FROM email_sequences
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;
  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    status: row.status as string,
    triggerType: row.trigger_type as string,
    activeVersionId: (row.active_version_id as string | null) ?? null,
    updatedAt: new Date(row.updated_at as string).toISOString(),
  }));
}

export async function createSequence(input: {
  name: string;
  triggerType:
    | 'new_customer'
    | 'first_order'
    | 'repeat_customer'
    | 'product_type_purchased'
    | 'ltv_threshold_crossed'
    | 'winback_eligible';
  triggerConfig?: Record<string, unknown>;
  entryRules?: Record<string, unknown>;
  stopRules?: Record<string, unknown>;
  steps?: Array<{ stepType: 'wait' | 'send_email' | 'condition_gate'; config: Record<string, unknown> }>;
}): Promise<{ sequenceId: string; versionId: string }> {
  const sequenceResult = await sql`
    INSERT INTO email_sequences (name, trigger_type, trigger_config)
    VALUES (${input.name}, ${input.triggerType}, ${JSON.stringify(input.triggerConfig || {})})
    RETURNING id
  `;
  const sequenceId = sequenceResult.rows[0]?.id as string;

  const versionResult = await sql`
    INSERT INTO email_sequence_versions (sequence_id, version_number, entry_rules, stop_rules, is_published)
    VALUES (
      ${sequenceId},
      1,
      ${JSON.stringify(input.entryRules || { mode: 'all', conditions: [] })},
      ${JSON.stringify(input.stopRules || { mode: 'any', conditions: [] })},
      false
    )
    RETURNING id
  `;
  const versionId = versionResult.rows[0]?.id as string;

  const steps = input.steps || [];
  let stepOrder = 1;
  for (const step of steps) {
    await sql`
      INSERT INTO email_sequence_steps (sequence_version_id, step_order, step_type, config)
      VALUES (${versionId}, ${stepOrder}, ${step.stepType}, ${JSON.stringify(step.config)})
    `;
    stepOrder += 1;
  }

  await sql`
    UPDATE email_sequences
    SET active_version_id = ${versionId},
        updated_at = NOW()
    WHERE id = ${sequenceId}
  `;

  return { sequenceId, versionId };
}

export async function enrollContactInSequence(input: {
  sequenceId: string;
  contactId: string;
  metadata?: Record<string, unknown>;
}): Promise<{ enrollmentId: string } | null> {
  const sequence = await sql`
    SELECT id, status, active_version_id
    FROM email_sequences
    WHERE id = ${input.sequenceId}
    LIMIT 1
  `;
  const activeVersionId = sequence.rows[0]?.active_version_id as string | undefined;
  const status = sequence.rows[0]?.status as string | undefined;

  if (!activeVersionId || status === 'archived') {
    return null;
  }

  const upsert = await sql`
    INSERT INTO email_sequence_enrollments (
      sequence_id,
      sequence_version_id,
      contact_id,
      status,
      current_step_order,
      next_run_at,
      metadata
    )
    VALUES (
      ${input.sequenceId},
      ${activeVersionId},
      ${input.contactId},
      'active',
      1,
      NOW(),
      ${JSON.stringify(input.metadata || {})}
    )
    ON CONFLICT (sequence_id, sequence_version_id, contact_id)
    DO UPDATE SET
      status = 'active',
      next_run_at = NOW(),
      metadata = email_sequence_enrollments.metadata || EXCLUDED.metadata
    RETURNING id
  `;

  return { enrollmentId: upsert.rows[0]?.id as string };
}

async function runStep(
  enrollment: EnrollmentRecord,
  step: SequenceStepRecord
): Promise<{ status: 'completed' | 'failed' | 'skipped'; nextRunAt?: string; details?: Record<string, unknown> }> {
  if (step.step_type === 'wait') {
    const waitHours = Number(step.config.waitHours || 24);
    return {
      status: 'completed',
      nextRunAt: new Date(Date.now() + waitHours * 60 * 60 * 1000).toISOString(),
      details: { waitHours },
    };
  }

  if (step.step_type === 'condition_gate') {
    const metric = String(step.config.metric || 'order_count');
    const threshold = Number(step.config.threshold || 0);

    const metrics = await sql`
      SELECT COALESCE(order_count, 0) AS order_count, COALESCE(lifetime_value, 0) AS lifetime_value
      FROM customer_aggregate_metrics
      WHERE contact_id = ${enrollment.contact_id}
      LIMIT 1
    `;
    const row = metrics.rows[0] || { order_count: 0, lifetime_value: 0 };
    const metricValue = metric === 'lifetime_value' ? Number(row.lifetime_value || 0) : Number(row.order_count || 0);
    const passed = metricValue >= threshold;
    return {
      status: passed ? 'completed' : 'skipped',
      details: { metric, threshold, metricValue, passed },
    };
  }

  if (step.step_type === 'send_email') {
    const templateVersionId = String(step.config.templateVersionId || '');
    if (!templateVersionId) {
      return { status: 'failed', details: { reason: 'missing_template_version' } };
    }

    const templateVersion = await getTemplateVersion(templateVersionId);
    if (!templateVersion) {
      return { status: 'failed', details: { reason: 'template_not_found' } };
    }

    const contact = await sql`
      SELECT primary_email, first_name
      FROM email_contacts
      WHERE id = ${enrollment.contact_id}
      LIMIT 1
    `;
    const email = contact.rows[0]?.primary_email as string | undefined;
    if (!email) {
      return { status: 'failed', details: { reason: 'contact_missing_email' } };
    }

    const renderedRaw = renderTemplateContent({
      subjectTemplate: templateVersion.subjectTemplate,
      htmlTemplate: templateVersion.htmlTemplate,
      variables: {
        customerName: (contact.rows[0]?.first_name as string | null) || '',
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au',
        email,
        unsubscribeUrl: await buildUnsubscribeUrl(enrollment.contact_id),
      },
    });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';
    const renderedHtml = proxyEmailImages(
      addUtmParamsToEmailHtml(
        renderedRaw.html,
        {
          source: 'email',
          medium: 'sequence',
          campaign: 'equestrian-sequence',
        },
        siteUrl
      ),
      siteUrl
    );
    const rendered = { ...renderedRaw, html: renderedHtml };

    try {
      const providerMessageId = await sendSesEmail({
        from: `${templateVersion.fromName || 'The Equestrian'} <${templateVersion.fromEmail || 'support@theequestrian.com.au'}>`,
        to: [email],
        subject: rendered.subject,
        html: rendered.html,
      });

      await sql`
        INSERT INTO email_sends (
          contact_id,
          recipient_email,
          template_version_id,
          status,
          provider,
          provider_message_id,
          subject,
          sent_at,
          metadata,
          updated_at
        )
        VALUES (
          ${enrollment.contact_id},
          ${email},
          ${templateVersion.id},
          'sent',
          'ses',
          ${providerMessageId},
          ${rendered.subject},
          NOW(),
          ${JSON.stringify({ sequenceId: enrollment.sequence_id, enrollmentId: enrollment.id, stepId: step.id })},
          NOW()
        )
      `;

      return { status: 'completed', details: { providerMessageId } };
    } catch (error) {
      return {
        status: 'failed',
        details: { reason: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  return { status: 'failed', details: { reason: 'unsupported_step_type' } };
}

export async function runDueSequenceEnrollments(limit = 200): Promise<{
  processed: number;
  completed: number;
  failed: number;
}> {
  const enrollments = await sql`
    SELECT id, contact_id, sequence_id, sequence_version_id, current_step_order
    FROM email_sequence_enrollments
    WHERE status = 'active'
      AND next_run_at <= NOW()
    ORDER BY next_run_at ASC
    LIMIT ${limit}
  `;

  let processed = 0;
  let completed = 0;
  let failed = 0;

  for (const row of enrollments.rows) {
    const enrollment: EnrollmentRecord = {
      id: row.id as string,
      contact_id: row.contact_id as string,
      sequence_id: row.sequence_id as string,
      sequence_version_id: row.sequence_version_id as string,
      current_step_order: Number(row.current_step_order || 1),
    };

    const stepResult = await sql`
      SELECT id, step_order, step_type, config
      FROM email_sequence_steps
      WHERE sequence_version_id = ${enrollment.sequence_version_id}
        AND step_order = ${enrollment.current_step_order}
      LIMIT 1
    `;
    const stepRow = stepResult.rows[0];

    if (!stepRow) {
      await sql`
        UPDATE email_sequence_enrollments
        SET status = 'completed',
            exited_at = NOW(),
            exit_reason = 'end_of_sequence'
        WHERE id = ${enrollment.id}
      `;
      completed += 1;
      processed += 1;
      continue;
    }

    const step: SequenceStepRecord = {
      id: stepRow.id as string,
      step_order: Number(stepRow.step_order || enrollment.current_step_order),
      step_type: stepRow.step_type as SequenceStepRecord['step_type'],
      config: (stepRow.config as Record<string, unknown>) || {},
    };

    const stepRun = await runStep(enrollment, step);
    await sql`
      INSERT INTO email_sequence_step_executions (enrollment_id, step_id, status, details)
      VALUES (${enrollment.id}, ${step.id}, ${stepRun.status}, ${JSON.stringify(stepRun.details || {})})
    `;

    if (stepRun.status === 'failed') {
      await sql`
        UPDATE email_sequence_enrollments
        SET status = 'failed',
            exited_at = NOW(),
            exit_reason = ${`step_${step.step_order}_failed`}
        WHERE id = ${enrollment.id}
      `;
      failed += 1;
      processed += 1;
      continue;
    }

    const nextStepOrder = enrollment.current_step_order + 1;
    await sql`
      UPDATE email_sequence_enrollments
      SET current_step_order = ${nextStepOrder},
          next_run_at = ${stepRun.nextRunAt || new Date().toISOString()},
          metadata = metadata || ${JSON.stringify({ lastStepStatus: stepRun.status })}
      WHERE id = ${enrollment.id}
    `;
    processed += 1;
  }

  return { processed, completed, failed };
}
