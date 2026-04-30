import { rm } from 'node:fs/promises';
import path from 'node:path';
import { renderVariant } from './render-variant';
import { VARIANT_TIMEOUT_MS, withTimeout } from './render-utils';
import { TIMING } from './brand-slides/slides';
import type {
  CampaignVideoRenderResult,
  CampaignVideoVariant,
  RenderInput,
} from './video-render-types';

export type { CampaignVideoRenderResult, CampaignVideoVariant, RenderInput } from './video-render-types';

const VIDEO_VARIANT_SPECS: Array<Omit<CampaignVideoVariant, 'videoUrl' | 'thumbnailUrl' | 'customThumbnailUrl'>> = [
  {
    key: 'landscape_16_9',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    platformTargets: ['youtube', 'x'],
  },
  {
    key: 'vertical_9_16',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    platformTargets: ['youtube_shorts', 'instagram_reels', 'tiktok', 'facebook_reels', 'x'],
  },
];

export async function renderCampaignVideoToS3(input: RenderInput): Promise<CampaignVideoRenderResult> {
  const runId = `${Date.now()}`;
  const promptPayload = { ...input.promptPayload, runId };
  try {
    console.log(`[video-render] start campaign=${input.campaignId} run=${runId}`);
    const settled = await Promise.allSettled(
      VIDEO_VARIANT_SPECS.map((spec) =>
        withTimeout(renderVariant(input, runId, spec), VARIANT_TIMEOUT_MS, `${spec.key} variant`)
      )
    );
    const variants: CampaignVideoVariant[] = [];
    settled.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        variants.push(result.value);
      } else {
        const reason =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.error(`[video-render] variant ${VIDEO_VARIANT_SPECS[i].key} failed: ${reason}`);
      }
    });
    const primaryVariant = variants.find((v) => v.key === 'landscape_16_9') || variants[0];
    if (!primaryVariant) {
      throw new Error('No video variants rendered successfully');
    }
    console.log(
      `[video-render] completed campaign=${input.campaignId} run=${runId} variants=${variants
        .map((v) => v.key)
        .join(',')}`
    );
    const durationSeconds =
      input.totalDurationSeconds && input.totalDurationSeconds > TIMING.total
        ? Number(input.totalDurationSeconds.toFixed(2))
        : TIMING.total;
    return {
      videoUrl: primaryVariant.videoUrl,
      thumbnailUrl: primaryVariant.thumbnailUrl,
      variants,
      durationSeconds,
      promptPayload: {
        ...promptPayload,
        durationSeconds,
        variants: variants.map((variant) => ({
          key: variant.key,
          width: variant.width,
          height: variant.height,
          aspectRatio: variant.aspectRatio,
          platformTargets: variant.platformTargets,
        })),
      },
    };
  } finally {
    console.log(`[video-render] cleanup campaign=${input.campaignId} run=${runId}`);
    await rm(path.join(process.cwd(), 'tmp', 'campaign-videos', input.campaignId, runId), {
      recursive: true,
      force: true,
    });
  }
}
