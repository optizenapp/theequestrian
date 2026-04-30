import type { Layout } from './util';

export function categoryGridCss(L: Layout, portrait: boolean): string {
  const r = L.cardRadius;
  const gap = portrait ? 10 : 12;
  return `
.category-grid-stack{padding:${portrait ? 10 : 14}px;}
.category-grid-stack .product-grid{display:flex;flex-direction:column;gap:${gap}px;width:100%;height:100%;min-height:0;flex:1;}
.category-grid-stack .pg-hero{flex:1 1 58%;min-height:0;border-radius:${r}px;overflow:hidden;background:#F2F2EE;display:flex;align-items:center;justify-content:center;padding:10px;}
.category-grid-stack .pg-hero img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;}
.category-grid-stack .pg-row{flex:1 1 40%;display:flex;gap:${gap}px;min-height:0;}
.category-grid-stack .pg-cell{flex:1 1 0;min-width:0;border-radius:${r - 6}px;overflow:hidden;background:#F2F2EE;display:flex;align-items:center;justify-content:center;padding:8px;}
.category-grid-stack .pg-cell img{max-width:100%;max-height:100%;object-fit:contain;}
`;
}
