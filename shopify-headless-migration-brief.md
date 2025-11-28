# Shopify Headless Migration - Technical Brief
## The Questrian Marketplace

**Version:** 1.0  
**Date:** November 10, 2025  
**Store:** thequestrian.myshopify.com

---

## Executive Summary

Migrating The Questrian from standard Shopify theme to a headless architecture deployed on Vercel. The primary objectives are implementing custom URL structures for SEO optimization, maintaining multi-vendor marketplace functionality, and creating a scalable foundation for future enhancements.

---

## Current Architecture

### Platform Stack
- **E-commerce Platform:** Shopify (Standard Theme)
- **Marketplace Solution:** Webkul Multi-Vendor Marketplace App
  - Syncs with vendor stores
  - Real-time pricing and inventory updates
  - Split checkout per vendor (customers checkout twice for multi-vendor orders)
- **Reviews:** Yotpo (integrated via Shopify app)
- **Product Organization:** Tags for collection/subcategory allocation

### Current URL Structure
```
/products/product-name
/collections/collection-name
/collections/pads/red-pads (subcollections via tags + app for meta)
```

---

## Target Architecture

### Platform Stack
- **Frontend:** Next.js (via Vercel Shopify Headless Template)
- **Hosting:** Vercel
- **Backend:** Shopify (headless)
- **Middleware:** Custom API layer for vendor management
- **Reviews:** Yotpo API integration
- **Caching:** Vercel KV / Redis for vendor data

### Base Template
- **Repository:** https://github.com/instantcommerce/shopify-headless-theme
- **Documentation:** https://vercel.com/docs/integrations/ecommerce/shopify

---

## Core Requirements

### 1. Custom URL Structure (Primary Objective)

#### Current vs. New
```
OLD: /products/leather-saddle-pad
NEW: /saddle-pads/leather/leather-saddle-pad

OLD: /collections/saddle-pads
NEW: /saddle-pads
```

#### URL Pattern
```
/{primary-category}/{subcategory}/{product-name}
```

#### Implementation Strategy

**Collection Hierarchy:**
- Use Shopify Collections for category structure
- Top-level collections = primary categories
- Nested collections = subcategories
- Remove `/products/` and `/collections/` prefixes entirely

**Product URL Assignment:**
- Create custom metafield: `product.primary_collection`
  - Namespace: `custom`
  - Key: `primary_collection`
  - Type: `single_line_text_field` or `collection_reference`
- This metafield determines the canonical URL path
- Products can exist in multiple collections but only ONE primary URL

**Canonical URLs:**
- Primary URL (from `primary_collection`): 
  ```html
  <link rel="canonical" href="https://thequestrian.com/saddle-pads/jumping-pads/product-name" />
  ```
- Alternative access paths (other collections):
  ```
  /alternative-category/subcategory/product-name
  ```
  Still accessible but include canonical pointing to primary URL

**Fallback for Orphaned Products:**
- Products without `primary_collection` metafield:
  ```
  /product-name (flat structure)
  ```
- Include self-referencing canonical

**Example URL Structure:**
```
Product: "Leather Jumping Saddle Pad - Brown"

Primary URL (canonical):
/saddle-pads/jumping-pads/leather-jumping-saddle-pad-brown

Also accessible at:
/all-leather-products/saddle-pads/leather-jumping-saddle-pad-brown
/brown-equestrian-gear/pads/leather-jumping-saddle-pad-brown

All alternative URLs canonical to primary.
```

#### Technical Implementation

**Next.js Dynamic Routes:**
```javascript
// app/[category]/[subcategory]/[product]/page.tsx
// app/[category]/[subcategory]/page.tsx
// app/[category]/page.tsx
// app/[product]/page.tsx (fallback)
```

**Route Resolution Logic:**
1. Check if route matches `/{category}/{subcategory}/{product}` pattern
2. Query Shopify for product by handle
3. Verify product belongs to specified collection path
4. If mismatch, redirect to canonical URL (301)
5. If no primary_collection, serve from flat URL

**Collection Query:**
```graphql
query GetProductByPath($handle: String!) {
  product(handle: $handle) {
    id
    handle
    title
    metafield(namespace: "custom", key: "primary_collection") {
      value
    }
    collections(first: 10) {
      edges {
        node {
          handle
          title
        }
      }
    }
  }
}
```

---

### 2. Multi-Vendor Integration

#### Current Behavior (Webkul App)
- Products sync from vendor stores
- Real-time pricing/inventory updates
- Split checkout: customers checkout separately per vendor
- Shipping calculated per vendor

#### Headless Requirements

**Option Analysis:**
- ❌ Webkul Headless Solution ($999): Expensive, locked-in architecture
- ✅ **Custom Middleware Layer:** Full control, flexible, cacheable

**Custom Middleware Architecture:**

```
Next.js Frontend (Vercel)
        ↓
Custom API Routes (/api/vendors/*)
        ↓
Webkul API (vendor data, pricing, inventory)
        ↓
Vercel KV / Redis (caching layer)
```

**API Endpoints to Build:**
```javascript
// Vendor data
GET /api/vendors
GET /api/vendors/:id
GET /api/vendors/:id/products

// Product enrichment
GET /api/products/:handle/vendor-info

// Inventory sync
POST /api/webhooks/inventory-update

// Pricing
GET /api/products/:id/vendor-pricing
```

**Caching Strategy:**
- Vendor info: 24 hours
- Product pricing: 1 hour
- Inventory: 15 minutes
- Bust cache on Shopify webhooks

**Integration Points:**
1. Product display: Show vendor name, location
2. Pricing: Real-time vendor pricing overlay
3. Inventory: Vendor-specific stock levels
4. Checkout: Vendor attribution (for order splitting)

#### Checkout Evolution

**Current:** Multiple checkouts per vendor

**Phase 1 (Launch):**
- Single unified checkout
- Single shipping rate
- Backend splits order to vendors post-purchase
- Customer sees one transaction

**Phase 2 (Future):**
- Calculate shipping per vendor
- Display split shipping costs transparently
- Still single checkout experience

**Technical Notes:**
- May require Shopify Scripts or Shopify Functions for order tagging
- Vendor attribution via order metafields
- Post-purchase webhook to notify vendors

---

### 3. Yotpo Reviews Integration

#### Current Integration
- Yotpo Shopify app (standard widget)

#### Headless Integration

**Yotpo API Endpoints:**
```javascript
// Get reviews for product
GET https://api.yotpo.com/v1/widget/{APP_KEY}/products/{PRODUCT_ID}/reviews

// Get average rating
GET https://api.yotpo.com/products/{APP_KEY}/{PRODUCT_ID}/bottomline

// Submit review (authenticated)
POST https://api.yotpo.com/v1/widget/reviews
```

**Implementation:**
- Server-side API route to proxy Yotpo requests (hide API keys)
- Client-side components for review display
- Star ratings on product cards (collection pages)
- Full reviews on product pages
- Review submission form

**Components Needed:**
```
<ReviewStars rating={4.5} count={23} />
<ReviewList productId={123} />
<ReviewForm productId={123} onSubmit={handleSubmit} />
<ReviewSummary productId={123} />
```

**Caching:**
- Review data: 1 hour
- Ratings: 30 minutes
- Revalidate on new review submission

---

### 4. SEO & Redirects

#### Redirect Strategy

**301 Redirects Required:**
```
/products/* → /{category}/{subcategory}/*
/collections/* → /{category}/*
```

**Implementation Layers:**

1. **Next.js Middleware** (Primary)
```javascript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Redirect old product URLs
  if (pathname.startsWith('/products/')) {
    const handle = pathname.split('/products/')[1];
    const newUrl = await getCanonicalUrl(handle);
    return NextResponse.redirect(new URL(newUrl, request.url), 301);
  }
  
  // Redirect old collection URLs
  if (pathname.startsWith('/collections/')) {
    const handle = pathname.split('/collections/')[1];
    const newUrl = `/${handle}`;
    return NextResponse.redirect(new URL(newUrl, request.url), 301);
  }
}
```

2. **Vercel Configuration** (vercel.json)
```json
{
  "redirects": [
    {
      "source": "/products/:handle",
      "destination": "/api/redirect/product/:handle",
      "permanent": true
    },
    {
      "source": "/collections/:handle",
      "destination": "/:handle",
      "permanent": true
    }
  ]
}
```

3. **Shopify URL Redirects** (Fallback)
- Use Shopify Admin > URL Redirects
- Import CSV of old → new URLs
- Catches any edge cases

**Redirect Data Generation:**
- Export all current product/collection URLs from Shopify
- Map to new structure using collection hierarchy
- Generate redirect CSV/JSON
- Test sample before full deployment

#### SEO Optimizations

**Meta Tags:**
```html
<title>{Product Name} | {Subcategory} | {Category} | The Questrian</title>
<meta name="description" content="..." />
<link rel="canonical" href="{primary_url}" />
<meta property="og:url" content="{primary_url}" />
```

**Structured Data:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "...",
  "url": "{canonical_url}",
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [...]
  }
}
```

**Sitemap:**
- Generate dynamic sitemap from Shopify product data
- Include only canonical URLs
- Update on product/collection changes
- Submit to Google Search Console

**Performance:**
- Vercel Edge Functions for dynamic routes
- Image optimization via Next.js Image component
- Lazy load below-fold content
- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Vercel project from template
- [ ] Configure Shopify Storefront API
- [ ] Implement basic Next.js dynamic routing structure
- [ ] Create `primary_collection` metafield in Shopify
- [ ] Build route resolution logic for custom URLs
- [ ] Implement canonical URL logic

### Phase 2: Multi-Vendor Integration (Weeks 3-4)
- [ ] Audit Webkul API capabilities
- [ ] Build custom middleware API routes
- [ ] Implement caching layer (Vercel KV)
- [ ] Add vendor data to product pages
- [ ] Set up Shopify webhooks for inventory sync
- [ ] Test vendor pricing updates

### Phase 3: Reviews & Content (Week 5)
- [ ] Integrate Yotpo API
- [ ] Build review display components
- [ ] Implement review submission
- [ ] Add star ratings to collection pages
- [ ] Test review caching

### Phase 4: Redirects & SEO (Week 6)
- [ ] Generate redirect mapping
- [ ] Implement Next.js middleware redirects
- [ ] Configure Vercel redirects
- [ ] Set up Shopify fallback redirects
- [ ] Generate dynamic sitemap
- [ ] Implement structured data
- [ ] Test canonical URLs across all product paths

### Phase 5: Testing & Launch (Week 7-8)
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Load testing
- [ ] SEO audit
- [ ] Staging environment review
- [ ] DNS cutover plan
- [ ] Production deployment
- [ ] Monitor analytics & Core Web Vitals

---

## Data Requirements

### Shopify Metafields to Create

**Products:**
```
Namespace: custom
Key: primary_collection
Type: single_line_text_field
Value: "collection-handle/subcollection-handle"
```

**Collections:**
```
Namespace: custom
Key: parent_collection
Type: single_line_text_field
Value: "parent-collection-handle"
```

### Data Migration Tasks

1. **Audit current collection structure**
   - Export all collections
   - Map parent/child relationships
   - Identify primary collection for each product

2. **Populate metafields**
   - Script to bulk update `primary_collection` on all products
   - Use Shopify Admin API or CSV import
   - Validate coverage (all products assigned)

3. **URL mapping export**
   - Generate old URL → new URL mapping
   - Format: CSV with columns [old_url, new_url, product_id]
   - Use for redirect implementation

---

## Technical Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Headless UI / Radix UI
- **State Management:** React Context / Zustand
- **Forms:** React Hook Form

### Backend & APIs
- **Shopify Storefront API:** GraphQL
- **Shopify Admin API:** REST/GraphQL (for webhooks)
- **Yotpo API:** REST
- **Webkul API:** REST (custom middleware)

### Infrastructure
- **Hosting:** Vercel
- **Caching:** Vercel KV / Upstash Redis
- **CDN:** Vercel Edge Network
- **Monitoring:** Vercel Analytics
- **Error Tracking:** Sentry (recommended)

### Development Tools
- **IDE:** Cursor
- **Version Control:** Git
- **Package Manager:** pnpm / npm
- **Linting:** ESLint + Prettier
- **Testing:** Vitest + Playwright (recommended)

---

## Environment Variables

```bash
# Shopify
SHOPIFY_STORE_DOMAIN=thequestrian.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
SHOPIFY_ADMIN_ACCESS_TOKEN=
SHOPIFY_WEBHOOK_SECRET=

# Yotpo
YOTPO_APP_KEY=
YOTPO_SECRET_KEY=

# Webkul
WEBKUL_API_KEY=
WEBKUL_API_URL=

# Vercel
VERCEL_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Optional
SENTRY_DSN=
GOOGLE_ANALYTICS_ID=
```

---

## API Routes Structure

```
/api/
  /shopify/
    /products/[handle]      # Get product with vendor data
    /collections/[handle]   # Get collection with nested products
  /vendors/
    /index                  # List all vendors
    /[id]                   # Get vendor details
    /[id]/products          # Get vendor products
  /yotpo/
    /reviews/[productId]    # Get reviews
    /submit                 # Submit review
    /rating/[productId]     # Get average rating
  /webhooks/
    /shopify/inventory      # Inventory update webhook
    /shopify/product        # Product update webhook
  /redirect/
    /product/[handle]       # Dynamic redirect resolver
```

---

## Success Metrics

### Performance
- Lighthouse Score: 90+ (all categories)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Core Web Vitals: All green

### SEO
- Organic traffic maintains or grows post-migration
- All old URLs properly redirected (301)
- Zero 404 errors on legacy URLs
- Search Console: Zero index coverage issues

### Functionality
- Multi-vendor data displays correctly
- Review submission works 100%
- Checkout flow completes without errors
- Inventory sync < 5 minute delay

### User Experience
- Mobile conversion rate maintains or improves
- Cart abandonment rate maintains or improves
- Average session duration maintains or improves
- Bounce rate maintains or improves

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Webkul API limitations | High | Build flexible middleware that can adapt; document API constraints early |
| SEO traffic drop during migration | High | Comprehensive redirect strategy; soft launch with subset of URLs; monitor Search Console |
| Collection hierarchy complexity | Medium | Clear documentation; admin UI for managing primary collections |
| Vercel KV rate limits | Medium | Implement tiered caching; fallback to direct API calls |
| Yotpo API rate limits | Low | Cache aggressively; implement request queuing |
| Custom URL conflicts | Medium | URL validation on metafield save; conflict detection script |

---

## Open Questions & Decisions Needed

1. **Multi-vendor checkout:** 
   - Launch with unified shipping or delay for split calculation?
   - **Recommendation:** Launch unified, iterate to split

2. **Product URL conflicts:**
   - How to handle products that could fit multiple category paths?
   - **Resolved:** Use primary_collection + canonicals

3. **Collection page limits:**
   - Pagination strategy for large collections?
   - **Needs decision:** Infinite scroll vs. numbered pages

4. **Vendor page requirement:**
   - Do we need `/vendors/vendor-name` pages?
   - **Needs decision:** Yes/No/Phase 2

5. **Search functionality:**
   - Keep Shopify search or implement Algolia/Typesense?
   - **Needs decision:** Budget and requirements dependent

6. **Blog migration:**
   - Is there a blog? How to handle `/blogs/*` URLs?
   - **Needs confirmation:** Current blog setup

---

## Next Steps

1. **Repository Setup**
   - Clone Instant Commerce template
   - Initialize Git repository
   - Configure Vercel project
   - Set up development environment

2. **Shopify Configuration**
   - Create private app for Storefront API access
   - Create custom app for Admin API access
   - Set up webhook endpoints
   - Create metafield definitions

3. **Cursor AI Instructions**
   - Add this brief to Cursor's context
   - Create `.cursorrules` file with conventions
   - Define component structure standards
   - Set up code style preferences

4. **First Sprint Tasks**
   - Implement basic routing structure
   - Build URL resolution logic
   - Create product page template
   - Test canonical URL implementation

---

## Appendix

### Useful Shopify GraphQL Queries

**Get Product with Collections:**
```graphql
query GetProduct($handle: String!) {
  product(handle: $handle) {
    id
    title
    handle
    description
    descriptionHtml
    metafield(namespace: "custom", key: "primary_collection") {
      value
    }
    collections(first: 20) {
      edges {
        node {
          id
          handle
          title
          metafield(namespace: "custom", key: "parent_collection") {
            value
          }
        }
      }
    }
    variants(first: 50) {
      edges {
        node {
          id
          title
          price {
            amount
            currencyCode
          }
          availableForSale
        }
      }
    }
    images(first: 10) {
      edges {
        node {
          url
          altText
          width
          height
        }
      }
    }
  }
}
```

**Get Collection with Products:**
```graphql
query GetCollection($handle: String!, $first: Int = 50) {
  collection(handle: $handle) {
    id
    title
    handle
    description
    metafield(namespace: "custom", key: "parent_collection") {
      value
    }
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
}
```

### Example Redirect CSV Format

```csv
old_url,new_url,redirect_type
/products/leather-saddle-pad,/saddle-pads/leather/leather-saddle-pad,301
/products/jumping-boots,/boots/jumping/jumping-boots,301
/collections/saddle-pads,/saddle-pads,301
/collections/all-boots,/boots,301
```

---

## Document Control

**Author:** Technical Team  
**Last Updated:** November 10, 2025  
**Version:** 1.0  
**Status:** Draft for Review  
**Next Review:** Upon completion of Phase 1

---

## Approval Sign-off

- [ ] Technical Lead
- [ ] Project Manager  
- [ ] SEO Specialist
- [ ] Stakeholder

---

**END OF BRIEF**
