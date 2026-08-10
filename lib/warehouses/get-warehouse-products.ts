import type { BrandContentRow } from '@/lib/content/brand-content';
import {
  getBrandProductsFromDb,
  type BrandFilters,
} from '@/lib/brands/get-brand-products';
import type { WarehouseDefinition } from '@/lib/warehouses/registry';

function warehouseAsBrandContent(warehouse: WarehouseDefinition): BrandContentRow {
  const rules = warehouse.vendorNames.map((name) => ({
    column: 'VENDOR',
    relation: 'EQUALS',
    condition: name,
  }));

  return {
    handle: warehouse.slug,
    title: warehouse.displayName,
    products_count: 0,
    rules: JSON.stringify(rules),
    h1_title: `Shop from our ${warehouse.displayName} warehouse`,
    meta_title: `Shop from ${warehouse.displayName} warehouse | The Equestrian`,
    meta_description: warehouse.shortDescription,
    short_description: warehouse.shortDescription,
    long_description: null,
    breadcrumb_label: warehouse.displayName,
    faq_json: null,
    quick_answer: null,
    logo_url: null,
    status: 'published',
  };
}

export async function getWarehouseProductsFromDb(
  warehouse: WarehouseDefinition,
  limit = 36,
  after: string | null = null,
  filters?: BrandFilters
) {
  return getBrandProductsFromDb(warehouseAsBrandContent(warehouse), limit, after, filters);
}
