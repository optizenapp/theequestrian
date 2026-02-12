import { NextRequest, NextResponse } from 'next/server';
import { createTemplateVersion } from '@/lib/email-platform/templates';
import type { EmailBlock, EmailTemplateVisualSettings } from '@/lib/email-platform/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const subjectTemplate =
      typeof body?.subjectTemplate === 'string' ? body.subjectTemplate : 'An update from The Equestrian';
    const blocks = Array.isArray(body?.blocks) ? (body.blocks as EmailBlock[]) : [];
    const metadata =
      body?.metadata && typeof body.metadata === 'object'
        ? (body.metadata as EmailTemplateVisualSettings & Record<string, unknown>)
        : {};

    const version = await createTemplateVersion({
      templateId: id,
      subjectTemplate,
      htmlTemplate: typeof body?.htmlTemplate === 'string' ? body.htmlTemplate : undefined,
      blocks,
      fromName: typeof body?.fromName === 'string' ? body.fromName : undefined,
      fromEmail: typeof body?.fromEmail === 'string' ? body.fromEmail : undefined,
      setActive: body?.setActive !== false,
      metadata,
    });

    return NextResponse.json({ ok: true, ...version });
  } catch (error) {
    console.error('Failed to create template version:', error);
    return NextResponse.json({ error: 'Failed to create template version' }, { status: 500 });
  }
}
