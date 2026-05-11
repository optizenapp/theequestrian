import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { deleteStandaloneSocialPost, updateStandaloneSocialPost } from '@/lib/social/standalone-repository';
import type { StandaloneSocialPlatform, StandaloneSocialPostKind, StandaloneSocialVariant } from '@/lib/social/standalone-types';

function strings(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function platform(value: unknown): StandaloneSocialPlatform | undefined {
  return value === 'facebook' || value === 'instagram' || value === 'youtube' ? value : undefined;
}

function kind(value: unknown): StandaloneSocialPostKind | undefined {
  return value === 'text' || value === 'image' || value === 'video' ? value : undefined;
}

function variant(value: unknown): StandaloneSocialVariant | null | undefined {
  if (value === undefined) return undefined;
  return value === 'landscape_16_9' || value === 'vertical_9_16' ? value : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const post = await updateStandaloneSocialPost(id, {
      platform: platform(body.platform),
      postKind: kind(body.postKind),
      variant: variant(body.variant),
      content: typeof body.content === 'string' ? body.content.trim() : undefined,
      title: body.title === null || typeof body.title === 'string' ? body.title : undefined,
      mediaUrls: strings(body.mediaUrls),
      sourceUrl: body.sourceUrl === null || typeof body.sourceUrl === 'string' ? body.sourceUrl : undefined,
      sourceType: typeof body.sourceType === 'string' ? body.sourceType : undefined,
    });
    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update social post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    await deleteStandaloneSocialPost(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete social post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
