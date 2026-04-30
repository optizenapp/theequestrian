import { NextRequest, NextResponse } from 'next/server';
import { parseSupportedChannel } from '@/lib/social/channel';
import {
  loadCampaignSocialContext,
  resolveVideoModeFromContext,
  type CampaignSocialContext,
} from '@/lib/social/campaign-context';
import { listAllPostsForVideo, updateSocialPostCopy } from '@/lib/social/repository';
import { validateYoutubeCopy } from '@/lib/social/copy/validation';
import { normalizeYoutubeDescription, stripSaleLanguage } from '@/lib/social/copy/normalize';
import type { CampaignVideoMode } from '@/lib/social/copy/types';
import {
  buildCrossLinkLines,
  extractPublishedSiblings,
  injectCrossLinks,
  siblingsForCurrent,
  type SocialPostSibling,
} from '@/lib/social/cross-links';
import type { SocialPostRow } from '@/lib/social/repository';

function readString(source: Record<string, unknown> | null | undefined, key: string): string {
  if (!source) return '';
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readSlideCopyTitle(context: CampaignSocialContext): string {
  const slideCopy = context.promptJson.slideCopy;
  if (slideCopy && typeof slideCopy === 'object' && !Array.isArray(slideCopy)) {
    const s1 = (slideCopy as Record<string, unknown>).s1;
    if (s1 && typeof s1 === 'object' && !Array.isArray(s1)) {
      const title = readString(s1 as Record<string, unknown>, 'title');
      if (title) return title;
    }
  }
  return '';
}

function buildHookForContext(context: CampaignSocialContext, mode: CampaignVideoMode): string {
  const slideTitle = readSlideCopyTitle(context);
  if (slideTitle) {
    return mode === 'on_sale_slides_v1' ? slideTitle : stripSaleLanguage(slideTitle) || slideTitle;
  }
  const brand = readString(context.promptJson, 'brandName');
  const category = readString(context.promptJson, 'categoryName');
  if (mode === 'brand_slides_v1' && brand) return `Browse the ${brand} range at The Equestrian`;
  if (mode === 'category_slides_v1' && category) return `Discover the ${category} edit at The Equestrian`;
  if (mode === 'on_sale_slides_v1') return 'On Sale picks at The Equestrian';
  return 'New picks at The Equestrian';
}

function normalizePostForDisplay(
  post: SocialPostRow,
  siblings: SocialPostSibling[],
  mode: CampaignVideoMode,
  hook: string
): SocialPostRow {
  if (post.channel !== 'youtube') return post;
  const desc = post.copyJson?.description;
  if (typeof desc !== 'string' || !desc) return post;
  const others = siblingsForCurrent(siblings, { channel: post.channel, variant: post.variant });
  const crossLines = buildCrossLinkLines(others);
  let next = normalizeYoutubeDescription(desc, { mode, hook });
  next = injectCrossLinks(next, crossLines);
  let nextTitle = post.copyJson?.title;
  if (mode !== 'on_sale_slides_v1' && typeof nextTitle === 'string' && nextTitle) {
    const stripped = stripSaleLanguage(nextTitle).trim();
    if (stripped) {
      nextTitle = stripped;
    } else if (hook) {
      nextTitle = `${hook} | The Equestrian`;
    }
  }
  if (next === desc && nextTitle === post.copyJson?.title) return post;
  return {
    ...post,
    copyJson: { ...post.copyJson, description: next, ...(typeof nextTitle === 'string' ? { title: nextTitle } : {}) },
  };
}

export async function GET(
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
    const mode = resolveVideoModeFromContext(context);
    const hook = buildHookForContext(context, mode);
    const allPosts = await listAllPostsForVideo(context.campaignVideoId);
    const siblings = extractPublishedSiblings(allPosts);
    const posts = allPosts
      .filter((p) => p.channel === channel)
      .sort((a, b) => (a.variant === 'landscape_16_9' ? -1 : 1));
    return NextResponse.json({
      posts: posts.map((post) => normalizePostForDisplay(post, siblings, mode, hook)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load social posts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const resolved = await params;
    const campaignId = String(resolved.id || '');
    const channel = parseSupportedChannel(String(resolved.channel || ''));
    if (!channel) return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    const body = (await request.json()) as { postId?: string; copy?: unknown };
    const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
    if (!postId) return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    if (channel !== 'youtube') {
      return NextResponse.json({ error: `${channel} copy editing is not implemented yet` }, { status: 501 });
    }
    const copy = body.copy;
    const copyObject = copy && typeof copy === 'object' && !Array.isArray(copy)
      ? (copy as Record<string, unknown>)
      : null;
    if (!copyObject) {
      return NextResponse.json({ error: 'copy payload is required' }, { status: 400 });
    }
    const variantValue = typeof copyObject.variant === 'string' ? copyObject.variant : '';
    if (variantValue !== 'landscape_16_9' && variantValue !== 'vertical_9_16') {
      return NextResponse.json({ error: 'copy.variant must be landscape_16_9 or vertical_9_16' }, { status: 400 });
    }
    const context = await loadCampaignSocialContext(campaignId);
    const mode = resolveVideoModeFromContext(context);
    const validated = validateYoutubeCopy(copyObject, variantValue, { mode });
    if (!validated.ok) {
      return NextResponse.json({ error: `Invalid copy: ${validated.reason}` }, { status: 400 });
    }
    const post = await updateSocialPostCopy(postId, validated.copy);
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update social post copy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
