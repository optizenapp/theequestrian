# URL Structure Documentation

## Overview

The Equestrian Headless uses a clean, SEO-friendly URL structure that balances user experience with technical best practices.

## Final URL Structure

### ✅ Products (Canonical)
```
/products/[handle]
```
**Example:** `/products/paddock-boot-brown`

- **Single source of truth** for all products
- No duplicate content issues
- All internal links point here
- Breadcrumbs show hierarchy dynamically
- Rich structured data (JSON-LD) for SEO

### ✅ Collections
```
/[collection-handle]
```
**Example:** `/riding-wear`

- Clean, simple URLs
- No `/collections/` prefix

### ✅ Tag-Filtered Collections (Sub-Collections)
```
/[collection-handle]/[tag-name]
```
**Example:** `/riding-wear/breeches`

- Uses Shopify tags for filtering
- Works with both smart collections and manual collections

## Redirects

### 1. Old Collection URLs → New Structure
```
OLD: /collections/riding-wear
NEW: /riding-wear
```
**Status:** 301 Permanent Redirect

```
OLD: /collections/riding-wear/breeches
NEW: /riding-wear/breeches
```
**Status:** 301 Permanent Redirect

### 2. Hierarchical Product URLs → Canonical
```
OLD: /riding-wear/breeches/product-handle
NEW: /products/product-handle
```
**Status:** 301 Permanent Redirect

**Note:** These hierarchical URLs still work (for backwards compatibility or if users type them), but they immediately redirect to the canonical `/products/[handle]` URL.

## Implementation Details

### Middleware (`middleware.ts`)
- Handles `/collections/*` → `/*` redirects
- Preserves query parameters
- 301 permanent redirects for SEO

### Dynamic Routes

#### Products (Canonical)
**File:** `app/products/[handle]/page.tsx`
- Fetches product by handle
- Displays product details
- Generates breadcrumbs from `primaryCollection` metafield
- Includes BreadcrumbList JSON-LD schema
- Returns 404 if product doesn't exist

#### Collections
**File:** `app/[collection]/page.tsx`
- Displays collection/category page
- Shows all products in collection

#### Tag-Filtered Collections
**File:** `app/[collection]/[tag]/page.tsx`
- Displays collection filtered by tag
- Shows products matching both collection and tag

#### Hierarchical Products (Redirect Only)
**File:** `app/[category]/[subcategory]/[product]/page.tsx`
- Verifies product exists
- 301 redirects to `/products/[handle]`
- No rendering (redirect happens first)

## SEO Strategy

### 1. Canonical URLs
Every product page sets its canonical URL to `/products/[handle]`:

```typescript
alternates: {
  canonical: `${siteUrl}/products/${handle}`
}
```

### 2. Breadcrumbs (Dynamic)
Breadcrumbs are generated from the `primaryCollection` metafield:

```
Home > Riding Wear > Breeches > Product Name
```

### 3. Structured Data (JSON-LD)
BreadcrumbList schema tells search engines about hierarchy:

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
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Breeches",
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

## Required Shopify Configuration

### Primary Collection Metafield

To enable dynamic breadcrumbs, you need to set up a metafield in Shopify:

1. Go to **Shopify Admin** → **Settings** → **Custom data** → **Products**
2. Click **Add definition**
3. Configure:
   - **Name:** Primary Collection
   - **Namespace and key:** `seo.primary_collection`
   - **Type:** Single line text
   - **Value format:** `collection-handle/tag-name`

**Example value:** `riding-wear/breeches`

### How to Set Primary Collection

For each product:
1. Edit product in Shopify Admin
2. Scroll to **Metafields**
3. Find **Primary Collection**
4. Enter the path: `collection-handle/tag-name`

**Note:** This determines which breadcrumb path shows on the product page.

## Internal Linking Rules

### ✅ DO: Link to Canonical URLs
```html
<!-- On collection pages -->
<a href="/products/paddock-boot-brown">Paddock Boot</a>

<!-- NOT -->
<a href="/riding-wear/boots/paddock-boot-brown">Paddock Boot</a>
```

### ✅ DO: Use Breadcrumbs for Hierarchy
Let breadcrumbs show the hierarchy, not the URL:
```
Home > Riding Wear > Boots > Paddock Boot
  ↓        ↓         ↓          ↓
  /   /riding-wear  /riding-wear/boots  /products/paddock-boot-brown
```

## Testing the URL Structure

### Test Cases

1. **Product Page (Canonical)**
   ```
   URL: http://localhost:3001/products/[any-product-handle]
   Expected: Product page displays with breadcrumbs
   ```

2. **Collection Page**
   ```
   URL: http://localhost:3001/riding-wear
   Expected: Collection page with products
   ```

3. **Tag-Filtered Collection**
   ```
   URL: http://localhost:3001/riding-wear/breeches
   Expected: Collection page filtered by "breeches" tag
   ```

4. **Old Collection URL (Redirect)**
   ```
   URL: http://localhost:3001/collections/riding-wear
   Expected: 301 redirect to /riding-wear
   ```

5. **Old Tag-Filtered Collection URL (Redirect)**
   ```
   URL: http://localhost:3001/collections/riding-wear/breeches
   Expected: 301 redirect to /riding-wear/breeches
   ```

6. **Hierarchical Product URL (Redirect)**
   ```
   URL: http://localhost:3001/riding-wear/breeches/product-handle
   Expected: 301 redirect to /products/product-handle
   ```

## Benefits of This Structure

### ✅ SEO Benefits
- **No duplicate content** - Single canonical URL per product
- **Strong hierarchy signals** - Via breadcrumbs and structured data
- **Link equity consolidation** - All links point to one URL
- **Flexible categorization** - Products can be in multiple collections without URL conflicts

### ✅ Maintenance Benefits
- **No URL changes** - Moving products between collections doesn't change URLs
- **No 301 redirects needed** - When reorganizing collections
- **Simple logic** - Easy to understand and maintain

### ✅ User Experience
- **Clean URLs** - Easy to read and share
- **Clear breadcrumbs** - Users always know where they are
- **Fast performance** - Simple lookups, no complex path verification

## Migration Notes

### From Current Shopify Store
- ✅ Products already at `/products/[handle]` - **No redirects needed**
- ✅ Only need to redirect `/collections/*` URLs
- ✅ Clean migration with minimal SEO impact

### Future Considerations
- Consider implementing `generateStaticParams()` for ISR
- Add sitemap generation using canonical URLs
- Monitor Core Web Vitals for performance
- Track 301 redirects in analytics

## Related Files

- `middleware.ts` - Handles collection URL redirects
- `app/products/[handle]/page.tsx` - Canonical product page
- `app/[collection]/page.tsx` - Collection pages
- `app/[collection]/[tag]/page.tsx` - Tag-filtered collection pages
- `app/[category]/[subcategory]/[product]/page.tsx` - Hierarchical redirect
- `lib/shopify/products.ts` - Product utilities and canonical URL builder






## Overview

The Equestrian Headless uses a clean, SEO-friendly URL structure that balances user experience with technical best practices.

## Final URL Structure

### ✅ Products (Canonical)
```
/products/[handle]
```
**Example:** `/products/paddock-boot-brown`

- **Single source of truth** for all products
- No duplicate content issues
- All internal links point here
- Breadcrumbs show hierarchy dynamically
- Rich structured data (JSON-LD) for SEO

### ✅ Collections
```
/[collection-handle]
```
**Example:** `/riding-wear`

- Clean, simple URLs
- No `/collections/` prefix

### ✅ Tag-Filtered Collections (Sub-Collections)
```
/[collection-handle]/[tag-name]
```
**Example:** `/riding-wear/breeches`

- Uses Shopify tags for filtering
- Works with both smart collections and manual collections

## Redirects

### 1. Old Collection URLs → New Structure
```
OLD: /collections/riding-wear
NEW: /riding-wear
```
**Status:** 301 Permanent Redirect

```
OLD: /collections/riding-wear/breeches
NEW: /riding-wear/breeches
```
**Status:** 301 Permanent Redirect

### 2. Hierarchical Product URLs → Canonical
```
OLD: /riding-wear/breeches/product-handle
NEW: /products/product-handle
```
**Status:** 301 Permanent Redirect

**Note:** These hierarchical URLs still work (for backwards compatibility or if users type them), but they immediately redirect to the canonical `/products/[handle]` URL.

## Implementation Details

### Middleware (`middleware.ts`)
- Handles `/collections/*` → `/*` redirects
- Preserves query parameters
- 301 permanent redirects for SEO

### Dynamic Routes

#### Products (Canonical)
**File:** `app/products/[handle]/page.tsx`
- Fetches product by handle
- Displays product details
- Generates breadcrumbs from `primaryCollection` metafield
- Includes BreadcrumbList JSON-LD schema
- Returns 404 if product doesn't exist

#### Collections
**File:** `app/[collection]/page.tsx`
- Displays collection/category page
- Shows all products in collection

#### Tag-Filtered Collections
**File:** `app/[collection]/[tag]/page.tsx`
- Displays collection filtered by tag
- Shows products matching both collection and tag

#### Hierarchical Products (Redirect Only)
**File:** `app/[category]/[subcategory]/[product]/page.tsx`
- Verifies product exists
- 301 redirects to `/products/[handle]`
- No rendering (redirect happens first)

## SEO Strategy

### 1. Canonical URLs
Every product page sets its canonical URL to `/products/[handle]`:

```typescript
alternates: {
  canonical: `${siteUrl}/products/${handle}`
}
```

### 2. Breadcrumbs (Dynamic)
Breadcrumbs are generated from the `primaryCollection` metafield:

```
Home > Riding Wear > Breeches > Product Name
```

### 3. Structured Data (JSON-LD)
BreadcrumbList schema tells search engines about hierarchy:

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
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Breeches",
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

## Required Shopify Configuration

### Primary Collection Metafield

To enable dynamic breadcrumbs, you need to set up a metafield in Shopify:

1. Go to **Shopify Admin** → **Settings** → **Custom data** → **Products**
2. Click **Add definition**
3. Configure:
   - **Name:** Primary Collection
   - **Namespace and key:** `seo.primary_collection`
   - **Type:** Single line text
   - **Value format:** `collection-handle/tag-name`

**Example value:** `riding-wear/breeches`

### How to Set Primary Collection

For each product:
1. Edit product in Shopify Admin
2. Scroll to **Metafields**
3. Find **Primary Collection**
4. Enter the path: `collection-handle/tag-name`

**Note:** This determines which breadcrumb path shows on the product page.

## Internal Linking Rules

### ✅ DO: Link to Canonical URLs
```html
<!-- On collection pages -->
<a href="/products/paddock-boot-brown">Paddock Boot</a>

<!-- NOT -->
<a href="/riding-wear/boots/paddock-boot-brown">Paddock Boot</a>
```

### ✅ DO: Use Breadcrumbs for Hierarchy
Let breadcrumbs show the hierarchy, not the URL:
```
Home > Riding Wear > Boots > Paddock Boot
  ↓        ↓         ↓          ↓
  /   /riding-wear  /riding-wear/boots  /products/paddock-boot-brown
```

## Testing the URL Structure

### Test Cases

1. **Product Page (Canonical)**
   ```
   URL: http://localhost:3001/products/[any-product-handle]
   Expected: Product page displays with breadcrumbs
   ```

2. **Collection Page**
   ```
   URL: http://localhost:3001/riding-wear
   Expected: Collection page with products
   ```

3. **Tag-Filtered Collection**
   ```
   URL: http://localhost:3001/riding-wear/breeches
   Expected: Collection page filtered by "breeches" tag
   ```

4. **Old Collection URL (Redirect)**
   ```
   URL: http://localhost:3001/collections/riding-wear
   Expected: 301 redirect to /riding-wear
   ```

5. **Old Tag-Filtered Collection URL (Redirect)**
   ```
   URL: http://localhost:3001/collections/riding-wear/breeches
   Expected: 301 redirect to /riding-wear/breeches
   ```

6. **Hierarchical Product URL (Redirect)**
   ```
   URL: http://localhost:3001/riding-wear/breeches/product-handle
   Expected: 301 redirect to /products/product-handle
   ```

## Benefits of This Structure

### ✅ SEO Benefits
- **No duplicate content** - Single canonical URL per product
- **Strong hierarchy signals** - Via breadcrumbs and structured data
- **Link equity consolidation** - All links point to one URL
- **Flexible categorization** - Products can be in multiple collections without URL conflicts

### ✅ Maintenance Benefits
- **No URL changes** - Moving products between collections doesn't change URLs
- **No 301 redirects needed** - When reorganizing collections
- **Simple logic** - Easy to understand and maintain

### ✅ User Experience
- **Clean URLs** - Easy to read and share
- **Clear breadcrumbs** - Users always know where they are
- **Fast performance** - Simple lookups, no complex path verification

## Migration Notes

### From Current Shopify Store
- ✅ Products already at `/products/[handle]` - **No redirects needed**
- ✅ Only need to redirect `/collections/*` URLs
- ✅ Clean migration with minimal SEO impact

### Future Considerations
- Consider implementing `generateStaticParams()` for ISR
- Add sitemap generation using canonical URLs
- Monitor Core Web Vitals for performance
- Track 301 redirects in analytics

## Related Files

- `middleware.ts` - Handles collection URL redirects
- `app/products/[handle]/page.tsx` - Canonical product page
- `app/[collection]/page.tsx` - Collection pages
- `app/[collection]/[tag]/page.tsx` - Tag-filtered collection pages
- `app/[category]/[subcategory]/[product]/page.tsx` - Hierarchical redirect
- `lib/shopify/products.ts` - Product utilities and canonical URL builder




