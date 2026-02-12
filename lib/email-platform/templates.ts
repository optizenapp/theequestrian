import { sql } from '@vercel/postgres';
import { applyTemplate } from '@/lib/reviews/email-settings';
import type { EmailBlock, EmailTemplateVisualSettings } from '@/lib/email-platform/types';

const defaultVisualSettings: EmailTemplateVisualSettings = {
  enabled: true,
  delayDays: 10,
  brandPrimary: '#000000',
  brandDark: '#000000',
  headerBackground: '#ffffff',
  linkColor: '#de8e94',
  logoUrl: 'https://www.theequestrian.com.au/email-logo.png',
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeVisualSettings(metadata?: Record<string, unknown>): EmailTemplateVisualSettings {
  const source = metadata || {};
  return {
    enabled: source.enabled !== false,
    delayDays: typeof source.delayDays === 'number' ? Math.max(0, Math.floor(source.delayDays)) : defaultVisualSettings.delayDays,
    brandPrimary: typeof source.brandPrimary === 'string' && source.brandPrimary.trim() ? source.brandPrimary : defaultVisualSettings.brandPrimary,
    brandDark: typeof source.brandDark === 'string' && source.brandDark.trim() ? source.brandDark : defaultVisualSettings.brandDark,
    headerBackground:
      typeof source.headerBackground === 'string' && source.headerBackground.trim()
        ? source.headerBackground
        : defaultVisualSettings.headerBackground,
    linkColor: typeof source.linkColor === 'string' && source.linkColor.trim() ? source.linkColor : defaultVisualSettings.linkColor,
    logoUrl: typeof source.logoUrl === 'string' && source.logoUrl.trim() ? source.logoUrl : null,
  };
}

export function renderTemplateBlocksHtml(input: {
  blocks: EmailBlock[];
  metadata?: Record<string, unknown>;
}): string {
  const visual = normalizeVisualSettings(input.metadata);
  const chunks = input.blocks.map((block) => {
    if (block.type === 'heading') {
      const level = Math.min(Math.max(block.level || 2, 1), 3);
      return `<h${level} style="margin:0 0 12px 0;text-align:${block.align || 'left'};color:${visual.brandDark};">${escapeHtml(
        block.text
      )}</h${level}>`;
    }
    if (block.type === 'text') {
      return `<p style="margin:0 0 12px 0;text-align:${block.align || 'left'};color:${visual.brandDark};white-space:pre-line;">${escapeHtml(
        block.text
      )}</p>`;
    }
    if (block.type === 'cta') {
      return `<p style="margin:16px 0;"><a href="${escapeHtml(
        block.url
      )}" style="display:inline-block;padding:10px 16px;background:${visual.brandPrimary};color:#fff;text-decoration:none;border-radius:999px;">${escapeHtml(
        block.label
      )}</a></p>`;
    }
    if (block.type === 'productCards') {
      return `<div style="margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:10px;text-align:center;">
        <img src="{{productImageUrl}}" alt="{{productTitle}}" style="max-width:220px;width:100%;height:auto;border-radius:8px;margin:0 auto 12px;display:block;" />
        <p style="margin:0 0 12px 0;color:${visual.brandDark};font-weight:600;">{{productTitle}}</p>
        <a href="{{productUrl}}" style="display:inline-block;padding:10px 16px;background:${visual.brandPrimary};color:#fff;text-decoration:none;border-radius:999px;">View product</a>
      </div>`;
    }
    if (block.type === 'divider') {
      return `<hr style="border:0;border-top:1px solid #e5e7eb;margin:16px 0;" />`;
    }
    if (block.type === 'footer') {
      return `<p style="margin:16px 0 0 0;font-size:12px;color:${visual.linkColor};white-space:pre-line;">${escapeHtml(block.text)}</p>`;
    }
    return '';
  });

  const logoSection = visual.logoUrl
    ? `<img src="${escapeHtml(visual.logoUrl)}" alt="Logo" style="max-width:180px;height:auto;margin:0 auto;display:block;" />`
    : '<h1 style="color:#111827;margin:0;font-size:26px;">The Equestrian</h1>';

  return `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
    <div style="background:${visual.headerBackground};padding:24px 20px;text-align:center;">${logoSection}</div>
    <div style="padding:28px;">${chunks.join('')}</div>
  </div>`;
}

export async function listTemplates(limit = 100): Promise<
  Array<{
    id: string;
    name: string;
    templateType: string;
    activeVersionId: string | null;
    updatedAt: string;
  }>
> {
  const result = await sql`
    SELECT id, name, template_type, active_version_id, updated_at
    FROM email_templates
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;

  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    templateType: row.template_type as string,
    activeVersionId: (row.active_version_id as string | null) ?? null,
    updatedAt: new Date(row.updated_at as string).toISOString(),
  }));
}

export async function createTemplate(input: {
  name: string;
  templateType: 'campaign' | 'sequence_step' | 'review';
  subjectTemplate: string;
  htmlTemplate?: string;
  blocks?: EmailBlock[];
  fromName?: string;
  fromEmail?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ templateId: string; versionId: string }> {
  const templateResult = await sql`
    INSERT INTO email_templates (name, template_type, updated_at)
    VALUES (${input.name}, ${input.templateType}, NOW())
    RETURNING id
  `;
  const templateId = templateResult.rows[0]?.id as string;

  const htmlTemplate = input.htmlTemplate || renderTemplateBlocksHtml({ blocks: input.blocks || [], metadata: input.metadata });
  const versionResult = await sql`
    INSERT INTO email_template_versions (
      template_id,
      version_number,
      subject_template,
      html_template,
      blocks,
      from_name,
      from_email,
      metadata
    )
    VALUES (
      ${templateId},
      1,
      ${input.subjectTemplate},
      ${htmlTemplate},
      ${JSON.stringify(input.blocks || [])},
      ${input.fromName ?? 'The Equestrian'},
      ${input.fromEmail ?? 'support@theequestrian.com.au'},
      ${JSON.stringify(input.metadata || {})}
    )
    RETURNING id
  `;
  const versionId = versionResult.rows[0]?.id as string;

  await sql`
    UPDATE email_templates
    SET active_version_id = ${versionId},
        updated_at = NOW()
    WHERE id = ${templateId}
  `;

  return { templateId, versionId };
}

export async function createTemplateVersion(input: {
  templateId: string;
  subjectTemplate: string;
  htmlTemplate?: string;
  blocks?: EmailBlock[];
  fromName?: string;
  fromEmail?: string;
  setActive?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<{ versionId: string; versionNumber: number }> {
  const current = await sql`
    SELECT COALESCE(MAX(version_number), 0) AS max_version
    FROM email_template_versions
    WHERE template_id = ${input.templateId}
  `;
  const versionNumber = Number(current.rows[0]?.max_version || 0) + 1;
  const htmlTemplate = input.htmlTemplate || renderTemplateBlocksHtml({ blocks: input.blocks || [], metadata: input.metadata });

  const inserted = await sql`
    INSERT INTO email_template_versions (
      template_id,
      version_number,
      subject_template,
      html_template,
      blocks,
      from_name,
      from_email,
      metadata
    )
    VALUES (
      ${input.templateId},
      ${versionNumber},
      ${input.subjectTemplate},
      ${htmlTemplate},
      ${JSON.stringify(input.blocks || [])},
      ${input.fromName ?? 'The Equestrian'},
      ${input.fromEmail ?? 'support@theequestrian.com.au'},
      ${JSON.stringify(input.metadata || {})}
    )
    RETURNING id
  `;
  const versionId = inserted.rows[0]?.id as string;

  if (input.setActive !== false) {
    await sql`
      UPDATE email_templates
      SET active_version_id = ${versionId},
          updated_at = NOW()
      WHERE id = ${input.templateId}
    `;
  }

  return { versionId, versionNumber };
}

export async function getTemplateVersion(versionId: string): Promise<{
  id: string;
  templateId: string;
  subjectTemplate: string;
  htmlTemplate: string;
  blocks: EmailBlock[];
  fromName: string | null;
  fromEmail: string | null;
  metadata: Record<string, unknown>;
} | null> {
  const result = await sql`
    SELECT id, template_id, subject_template, html_template, blocks, from_name, from_email, metadata
    FROM email_template_versions
    WHERE id = ${versionId}
    LIMIT 1
  `;

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id as string,
    templateId: row.template_id as string,
    subjectTemplate: row.subject_template as string,
    htmlTemplate: row.html_template as string,
    blocks: (row.blocks as EmailBlock[]) || [],
    fromName: (row.from_name as string | null) ?? null,
    fromEmail: (row.from_email as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) || {},
  };
}

export function renderTemplateContent(input: {
  subjectTemplate: string;
  htmlTemplate: string;
  variables: Record<string, string | number | null | undefined>;
}): { subject: string; html: string } {
  const normalizedVariables: Record<string, string> = Object.fromEntries(
    Object.entries(input.variables).map(([key, value]) => [key, value == null ? '' : String(value)])
  );
  const subject = applyTemplate(input.subjectTemplate, normalizedVariables);
  const html = applyTemplate(input.htmlTemplate, normalizedVariables);
  return { subject, html };
}
