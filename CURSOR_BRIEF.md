# Performance Fix: Move to Vercel Postgres for Product Search

## The Problem

Our current product filtering is **8-12 seconds per request**. The bottleneck:

1. We fetch **ALL products** from Shopify GraphQL API (1000+ products for `/horse`)
2. Shopify takes 2-3s just to respond
3. We make multiple API calls (pagination loop)
4. We filter in JavaScript (extra latency)
5. We return 36 products to user

**We moved to headless for performance, but we're not getting it.** The issue isn't our code—it's that Shopify's GraphQL API is slow for large product sets.

## The Solution: Vercel Postgres

Instead of querying Shopify on every request, **store products in Vercel Postgres and query locally**.

### Why This Works

```
BEFORE (Current):
User request → Shopify API (2-3s) → Fetch 1000 products → Filter JS → Return
Total: 8-12s

AFTER (Postgres):
User request → Postgres query (20-50ms) → Return
Total: <200ms
```

**That's 40-60x faster.** And we don't need to change the UI at all.

### Why Vercel Postgres Specifically

- ✅ Native to Vercel (already in Pro plan, ~$15/mo)
- ✅ Built-in to Next.js (no extra infrastructure)
- ✅ Handles 10k products easily (scales to 100k+)
- ✅ Fast for our use case (<50ms queries)
- ✅ No new services to manage

## Implementation Overview

### Phase 1: Database Setup (2-3 days)

**1.1 Create Postgres schema**

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  vendor TEXT,
  product_type TEXT,
  price DECIMAL(10, 2),
  compare_at_price DECIMAL(10, 2),
  inventory_quantity INT DEFAULT 0,
  tags TEXT[],
  image_url TEXT,
  shopify_created_at TIMESTAMP,
  synced_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for filtering performance
CREATE INDEX idx_vendor ON products(vendor);
CREATE INDEX idx_product_type ON products(product_type);
CREATE INDEX idx_tags ON products USING GIN(tags);
CREATE INDEX idx_price ON products(price);
CREATE INDEX idx_inventory ON products(inventory_quantity);
```

**1.2 Create initial sync script**

File: `scripts/sync-products-to-db.ts`

```typescript
import { sql } from '@vercel/postgres';
import { getProductsByTypes } from '@/lib/shopify/products';

const ALL_PRODUCT_TYPES = [
  'Horse Rugs',
  'Horse Boots',
  'Horse Saddles',
  'Horse Bridles',
  // ... all types from your config
];

export async function syncProductsFromShopify() {
  console.log('Starting product sync...');
  
  // Fetch all products from Shopify (this is the ONE TIME we do this)
  const allProducts = await getProductsByTypes(ALL_PRODUCT_TYPES, 250);
  
  console.log(`Fetched ${allProducts.length} products from Shopify`);
  
  // Clear old data (optional, or do upsert)
  await sql`TRUNCATE TABLE products`;
  
  // Batch insert (Postgres handles this efficiently)
  let inserted = 0;
  for (const product of allProducts) {
    try {
      await sql`
        INSERT INTO products 
        (id, title, vendor, product_type, price, compare_at_price, inventory_quantity, tags, image_url, shopify_created_at, synced_at)
        VALUES 
        (${product.id}, ${product.title}, ${product.vendor}, ${product.product_type}, ${product.price}, ${product.compareAtPrice}, ${product.inventory_quantity}, ${product.tags}, ${product.image_url}, ${product.createdAt}, NOW())
      `;
      inserted++;
      if (inserted % 100 === 0) console.log(`Inserted ${inserted} products...`);
    } catch (error) {
      console.error(`Failed to insert product ${product.id}:`, error);
    }
  }
  
  console.log(`✅ Synced ${inserted} products to Postgres`);
  return { synced: inserted, total: allProducts.length };
}

// Run this on deploy
if (require.main === module) {
  syncProductsFromShopify()
    .then(result => console.log('Sync complete:', result))
    .catch(error => console.error('Sync failed:', error));
}
```

**1.3 Run initial sync**

```bash
# This is a one-time operation
# Run locally: npx ts-node scripts/sync-products-to-db.ts
# Or set up as a post-deploy hook in vercel.json
```

**Expected time**: 2-3 minutes for 10k products

---

### Phase 2: Replace Product Fetching (2-3 days)

**2.1 Create new search API endpoint**

File: `app/api/products/search/route.ts`

```typescript
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

interface SearchParams {
  productTypes?: string[];
  brands?: string[];
  sizes?: string[];
  colors?: string[];
  limit?: number;
  offset?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query params
    const productTypes = searchParams.getAll('type');
    const brands = searchParams.getAll('brand');
    const sizes = searchParams.getAll('size');
    const colors = searchParams.getAll('color');
    const limit = parseInt(searchParams.get('limit') || '36');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build dynamic WHERE clause
    let whereClause = '1=1';
    const params: (string | string[])[] = [];

    if (productTypes.length > 0) {
      whereClause += ` AND product_type = ANY($${params.length + 1}::text[])`;
      params.push(productTypes);
    }

    if (brands.length > 0) {
      whereClause += ` AND vendor = ANY($${params.length + 1}::text[])`;
      params.push(brands);
    }

    if (sizes.length > 0) {
      whereClause += ` AND tags && $${params.length + 1}::text[]`;
      params.push(sizes);
    }

    if (colors.length > 0) {
      whereClause += ` AND tags && $${params.length + 1}::text[]`;
      params.push(colors);
    }

    // Fetch products with pagination
    const query = `
      SELECT id, title, vendor, product_type, price, compare_at_price, inventory_quantity, image_url, tags
      FROM products
      WHERE ${whereClause}
      ORDER BY shopify_created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const productsResult = await sql.query(query, [...params, limit, offset]);
    const products = productsResult.rows;

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products
      WHERE ${whereClause}
    `;
    const countResult = await sql.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total);

    // Get facets (brands, sizes, colors available in filtered results)
    const facetsQuery = `
      SELECT 
        vendor as brand,
        COUNT(DISTINCT id) as count
      FROM products
      WHERE ${whereClause}
      GROUP BY vendor
      ORDER BY count DESC
    `;
    const facetsResult = await sql.query(facetsQuery, params);
    const brandFacets = facetsResult.rows;

    // Calculate next/prev cursors
    const nextOffset = offset + limit;
    const hasNextPage = nextOffset < totalCount;
    const nextCursor = hasNextPage ? `offset=${nextOffset}` : null;

    return NextResponse.json({
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        vendor: p.vendor,
        price: parseFloat(p.price),
        compareAtPrice: p.compare_at_price ? parseFloat(p.compare_at_price) : null,
        inventory: p.inventory_quantity,
        image: p.image_url,
        tags: p.tags || [],
      })),
      pagination: {
        limit,
        offset,
        totalCount,
        hasNextPage,
        nextCursor,
      },
      facets: {
        brands: brandFacets.map(f => ({ value: f.brand, count: parseInt(f.count) })),
      },
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
```

**2.2 Update the products page component**

File: `app/[category]/page.tsx` (modify the existing page)

Replace the `getProductsByTypes()` call with a call to our new endpoint:

```typescript
// OLD CODE (lines ~150-159)
const products = await getProductsByTypes(
  allowedProductTypes,
  36,
  afterCursor,
  filters
);

// NEW CODE
const searchParams = new URLSearchParams();
allowedProductTypes.forEach(t => searchParams.append('type', t));
Object.entries(filters).forEach(([key, values]) => {
  if (values && values.length > 0) {
    values.forEach(v => searchParams.append(key, v));
  }
});
searchParams.append('limit', '36');
if (afterCursor) searchParams.append('offset', afterCursor);

const response = await fetch(
  `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/products/search?${searchParams}`,
  { next: { revalidate: 300 } } // ISR: revalidate every 5 minutes
);

const { products, pagination, facets } = await response.json();
```

**2.3 Update filtering component**

File: `components/filters/ProductGridWithFilters.tsx` (client-side)

```typescript
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function ProductGridWithFilters({ initialProducts, initialFacets }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState(initialProducts);
  const [facets, setFacets] = useState(initialFacets);
  const [loading, setLoading] = useState(false);

  const handleFilterChange = async (filterName: string, filterValue: string) => {
    setLoading(true);
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    const currentValues = newParams.getAll(filterName);
    
    if (currentValues.includes(filterValue)) {
      newParams.delete(filterName, filterValue);
    } else {
      newParams.append(filterName, filterValue);
    }
    
    // Reset to first page
    newParams.delete('offset');
    
    // Fetch new products
    const response = await fetch(`/api/products/search?${newParams}`);
    const { products: newProducts, facets: newFacets } = await response.json();
    
    setProducts(newProducts);
    setFacets(newFacets);
    router.push(`?${newParams.toString()}`);
    
    setLoading(false);
  };

  return (
    <div>
      {/* Your filter UI */}
      {facets.brands.map(brand => (
        <label key={brand.value}>
          <input
            type="checkbox"
            onChange={() => handleFilterChange('brand', brand.value)}
            checked={searchParams.getAll('brand').includes(brand.value)}
          />
          {brand.value} ({brand.count})
        </label>
      ))}
      
      {/* Your product grid */}
      <div className="grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {loading && <div>Loading...</div>}
    </div>
  );
}
```

---

### Phase 3: Add Webhook for Real-Time Updates (2-3 days)

**3.1 Create webhook endpoint**

File: `app/api/webhooks/shopify/product-update/route.ts`

```typescript
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/shopify/webhooks';

export async function POST(request: NextRequest) {
  try {
    // Verify the webhook is from Shopify
    const isValid = await verifyShopifyWebhook(request);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await request.json();
    
    // Update or insert the product
    await sql`
      INSERT INTO products 
      (id, title, vendor, product_type, price, compare_at_price, inventory_quantity, tags, image_url, shopify_created_at, synced_at)
      VALUES 
      (${product.id}, ${product.title}, ${product.vendor}, ${product.product_type}, ${product.price}, ${product.compare_at_price}, ${product.inventory_quantity}, ${product.tags}, ${product.image}, ${product.created_at}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        vendor = EXCLUDED.vendor,
        price = EXCLUDED.price,
        compare_at_price = EXCLUDED.compare_at_price,
        inventory_quantity = EXCLUDED.inventory_quantity,
        tags = EXCLUDED.tags,
        image_url = EXCLUDED.image_url,
        synced_at = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
```

**3.2 Register webhook in Shopify**

In your Shopify admin:
- App Settings → Webhooks
- Add new webhook:
  - Topic: `products/update`
  - Endpoint: `https://yourdomain.com/api/webhooks/shopify/product-update`

**3.3 Also handle `products/delete`**

File: `app/api/webhooks/shopify/product-delete/route.ts`

```typescript
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/shopify/webhooks';

export async function POST(request: NextRequest) {
  try {
    const isValid = await verifyShopifyWebhook(request);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await request.json();
    
    await sql`DELETE FROM products WHERE id = ${product.id}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
```

---

### Phase 4: Testing & Verification (2-3 days)

**4.1 Test locally**

```bash
# 1. Set up local Postgres (or use Vercel Postgres from staging)
# 2. Run sync script
npx ts-node scripts/sync-products-to-db.ts

# 3. Test search endpoint
curl 'http://localhost:3000/api/products/search?type=Horse%20Rugs&brand=Ariat'

# 4. Verify response time (<200ms)
# 5. Test filtering UI
```

**4.2 Performance benchmarks**

Before (Shopify API):
```
Request → /horse (no filters)
Time: 8-12 seconds
Products fetched: 1000+
API calls: ~4
```

After (Postgres):
```
Request → /horse (no filters)
Time: <200ms
Products fetched: 36 (from 10k in DB)
API calls: 1 (database query)
```

**4.3 Verify filtering still works**

- [ ] Click brand filter → Results update <500ms
- [ ] Click size + brand filter → Results accurate
- [ ] Paginate through results → All products show
- [ ] Facet counts match product results
- [ ] Clear all filters → Returns to full dataset

---

## Timeline & Effort

| Phase | Duration | Effort | Key Deliverable |
|-------|----------|--------|-----------------|
| 1. DB Setup | 2-3 days | Medium | Postgres schema + sync script |
| 2. API & UI | 2-3 days | Medium | Search endpoint + updated pages |
| 3. Webhooks | 2-3 days | Low | Real-time product sync |
| 4. Testing | 2-3 days | Medium | Performance verified |
| **Total** | **1-2 weeks** | **Medium** | **40-60x faster** |

---

## Risk Assessment

### Low Risk ✅
- New database (isolated, doesn't affect Shopify)
- New API endpoint (doesn't break existing code)
- Webhooks (fire and forget, non-critical)

### What Could Break ⚠️
- If you don't run initial sync, products won't appear
- If webhooks fail silently, data gets stale
- If you query old API alongside new one, data mismatch

### Mitigation
- Run sync script before deploying new pages
- Monitor webhook delivery in Shopify admin
- Keep old `getProductsByTypes()` as fallback initially
- Log all errors from webhooks

---

## Files to Create/Modify

### New Files (Create)
- `scripts/sync-products-to-db.ts` - Initial sync script
- `app/api/products/search/route.ts` - Search endpoint
- `app/api/webhooks/shopify/product-update/route.ts` - Update webhook
- `app/api/webhooks/shopify/product-delete/route.ts` - Delete webhook

### Files to Modify
- `app/[category]/page.tsx` - Replace `getProductsByTypes()` call
- `components/filters/ProductGridWithFilters.tsx` - Update to call new API
- `vercel.json` - Add post-deploy hook to run sync script (optional)

### Files to Keep (No Changes)
- `lib/shopify/products.ts` - Still use for initial sync
- `components/ProductCard.tsx` - Works with new data format
- All styling/UI components - No changes needed

---

## Success Criteria

- ✅ Initial page load: <200ms (measured with DevTools)
- ✅ Filtering: <500ms response time
- ✅ Pagination: Shows correct products
- ✅ Facet counts: Accurate (match filtered results)
- ✅ Real-time updates: Products updated within 5 minutes of Shopify change
- ✅ No 404s or missing products
- ✅ All existing filters still work

---

## What Stays the Same

- User-facing UI (no redesign needed)
- Pagination behavior (still cursor-based)
- Filter logic (same filters, just faster)
- Product card design
- Everything from the user's perspective

---

## Questions Before Starting

1. Do you want to keep the old `getProductsByTypes()` function as a fallback?
2. Should webhooks auto-sync inventory quantities in real-time, or is 15-min cache fine?
3. Do you need search by product name/description, or just filtering?
4. Should we sync product images as URLs or blob data?

---

## Next Steps

1. ✅ Approve this plan
2. Create Postgres table schema
3. Build and test sync script locally
4. Build search API endpoint
5. Update product pages
6. Test filtering works end-to-end
7. Set up webhooks
8. Deploy to staging
9. Verify performance
10. Deploy to production

Let's go. This will fix the performance problem.
