import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runCommand, uploadToS3WithRetry } from './render-utils';
import { buildThumbnailFilenameSlug } from './thumbnail-filename';
import { renderCustomThumbnailBuffer, bufferToDataUrl } from './thumbnail-render';
import type { ThumbnailCompositionInput } from './thumbnail-composition';
import type { CampaignVideoVariant, RenderInput } from './video-render-types';

export type GenerateThumbnailsResult = {
  thumbnailUrl: string | null;
  customThumbnailUrl: string | null;
};

type VariantSpec = Pick<CampaignVideoVariant, 'key'>;

function resolveFilenameContext(input: RenderInput) {
  const slides = input.brandSlides;
  return {
    mode: input.compositionMode,
    subjectLine: input.subjectLine || null,
    brandName: slides?.variant === 'brand' ? slides.brandName : null,
    categoryName: slides?.variant === 'category' ? slides?.brandName ?? slides?.categoryHandle ?? null : null,
  };
}

async function extractFrameThumbnail(
  videoPath: string,
  projectDir: string,
  variantKey: VariantSpec['key'],
  stagePrefix: string,
  slug: string
): Promise<string | null> {
  const thumbPath = path.join(projectDir, 'out', `campaign-thumb-${variantKey}.jpg`);
  try {
    await runCommand(
      'ffmpeg',
      ['-y', '-ss', '14.0', '-i', videoPath, '-frames:v', '1', '-q:v', '2', thumbPath],
      projectDir,
      `${stagePrefix}:ffmpeg-thumb`
    );
    const buffer = await readFile(thumbPath);
    return await uploadToS3WithRetry(buffer, 'articles/uploads', 'image/jpeg', `${stagePrefix}:thumbnail`, { slug });
  } catch {
    console.warn(`[video-render] frame thumbnail failed for ${variantKey}`);
    return null;
  }
}

function buildCompositionInput(
  input: RenderInput,
  variantKey: VariantSpec['key']
): ThumbnailCompositionInput {
  const slides = input.brandSlides;
  const productBuffer = slides?.products?.[0]?.imageBuffer ?? input.heroImageBuffer ?? null;
  return {
    variant: variantKey,
    subjectLine: input.subjectLine,
    brand: input.brand,
    brandSlides: slides,
    siteLogoDataUrl: bufferToDataUrl(slides?.siteLogoBuffer ?? input.logoImageBuffer ?? null, 'image/png'),
    brandLogoDataUrl: bufferToDataUrl(slides?.brandLogoBuffer ?? null, 'image/png'),
    productImageDataUrl: bufferToDataUrl(productBuffer, 'image/jpeg'),
  };
}

async function renderCustomThumbnail(
  input: RenderInput,
  variantKey: VariantSpec['key'],
  stagePrefix: string,
  slug: string
): Promise<string | null> {
  try {
    const composition = buildCompositionInput(input, variantKey);
    const buffer = await renderCustomThumbnailBuffer(composition);
    if (!buffer || buffer.length === 0) return null;
    return await uploadToS3WithRetry(buffer, 'articles/uploads', 'image/jpeg', `${stagePrefix}:custom-thumb`, { slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.warn(`[video-render] custom thumbnail failed for ${variantKey}: ${message}`);
    return null;
  }
}

export async function generateAndUploadThumbnails(args: {
  input: RenderInput;
  variantKey: VariantSpec['key'];
  videoPath: string;
  projectDir: string;
  stagePrefix: string;
}): Promise<GenerateThumbnailsResult> {
  const { input, variantKey, videoPath, projectDir, stagePrefix } = args;
  const filenameContext = resolveFilenameContext(input);
  const frameSlug = buildThumbnailFilenameSlug(filenameContext, variantKey, 'frame');
  const customSlug = buildThumbnailFilenameSlug(filenameContext, variantKey, 'custom');

  const [thumbnailUrl, customThumbnailUrl] = await Promise.all([
    extractFrameThumbnail(videoPath, projectDir, variantKey, stagePrefix, frameSlug),
    renderCustomThumbnail(input, variantKey, stagePrefix, customSlug),
  ]);

  return { thumbnailUrl, customThumbnailUrl };
}
