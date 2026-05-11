import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { createStandaloneSocialPost, listStandaloneSocialPosts } from '@/lib/social/standalone-repository';
import type { StandaloneSocialPlatform, StandaloneSocialPostKind, StandaloneSocialVariant } from '@/lib/social/standalone-types';

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function parsePlatform(value: unknown): StandaloneSocialPlatform {
  if (value === 'facebook' || value === 'instagram' || value === 'youtube') return value;
  throw new Error('platform must be facebook, instagram, or youtube');
}

function parsePostKind(value: unknown): StandaloneSocialPostKind {
  if (value === 'text' || value === 'image' || value === 'video') return value;
  throw new Error('postKind must be text, image, or video');
}

function parseVariant(value: unknown): StandaloneSocialVariant | null {
  if (value === 'landscape_16_9' || value === 'vertical_9_16') return value;
  return null;
}

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ posts: await listStandaloneSocialPosts() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list social posts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });
    const platform = parsePlatform(body.platform);
    const postKind = parsePostKind(body.postKind);
    if (platform === 'youtube' && postKind !== 'video') {
      return NextResponse.json({ error: 'YouTube text/community posts are not supported by the official API. Use Create video from URL for YouTube.' }, { status: 400 });
    }
    const post = await createStandaloneSocialPost({
      platform,
      postKind,
      variant: parseVariant(body.variant),
      content,
      title: typeof body.title === 'string' ? body.title.trim() : null,
      mediaUrls: parseStringArray(body.mediaUrls),
      sourceUrl: typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : null,
      sourceType: typeof body.sourceType === 'string' && body.sourceType.trim() ? body.sourceType.trim() : 'manual',
      metadata: body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {},
    });
    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create social post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
