import { NextRequest, NextResponse } from 'next/server';
import { parseSupportedChannel } from '@/lib/social/channel';
import { loadCampaignSocialContext } from '@/lib/social/campaign-context';
import { publishToFacebook } from '@/lib/social/publishers/facebook';
import { publishToInstagram } from '@/lib/social/publishers/instagram';
import { publishToYoutube } from '@/lib/social/publishers/youtube';
import { listSocialPosts, updateSocialPostStatus } from '@/lib/social/repository';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const resolved = await params;
    const campaignId = String(resolved.id || '');
    const channel = parseSupportedChannel(String(resolved.channel || ''));
    if (!campaignId || !channel) {
      return NextResponse.json({ error: 'Invalid campaign id or channel' }, { status: 400 });
    }
    const body = (await request.json()) as { variant?: string };
    const variant = typeof body.variant === 'string' ? body.variant : '';
    if (variant !== 'landscape_16_9' && variant !== 'vertical_9_16') {
      return NextResponse.json({ error: 'variant must be landscape_16_9 or vertical_9_16' }, { status: 400 });
    }

    const context = await loadCampaignSocialContext(campaignId);
    const posts = await listSocialPosts(context.campaignVideoId, channel);
    const target = posts.find((item) => item.variant === variant);
    if (!target) {
      return NextResponse.json({ error: `No social post found for variant ${variant}` }, { status: 404 });
    }

    await updateSocialPostStatus(target.id, 'publishing', { errorMessage: null });
    const publishResult =
      channel === 'youtube'
        ? await publishToYoutube(target.id)
        : channel === 'facebook'
          ? await publishToFacebook(target.id)
          : channel === 'instagram'
            ? await publishToInstagram(target.id)
            : { ok: false as const, error: `${channel} publishing not implemented yet` };
    if (!publishResult.ok) {
      return NextResponse.json({ error: publishResult.error }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      postId: target.id,
      variant,
      externalPostId:
        'videoId' in publishResult ? publishResult.videoId : 'postId' in publishResult ? publishResult.postId : publishResult.mediaId,
      externalUrl: publishResult.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish social post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
