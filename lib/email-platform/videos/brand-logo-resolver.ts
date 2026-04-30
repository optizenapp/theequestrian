import { getCollectionByHandle } from '@/lib/shopify/collections';
import { loadLogoBuffer } from './brand';
import type { CampaignVideoRow } from './campaign-video-context';

type LogoCandidate = { url: string; source: string };

export async function resolveBrandLogoBuffer(campaign: CampaignVideoRow): Promise<Buffer | null> {
  const meta = campaign.metadata || {};
  const brandHandle = typeof meta.brandHandle === 'string' ? meta.brandHandle.trim().toLowerCase() : '';
  const brandName = typeof meta.brandName === 'string' ? meta.brandName.trim().toLowerCase() : '';

  logDiagnostics(campaign, brandHandle, brandName);

  const candidates = collectCandidates(campaign, brandHandle, brandName);
  for (const candidate of candidates) {
    const buffer = await tryFetchBuffer(candidate.url);
    if (buffer) {
      console.log(`[brand-logo] resolved via=${candidate.source} url=${candidate.url.slice(0, 120)}`);
      return buffer;
    }
    console.warn(`[brand-logo] candidate failed via=${candidate.source} url=${candidate.url.slice(0, 120)}`);
  }

  if (brandHandle) {
    const shopifyUrl = await fetchShopifyCollectionImage(brandHandle);
    if (shopifyUrl) {
      const buffer = await tryFetchBuffer(shopifyUrl);
      if (buffer) {
        console.log(`[brand-logo] resolved via=shopify_collection url=${shopifyUrl.slice(0, 120)}`);
        return buffer;
      }
    }
  }

  console.warn('[brand-logo] no brand logo image fetched; using site logo fallback');
  return loadLogoBuffer();
}

function collectCandidates(campaign: CampaignVideoRow, brandHandle: string, brandName: string): LogoCandidate[] {
  const out: LogoCandidate[] = [];
  const meta = campaign.metadata || {};
  const blocks = Array.isArray(campaign.template_blocks)
    ? (campaign.template_blocks as Array<Record<string, unknown>>)
    : [];
  const seen = new Set<string>();
  const push = (url: string, source: string) => {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push({ url: trimmed, source });
  };

  for (const block of blocks) {
    if (block?.type !== 'image' || typeof block.url !== 'string') continue;
    if (!/^https?:\/\//i.test(block.url)) continue;
    const linkUrl = typeof block.linkUrl === 'string' ? block.linkUrl.toLowerCase() : '';
    const alt = typeof block.alt === 'string' ? block.alt.trim().toLowerCase() : '';
    if (brandHandle && linkUrl.includes(`/brands/${brandHandle}`)) {
      push(block.url, `template:linkUrl=/brands/${brandHandle}`);
    } else if (brandName && alt && alt === brandName) {
      push(block.url, `template:alt="${brandName}"`);
    } else if (brandName && alt && alt.includes(brandName)) {
      push(block.url, `template:alt~="${brandName}"`);
    }
  }
  for (const block of blocks) {
    if (block?.type !== 'image' || typeof block.url !== 'string') continue;
    if (!/^https?:\/\//i.test(block.url)) continue;
    const linkUrl = typeof block.linkUrl === 'string' ? block.linkUrl.toLowerCase() : '';
    if (linkUrl.includes('/brands/')) {
      push(block.url, 'template:any /brands/ (brand container)');
    }
  }
  if (typeof meta.logoUrl === 'string' && meta.logoUrl.trim()) {
    push(meta.logoUrl.trim(), 'metadata.logoUrl');
  }
  return out;
}

function logDiagnostics(campaign: CampaignVideoRow, brandHandle: string, brandName: string): void {
  const blocks = Array.isArray(campaign.template_blocks)
    ? (campaign.template_blocks as Array<Record<string, unknown>>)
    : [];
  const imageBlocks = blocks
    .filter((b) => b?.type === 'image')
    .map((b) => ({
      url: typeof b.url === 'string' ? b.url.slice(0, 120) : null,
      alt: typeof b.alt === 'string' ? b.alt : null,
      linkUrl: typeof b.linkUrl === 'string' ? b.linkUrl : null,
    }));
  console.log(
    `[brand-logo] diag campaign=${campaign.id} brandHandle=${brandHandle || '(none)'} brandName=${brandName || '(none)'} imageBlocks=${imageBlocks.length}`
  );
  imageBlocks.forEach((b, i) =>
    console.log(`[brand-logo]   image[${i}] alt=${JSON.stringify(b.alt)} linkUrl=${b.linkUrl} url=${b.url}`)
  );
}

async function tryFetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    const buffer = Buffer.from(bytes);
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

async function fetchShopifyCollectionImage(brandHandle: string): Promise<string | null> {
  try {
    const collection = await getCollectionByHandle(brandHandle, 1);
    const url = collection?.image?.url;
    return typeof url === 'string' && url.trim() ? url.trim() : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.warn(`[brand-logo] shopify collection lookup failed handle=${brandHandle}: ${message}`);
    return null;
  }
}
