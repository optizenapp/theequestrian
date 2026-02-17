import { NextRequest, NextResponse } from 'next/server';
import {
  createTemplateVersion,
  normalizeEmailBlocks,
  normalizeTemplateMetadata,
} from '@/lib/email-platform/templates';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const subjectTemplate =
      typeof body?.subjectTemplate === 'string' ? body.subjectTemplate : 'An update from The Equestrian';
    const blocks = normalizeEmailBlocks(body?.blocks);
    const metadata = normalizeTemplateMetadata(
      body?.metadata && typeof body.metadata === 'object'
        ? (body.metadata as Record<string, unknown>)
        : {}
    );

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
