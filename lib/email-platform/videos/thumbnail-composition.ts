import type { BrandSlidesPayload } from './video-render-types';

export type ThumbnailVariant = 'landscape_16_9' | 'vertical_9_16';

export type ThumbnailCompositionInput = {
  variant: ThumbnailVariant;
  subjectLine: string;
  brand: {
    primary: string;
    secondary: string;
    foreground: string;
    background: string;
    fontFamily: string;
  };
  brandSlides: BrandSlidesPayload | null;
  siteLogoDataUrl: string | null;
  brandLogoDataUrl: string | null;
  productImageDataUrl: string | null;
};

const SIZES: Record<ThumbnailVariant, { width: number; height: number }> = {
  landscape_16_9: { width: 1280, height: 720 },
  vertical_9_16: { width: 720, height: 1280 },
};

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveTopic(input: ThumbnailCompositionInput): string {
  const slides = input.brandSlides;
  if (!slides) return 'The Equestrian';
  if (slides.variant === 'brand') return slides.brandName || 'The Equestrian';
  if (slides.variant === 'category') return slides.brandName || slides.subjectLine || 'Featured Edit';
  return 'On Sale Now';
}

function resolveEyebrow(input: ThumbnailCompositionInput): string {
  const slides = input.brandSlides;
  const slideEyebrow = slides?.slideCopy?.s1?.eyebrow?.trim();
  if (slideEyebrow) return slideEyebrow;
  if (!slides) return 'The Equestrian';
  if (slides.variant === 'brand') return 'Featured Brand';
  if (slides.variant === 'category') return 'Featured Edit';
  return 'On Sale Now';
}

function resolveTitle(input: ThumbnailCompositionInput): string {
  const slideTitle = input.brandSlides?.slideCopy?.s1?.title?.trim();
  if (slideTitle) return slideTitle;
  const subject = input.subjectLine.trim();
  if (subject) return subject;
  return resolveTopic(input);
}

function fitTitleFontSize(title: string, portrait: boolean): { fontSize: number; lineHeight: number } {
  const len = title.length;
  if (portrait) {
    if (len <= 22) return { fontSize: 84, lineHeight: 1.04 };
    if (len <= 36) return { fontSize: 70, lineHeight: 1.05 };
    if (len <= 54) return { fontSize: 58, lineHeight: 1.06 };
    if (len <= 72) return { fontSize: 48, lineHeight: 1.08 };
    return { fontSize: 42, lineHeight: 1.1 };
  }
  if (len <= 22) return { fontSize: 92, lineHeight: 1.02 };
  if (len <= 36) return { fontSize: 76, lineHeight: 1.04 };
  if (len <= 54) return { fontSize: 60, lineHeight: 1.06 };
  if (len <= 72) return { fontSize: 50, lineHeight: 1.08 };
  return { fontSize: 44, lineHeight: 1.1 };
}

function buildCss(input: ThumbnailCompositionInput, title: string): string {
  const { width, height } = SIZES[input.variant];
  const portrait = input.variant === 'vertical_9_16';
  const accent = esc(input.brand.primary || '#0f3a2d');
  const ink = esc(input.brand.foreground || '#0a0a0a');
  const bg = esc(input.brand.background || '#f6f3ec');
  const { fontSize: titleSize, lineHeight: titleLh } = fitTitleFontSize(title, portrait);
  const eyebrowSize = portrait ? 26 : 28;
  const margin = portrait ? 22 : 26;
  const radius = portrait ? 26 : 30;
  const padding = portrait ? 52 : 64;
  const titleMaxLines = portrait ? 6 : 5;
  const titleMaxHeight = Math.round(titleSize * titleLh * titleMaxLines);
  return `
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${width}px;height:${height}px;background:#ffffff;color:${ink};font-family:${input.brand.fontFamily}, "Inter", "Helvetica Neue", Arial, sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
.canvas{width:${width}px;height:${height}px;padding:${margin}px;background:#ffffff;}
.thumb{position:relative;width:100%;height:100%;border-radius:${radius}px;overflow:hidden;background:${bg};box-shadow:0 0 0 1px rgba(15,23,42,0.06);}
.grid{position:relative;width:100%;height:100%;display:grid;grid-template-columns:${portrait ? '1fr' : '1.05fr 0.95fr'};grid-template-rows:${portrait ? '1.05fr 0.95fr' : '1fr'};}
.accent-bar{position:absolute;left:0;top:0;width:100%;height:8px;background:linear-gradient(90deg,${accent} 0%,${esc(input.brand.secondary || accent)} 100%);z-index:6;}
.left{position:relative;padding:${padding}px;display:flex;flex-direction:column;justify-content:center;gap:${portrait ? 14 : 18}px;background:${bg};overflow:hidden;}
.eyebrow{font-size:${eyebrowSize}px;letter-spacing:0.22em;text-transform:uppercase;font-weight:800;color:${accent};}
.title{font-size:${titleSize}px;line-height:${titleLh};font-weight:800;letter-spacing:-0.015em;color:${ink};max-height:${titleMaxHeight}px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:${titleMaxLines};-webkit-box-orient:vertical;word-break:break-word;hyphens:auto;}
.divider{width:88px;height:6px;background:${accent};border-radius:3px;flex-shrink:0;}
.brand-row{display:flex;align-items:center;gap:18px;margin-top:${portrait ? 8 : 12}px;flex-shrink:0;}
.brand-row img{max-height:${portrait ? 52 : 64}px;max-width:${portrait ? 220 : 260}px;object-fit:contain;}
.right{position:relative;background:${esc(input.brand.secondary || '#1a1a1a')};display:flex;align-items:center;justify-content:center;overflow:hidden;}
.right img.product{width:100%;height:100%;object-fit:cover;}
.right .scrim{position:absolute;inset:0;background:linear-gradient(135deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.18) 100%);}
.site-logo{position:absolute;top:${portrait ? 18 : 22}px;right:${portrait ? 18 : 22}px;height:${portrait ? 44 : 56}px;display:flex;align-items:center;justify-content:flex-end;z-index:5;}
.site-logo img{max-height:100%;max-width:${portrait ? 200 : 240}px;object-fit:contain;}
`;
}

function buildBody(input: ThumbnailCompositionInput): string {
  const eyebrow = esc(resolveEyebrow(input));
  const topic = esc(resolveTopic(input));
  const titleRaw = resolveTitle(input);
  const title = esc(titleRaw);
  const siteLogo = input.siteLogoDataUrl
    ? `<div class="site-logo"><img src="${input.siteLogoDataUrl}" alt="The Equestrian" /></div>`
    : '';
  const brandLogo = input.brandLogoDataUrl
    ? `<div class="brand-row"><img src="${input.brandLogoDataUrl}" alt="${topic}" /></div>`
    : '';
  const productImage = input.productImageDataUrl
    ? `<img class="product" src="${input.productImageDataUrl}" alt="${topic}" /><div class="scrim"></div>`
    : `<div style="color:#fff;font-size:42px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${topic}</div>`;
  return `
<div class="canvas">
  <div class="thumb">
    <div class="accent-bar"></div>
    <div class="grid">
      <div class="left">
        <div class="eyebrow">${eyebrow}</div>
        <div class="title">${title}</div>
        <div class="divider"></div>
        ${brandLogo}
      </div>
      <div class="right">
        ${productImage}
      </div>
    </div>
    ${siteLogo}
  </div>
</div>
`;
}

export function buildThumbnailHtml(input: ThumbnailCompositionInput): string {
  const { width, height } = SIZES[input.variant];
  const title = resolveTitle(input);
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${buildCss(input, title)}</style></head><body style="margin:0;width:${width}px;height:${height}px;">${buildBody(input)}</body></html>`;
}

export function getThumbnailViewport(variant: ThumbnailVariant): { width: number; height: number } {
  return SIZES[variant];
}
