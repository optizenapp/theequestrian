import { buildCatalogFeedItems, type CatalogFeedItem } from '@/lib/feeds/catalog-items';

const META_FALLBACK_BRAND = 'The Equestrian';
const META_TITLE_MAX = 200;

const META_CSV_HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'sale_price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
  'item_group_id',
  'google_product_category',
  'product_type',
  'gtin',
  'mpn',
  'size',
  'color',
  'gender',
  'age_group',
  'material',
  'pattern',
  'shipping',
  'custom_label_0',
  'custom_label_1',
  'custom_label_2',
  'custom_label_3',
  'custom_label_4',
  'status',
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function truncateTitle(title: string): string {
  if (title.length <= META_TITLE_MAX) return title;
  return title.slice(0, META_TITLE_MAX).trimEnd();
}

function formatMetaShipping(item: CatalogFeedItem): string {
  if (item.shipping.rateAud === null) return '';
  return `AU::Standard:${item.shipping.rateAud.toFixed(2)} AUD`;
}

function metaGender(value: string | null): string {
  if (value === 'female' || value === 'male' || value === 'unisex') return value;
  return '';
}

function serializeMetaRow(item: CatalogFeedItem): string {
  const values: string[] = [
    item.variantId,
    truncateTitle(item.title),
    item.description,
    item.available ? 'in stock' : 'out of stock',
    'new',
    item.priceFormatted,
    item.salePriceFormatted ?? '',
    item.link,
    item.imageUrl,
    item.additionalImageUrls.join(','),
    item.brand?.trim() || META_FALLBACK_BRAND,
    item.productId,
    item.googleCategory ?? '',
    item.productType ?? '',
    item.gtin ?? '',
    item.mpn ?? '',
    item.size ?? '',
    item.color ?? '',
    metaGender(item.gender),
    item.ageGroup ?? '',
    item.material ?? '',
    item.pattern ?? '',
    formatMetaShipping(item),
    item.labels.custom_label_0,
    item.labels.custom_label_1,
    item.labels.custom_label_2,
    item.labels.custom_label_3,
    item.labels.custom_label_4,
    'active',
  ];
  return values.map(escapeCsvField).join(',');
}

export async function buildMetaCatalogCsv() {
  const { items } = await buildCatalogFeedItems('meta:feed');
  const rows = items.map(serializeMetaRow);
  const csv = [META_CSV_HEADERS.join(','), ...rows].join('\n');
  return {
    csv,
    itemCount: items.length,
    variantIds: items.map((item) => item.variantId),
  };
}
