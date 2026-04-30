import { esc } from './util';
import type { Layout, SlideInput } from './util';
import { categoryGridCss } from './category-grid-styles';

export function buildStyles(input: SlideInput, L: Layout): string {
  const W = input.width;
  const H = input.height;
  const portrait = L.isPortrait;
  const accent = esc(L.accent);
  return `
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${L.surface};color:${L.ink};font-family:${L.fontFamily};font-feature-settings:"tnum","ss01";-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
#root{position:relative;width:${W}px;height:${H}px;background:${L.surface};}
.clip{position:absolute;}
.slide{position:absolute;left:0;top:0;width:${W}px;height:${H}px;padding:${L.pad}px;display:flex;opacity:0;}
.accent-bar{position:absolute;top:0;left:0;width:100%;height:6px;background:linear-gradient(90deg,${accent} 0%,${esc(input.brand.secondary || L.accent)} 100%);}
.eyebrow{font-size:${L.eyebrowSize}px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:${accent};}
.divider{display:block;width:64px;height:4px;background:${accent};border-radius:2px;margin:18px 0 18px 0;}
.muted{color:${L.inkSoft};}
.brand-watermark{position:absolute;left:${L.pad}px;bottom:${L.pad - 16}px;font-size:18px;color:${L.inkSoft};letter-spacing:0.06em;}
${stingerCss(L)}
${slide1Css(W, H, L)}
${slide2Css(W, L)}
${slide3Css(W, L)}
${slide4Css(W, H, L, input.brand.secondary || L.accent)}
${cardCss(L)}
`;
}

function stingerCss(L: Layout): string {
  return `
.s0{align-items:center;justify-content:center;background:${L.surfaceAlt};}
.s0-mark{display:flex;align-items:center;justify-content:center;width:280px;height:120px;}
.s0-mark img{max-width:100%;max-height:100%;object-fit:contain;}
`;
}

function slide1Css(W: number, H: number, L: Layout): string {
  const portrait = L.isPortrait;
  const leftWidth = portrait ? '100%' : `${Math.round(W * 0.52)}px`;
  const rightWidth = portrait ? '100%' : `${Math.round(W * 0.36)}px`;
  const portraitTopOffset = Math.round(L.pad * 0.6);
  return `
.s1{flex-direction:${portrait ? 'column' : 'row'};align-items:${portrait ? 'center' : 'stretch'};justify-content:${portrait ? 'center' : 'space-between'};gap:${portrait ? Math.round(L.pad * 0.7) : L.pad}px;padding-top:${portrait ? L.pad * 2 : L.pad}px;background:${L.surface};}
.s1-left{display:flex;flex-direction:column;justify-content:center;width:${leftWidth};${portrait ? `text-align:center;align-items:center;` : ''}}
.s1-eyebrow{margin-bottom:${portrait ? 16 : 24}px;}
.s1-title{font-size:${L.titleSize}px;line-height:1.05;font-weight:800;letter-spacing:-0.01em;color:${L.ink};max-width:${portrait ? W - L.pad * 2 : Math.round(W * 0.48)}px;}
.s1-sub{font-size:${Math.round(L.aboutSize * 0.78)}px;color:${L.inkSoft};margin-top:${portrait ? 14 : 18}px;}
.s1-right{position:relative;display:flex;flex-direction:column;align-items:${portrait ? 'center' : 'flex-end'};justify-content:center;width:${rightWidth};}
.site-corner{position:absolute;top:${portraitTopOffset}px;right:${portraitTopOffset}px;width:${portrait ? 220 : 220}px;height:${portrait ? 56 : 60}px;display:flex;justify-content:flex-end;align-items:flex-start;z-index:5;}
.site-corner img{max-width:100%;max-height:100%;object-fit:contain;}
.brand-stack{display:flex;align-items:center;justify-content:center;width:${portrait ? Math.round(W * 0.78) : '100%'}px;height:${portrait ? Math.round(W * 0.78) : Math.round(H * 0.6)}px;background:${L.surfaceAlt};border-radius:${L.cardRadius}px;box-shadow:${L.cardShadow};padding:${portrait ? 56 : 48}px;}
.brand-stack img{max-width:${portrait ? Math.round(W * 0.6) : 380}px;max-height:${portrait ? Math.round(W * 0.55) : 220}px;object-fit:contain;}
${saleBadgeCss(W, H, L, portrait)}
${categoryGridCss(L, portrait)}
`;
}

function saleBadgeCss(W: number, H: number, L: Layout, portrait: boolean): string {
  const accent = esc(L.accent);
  const badgeSize = portrait ? Math.round(W * 0.62) : Math.round(H * 0.58);
  const mainSize = Math.round(badgeSize * 0.32);
  const topSize = Math.round(badgeSize * 0.085);
  const bottomSize = Math.round(badgeSize * 0.085);
  return `
.sale-stack{padding:0;background:${L.surface};box-shadow:none;}
.sale-badge{position:relative;width:${badgeSize}px;height:${badgeSize}px;border-radius:50%;background:radial-gradient(120% 120% at 30% 25%, ${accent} 0%, ${esc(L.accent)} 60%, rgba(0,0,0,0.18) 100%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-shadow:0 24px 60px rgba(15,18,38,0.28),inset 0 0 0 6px rgba(255,255,255,0.18),inset 0 0 0 14px rgba(255,255,255,0.08);transform:rotate(-6deg);font-family:${L.fontFamily};}
.sale-badge::before{content:'';position:absolute;inset:-8px;border-radius:50%;border:2px dashed rgba(255,255,255,0.55);}
.sale-badge-top{font-size:${topSize}px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;line-height:1.05;margin-bottom:${Math.round(badgeSize * 0.025)}px;opacity:0.95;}
.sale-badge-main{font-size:${mainSize}px;font-weight:900;letter-spacing:-0.02em;line-height:1;text-shadow:0 4px 12px rgba(0,0,0,0.18);}
.sale-badge-bottom{font-size:${bottomSize}px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;margin-top:${Math.round(badgeSize * 0.035)}px;opacity:0.95;}
`;
}

function slide2Css(W: number, L: Layout): string {
  const portrait = L.isPortrait;
  const accent = esc(L.accent);
  const headlineSize = portrait ? 56 : 64;
  const subSize = Math.round(L.aboutSize * 0.86);
  const ctaSize = portrait ? 30 : 34;
  const linkSize = portrait ? 22 : 22;
  return `
.s2{flex-direction:${portrait ? 'column' : 'row'};align-items:${portrait ? 'stretch' : 'stretch'};gap:${L.pad}px;background:${L.surface};}
.s2-left{flex:1;display:flex;flex-direction:column;justify-content:center;max-width:${portrait ? '100%' : '50%'};padding:${portrait ? '0' : '12px 0'};}
.s2-left .eyebrow{margin-bottom:18px;}
.about{font-size:${L.aboutSize}px;line-height:1.4;color:${L.ink};font-weight:500;max-width:${portrait ? '100%' : Math.round(W * 0.42)}px;}
.s2-right{flex:${portrait ? '0 0 auto' : '0 0 46%'};max-width:${portrait ? '100%' : '46%'};display:flex;align-items:center;justify-content:center;}
.s2-left-sale .s2-headline{font-size:${headlineSize}px;font-weight:800;letter-spacing:-0.015em;line-height:1.05;color:${L.ink};margin-bottom:14px;max-width:${portrait ? '100%' : Math.round(W * 0.42)}px;}
.s2-left-sale .s2-sub{font-size:${subSize}px;line-height:1.4;color:${L.inkSoft};font-weight:500;margin-bottom:${portrait ? 28 : 32}px;max-width:${portrait ? '100%' : Math.round(W * 0.42)}px;}
.s2-cta{display:inline-flex;align-items:center;gap:14px;background:${accent};color:#fff;font-weight:700;font-size:${ctaSize}px;padding:${portrait ? '20px 36px' : '22px 44px'};border-radius:9999px;box-shadow:0 14px 32px rgba(15,18,38,0.18);align-self:${portrait ? 'center' : 'flex-start'};}
.s2-cta .arrow{display:inline-block;font-size:1.1em;transform:translateY(-1px);}
.s2-link{font-size:${linkSize}px;color:${L.inkSoft};letter-spacing:0.04em;margin-top:18px;text-align:${portrait ? 'center' : 'left'};font-variant:all-small-caps;}
`;
}

function slide3Css(W: number, L: Layout): string {
  const portrait = L.isPortrait;
  return `
.s3{flex-direction:column;background:${L.surface};overflow:hidden;}
.s3-head{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:${L.pad / 2}px;flex:0 0 auto;}
.s3-head .eyebrow{margin-bottom:8px;}
.s3-title{font-size:${portrait ? 40 : 44}px;font-weight:800;color:${L.ink};letter-spacing:-0.01em;}
.s3-grid{flex:1 1 auto;min-height:0;display:flex;flex-direction:${portrait ? 'column' : 'row'};gap:${L.pad / 1.6}px;align-items:stretch;}
.s3-grid .pcard{flex:1 1 0;min-height:0;min-width:0;}
`;
}

function slide4Css(W: number, H: number, L: Layout, secondary: string): string {
  const portrait = L.isPortrait;
  const accent = esc(L.accent);
  return `
.s4{flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(120% 80% at 50% 0%, ${accent} 0%, ${esc(secondary)} 60%, ${accent} 100%);color:${L.accentInk};}
.s4 .eyebrow{color:rgba(255,255,255,0.85);margin-bottom:18px;}
.s4-headline{font-size:${L.ctaSize}px;font-weight:800;letter-spacing:-0.015em;line-height:1.04;max-width:${Math.round(W * 0.84)}px;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,0.18);}
.s4-cta{margin-top:${portrait ? 36 : 44}px;display:inline-flex;align-items:center;gap:14px;background:#fff;color:${L.ink};font-weight:700;font-size:${portrait ? 28 : 30}px;padding:${portrait ? '20px 36px' : '22px 44px'};border-radius:9999px;box-shadow:0 14px 40px rgba(0,0,0,0.22);}
.s4-cta .arrow{display:inline-block;font-size:1.1em;transform:translateY(-1px);}
.s4-foot{margin-top:${portrait ? 32 : 40}px;display:flex;flex-direction:column;align-items:center;gap:14px;}
.s4-foot .footer-logo{width:${portrait ? 220 : 260}px;height:${portrait ? 60 : 64}px;display:flex;justify-content:center;align-items:center;}
.s4-foot .footer-logo img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.18));}
.s4-strip{position:absolute;left:0;bottom:${portrait ? 36 : 28}px;width:100%;display:flex;justify-content:center;gap:${portrait ? 18 : 20}px;padding:0 ${L.pad}px;}
.s4-strip .thumb{width:${portrait ? 120 : 110}px;height:${portrait ? 120 : 110}px;border-radius:18px;overflow:hidden;background:rgba(255,255,255,0.18);box-shadow:0 8px 22px rgba(0,0,0,0.2);}
.s4-strip .thumb img{width:100%;height:100%;object-fit:cover;}
`;
}

function cardCss(L: Layout): string {
  const titleSize = L.isPortrait ? 26 : 26;
  const priceSize = L.isPortrait ? 28 : 30;
  return `
.pcard{background:${L.surfaceAlt};border-radius:${L.cardRadius}px;box-shadow:${L.cardShadow};padding:${L.isPortrait ? 18 : 22}px;display:flex;flex-direction:column;align-items:stretch;min-width:0;min-height:0;overflow:hidden;}
.pimg{flex:1 1 auto;min-height:0;width:100%;border-radius:${L.cardRadius - 8}px;overflow:hidden;background:#F2F2EE;margin-bottom:14px;display:flex;align-items:center;justify-content:center;}
.pimg img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;}
.pimg.fit-cover img{width:100%;height:100%;object-fit:cover;}
.pimg.fit-contain img{padding:10px;}
.ptitle{flex:0 0 auto;font-size:${titleSize}px;line-height:1.18;font-weight:700;color:${L.ink};text-align:center;margin-bottom:10px;letter-spacing:-0.005em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.prow{flex:0 0 auto;display:flex;align-items:baseline;justify-content:center;gap:14px;flex-wrap:wrap;}
.price{font-size:${priceSize}px;font-weight:800;color:${L.ink};font-variant-numeric:tabular-nums;}
.was{font-size:${L.isPortrait ? 20 : 22}px;color:${L.inkSoft};text-decoration:line-through;font-variant-numeric:tabular-nums;}
.save-chip{flex:0 0 auto;display:inline-block;margin-top:10px;background:#0F8F4D;color:#fff;font-size:15px;font-weight:700;padding:5px 12px;border-radius:9999px;letter-spacing:0.04em;align-self:center;}
`;
}
