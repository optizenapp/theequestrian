import { config } from '../config.js';
import PQueue from 'p-queue';

// Shopify Admin API allows 2 requests per second per app
// Using conservative rate limiting to avoid 429 errors
const queue = new PQueue({
  intervalCap: config.rateLimit.perSecond,
  interval: 1000,
  carryoverConcurrencyCount: false,
  concurrency: 1, // Process 1 request at a time to stay under limit
});

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  tags: string;
  status: string; // 'active', 'draft', 'archived'
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
  let pageCount = 0;
  const MAX_PAGES = 200; // Safety limit: 200 pages × 250 = 50,000 products max

  while (hasNextPage && pageCount < MAX_PAGES) {
    const params = new URLSearchParams({
      limit: '250',
      fields: 'id,title,vendor,tags,status,variants',
    });

    if (pageInfo) {
      params.set('page_info', pageInfo);
    }

    const data = await queue.add(() => shopifyFetch(`/products.json?${params}`));
    pageCount++;
    
    if (data.products && data.products.length > 0) {
      const previousCount = products.length;
      products.push(...data.products);
      
      console.log(`[Shopify] Fetched ${products.length} products so far... (page ${pageCount}, +${data.products.length} products)`);
      
      // Stop if we got fewer than 250 products (last page)
      if (data.products.length < 250) {
        console.log(`[Shopify] Last page detected (${data.products.length} products)`);
        hasNextPage = false;
        break;
      }
      
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
  }

  if (pageCount >= MAX_PAGES) {
    console.log(`[Shopify] Reached max page limit (${MAX_PAGES} pages)`);
  }

  return products;
}

export async function getProductById(productId: string): Promise<ShopifyProduct | null> {
  try {
    const data = await queue.add(() => 
      shopifyFetch(`/products/${productId}.json?fields=id,title,vendor,tags,status,variants`)
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
