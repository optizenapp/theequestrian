import { sql } from '@vercel/postgres';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import { loadBrandStyle } from './brand';
import {
  getCampaignProductHandles,
  loadCampaignVideoRow,
  resolveCampaignLogoBuffer,
  resolveCampaignSubjectLine,
  type CampaignVideoRow,
} from './campaign-video-context';
import {
  extractBrandAboutFromTemplateBlocks,
  loadSiteLogoForBrandVideo,
  resolveBrandNameForVideo,
} from './brand-video-content';
import { loadBrandVideoProducts, padProductsToThree } from './brand-video-products';
import { resolveCategoryDisplayName } from './campaign-video-category-resolve';
import { buildValidatedSlideCopy } from './copy-service';
import { getSlideCopyOverride } from './slide-copy-override';
import { generateAndUploadThumbnails } from './thumbnail';
import type { BrandSlidesPayload, RenderInput, SlideVariant } from './video-render-types';

type VariantKey = 'landscape_16_9' | 'vertical_9_16';

function resolveVariantFromMode(template: string | null): SlideVariant {
  if (template === 'on_sale_slides_v1') return 'on_sale';
  if (template === 'category_slides_v1') return 'category';
  return 'brand';
}

async function buildBrandSlidesPayload(args: {
  campaign: CampaignVideoRow;
  subjectLine: string;
  template: string | null;
}): Promise<BrandSlidesPayload | null> {
  const { campaign, subjectLine, template } = args;
  const handles = getCampaignProductHandles(campaign.metadata);
  if (handles.length === 0) return null;
  const variant = resolveVariantFromMode(template);
  const productsRaw = await loadBrandVideoProducts(handles);
  if (productsRaw.length === 0) return null;
  const products = padProductsToThree(productsRaw);
  const brandName = resolveBrandNameForVideo(campaign, products);
  const aboutText = extractBrandAboutFromTemplateBlocks(campaign.template_blocks) || '';
  const [siteLogoBuffer, brandLogoBuffer] = await Promise.all([
    loadSiteLogoForBrandVideo(),
    resolveCampaignLogoBuffer(campaign),
  ]);
  const ctaUrl = 'https://www.theequestrian.com.au';
  const productTitles = products.map((p) => p.title).filter(Boolean);
  let displayName = brandName;
  let categoryHandle: string | null = null;
  if (variant === 'category') {
    displayName = resolveCategoryDisplayName(campaign);
    categoryHandle = handles[0] ?? null;
  } else if (variant === 'on_sale') {
    displayName = 'Sale Picks';
  }
  const slideCopyResult = await buildValidatedSlideCopy(
    {
      variant,
      subjectLine,
      displayName,
      aboutText,
      categoryHandle,
      ctaUrl,
      productTitles,
    },
    { override: getSlideCopyOverride(campaign.metadata) }
  );
  return {
    variant,
    brandName: variant === 'category' ? displayName : brandName,
    aboutText,
    subjectLine,
    slideCopy: slideCopyResult.copy,
    categoryHandle,
    products,
    siteLogoBuffer,
    brandLogoBuffer,
  };
}

async function downloadVideoToTmp(videoUrl: string, projectDir: string, variantKey: VariantKey): Promise<string> {
  const outDir = path.join(projectDir, 'out');
  await mkdir(outDir, { recursive: true });
  const localPath = path.join(outDir, `campaign-video-${variantKey}.mp4`);
  const response = await fetch(videoUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(localPath, bytes);
  return localPath;
}

type RenderConfigVariant = {
  key: VariantKey;
  videoUrl: string;
  thumbnailUrl: string | null;
  customThumbnailUrl: string | null;
  [k: string]: unknown;
};

export async function regenerateCampaignThumbnails(campaignId: string): Promise<{ updated: VariantKey[] }> {
  await ensureEmailPlatformSchema();
  const videoRow = await sql`
    SELECT render_config_json, prompt_json FROM email_campaign_videos WHERE campaign_id = ${campaignId} LIMIT 1
  `;
  const row = videoRow.rows[0];
  if (!row) throw new Error('No campaign video found');
  const renderConfig = (row.render_config_json as Record<string, unknown> | null) || {};
  const variants = Array.isArray(renderConfig.variants) ? (renderConfig.variants as RenderConfigVariant[]) : [];
  if (variants.length === 0) throw new Error('No video variants to regenerate thumbnails for');
  const template = typeof renderConfig.template === 'string' ? renderConfig.template : null;

  const campaign = await loadCampaignVideoRow(campaignId);
  const subjectLine = resolveCampaignSubjectLine(campaign);
  const brand = await loadBrandStyle();
  const brandSlides = await buildBrandSlidesPayload({ campaign, subjectLine, template });

  const baseInput: RenderInput = {
    campaignId,
    subjectLine,
    subtitle: '',
    ctaUrl: 'https://www.theequestrian.com.au',
    brand,
    logoImageBuffer: brandSlides?.siteLogoBuffer ?? null,
    heroImageBuffer: brandSlides?.products[0]?.imageBuffer ?? null,
    musicBuffer: null,
    musicContentType: null,
    promptPayload: {},
    compositionMode:
      template === 'on_sale_slides_v1' || template === 'category_slides_v1' || template === 'brand_slides_v1'
        ? template
        : 'default',
    brandSlides,
  };

  const projectRoot = path.join(process.cwd(), 'tmp', 'campaign-videos', campaignId, `regen-thumbs-${Date.now()}`);
  const updated: VariantKey[] = [];
  try {
    for (const variant of variants) {
      if (!variant?.key || !variant.videoUrl) continue;
      const projectDir = path.join(projectRoot, variant.key);
      const videoPath = await downloadVideoToTmp(variant.videoUrl, projectDir, variant.key);
      const result = await generateAndUploadThumbnails({
        input: baseInput,
        variantKey: variant.key,
        videoPath,
        projectDir,
        stagePrefix: `${campaignId}:${variant.key}:regen`,
      });
      variant.thumbnailUrl = result.thumbnailUrl;
      variant.customThumbnailUrl = result.customThumbnailUrl;
      updated.push(variant.key);
    }
  } finally {
    await rm(projectRoot, { recursive: true, force: true }).catch(() => undefined);
  }

  const primary = variants.find((v) => v.key === 'landscape_16_9') || variants[0];
  await sql`
    UPDATE email_campaign_videos
    SET render_config_json = ${JSON.stringify({ ...renderConfig, variants })}::jsonb,
        s3_thumbnail_url = ${primary?.thumbnailUrl ?? null},
        updated_at = NOW()
    WHERE campaign_id = ${campaignId}
  `;
  return { updated };
}
