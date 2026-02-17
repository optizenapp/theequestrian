import { NextRequest, NextResponse } from 'next/server';
import { getTemplateVersion } from '@/lib/email-platform/templates';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const version = await getTemplateVersion(id);
    if (!version) {
      return NextResponse.json({ error: 'Template version not found' }, { status: 404 });
    }
    return NextResponse.json({ version });
  } catch (error) {
    console.error('Failed to load template version:', error);
    return NextResponse.json({ error: 'Failed to load template version' }, { status: 500 });
  }
}
