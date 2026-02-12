import { NextRequest, NextResponse } from 'next/server';
import { createTemplate, listTemplates } from '@/lib/email-platform/templates';
import type { EmailBlock, EmailTemplateVisualSettings } from '@/lib/email-platform/types';
import { logEmailAudit } from '@/lib/email-platform/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 1000);
    const templates = await listTemplates(limit);
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Failed to list templates:', error);
    return NextResponse.json({ error: 'Failed to list templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const subjectTemplate =
      typeof body?.subjectTemplate === 'string' ? body.subjectTemplate : 'An update from The Equestrian';
    const templateType =
      body?.templateType === 'sequence_step' || body?.templateType === 'review'
        ? body.templateType
        : 'campaign';

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const blocks = Array.isArray(body?.blocks) ? (body.blocks as EmailBlock[]) : [];
    const metadata =
      body?.metadata && typeof body.metadata === 'object'
        ? (body.metadata as EmailTemplateVisualSettings & Record<string, unknown>)
        : {};
    const created = await createTemplate({
      name,
      templateType,
      subjectTemplate,
      htmlTemplate: typeof body?.htmlTemplate === 'string' ? body.htmlTemplate : undefined,
      blocks,
      fromName: typeof body?.fromName === 'string' ? body.fromName : undefined,
      fromEmail: typeof body?.fromEmail === 'string' ? body.fromEmail : undefined,
      metadata,
    });
    await logEmailAudit({
      actor: 'admin',
      action: 'template_created',
      entityType: 'email_template',
      entityId: created.templateId,
      payload: { name, templateType },
    });
    return NextResponse.json({ ok: true, ...created });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
