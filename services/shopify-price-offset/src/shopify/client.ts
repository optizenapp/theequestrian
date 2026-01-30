import { config } from '../config.js';
import PQueue from 'p-queue';

// Shopify Admin API allows 2 requests per second per app
// With burst allowance, can handle up to 40 requests in a 10-second window
// Using 4 req/sec with burst handling for optimal performance
const queue = new PQueue({
  intervalCap: config.rateLimit.perSecond,
  interval: 1000,
  carryoverConcurrencyCount: true,
  concurrency: 2, // Process 2 requests concurrently
});

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  tags: string;
  variants: ShopifyVariant[];
}

export interface ShopifyVariant {
  id: string;
  product_id: string;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string;
  inventory_quantity: number;
  inventory_item_id: string;
}

async function shopifyFetch(endpoint: string, options: RequestInit = {}) {
  const url = `https://${config.shopify.storeDomain}/admin/api/${config.shopify.apiVersion}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': config.shopify.accessToken,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API ${response.status}: ${text}`);
  }

  const data = await response.json();
  
  // Attach Link header for pagination
  const linkHeader = response.headers.get('Link');
  if (linkHeader) {
    data._link = linkHeader;
  }
  
  return data;
}

export async function getAllProducts(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let pageInfo: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const params = new URLSearchParams({
      limit: '250',
      fields: 'id,title,vendor,tags,variants',
    });

    if (pageInfo) {
      params.set('page_info', pageInfo);
    }

    const data = await queue.add(() => shopifyFetch(`/products.json?${params}`));
    
    if (data.products && data.products.length > 0) {
      products.push(...data.products);
      
      // Check for pagination using Link header
      const linkHeader = data._link;
      if (linkHeader && linkHeader.includes('rel="next"')) {
        // Extract page_info from link header
        const nextMatch = linkHeader.match(/page_info=([^&>]+)/);
        pageInfo = nextMatch ? nextMatch[1] : null;
        hasNextPage = !!pageInfo;
      } else {
        hasNextPage = false;
      }
    } else {
      hasNextPage = false;
    }

    console.log(`[Shopify] Fetched ${products.length} products so far...`);
  }

  return products;
}

export async function getProductById(productId: string): Promise<ShopifyProduct | null> {
  try {
    const data = await queue.add(() => 
      shopifyFetch(`/products/${productId}.json?fields=id,title,vendor,tags,variants`)
    );
    return data.product || null;
  } catch (error) {
    console.error(`[Shopify] Error fetching product ${productId}:`, error);
    return null;
  }
}

export async function updateVariantPrice(
  variantId: string,
  price: string,
  compareAtPrice?: string | null
): Promise<void> {
  const payload: any = {
    variant: {
      id: variantId,
      price,
    },
  };

  if (compareAtPrice !== undefined) {
    payload.variant.compare_at_price = compareAtPrice;
  }

  await queue.add(() =>
    shopifyFetch(`/variants/${variantId}.json`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  );
}
