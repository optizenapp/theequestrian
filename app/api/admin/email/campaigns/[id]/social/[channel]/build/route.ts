import { NextRequest, NextResponse } from 'next/server';
import { logEmailAudit } from '@/lib/email-platform/audit';
import { parseSupportedChannel } from '@/lib/social/channel';
import { buildYoutubeCopy } from '@/lib/social/copy/service';
import type { SocialVariant } from '@/lib/social/copy/types';
import { buildYoutubeCopyContext } from '@/lib/social/copy/youtube-context';
import { loadCampaignSocialContext } from '@/lib/social/campaign-context';
import { listSocialPosts, upsertSocialPost } from '@/lib/social/repository';

function resolveVariants(channel: string): SocialVariant[] {
  if (channel === 'youtube') return ['landscape_16_9', 'vertical_9_16'];
  return ['landscape_16_9'];
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const resolved = await params;
    const campaignId = String(resolved.id || '');
    const channel = parseSupportedChannel(String(resolved.channel || ''));
    if (!campaignId || !channel) {
      return NextResponse.json({ error: 'Invalid campaign id or channel' }, { status: 400 });
    }

    const context = await loadCampaignSocialContext(campaignId);
    if (context.campaignVideoStatus !== 'approved') {
      return NextResponse.json({ error: 'Campaign video must be approved before social post build' }, { status: 400 });
    }

    for (const variant of resolveVariants(channel)) {
      if (channel === 'youtube') {
        const copyContext = buildYoutubeCopyContext(context, variant);
        const copyResult = await buildYoutubeCopy(copyContext);
        await upsertSocialPost({
          campaignVideoId: context.campaignVideoId,
          channel,
          variant,
          status: 'ready_for_review',
          copyJson: copyResult.copy,
        });
      } else {
        await upsertSocialPost({
          campaignVideoId: context.campaignVideoId,
          channel,
          variant,
          status: 'ready_for_review',
          copyJson: {
            placeholder: true,
            note: `${channel} publishing is not implemented yet.`,
          },
        });
      }
    }

    const posts = await listSocialPosts(context.campaignVideoId, channel);
    await logEmailAudit({
      actor: 'admin',
      action: 'campaign_social_post_built',
      entityType: 'email_campaign',
      entityId: campaignId,
      payload: { channel, postCount: posts.length },
    });
    return NextResponse.json({ ok: true, posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build social post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
