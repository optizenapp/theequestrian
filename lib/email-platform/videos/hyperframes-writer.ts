import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildCampaignVideoHtml } from './composition';
import { buildBrandSlideVideoHtml } from './brand-slide-composition';
import { TIMING } from './brand-slides/slides';
import type { CampaignVideoVariant, RenderInput } from './video-render-types';

type VariantSpec = Omit<CampaignVideoVariant, 'videoUrl' | 'thumbnailUrl' | 'customThumbnailUrl'>;

const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

export async function writeHyperframesProject(
  input: RenderInput,
  projectDir: string,
  variant: VariantSpec
): Promise<void> {
  if (
    (input.compositionMode === 'brand_slides_v1' ||
      input.compositionMode === 'on_sale_slides_v1' ||
      input.compositionMode === 'category_slides_v1') &&
    input.brandSlides
  ) {
    await writeBrandSlidesProject(input, projectDir, variant);
    return;
  }
  await mkdir(path.join(projectDir, 'assets'), { recursive: true });
  const heroImagePath = input.heroImageBuffer ? 'assets/hero.jpg' : null;
  const logoImagePath = input.logoImageBuffer ? 'assets/logo.png' : null;
  let musicPath: string | null = null;
  if (input.heroImageBuffer) {
    await writeFile(path.join(projectDir, 'assets', 'hero.jpg'), input.heroImageBuffer);
  }
  if (input.logoImageBuffer) {
    await writeFile(path.join(projectDir, 'assets', 'logo.png'), input.logoImageBuffer);
  }
  if (input.musicBuffer) {
    const ext = input.musicContentType?.includes('wav')
      ? 'wav'
      : input.musicContentType?.includes('ogg')
        ? 'ogg'
        : 'mp3';
    musicPath = `assets/music.${ext}`;
    await writeFile(path.join(projectDir, musicPath), input.musicBuffer);
  }
  await writeFile(
    path.join(projectDir, 'index.html'),
    buildCampaignVideoHtml({
      subjectLine: input.subjectLine,
      subtitle: input.subtitle,
      ctaUrl: input.ctaUrl,
      logoImagePath,
      heroImagePath,
      musicPath,
      width: variant.width,
      height: variant.height,
      brand: input.brand,
    })
  );
  await writeHyperframesConfig(projectDir, variant, input.campaignId);
}

async function writeBrandSlidesProject(
  input: RenderInput,
  projectDir: string,
  variant: VariantSpec
): Promise<void> {
  const bs = input.brandSlides;
  if (!bs) throw new Error('brand_slides_v1 requires brandSlides payload');
  await mkdir(path.join(projectDir, 'assets'), { recursive: true });
  const products = bs.products;
  if (products.length < 3) throw new Error('Brand slides require three product slots');
  for (let i = 0; i < 3; i++) {
    const buf = products[i]?.imageBuffer ?? PLACEHOLDER_PNG;
    if (!products[i]?.imageBuffer) {
      console.warn(
        `[hyperframes-writer] product-${i + 1}.jpg missing imageBuffer (handle="${products[i]?.title ?? '-'}") — using placeholder`
      );
    }
    await writeFile(path.join(projectDir, 'assets', `product-${i + 1}.jpg`), buf);
    await writeFile(path.join(projectDir, 'assets', `product-${i + 1}-strip.jpg`), buf);
  }
  if (bs.siteLogoBuffer) {
    await writeFile(path.join(projectDir, 'assets', 'site-logo.png'), bs.siteLogoBuffer);
    await writeFile(path.join(projectDir, 'assets', 'site-logo-cta.png'), bs.siteLogoBuffer);
  } else {
    console.warn('[hyperframes-writer] site logo buffer missing');
  }
  if (bs.brandLogoBuffer) {
    await writeFile(path.join(projectDir, 'assets', 'brand-logo.png'), bs.brandLogoBuffer);
  }
  let musicPath: string | null = null;
  if (input.musicBuffer) {
    const ext = input.musicContentType?.includes('wav')
      ? 'wav'
      : input.musicContentType?.includes('ogg')
        ? 'ogg'
        : 'mp3';
    musicPath = `assets/music.${ext}`;
    await writeFile(path.join(projectDir, musicPath), input.musicBuffer);
  }
  const siteLogoPath = bs.siteLogoBuffer ? 'assets/site-logo.png' : null;
  const siteLogoCtaPath = bs.siteLogoBuffer ? 'assets/site-logo-cta.png' : null;
  const brandLogoPath = bs.brandLogoBuffer ? 'assets/brand-logo.png' : null;
  await writeFile(
    path.join(projectDir, 'index.html'),
    buildBrandSlideVideoHtml({
      variant: bs.variant,
      categoryHandle: bs.categoryHandle,
      width: variant.width,
      height: variant.height,
      subjectLine: bs.subjectLine,
      brandName: bs.brandName,
      aboutText: bs.aboutText,
      slideCopy: bs.slideCopy,
      brand: input.brand,
      musicPath,
      siteLogoPath,
      siteLogoCtaPath,
      brandLogoPath,
      product1: products[0],
      product2: products[1],
      product3: products[2],
      totalDurationSeconds: input.totalDurationSeconds ?? null,
    })
  );
  await writeHyperframesConfig(projectDir, variant, input.campaignId, input.totalDurationSeconds ?? null);
}

async function writeHyperframesConfig(
  projectDir: string,
  variant: VariantSpec,
  campaignId: string,
  totalDurationSeconds: number | null = null
): Promise<void> {
  const duration =
    totalDurationSeconds && totalDurationSeconds > TIMING.total
      ? Number(totalDurationSeconds.toFixed(2))
      : TIMING.total;
  await writeFile(
    path.join(projectDir, 'hyperframes.json'),
    JSON.stringify(
      {
        composition: 'index.html',
        output: { dir: 'out', filename: `campaign-video-${variant.key}.mp4` },
        render: { width: variant.width, height: variant.height, fps: 30, duration },
      },
      null,
      2
    )
  );
  await writeFile(
    path.join(projectDir, 'meta.json'),
    JSON.stringify({ name: `campaign-video-${campaignId}`, created: new Date().toISOString() }, null, 2)
  );
}
