import { esc } from './util';
import type { SlideInput } from './util';
export { renderSlide2, renderSlide3, renderSlide4 } from './slides-detail';

export const TIMING = {
  stinger: { start: 0, dur: 0.7 },
  s1: { start: 0.5, dur: 4.0 },
  s2: { start: 4.3, dur: 5.4 },
  s3: { start: 9.4, dur: 3.0 },
  s4: { start: 12.2, dur: 3.8 },
  total: 16,
};

export function effectiveTotalSeconds(input: { totalDurationSeconds?: number | null }): number {
  const requested = input.totalDurationSeconds;
  if (typeof requested === 'number' && Number.isFinite(requested) && requested > TIMING.total) {
    return Number(requested.toFixed(2));
  }
  return TIMING.total;
}

export function renderStinger(input: SlideInput): string {
  const t = TIMING.stinger;
  const logo = input.siteLogoPath
    ? `<img src="${esc(input.siteLogoPath)}" alt="The Equestrian" />`
    : '';
  return `<div class="slide s0 clip" id="slide-0" data-start="${t.start}" data-duration="${t.dur}" data-track-index="0">
    <div class="s0-mark">${logo}</div>
  </div>`;
}

export function renderSlide1(input: SlideInput): string {
  const t = TIMING.s1;
  const siteLogo = input.siteLogoPath
    ? `<img src="${esc(input.siteLogoPath)}" alt="The Equestrian" />`
    : '';
  const eyebrow = input.slideCopy.s1.eyebrow;
  const title = input.slideCopy.s1.title;
  const sub = input.slideCopy.s1.subtitle;
  const isOnSale = input.variant === 'on_sale';
  const isCategory = input.variant === 'category';
  const rightCard = isOnSale
    ? renderOnSaleBadgeCard()
    : isCategory
      ? renderCategoryProductGrid()
      : renderBrandLogoCard(input);
  const eyebrowHtml = eyebrow ? `<div class="eyebrow s1-eyebrow">${esc(eyebrow)}</div>` : '';
  const titleHtml = title ? `<div class="s1-title">${esc(title)}</div>` : '';
  const dividerHtml = title || sub ? '<span class="divider"></span>' : '';
  const subHtml = sub ? `<div class="s1-sub">${esc(sub)}</div>` : '';
  return `<div class="slide s1 clip" id="slide-1" data-start="${t.start}" data-duration="${t.dur}" data-track-index="1">
    <div class="accent-bar"></div>
    <div class="site-corner">${siteLogo}</div>
    <div class="s1-left">
      ${eyebrowHtml}
      ${titleHtml}
      ${dividerHtml}
      ${subHtml}
    </div>
    <div class="s1-right">${rightCard}</div>
  </div>`;
}

function renderBrandLogoCard(input: SlideInput): string {
  const brandLogo = input.brandLogoPath
    ? `<img src="${esc(input.brandLogoPath)}" alt="${esc(input.brandName)}" />`
    : `<div style="font-size:48px;font-weight:800;letter-spacing:-0.02em;">${esc(input.brandName)}</div>`;
  return `<div class="brand-stack">${brandLogo}</div>`;
}

function renderOnSaleBadgeCard(): string {
  return `<div class="brand-stack sale-stack">
    <div class="sale-badge">
      <div class="sale-badge-top">Limited<br/>Time</div>
      <div class="sale-badge-main">SALE</div>
      <div class="sale-badge-bottom">Shop Now</div>
    </div>
  </div>`;
}

function renderCategoryProductGrid(): string {
  return `<div class="brand-stack category-grid-stack">
    <div class="product-grid">
      <div class="pg-hero"><img src="assets/product-1.jpg" alt="" /></div>
      <div class="pg-row">
        <div class="pg-cell"><img src="assets/product-2.jpg" alt="" /></div>
        <div class="pg-cell"><img src="assets/product-3.jpg" alt="" /></div>
      </div>
    </div>
  </div>`;
}

export function renderMusic(input: SlideInput): string {
  if (!input.musicPath) return '';
  const total = effectiveTotalSeconds(input);
  return `<audio id="bg-audio" class="clip" data-start="0" data-duration="${total}" data-track-index="9" data-volume="0.32" src="${esc(input.musicPath)}"></audio>`;
}
