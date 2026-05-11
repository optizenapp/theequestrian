import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { deleteSocialPromptTemplate, updateSocialPromptTemplate } from '@/lib/social/prompt-repository';

function parseBody(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt.trim() : '';
  const userPrompt = typeof body.userPrompt === 'string' ? body.userPrompt.trim() : '';
  if (!name || !systemPrompt || !userPrompt) throw new Error('name, systemPrompt, and userPrompt are required');
  return {
    name,
    systemPrompt,
    userPrompt,
    description: typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null,
    isActive: body.isActive !== false,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const prompt = await updateSocialPromptTemplate(id, parseBody((await request.json()) as Record<string, unknown>));
    return NextResponse.json({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update social prompt';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    await deleteSocialPromptTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete social prompt';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
