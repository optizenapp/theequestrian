import { NextRequest, NextResponse } from 'next/server';
import { parseSupportedChannel } from '@/lib/social/channel';
import { buildMetaFallbackCopy } from '@/lib/social/copy/meta';
import { buildYoutubeCopy } from '@/lib/social/copy/service';
import type { SocialVariant } from '@/lib/social/copy/types';
import { buildYoutubeCopyContext } from '@/lib/social/copy/youtube-context';
import { loadCampaignSocialContext } from '@/lib/social/campaign-context';
import { listSocialPosts, updateSocialPostCopy } from '@/lib/social/repository';

function isMetaChannel(channel: string): channel is 'facebook' | 'instagram' {
  return channel === 'facebook' || channel === 'instagram';
}

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

    const copyContext = buildYoutubeCopyContext(context, variant as SocialVariant);
    if (channel === 'youtube') {
      const copyResult = await buildYoutubeCopy(copyContext);
      const post = await updateSocialPostCopy(target.id, copyResult.copy);
      return NextResponse.json({ ok: true, post, source: copyResult.source, rejectionReason: copyResult.rejectionReason ?? null });
    }
    if (!isMetaChannel(channel)) {
      return NextResponse.json({ error: `${channel} copy regeneration is not implemented yet` }, { status: 501 });
    }
    const post = await updateSocialPostCopy(target.id, buildMetaFallbackCopy(copyContext, channel));
    return NextResponse.json({ ok: true, post, source: 'fallback', rejectionReason: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to regenerate copy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
