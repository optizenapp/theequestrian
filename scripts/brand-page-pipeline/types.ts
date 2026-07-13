import type { BrandSEOContent } from '../run-brand-seo-update';

export type BrandRule = {
  column: string;
  relation?: string;
  condition: string;
};

export type InventoryProduct = {
  handle: string;
  title: string;
  brand: string | null;
  vendor: string | null;
  canonical_path: string | null;
};

export type BrandInventory = {
  handle: string;
  displayName: string;
  products: InventoryProduct[];
  totalCount: number;
  brandCounts: Record<string, number>;
  categoryPaths: string[];
  sampleTitles: string[];
};

export type ResearchContext = {
  catalogSummary: string;
  serpSummary: string;
  productLineHints: string[];
};

export type PipelineFlags = {
  brands: string[];
  dryRun: boolean;
  floralProd: boolean;
  skipGenerate: boolean;
  overwrite: boolean;
  skipExisting: boolean;
  skipRevalidate: boolean;
};

export type { BrandSEOContent };
