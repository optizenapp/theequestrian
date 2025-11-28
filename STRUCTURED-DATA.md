# ✅ Structured Data (JSON-LD) Implementation

## What's Implemented

All pages (products, collections, and subcollections) now include **structured data (JSON-LD)** that is embedded directly in the HTML as `<script type="application/ld+json">` tags.

This helps search engines and AI understand your site structure, product hierarchy, and content relationships.

## Product Pages (`/products/[handle]`)

### 1. BreadcrumbList Schema ✅

Tells search engines (including AI-powered ones) about the product's hierarchy:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://theequestrian.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "riding wear",
      "item": "https://theequestrian.com/riding-wear"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "breeches",
      "item": "https://theequestrian.com/riding-wear/breeches"
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": "Product Name",
      "item": "https://theequestrian.com/products/product-handle"
    }
  ]
}
```

**Benefits:**
- ✅ Shows Google/Bing the product's category hierarchy
- ✅ Can appear in search results as breadcrumb navigation
- ✅ Helps AI understand product context
- ✅ Works even though URL is flat (`/products/handle`)

### 2. Product Schema ✅

Provides rich product information to search engines:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Paddock Boot Brown",
  "description": "High-quality leather paddock boots...",
  "image": "https://cdn.shopify.com/...",
  "offers": {
    "@type": "Offer",
    "url": "https://theequestrian.com/products/paddock-boot-brown",
    "priceCurrency": "USD",
    "price": "129.99",
    "availability": "https://schema.org/InStock"
  }
}
```

**Benefits:**
- ✅ Enables rich snippets in search results (price, availability, ratings)
- ✅ Shows product info in Google Shopping
- ✅ Improves click-through rates from search
- ✅ Helps AI assistants answer product questions

## Collection Pages (`/[collection]`)

### 1. BreadcrumbList Schema ✅

Shows the collection's position in the site hierarchy:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://theequestrian.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Riding Wear",
      "item": "https://theequestrian.com/riding-wear"
    }
  ]
}
```

### 2. CollectionPage Schema ✅

Provides information about the collection:

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Riding Wear",
  "description": "Premium equestrian riding wear...",
  "url": "https://theequestrian.com/riding-wear",
  "image": "https://cdn.shopify.com/..."
}
```

**Benefits:**
- ✅ Helps search engines understand collection pages
- ✅ Can appear in site links in search results
- ✅ Improves category page SEO
- ✅ Better AI understanding of site structure

## Subcollection Pages (`/[collection]/[tag]`)

### 1. BreadcrumbList Schema ✅

Shows the full hierarchy including parent collection:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://theequestrian.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "riding wear",
      "item": "https://theequestrian.com/riding-wear"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Breeches",
      "item": "https://theequestrian.com/riding-wear/breeches"
    }
  ]
}
```

### 2. CollectionPage Schema with Parent ✅

Shows the subcollection and its relationship to the parent:

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Breeches",
  "description": "High-quality riding breeches...",
  "url": "https://theequestrian.com/riding-wear/breeches",
  "image": "https://cdn.shopify.com/...",
  "isPartOf": {
    "@type": "CollectionPage",
    "name": "riding wear",
    "url": "https://theequestrian.com/riding-wear"
  }
}
```

**Benefits:**
- ✅ Shows parent-child collection relationships
- ✅ Helps search engines understand site taxonomy
- ✅ Better filtering and categorization in search
- ✅ AI can understand product organization

## How It Works

### Implementation Locations

**Product Pages:** `app/products/[handle]/page.tsx`
**Collection Pages:** `app/[category]/page.tsx`
**Subcollection Pages:** `app/[category]/[subcategory]/page.tsx`

The structured data is generated server-side and embedded in the HTML:

#### Product Page Example

```tsx
// Build schemas
const breadcrumbSchema = { /* ... */ };
const productSchema = { /* ... */ };

return (
  <>
    {/* Structured Data - BreadcrumbList */}
    {breadcrumbSchema && (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    )}
    
    {/* Structured Data - Product */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
    />
    
    {/* Page content */}
    <div>...</div>
  </>
);
```

#### Collection Page Example

```tsx
// Build schemas
const breadcrumbSchema = { /* ... */ };
const collectionSchema = { /* ... */ };

return (
  <>
    {/* Structured Data - BreadcrumbList */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
    />
    
    {/* Structured Data - CollectionPage */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
    />
    
    {/* Page content */}
    <div>...</div>
  </>
);
```

### Data Sources

**BreadcrumbList:**
- Built from `product.primaryCollection` metafield
- Format: `collection-handle/tag-name`
- Example: `riding-wear/breeches`

**Product:**
- `name` → `product.title`
- `description` → `product.description`
- `image` → First product image
- `price` → `product.priceRange.minVariantPrice.amount`
- `priceCurrency` → `product.priceRange.minVariantPrice.currencyCode`
- `availability` → Based on `product.availableForSale`

**CollectionPage:**
- `name` → `collection.title`
- `description` → `collection.description`
- `url` → Collection URL
- `image` → Collection image (if available)
- `isPartOf` → Parent collection (for subcollections only)

## Testing Structured Data

### 1. Google Rich Results Test
1. Visit: https://search.google.com/test/rich-results
2. Test each page type:
   - **Product page:** Should show BreadcrumbList + Product
   - **Collection page:** Should show BreadcrumbList + CollectionPage
   - **Subcollection page:** Should show BreadcrumbList + CollectionPage (with isPartOf)
3. All should show:
   - ✅ Schemas detected
   - ✅ No errors

### 2. Schema.org Validator
1. Visit: https://validator.schema.org/
2. Enter your product URL
3. Should validate both schemas

### 3. View Page Source
1. Visit any product page
2. View source (Ctrl+U / Cmd+U)
3. Search for `application/ld+json`
4. You should see both schemas in the HTML

### 4. Browser DevTools
```javascript
// In browser console:
const scripts = document.querySelectorAll('script[type="application/ld+json"]');
scripts.forEach(s => console.log(JSON.parse(s.textContent)));
```

## What Search Engines See

### Google Search Results
With this structured data, your products can show:
- ⭐ Star ratings (when you add review schema)
- 💰 Price
- ✅ In stock / Out of stock
- 🔗 Breadcrumb navigation
- 📸 Product image

### AI Search Engines (ChatGPT, Perplexity, etc.)
The structured data helps AI understand:
- Product hierarchy and categorization
- Pricing and availability
- Product relationships
- Site structure

## Future Enhancements

### 1. Review/Rating Schema (Coming Soon)
When you deploy the custom review system:

```json
{
  "@type": "Product",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "24"
  }
}
```

### 2. Organization Schema
Add to site-wide layout:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "The Equestrian",
  "url": "https://theequestrian.com",
  "logo": "https://theequestrian.com/logo.png"
}
```

### 3. WebSite Schema
Add search functionality schema:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://theequestrian.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://theequestrian.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

## SEO Impact

### Before (Without Structured Data)
- Plain text search results
- No rich snippets
- Search engines guess at structure
- Lower click-through rates

### After (With Structured Data) ✅
- Rich product snippets
- Breadcrumb navigation in results
- Price and availability shown
- Better AI understanding
- Higher click-through rates (typically 10-30% increase)

## Monitoring

### Google Search Console
1. Go to **Enhancements** → **Products**
2. Monitor:
   - Valid products detected
   - Errors or warnings
   - Impressions and clicks

### Schema Markup Reports
- Check for errors weekly
- Fix any validation issues
- Update schemas when Shopify data changes

## Requirements

### ✅ Already Working
- Product schema generates automatically
- BreadcrumbList generates from metafield
- Both embedded in HTML correctly

### ⚠️ Needs Setup
- **Primary Collection metafield** must be set in Shopify
  - Without it, breadcrumbs won't show
  - Product schema still works

### 📋 To Set Up
1. Create `seo.primary_collection` metafield in Shopify
2. Set primary collection for each product
3. Deploy to production
4. Test with Google Rich Results Test
5. Monitor in Google Search Console

## Summary

**Status: ✅ FULLY IMPLEMENTED**

Structured data is now embedded across all page types:

### ✅ Product Pages
- BreadcrumbList schema
- Product schema

### ✅ Collection Pages  
- BreadcrumbList schema
- CollectionPage schema

### ✅ Subcollection Pages
- BreadcrumbList schema (3-level hierarchy)
- CollectionPage schema with parent relationship

This gives you:

- ✅ Rich snippets in search results
- ✅ Better AI understanding
- ✅ Breadcrumb navigation display
- ✅ Price and availability in search
- ✅ Improved SEO performance
- ✅ Higher click-through rates

The structured data works independently of the URL structure, so even with flat `/products/handle` URLs, search engines understand the full product hierarchy through the BreadcrumbList schema.


## What's Implemented

All pages (products, collections, and subcollections) now include **structured data (JSON-LD)** that is embedded directly in the HTML as `<script type="application/ld+json">` tags.

This helps search engines and AI understand your site structure, product hierarchy, and content relationships.

## Product Pages (`/products/[handle]`)

### 1. BreadcrumbList Schema ✅

Tells search engines (including AI-powered ones) about the product's hierarchy:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://theequestrian.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "riding wear",
      "item": "https://theequestrian.com/riding-wear"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "breeches",
      "item": "https://theequestrian.com/riding-wear/breeches"
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": "Product Name",
      "item": "https://theequestrian.com/products/product-handle"
    }
  ]
}
```

**Benefits:**
- ✅ Shows Google/Bing the product's category hierarchy
- ✅ Can appear in search results as breadcrumb navigation
- ✅ Helps AI understand product context
- ✅ Works even though URL is flat (`/products/handle`)

### 2. Product Schema ✅

Provides rich product information to search engines:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Paddock Boot Brown",
  "description": "High-quality leather paddock boots...",
  "image": "https://cdn.shopify.com/...",
  "offers": {
    "@type": "Offer",
    "url": "https://theequestrian.com/products/paddock-boot-brown",
    "priceCurrency": "USD",
    "price": "129.99",
    "availability": "https://schema.org/InStock"
  }
}
```

**Benefits:**
- ✅ Enables rich snippets in search results (price, availability, ratings)
- ✅ Shows product info in Google Shopping
- ✅ Improves click-through rates from search
- ✅ Helps AI assistants answer product questions

## Collection Pages (`/[collection]`)

### 1. BreadcrumbList Schema ✅

Shows the collection's position in the site hierarchy:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://theequestrian.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Riding Wear",
      "item": "https://theequestrian.com/riding-wear"
    }
  ]
}
```

### 2. CollectionPage Schema ✅

Provides information about the collection:

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Riding Wear",
  "description": "Premium equestrian riding wear...",
  "url": "https://theequestrian.com/riding-wear",
  "image": "https://cdn.shopify.com/..."
}
```

**Benefits:**
- ✅ Helps search engines understand collection pages
- ✅ Can appear in site links in search results
- ✅ Improves category page SEO
- ✅ Better AI understanding of site structure

## Subcollection Pages (`/[collection]/[tag]`)

### 1. BreadcrumbList Schema ✅

Shows the full hierarchy including parent collection:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://theequestrian.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "riding wear",
      "item": "https://theequestrian.com/riding-wear"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Breeches",
      "item": "https://theequestrian.com/riding-wear/breeches"
    }
  ]
}
```

### 2. CollectionPage Schema with Parent ✅

Shows the subcollection and its relationship to the parent:

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Breeches",
  "description": "High-quality riding breeches...",
  "url": "https://theequestrian.com/riding-wear/breeches",
  "image": "https://cdn.shopify.com/...",
  "isPartOf": {
    "@type": "CollectionPage",
    "name": "riding wear",
    "url": "https://theequestrian.com/riding-wear"
  }
}
```

**Benefits:**
- ✅ Shows parent-child collection relationships
- ✅ Helps search engines understand site taxonomy
- ✅ Better filtering and categorization in search
- ✅ AI can understand product organization

## How It Works

### Implementation Locations

**Product Pages:** `app/products/[handle]/page.tsx`
**Collection Pages:** `app/[category]/page.tsx`
**Subcollection Pages:** `app/[category]/[subcategory]/page.tsx`

The structured data is generated server-side and embedded in the HTML:

#### Product Page Example

```tsx
// Build schemas
const breadcrumbSchema = { /* ... */ };
const productSchema = { /* ... */ };

return (
  <>
    {/* Structured Data - BreadcrumbList */}
    {breadcrumbSchema && (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    )}
    
    {/* Structured Data - Product */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
    />
    
    {/* Page content */}
    <div>...</div>
  </>
);
```

#### Collection Page Example

```tsx
// Build schemas
const breadcrumbSchema = { /* ... */ };
const collectionSchema = { /* ... */ };

return (
  <>
    {/* Structured Data - BreadcrumbList */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
    />
    
    {/* Structured Data - CollectionPage */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
    />
    
    {/* Page content */}
    <div>...</div>
  </>
);
```

### Data Sources

**BreadcrumbList:**
- Built from `product.primaryCollection` metafield
- Format: `collection-handle/tag-name`
- Example: `riding-wear/breeches`

**Product:**
- `name` → `product.title`
- `description` → `product.description`
- `image` → First product image
- `price` → `product.priceRange.minVariantPrice.amount`
- `priceCurrency` → `product.priceRange.minVariantPrice.currencyCode`
- `availability` → Based on `product.availableForSale`

**CollectionPage:**
- `name` → `collection.title`
- `description` → `collection.description`
- `url` → Collection URL
- `image` → Collection image (if available)
- `isPartOf` → Parent collection (for subcollections only)

## Testing Structured Data

### 1. Google Rich Results Test
1. Visit: https://search.google.com/test/rich-results
2. Test each page type:
   - **Product page:** Should show BreadcrumbList + Product
   - **Collection page:** Should show BreadcrumbList + CollectionPage
   - **Subcollection page:** Should show BreadcrumbList + CollectionPage (with isPartOf)
3. All should show:
   - ✅ Schemas detected
   - ✅ No errors

### 2. Schema.org Validator
1. Visit: https://validator.schema.org/
2. Enter your product URL
3. Should validate both schemas

### 3. View Page Source
1. Visit any product page
2. View source (Ctrl+U / Cmd+U)
3. Search for `application/ld+json`
4. You should see both schemas in the HTML

### 4. Browser DevTools
```javascript
// In browser console:
const scripts = document.querySelectorAll('script[type="application/ld+json"]');
scripts.forEach(s => console.log(JSON.parse(s.textContent)));
```

## What Search Engines See

### Google Search Results
With this structured data, your products can show:
- ⭐ Star ratings (when you add review schema)
- 💰 Price
- ✅ In stock / Out of stock
- 🔗 Breadcrumb navigation
- 📸 Product image

### AI Search Engines (ChatGPT, Perplexity, etc.)
The structured data helps AI understand:
- Product hierarchy and categorization
- Pricing and availability
- Product relationships
- Site structure

## Future Enhancements

### 1. Review/Rating Schema (Coming Soon)
When you deploy the custom review system:

```json
{
  "@type": "Product",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "24"
  }
}
```

### 2. Organization Schema
Add to site-wide layout:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "The Equestrian",
  "url": "https://theequestrian.com",
  "logo": "https://theequestrian.com/logo.png"
}
```

### 3. WebSite Schema
Add search functionality schema:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://theequestrian.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://theequestrian.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

## SEO Impact

### Before (Without Structured Data)
- Plain text search results
- No rich snippets
- Search engines guess at structure
- Lower click-through rates

### After (With Structured Data) ✅
- Rich product snippets
- Breadcrumb navigation in results
- Price and availability shown
- Better AI understanding
- Higher click-through rates (typically 10-30% increase)

## Monitoring

### Google Search Console
1. Go to **Enhancements** → **Products**
2. Monitor:
   - Valid products detected
   - Errors or warnings
   - Impressions and clicks

### Schema Markup Reports
- Check for errors weekly
- Fix any validation issues
- Update schemas when Shopify data changes

## Requirements

### ✅ Already Working
- Product schema generates automatically
- BreadcrumbList generates from metafield
- Both embedded in HTML correctly

### ⚠️ Needs Setup
- **Primary Collection metafield** must be set in Shopify
  - Without it, breadcrumbs won't show
  - Product schema still works

### 📋 To Set Up
1. Create `seo.primary_collection` metafield in Shopify
2. Set primary collection for each product
3. Deploy to production
4. Test with Google Rich Results Test
5. Monitor in Google Search Console

## Summary

**Status: ✅ FULLY IMPLEMENTED**

Structured data is now embedded across all page types:

### ✅ Product Pages
- BreadcrumbList schema
- Product schema

### ✅ Collection Pages  
- BreadcrumbList schema
- CollectionPage schema

### ✅ Subcollection Pages
- BreadcrumbList schema (3-level hierarchy)
- CollectionPage schema with parent relationship

This gives you:

- ✅ Rich snippets in search results
- ✅ Better AI understanding
- ✅ Breadcrumb navigation display
- ✅ Price and availability in search
- ✅ Improved SEO performance
- ✅ Higher click-through rates

The structured data works independently of the URL structure, so even with flat `/products/handle` URLs, search engines understand the full product hierarchy through the BreadcrumbList schema.

