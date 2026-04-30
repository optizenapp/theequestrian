import { esc, letterboxClass, priceRowHtml, saveBadgeHtml } from './util';
import type { SlideInput } from './util';
import { TIMING } from './slides';

function productCard(id: string, p: SlideInput['product1'], imgPath: string): string {
  const cls = letterboxClass(p);
  return `<div class="pcard" id="${id}">
    <div class="${cls}"><img src="${esc(imgPath)}" alt="" /></div>
    <div class="ptitle">${esc(p.title)}</div>
    <div class="prow">${priceRowHtml(p)}</div>
    ${saveBadgeHtml(p)}
  </div>`;
}

function stripThumb(p: SlideInput['product1'], imgPath: string): string {
  return `<div class="thumb"><img src="${esc(imgPath)}" alt="" /></div>`;
}

function renderBrandS2Left(input: SlideInput): string {
  const eyebrow = input.slideCopy.s2.eyebrow;
  const sub = input.slideCopy.s2.subtitle;
  return `<div class="s2-left">
    ${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ''}
    ${sub ? `<div class="about">${esc(sub)}</div>` : ''}
  </div>`;
}

function renderSaleOrCategoryS2Left(input: SlideInput): string {
  const s2 = input.slideCopy.s2;
  const linkHtml = input.variant === 'category' || !s2.linkText
    ? ''
    : `<div class="s2-link">${esc(s2.linkText)}</div>`;
  const ctaHtml = s2.cta
    ? `<div class="s2-cta">${esc(s2.cta)} <span class="arrow">→</span></div>`
    : '';
  return `<div class="s2-left s2-left-sale">
    ${s2.eyebrow ? `<div class="eyebrow">${esc(s2.eyebrow)}</div>` : ''}
    ${s2.title ? `<div class="s2-headline">${esc(s2.title)}</div>` : ''}
    ${s2.subtitle ? `<div class="s2-sub">${esc(s2.subtitle)}</div>` : ''}
    ${ctaHtml}
    ${linkHtml}
  </div>`;
}

export function renderSlide2(input: SlideInput): string {
  const t = TIMING.s2;
  const card = productCard('p1', input.product1, 'assets/product-1.jpg');
  const left = input.variant === 'brand' ? renderBrandS2Left(input) : renderSaleOrCategoryS2Left(input);
  return `<div class="slide s2 clip" id="slide-2" data-start="${t.start}" data-duration="${t.dur}" data-track-index="2">
    <div class="accent-bar"></div>
    ${left}
    <div class="s2-right">${card}</div>
  </div>`;
}

export function renderSlide3(input: SlideInput): string {
  const t = TIMING.s3;
  const c2 = productCard('p2', input.product2, 'assets/product-2.jpg');
  const c3 = productCard('p3', input.product3, 'assets/product-3.jpg');
  const s3 = input.slideCopy.s3;
  const headHtml = s3.eyebrow || s3.title
    ? `<div class="s3-head">
      ${s3.eyebrow ? `<div class="eyebrow">${esc(s3.eyebrow)}</div>` : ''}
      ${s3.title ? `<div class="s3-title">${esc(s3.title)}</div>` : ''}
    </div>`
    : '';
  return `<div class="slide s3 clip" id="slide-3" data-start="${t.start}" data-duration="${t.dur}" data-track-index="3">
    <div class="accent-bar"></div>
    ${headHtml}
    <div class="s3-grid">${c2}${c3}</div>
  </div>`;
}

export function renderSlide4(input: SlideInput): string {
  const t = TIMING.s4;
  const total = input.totalDurationSeconds && input.totalDurationSeconds > t.start + t.dur
    ? input.totalDurationSeconds
    : null;
  const dur = total ? Number((total - t.start).toFixed(2)) : t.dur;
  const siteLogo = input.siteLogoCtaPath
    ? `<img src="${esc(input.siteLogoCtaPath)}" alt="The Equestrian" />`
    : input.siteLogoPath
      ? `<img src="${esc(input.siteLogoPath)}" alt="The Equestrian" />`
      : '';
  const strip = `${stripThumb(input.product1, 'assets/product-1-strip.jpg')}${stripThumb(input.product2, 'assets/product-2-strip.jpg')}${stripThumb(input.product3, 'assets/product-3-strip.jpg')}`;
  const s4 = input.slideCopy.s4;
  return `<div class="slide s4 clip" id="slide-4" data-start="${t.start}" data-duration="${dur}" data-track-index="4">
    ${s4.eyebrow ? `<div class="eyebrow">${esc(s4.eyebrow)}</div>` : ''}
    ${s4.title ? `<div class="s4-headline">${esc(s4.title)}</div>` : ''}
    ${s4.cta ? `<div class="s4-cta">${esc(s4.cta)} <span class="arrow">→</span></div>` : ''}
    <div class="s4-foot"><div class="footer-logo">${siteLogo}</div></div>
    <div class="s4-strip">${strip}</div>
  </div>`;
}

