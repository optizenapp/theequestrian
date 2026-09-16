import { buildCatalogFeedItems, type CatalogFeedItem } from '@/lib/feeds/catalog-items';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function serializeGmcItem(item: CatalogFeedItem): string {
  const priceTags = item.salePriceFormatted
    ? [
        `<g:price>${escapeXml(item.priceFormatted)}</g:price>`,
        `<g:sale_price>${escapeXml(item.salePriceFormatted)}</g:sale_price>`,
      ]
    : [`<g:price>${escapeXml(item.priceFormatted)}</g:price>`];

  const tags = [
    `<g:id>${escapeXml(item.variantId)}</g:id>`,
    `<g:item_group_id>${escapeXml(item.productId)}</g:item_group_id>`,
    `<g:title>${escapeXml(item.title)}</g:title>`,
    `<g:description>${escapeXml(item.description)}</g:description>`,
    `<g:link>${escapeXml(item.link)}</g:link>`,
    `<g:image_link>${escapeXml(item.imageUrl)}</g:image_link>`,
    `<g:availability>${item.available ? 'in_stock' : 'out_of_stock'}</g:availability>`,
    ...priceTags,
    `<g:condition>new</g:condition>`,
    item.brand ? `<g:brand>${escapeXml(item.brand)}</g:brand>` : '',
    item.productType ? `<g:product_type>${escapeXml(item.productType)}</g:product_type>` : '',
    item.googleCategory
      ? `<g:google_product_category>${escapeXml(item.googleCategory)}</g:google_product_category>`
      : '',
    item.gtin ? `<g:gtin>${escapeXml(item.gtin)}</g:gtin>` : '',
    item.mpn ? `<g:mpn>${escapeXml(item.mpn)}</g:mpn>` : '',
    `<g:identifier_exists>${item.identifierExists ? 'true' : 'false'}</g:identifier_exists>`,
    item.size ? `<g:size>${escapeXml(item.size)}</g:size>` : '',
    item.color ? `<g:color>${escapeXml(item.color)}</g:color>` : '',
    item.gender ? `<g:gender>${escapeXml(item.gender)}</g:gender>` : '',
    item.ageGroup ? `<g:age_group>${escapeXml(item.ageGroup)}</g:age_group>` : '',
    item.material ? `<g:material>${escapeXml(item.material)}</g:material>` : '',
    item.pattern ? `<g:pattern>${escapeXml(item.pattern)}</g:pattern>` : '',
    item.shipping.shippingXml,
    `<g:custom_label_0>${escapeXml(item.labels.custom_label_0)}</g:custom_label_0>`,
    `<g:custom_label_1>${escapeXml(item.labels.custom_label_1)}</g:custom_label_1>`,
    `<g:custom_label_2>${escapeXml(item.labels.custom_label_2)}</g:custom_label_2>`,
    `<g:custom_label_3>${escapeXml(item.labels.custom_label_3)}</g:custom_label_3>`,
    `<g:custom_label_4>${escapeXml(item.labels.custom_label_4)}</g:custom_label_4>`,
  ].filter(Boolean);

  return `<item>${tags.join('')}</item>`;
}

export async function buildGmcFeedXml() {
  const { items, baseUrl } = await buildCatalogFeedItems('gmc:feed');
  const validItems = items.map(serializeGmcItem);
  const variantIds = items.map((item) => item.variantId);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    '<title>The Equestrian Product Feed</title>',
    `<link>${escapeXml(baseUrl)}</link>`,
    '<description>Dynamic feed for Google Merchant Center</description>',
    ...validItems,
    '</channel>',
    '</rss>',
  ].join('');

  return { xml, itemCount: validItems.length, variantIds };
}
