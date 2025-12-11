# Master Scope Document: Hybrid Fetching & Real-Time Hydration

## Objective
Transform the product listing architecture to achieve two goals simultaneously:

1. **Sub-2-second loads** on massive categories (by switching to Hybrid Fetching)
2. **100% Price & Inventory accuracy** (by implementing Client-Side Hydration)

---

## Phase 1: Hybrid Data Fetching (The Performance Fix)

**Solves:** Slow load times on `/horse` and other root categories.

### 1.1 The Critical Requirement: Filtering Must Work Across All Pages

**IMPORTANT**: We cannot break the filtering experience. Users must be able to:
- See accurate filter counts (e.g., "Ariat (47 products)")
- Filter across the entire category, not just the current page
- Navigate through filtered results with consistent pagination

**Current System (Working)**: Fetches ALL products → Calculates facets → Filters in memory → Paginates

**Our Challenge**: Make it faster WITHOUT breaking filtering

### 1.2 The Solution: Smart Query Building

Instead of choosing between "Fetch All" or "Fetch 36", we use **filtered queries**:

**When NO filters are active**:
```javascript
query: "(product_type:"Horse Rugs" OR product_type:"Horse Boots")"
// Fetches ALL products in category (slow, but needed for accurate facets)
```

**When filters ARE active**:
```javascript
query: "(product_type:"Horse Rugs" OR product_type:"Horse Boots") AND vendor:Ariat AND tag:6.0"
// Fetches ONLY matching products (fast, because Shopify filters server-side)
```

### 1.3 Implementation Details

**Query Construction:** Implement a helper `buildShopifyQuery(productTypes, filters)` that converts filters into Shopify GraphQL syntax.

```javascript
// Input
productTypes: ["Horse Rugs", "Horse Boots"]
filters: { brands: ["Ariat"], sizes: ["6.0"], colors: ["Black"] }

// Output
"(product_type:"Horse Rugs" OR product_type:"Horse Boots") AND vendor:Ariat AND tag:6.0 AND tag:Black"
```

**Filtering Strategy**:
1. Build query with productTypes + active filters
2. Fetch ALL pages of matching products (not just 36)
3. Calculate facets from the filtered results
4. Paginate the filtered results (manual cursor: "page:N")

**Why This Works**:
- **Initial load (no filters)**: Same as current (fetches all, calculates facets)
- **With filters**: Much faster (Shopify returns only matching products)
- **Filtering**: Still works perfectly (we have the full filtered dataset)
- **Facets**: Show counts for filtered results (better UX - "how many Ariat products are size 6.0?")

**Pagination:** Keep the current manual pagination (`page:N` cursor) since we're still fetching all matching products.

---

## Phase 2: Live Price & Inventory Hydration (The Accuracy Fix)

**Solves:** Selling out-of-stock items due to aggressive caching.

### 2.1 API Endpoint (`/app/api/products/status/route.ts`)

Create a lightweight endpoint to fetch only dynamic data.

- **Input:** POST request with an array of Product IDs
- **Shopify Query:** Use the `nodes` query to fetch `totalInventory`, `availableForSale`, and `priceRange`
- **Output:** JSON map: `{ [id]: { stock: 5, price: 100.00 } }`

### 2.2 Client-Side Hook (`useLiveStatus`)

Create a hook to run on `ProductGrid` mount.

**Logic:**
1. Read the product IDs rendered by the server (from Phase 1)
2. Fetch fresh status from the new API endpoint (SWR/React Query)
3. Merge the live data over the cached data

### 2.3 UI Updates

- **Price:** If `livePrice != cachedPrice`, update the text immediately
- **Add to Cart:** If `availableForSale` turns false (even if cache said true), disable the button and show "Sold Out"

---

## Implementation Plan for Cursor

### Step 1: Backend - Smart Query Builder

> "Create a helper function `buildShopifyQuery(productTypes, filters)` in `lib/shopify/products.ts`. It should:
> 1. Build the base query: `(product_type:"Type1" OR product_type:"Type2")`
> 2. If filters.brands is provided, add: `AND (vendor:Brand1 OR vendor:Brand2)`
> 3. If filters.sizes is provided, add: `AND (tag:Size1 OR tag:Size2)`
> 4. If filters.colors is provided, add: `AND (tag:Color1 OR tag:Color2)`
> 5. Return the complete query string for Shopify's search API"

### Step 1b: Backend - Update Product Fetcher

> "Update `getProductsByTypes()` in `lib/shopify/products.ts` to use the new `buildShopifyQuery()` helper. Instead of building a query with ONLY productTypes, pass the filters parameter to build a filtered query. This lets Shopify do the filtering server-side, reducing the number of products we need to fetch and process. Keep the same pagination and facet calculation logic - we're just optimizing the query."

### Step 2: Backend - Status API

> "Create a new Next.js API route at `/api/products/status`. It should accept a list of product IDs, query Shopify for their current `totalInventory` and `priceRange` using the `nodes` query, and return a simplified JSON map."

### Step 3: Frontend - The Hook

> "Create a hook named `useLiveProductStatus`. It should take an array of products as input. Use `useSWR` to fetch the status from our new API route. Return a new array of products where the live price/inventory data overrides the initial server data."

### Step 4: Integration

> "Update the `ProductGrid` component. Use the `useLiveProductStatus` hook to hydrate the products prop. Pass the merged products down to the `ProductCard` components so users see real-time availability."

---

## Definition of Done

✅ **Speed:** Navigating to `/horse` loads in <2s (Server sends cached HTML of the first 36 items)

✅ **Filtering:** Selecting "Size: 6.0" on `/horse` works correctly by querying Shopify directly

✅ **Freshness:** If I manually change a price in Shopify, the website shows the new price within 1 second of loading the page, even if the HTML was cached yesterday

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Request                             │
│                  (e.g., /horse?size=6.0)                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │  Route Detection       │
                │  Is Root Category?     │
                └────────┬───────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
    YES (>250)                      NO (<250)
          │                             │
          ▼                             ▼
┌─────────────────────┐      ┌──────────────────────┐
│   MODE B (NEW)      │      │   MODE A (LEGACY)    │
│ Shopify Search API  │      │   Fetch All + Cache  │
│ + Query String      │      │   + JS Filter        │
└──────────┬──────────┘      └──────────┬───────────┘
           │                             │
           └──────────────┬──────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Server Response      │
              │  (Cached HTML)        │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Client Hydration     │
              │  useLiveProductStatus │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  /api/products/status │
              │  (Fresh Price/Stock)  │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  UI Update            │
              │  Real-time Data       │
              └───────────────────────┘
```

---

## Technical Notes

### Root Categories to Apply Mode B
- `/horse`
- `/rider`
- `/dog`
- Any collection with >250 products

### Query String Mapping Examples

| Filter Input | Shopify Query String |
|-------------|---------------------|
| `{ brands: ['Ariat'] }` | `(product_type:"...") AND vendor:Ariat` |
| `{ sizes: ['6.0'] }` | `(product_type:"...") AND tag:6.0` |
| `{ colors: ['black'] }` | `(product_type:"...") AND tag:black` |
| `{ brands: ['Ariat'], sizes: ['6.0'] }` | `(product_type:"...") AND vendor:Ariat AND tag:6.0` |
| `{ brands: ['Ariat', 'Woof Wear'] }` | `(product_type:"...") AND (vendor:Ariat OR vendor:"Woof Wear")` |

**Note**: Price filtering is NOT done in the Shopify query (Shopify's price search is unreliable). We filter by price client-side on the current page.

### Caching Strategy

- **Mode A (Small Categories):** Cache for 24 hours, revalidate on demand
- **Mode B (Large Categories):** Cache HTML for 1 hour, always hydrate client-side
- **Status API:** No caching, always fresh

### Performance Targets

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Initial Load (/horse, no filters) | 8-12s | <3s | Still fetches all, but optimized |
| Filtered Load (/horse?brand=Ariat) | 8-12s | <2s | Much faster - fewer products |
| Filter Application (client-side) | Instant | Instant | No change |
| Price Accuracy | ~80% | 100% | Phase 2: Hydration |
| Inventory Accuracy | ~70% | 100% | Phase 2: Hydration |

---

## Dependencies

- **SWR** or **React Query** for client-side data fetching
- Shopify Storefront API with search capabilities
- Next.js API Routes for the status endpoint

---

## Rollout Plan

1. **Week 1:** Implement Mode B for `/horse` only (A/B test)
2. **Week 2:** Add status API and hydration hook
3. **Week 3:** Roll out to all root categories
4. **Week 4:** Monitor, optimize, and document

---

## Success Metrics

- **Page Load Time:** <2s for 95th percentile
- **Cart Abandonment:** Reduce by 15% (fewer out-of-stock errors)
- **Server Costs:** Reduce by 30% (fewer full-catalog fetches)
- **Customer Complaints:** Zero "sold out after adding to cart" issues

---

*Last Updated: December 11, 2025*

