import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { createStandaloneSocialPost } from '@/lib/social/standalone-repository';
import { buildFallbackSocialCopy, loadSocialUrlContext } from '@/lib/social/url-context';

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = (await request.json()) as { sourceUrl?: string; platform?: string; variant?: string; videoUrl?: string };
    if (!body.sourceUrl?.trim()) return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 });
    const platform = body.platform === 'facebook' || body.platform === 'instagram' ? body.platform : 'youtube';
    const variant = body.variant === 'landscape_16_9' ? 'landscape_16_9' : 'vertical_9_16';
    const context = await loadSocialUrlContext(body.sourceUrl);
    const mediaUrls = body.videoUrl?.trim() ? [body.videoUrl.trim()] : [];
    const post = await createStandaloneSocialPost({
      platform,
      postKind: 'video',
      variant,
      title: context.title || 'URL video draft',
      content: buildFallbackSocialCopy(context, platform),
      sourceUrl: context.sourceUrl,
      sourceType: 'url_video',
      mediaUrls,
      metadata: {
        urlVideoStatus: mediaUrls.length ? 'asset_attached' : 'needs_video_asset',
        imageCandidates: context.images,
      },
    });
    return NextResponse.json({ post, imageCandidates: context.images });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create URL video draft';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
