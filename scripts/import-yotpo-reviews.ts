/**
 * Import Yotpo Reviews Script
 * 
 * This script fetches reviews from Yotpo API and imports them into Neon Postgres
 * 
 * Usage:
 * 1. Set YOTPO_APP_KEY and YOTPO_API_SECRET in .env.local
 * 2. Run: npx tsx scripts/import-yotpo-reviews.ts
 */

import { sql } from '@vercel/postgres';

interface YotpoReview {
  id: number;
  score: number;
  title: string;
  content: string;
  created_at: string;
  verified_buyer: boolean;
  user: {
    display_name: string;
    email?: string;
  };
  product: {
    id: number;
    name: string;
    url: string;
  };
}

interface YotpoResponse {
  reviews: YotpoReview[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
  };
}

const YOTPO_APP_KEY = process.env.YOTPO_APP_KEY;
const YOTPO_API_SECRET = process.env.YOTPO_API_SECRET;

if (!YOTPO_APP_KEY) {
  console.error('❌ YOTPO_APP_KEY is required in .env.local');
  process.exit(1);
}

async function getYotpoAccessToken(): Promise<string> {
  if (!YOTPO_API_SECRET) {
    throw new Error('YOTPO_API_SECRET is required');
  }

  const response = await fetch('https://api.yotpo.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: YOTPO_APP_KEY,
      client_secret: YOTPO_API_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Yotpo access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchYotpoReviews(page: number = 1): Promise<YotpoResponse> {
  const url = `https://api.yotpo.com/v1/apps/${YOTPO_APP_KEY}/reviews?page=${page}&per_page=100`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Yotpo reviews: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

async function getShopifyProductId(productUrl: string): Promise<string | null> {
  // Extract product handle from Yotpo product URL
  // Example: https://theequestrian.com.au/products/product-handle
  const match = productUrl.match(/\/products\/([^/?]+)/);
  if (!match) return null;
  
  const handle = match[1];
  
  // Fetch product from Shopify to get the GID
  try {
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const shopifyToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
    
    if (!shopifyDomain || !shopifyToken) {
      console.warn('⚠️ Shopify credentials not found, using handle as ID');
      return `product-${handle}`;
    }

    const query = `
      query getProduct($handle: String!) {
        productByHandle(handle: $handle) {
          id
        }
      }
    `;

    const response = await fetch(`https://${shopifyDomain}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': shopifyToken,
      },
      body: JSON.stringify({
        query,
        variables: { handle },
      }),
    });

    const data = await response.json();
    return data.data?.productByHandle?.id || `product-${handle}`;
  } catch (error) {
    console.warn(`⚠️ Could not fetch Shopify product for ${handle}:`, error);
    return `product-${handle}`;
  }
}

async function importReview(review: YotpoReview): Promise<void> {
  const productId = await getShopifyProductId(review.product.url);
  
  if (!productId) {
    console.warn(`⚠️ Skipping review ${review.id}: Could not determine product ID`);
    return;
  }

  // Extract product handle from URL
  const handleMatch = review.product.url.match(/\/products\/([^/?]+)/);
  const productHandle = handleMatch ? handleMatch[1] : 'unknown';

  try {
    await sql`
      INSERT INTO reviews (
        product_id,
        product_handle,
        product_title,
        rating,
        title,
        content,
        author_name,
        author_email,
        verified_purchase,
        status,
        source,
        created_at
      ) VALUES (
        ${productId},
        ${productHandle},
        ${review.product.name},
        ${review.score},
        ${review.title || ''},
        ${review.content},
        ${review.user.display_name},
        ${review.user.email || null},
        ${review.verified_buyer},
        'approved',
        'yotpo',
        ${review.created_at}
      )
      ON CONFLICT DO NOTHING
    `;
    
    console.log(`✅ Imported review ${review.id} for ${review.product.name}`);
  } catch (error) {
    console.error(`❌ Failed to import review ${review.id}:`, error);
  }
}

async function main() {
  console.log('🚀 Starting Yotpo review import...\n');

  try {
    let page = 1;
    let totalImported = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`📥 Fetching page ${page}...`);
      
      const response = await fetchYotpoReviews(page);
      
      console.log(`Found ${response.reviews.length} reviews on page ${page}`);
      
      for (const review of response.reviews) {
        await importReview(review);
        totalImported++;
      }

      // Check if there are more pages
      const totalPages = Math.ceil(response.pagination.total / response.pagination.per_page);
      hasMore = page < totalPages;
      page++;

      // Add a small delay to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✅ Import complete! Imported ${totalImported} reviews.`);
    console.log('\n📊 Review stats:');
    
    const { rows: stats } = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE source = 'yotpo') as from_yotpo,
        ROUND(AVG(rating), 2) as avg_rating
      FROM reviews
      WHERE status = 'approved'
    `;
    
    console.log(`   Total reviews: ${stats[0].total}`);
    console.log(`   From Yotpo: ${stats[0].from_yotpo}`);
    console.log(`   Average rating: ${stats[0].avg_rating}⭐`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

main();

