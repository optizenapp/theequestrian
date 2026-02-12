import { sql } from '@vercel/postgres';
import { applyTemplate } from '@/lib/reviews/email-settings';
import type { EmailBlock } from '@/lib/email-platform/types';

function renderSimpleBlocks(blocks: EmailBlock[]): string {
  const chunks = blocks.map((block) => {
    if (block.type === 'heading') {
      const level = Math.min(Math.max(block.level || 2, 1), 3);
      return `<h${level} style="margin:0 0 12px 0;">${block.text}</h${level}>`;
    }
    if (block.type === 'text') {
      return `<p style="margin:0 0 12px 0;">${block.text}</p>`;
    }
    if (block.type === 'cta') {
      return `<p style="margin:16px 0;"><a href="${block.url}" style="display:inline-block;padding:10px 16px;background:#ef4a75;color:#fff;text-decoration:none;border-radius:999px;">${block.label}</a></p>`;
    }
    if (block.type === 'divider') {
      return `<hr style="border:0;border-top:1px solid #e5e7eb;margin:16px 0;" />`;
    }
    if (block.type === 'footer') {
      return `<p style="margin:16px 0 0 0;font-size:12px;color:#6b7280;">${block.text}</p>`;
    }
    return '';
  });

  return `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">${chunks.join('')}</div>`;
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
}): Promise<{ templateId: string; versionId: string }> {
  const templateResult = await sql`
    INSERT INTO email_templates (name, template_type, updated_at)
    VALUES (${input.name}, ${input.templateType}, NOW())
    RETURNING id
  `;
  const templateId = templateResult.rows[0]?.id as string;

  const htmlTemplate = input.htmlTemplate || renderSimpleBlocks(input.blocks || []);
  const versionResult = await sql`
    INSERT INTO email_template_versions (
      template_id,
      version_number,
      subject_template,
      html_template,
      blocks,
      from_name,
      from_email
    )
    VALUES (
      ${templateId},
      1,
      ${input.subjectTemplate},
      ${htmlTemplate},
      ${JSON.stringify(input.blocks || [])},
      ${input.fromName ?? 'The Equestrian'},
      ${input.fromEmail ?? 'support@theequestrian.com.au'}
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
}): Promise<{ versionId: string; versionNumber: number }> {
  const current = await sql`
    SELECT COALESCE(MAX(version_number), 0) AS max_version
    FROM email_template_versions
    WHERE template_id = ${input.templateId}
  `;
  const versionNumber = Number(current.rows[0]?.max_version || 0) + 1;
  const htmlTemplate = input.htmlTemplate || renderSimpleBlocks(input.blocks || []);

  const inserted = await sql`
    INSERT INTO email_template_versions (
      template_id,
      version_number,
      subject_template,
      html_template,
      blocks,
      from_name,
      from_email
    )
    VALUES (
      ${input.templateId},
      ${versionNumber},
      ${input.subjectTemplate},
      ${htmlTemplate},
      ${JSON.stringify(input.blocks || [])},
      ${input.fromName ?? 'The Equestrian'},
      ${input.fromEmail ?? 'support@theequestrian.com.au'}
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
} | null> {
  const result = await sql`
    SELECT id, template_id, subject_template, html_template, blocks, from_name, from_email
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
