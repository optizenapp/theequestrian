import puppeteer from 'puppeteer';
import { buildThumbnailHtml, getThumbnailViewport, type ThumbnailCompositionInput } from './thumbnail-composition';

const RENDER_TIMEOUT_MS = 30_000;

export async function renderCustomThumbnailBuffer(
  input: ThumbnailCompositionInput
): Promise<Buffer> {
  const html = buildThumbnailHtml(input);
  const viewport = getThumbnailViewport(input.variant);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
    });
    await page.setDefaultNavigationTimeout(RENDER_TIMEOUT_MS);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: RENDER_TIMEOUT_MS });
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 88,
      fullPage: false,
      clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
    });
    return Buffer.from(screenshot);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export function bufferToDataUrl(buffer: Buffer | null, contentType: string): string | null {
  if (!buffer || buffer.length === 0) return null;
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}
