import { NextResponse } from 'next/server';
import { getAllProducts, getProductCanonicalUrls } from '@/lib/shopify/products';
import { getGmcBaseUrl } from '@/lib/gmc/content';

export const runtime = 'nodejs';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatPrice(amount: string, currencyCode: string) {
  const numeric = Number(amount);
  const normalized = Number.isFinite(numeric) ? numeric.toFixed(2) : amount;
  return `${normalized} ${currencyCode}`;
}

function getVariantOption(variant: { selectedOptions?: Array<{ name: string; value: string }> }, optionName: string) {
  const match = variant.selectedOptions?.find((option) => option.name.toLowerCase() === optionName.toLowerCase());
  return match?.value ?? null;
}

function stripGid(gid: string) {
  const parts = gid.split('/');
  return parts[parts.length - 1] || gid;
}

export async function GET() {
  const baseUrl = getGmcBaseUrl();
  const products = await getAllProducts();
  const urlMap = await getProductCanonicalUrls(products);

  const items = products.flatMap((product) => {
    const canonicalPath = urlMap.get(product.id) ?? `/products/${product.handle}`;
    const productUrl = `${baseUrl}${canonicalPath}`;
    const imageUrl = product.images.edges[0]?.node.url;
    const description = stripHtml(product.description || product.descriptionHtml || product.title);

    if (!imageUrl) {
      return [];
    }

    return product.variants.edges.map(({ node: variant }) => {
      const variantId = stripGid(variant.id);
      const productId = stripGid(product.id);
      const isAvailable = product.availableForSale && variant.availableForSale;
      const size = getVariantOption(variant, 'size');
      const color = getVariantOption(variant, 'color');
      const variantTitle = variant.title && variant.title !== 'Default Title'
        ? `${product.title} - ${variant.title}`
        : product.title;

      const tags = [
        `<g:id>${escapeXml(variantId)}</g:id>`,
        `<g:item_group_id>${escapeXml(productId)}</g:item_group_id>`,
        `<g:title>${escapeXml(variantTitle)}</g:title>`,
        `<g:description>${escapeXml(description)}</g:description>`,
        `<g:link>${escapeXml(productUrl)}</g:link>`,
        `<g:image_link>${escapeXml(imageUrl)}</g:image_link>`,
        `<g:availability>${isAvailable ? 'in_stock' : 'out_of_stock'}</g:availability>`,
        `<g:price>${escapeXml(formatPrice(variant.price.amount, variant.price.currencyCode))}</g:price>`,
        `<g:condition>new</g:condition>`,
        product.vendor ? `<g:brand>${escapeXml(product.vendor)}</g:brand>` : '',
        product.productType ? `<g:product_type>${escapeXml(product.productType)}</g:product_type>` : '',
        '<g:identifier_exists>false</g:identifier_exists>',
        size ? `<g:size>${escapeXml(size)}</g:size>` : '',
        color ? `<g:color>${escapeXml(color)}</g:color>` : '',
      ].filter(Boolean);

      return `<item>${tags.join('')}</item>`;
    });
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    '<title>The Equestrian Product Feed</title>',
    `<link>${escapeXml(baseUrl)}</link>`,
    '<description>Dynamic feed for Google Merchant Center</description>',
    ...items,
    '</channel>',
    '</rss>',
  ].join('');

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
}
