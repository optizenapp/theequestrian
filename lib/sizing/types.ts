import type { SizingChart, TextChart } from '@/lib/sizing/sizing-config';

export type ResolvedBrandSizingSource = 'neon' | 'config' | 'empty';

export interface ResolvedBrandSizing {
  handle: string;
  displayName: string;
  source: ResolvedBrandSizingSource;
  sizingHtml: string | null;
  sourceUrl: string | null;
  charts: SizingChart[];
  textCharts: TextChart[];
  /** Legacy /sizing/{slug} path when config match exists */
  sizingPagePath: string | null;
}
