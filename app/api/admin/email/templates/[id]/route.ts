import { NextRequest, NextResponse } from 'next/server';
import {
  createTemplateVersion,
  getTemplateWithActiveVersion,
  normalizeEmailBlocks,
  normalizeTemplateMetadata,
  updateTemplateName,
} from '@/lib/email-platform/templates';
import { logEmailAudit } from '@/lib/email-platform/audit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getTemplateWithActiveVersion(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error) {
    console.error('Failed to fetch template detail:', error);
    return NextResponse.json({ error: 'Failed to fetch template detail' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const template = await getTemplateWithActiveVersion(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (name) {
      await updateTemplateName(id, name);
    }

    const subjectTemplate =
      typeof body?.subjectTemplate === 'string'
        ? body.subjectTemplate
        : template.version?.subjectTemplate || 'An update from The Equestrian';
    const blocks = normalizeEmailBlocks(body?.blocks);
    const metadata = normalizeTemplateMetadata(
      body?.metadata && typeof body.metadata === 'object'
        ? (body.metadata as Record<string, unknown>)
        : template.version?.metadata || {}
    );

    const version = await createTemplateVersion({
      templateId: id,
      subjectTemplate,
      htmlTemplate: typeof body?.htmlTemplate === 'string' ? body.htmlTemplate : undefined,
      blocks,
      fromName: typeof body?.fromName === 'string' ? body.fromName : template.version?.fromName || undefined,
      fromEmail:
        typeof body?.fromEmail === 'string' ? body.fromEmail : template.version?.fromEmail || undefined,
      setActive: true,
      metadata,
    });

    await logEmailAudit({
      actor: 'admin',
      action: 'template_updated',
      entityType: 'email_template',
      entityId: id,
      payload: { versionId: version.versionId, versionNumber: version.versionNumber },
    });

    return NextResponse.json({ ok: true, ...version });
  } catch (error) {
    console.error('Failed to update template:', error);
    const message = error instanceof Error ? error.message : 'Failed to update template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
