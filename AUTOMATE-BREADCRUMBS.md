# 🤖 Automate Breadcrumb Metafield Values

## Overview

Instead of manually setting `primary_collection` metafield values on each product, you can automate this using rules based on product collections and tags.

---

## How It Works

The system automatically determines the primary collection path using these rules:

1. **Primary Collection:** Uses the product's first collection (or priority collection)
2. **Subcategory:** Uses the product's first relevant tag
3. **Format:** `collection-handle/tag-name` or `collection-handle`

**Example:**
- Product in collection: "Riding Wear" (`riding-wear`)
- Product has tag: "Boots" (`boots`)
- **Result:** `riding-wear/boots`

---

## Option 1: API Route (Recommended)

### Step 1: Preview Changes (Dry Run)

Test what changes will be made without actually updating:

```bash
curl http://localhost:3001/api/admin/set-primary-collections?dryRun=true&limit=10
```

**Response:**
```json
{
  "dryRun": true,
  "total": 10,
  "summary": {
    "set": 5,
    "skip": 2,
    "noChange": 3
  },
  "updates": [
    {
      "productId": "gid://shopify/Product/123",
      "handle": "paddock-boot-brown",
      "currentValue": null,
      "newValue": "riding-wear/boots",
      "action": "set"
    }
  ]
}
```

### Step 2: Apply Changes

Once you're happy with the preview, run it for real:

```bash
curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=100
```

**Response:**
```json
{
  "success": true,
  "results": {
    "total": 100,
    "updated": 85,
    "skipped": 10,
    "errors": []
  },
  "summary": {
    "total": 100,
    "updated": 85,
    "skipped": 10,
    "errors": 0
  }
}
```

### Step 3: Process All Products

For large catalogs, process in batches:

```bash
# Process first 250 products
curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=250

# Then process next batch (if needed)
# Note: You may need to add pagination support for very large catalogs
```

---

## Option 2: Customize the Rules

### Edit the Logic

Open `lib/shopify/primary-collection.ts` and customize:

#### Rule 1: Change Primary Collection Selection

**Current:** Uses first collection
```typescript
const primaryCollection = collections[0].node;
```

**Custom:** Prefer specific collections
```typescript
// Prefer "Riding Wear" over "Sale" collection
const priorityCollections = ['riding-wear', 'equipment', 'safety'];
const primaryCollection = determinePrimaryCollectionWithPriority(
  product,
  priorityCollections
);
```

#### Rule 2: Change Tag Filtering

**Current:** Uses first tag (excluding common tags)
```typescript
const excludeTags = ['new', 'sale', 'featured', 'bestseller', 'clearance'];
```

**Custom:** Add your own exclusions
```typescript
const excludeTags = [
  'new', 'sale', 'featured', 'bestseller', 'clearance',
  'vendor-name', 'custom-tag' // Add your exclusions
];
```

#### Rule 3: Custom Tag Selection Logic

```typescript
function findSubcategoryTag(tags: string[], collectionHandle: string): string | null {
  // Your custom logic here
  // Example: Prefer tags that match collection name
  const matchingTag = tags.find(tag => 
    tag.toLowerCase().includes(collectionHandle.split('-')[0])
  );
  
  return matchingTag ? matchingTag.toLowerCase().replace(/\s+/g, '-') : null;
}
```

---

## Option 3: Shopify Flow Automation

### Create a Flow

1. **Go to Shopify Admin** → **Settings** → **Automation** → **Flows**

2. **Create new flow:**
   - **Trigger:** Product created or updated
   - **Condition:** Product has collections

3. **Add action:** Set metafield value
   - **Metafield:** `custom.primary_collection`
   - **Value:** Use Liquid to build path
     ```liquid
     {% assign first_collection = product.collections.first %}
     {% assign first_tag = product.tags.first %}
     {% if first_tag %}
       {{ first_collection.handle }}/{{ first_tag | handleize }}
     {% else %}
       {{ first_collection.handle }}
     {% endif %}
     ```

4. **Save and activate**

**Note:** Shopify Flow uses Liquid, so the logic is slightly different from the API approach.

---

## Option 4: One-Time Script

### Create a Script File

Create `scripts/set-primary-collections.ts`:

```typescript
import { determinePrimaryCollection } from '../lib/shopify/primary-collection';
import { getAllProducts } from '../lib/shopify/products';

async function setPrimaryCollections() {
  const products = await getAllProducts();
  
  for (const product of products) {
    const primaryCollection = determinePrimaryCollection(product);
    
    if (primaryCollection) {
      // Use Shopify Admin API to set metafield
      console.log(`Setting ${product.handle}: ${primaryCollection}`);
      // Add your Admin API call here
    }
  }
}

setPrimaryCollections();
```

Run with:
```bash
npx tsx scripts/set-primary-collections.ts
```

---

## Rules Summary

### Default Rules

1. **Primary Collection:** First collection in product's collections list
2. **Subcategory:** First tag (excluding: new, sale, featured, bestseller, clearance)
3. **Format:** `collection-handle/tag-name` or `collection-handle`

### Customization Options

- ✅ Prefer specific collections (e.g., "Riding Wear" over "Sale")
- ✅ Filter tags (exclude non-subcategory tags)
- ✅ Custom tag selection logic
- ✅ Handle products with no collections/tags

---

## Testing

### Test on One Product First

1. **Preview changes:**
   ```bash
   curl http://localhost:3001/api/admin/set-primary-collections?dryRun=true&limit=1
   ```

2. **Verify the logic:**
   - Check if `newValue` makes sense
   - Adjust rules if needed

3. **Apply to one product:**
   ```bash
   curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=1
   ```

4. **Check product page:**
   - Visit `/products/[handle]`
   - Verify breadcrumbs show correctly

### Then Scale Up

Once verified, process all products:
```bash
curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=250
```

---

## Troubleshooting

### Products Skipped

**Reason:** Product has no collections
**Solution:** Ensure products are assigned to at least one collection

### Wrong Collection Selected

**Reason:** First collection isn't the right one
**Solution:** Customize priority collections in `primary-collection.ts`

### Wrong Tag Selected

**Reason:** Tag filtering isn't working correctly
**Solution:** Adjust `findSubcategoryTag()` function

### Metafield Not Updating

**Reason:** Storefront Access not enabled
**Solution:** Enable Storefront Access on metafield definition

---

## Best Practices

1. ✅ **Test with dry run first** - Preview changes before applying
2. ✅ **Start small** - Test on 1-10 products first
3. ✅ **Customize rules** - Adjust logic to match your store structure
4. ✅ **Monitor results** - Check breadcrumbs after updating
5. ✅ **Set up automation** - Use Shopify Flow for new products

---

## Files Created

- ✅ `lib/shopify/primary-collection.ts` - Logic for determining primary collection
- ✅ `app/api/admin/set-primary-collections/route.ts` - API endpoint for bulk updates
- ✅ `AUTOMATE-BREADCRUMBS.md` - This guide

---

## Quick Start

1. **Preview changes:**
   ```bash
   curl http://localhost:3001/api/admin/set-primary-collections?dryRun=true&limit=10
   ```

2. **Apply changes:**
   ```bash
   curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=100
   ```

3. **Verify:**
   - Visit a product page
   - Check breadcrumbs show correctly

4. **Customize (optional):**
   - Edit `lib/shopify/primary-collection.ts`
   - Adjust rules to match your needs

**Done!** 🎉






## Overview

Instead of manually setting `primary_collection` metafield values on each product, you can automate this using rules based on product collections and tags.

---

## How It Works

The system automatically determines the primary collection path using these rules:

1. **Primary Collection:** Uses the product's first collection (or priority collection)
2. **Subcategory:** Uses the product's first relevant tag
3. **Format:** `collection-handle/tag-name` or `collection-handle`

**Example:**
- Product in collection: "Riding Wear" (`riding-wear`)
- Product has tag: "Boots" (`boots`)
- **Result:** `riding-wear/boots`

---

## Option 1: API Route (Recommended)

### Step 1: Preview Changes (Dry Run)

Test what changes will be made without actually updating:

```bash
curl http://localhost:3001/api/admin/set-primary-collections?dryRun=true&limit=10
```

**Response:**
```json
{
  "dryRun": true,
  "total": 10,
  "summary": {
    "set": 5,
    "skip": 2,
    "noChange": 3
  },
  "updates": [
    {
      "productId": "gid://shopify/Product/123",
      "handle": "paddock-boot-brown",
      "currentValue": null,
      "newValue": "riding-wear/boots",
      "action": "set"
    }
  ]
}
```

### Step 2: Apply Changes

Once you're happy with the preview, run it for real:

```bash
curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=100
```

**Response:**
```json
{
  "success": true,
  "results": {
    "total": 100,
    "updated": 85,
    "skipped": 10,
    "errors": []
  },
  "summary": {
    "total": 100,
    "updated": 85,
    "skipped": 10,
    "errors": 0
  }
}
```

### Step 3: Process All Products

For large catalogs, process in batches:

```bash
# Process first 250 products
curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=250

# Then process next batch (if needed)
# Note: You may need to add pagination support for very large catalogs
```

---

## Option 2: Customize the Rules

### Edit the Logic

Open `lib/shopify/primary-collection.ts` and customize:

#### Rule 1: Change Primary Collection Selection

**Current:** Uses first collection
```typescript
const primaryCollection = collections[0].node;
```

**Custom:** Prefer specific collections
```typescript
// Prefer "Riding Wear" over "Sale" collection
const priorityCollections = ['riding-wear', 'equipment', 'safety'];
const primaryCollection = determinePrimaryCollectionWithPriority(
  product,
  priorityCollections
);
```

#### Rule 2: Change Tag Filtering

**Current:** Uses first tag (excluding common tags)
```typescript
const excludeTags = ['new', 'sale', 'featured', 'bestseller', 'clearance'];
```

**Custom:** Add your own exclusions
```typescript
const excludeTags = [
  'new', 'sale', 'featured', 'bestseller', 'clearance',
  'vendor-name', 'custom-tag' // Add your exclusions
];
```

#### Rule 3: Custom Tag Selection Logic

```typescript
function findSubcategoryTag(tags: string[], collectionHandle: string): string | null {
  // Your custom logic here
  // Example: Prefer tags that match collection name
  const matchingTag = tags.find(tag => 
    tag.toLowerCase().includes(collectionHandle.split('-')[0])
  );
  
  return matchingTag ? matchingTag.toLowerCase().replace(/\s+/g, '-') : null;
}
```

---

## Option 3: Shopify Flow Automation

### Create a Flow

1. **Go to Shopify Admin** → **Settings** → **Automation** → **Flows**

2. **Create new flow:**
   - **Trigger:** Product created or updated
   - **Condition:** Product has collections

3. **Add action:** Set metafield value
   - **Metafield:** `custom.primary_collection`
   - **Value:** Use Liquid to build path
     ```liquid
     {% assign first_collection = product.collections.first %}
     {% assign first_tag = product.tags.first %}
     {% if first_tag %}
       {{ first_collection.handle }}/{{ first_tag | handleize }}
     {% else %}
       {{ first_collection.handle }}
     {% endif %}
     ```

4. **Save and activate**

**Note:** Shopify Flow uses Liquid, so the logic is slightly different from the API approach.

---

## Option 4: One-Time Script

### Create a Script File

Create `scripts/set-primary-collections.ts`:

```typescript
import { determinePrimaryCollection } from '../lib/shopify/primary-collection';
import { getAllProducts } from '../lib/shopify/products';

async function setPrimaryCollections() {
  const products = await getAllProducts();
  
  for (const product of products) {
    const primaryCollection = determinePrimaryCollection(product);
    
    if (primaryCollection) {
      // Use Shopify Admin API to set metafield
      console.log(`Setting ${product.handle}: ${primaryCollection}`);
      // Add your Admin API call here
    }
  }
}

setPrimaryCollections();
```

Run with:
```bash
npx tsx scripts/set-primary-collections.ts
```

---

## Rules Summary

### Default Rules

1. **Primary Collection:** First collection in product's collections list
2. **Subcategory:** First tag (excluding: new, sale, featured, bestseller, clearance)
3. **Format:** `collection-handle/tag-name` or `collection-handle`

### Customization Options

- ✅ Prefer specific collections (e.g., "Riding Wear" over "Sale")
- ✅ Filter tags (exclude non-subcategory tags)
- ✅ Custom tag selection logic
- ✅ Handle products with no collections/tags

---

## Testing

### Test on One Product First

1. **Preview changes:**
   ```bash
   curl http://localhost:3001/api/admin/set-primary-collections?dryRun=true&limit=1
   ```

2. **Verify the logic:**
   - Check if `newValue` makes sense
   - Adjust rules if needed

3. **Apply to one product:**
   ```bash
   curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=1
   ```

4. **Check product page:**
   - Visit `/products/[handle]`
   - Verify breadcrumbs show correctly

### Then Scale Up

Once verified, process all products:
```bash
curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=250
```

---

## Troubleshooting

### Products Skipped

**Reason:** Product has no collections
**Solution:** Ensure products are assigned to at least one collection

### Wrong Collection Selected

**Reason:** First collection isn't the right one
**Solution:** Customize priority collections in `primary-collection.ts`

### Wrong Tag Selected

**Reason:** Tag filtering isn't working correctly
**Solution:** Adjust `findSubcategoryTag()` function

### Metafield Not Updating

**Reason:** Storefront Access not enabled
**Solution:** Enable Storefront Access on metafield definition

---

## Best Practices

1. ✅ **Test with dry run first** - Preview changes before applying
2. ✅ **Start small** - Test on 1-10 products first
3. ✅ **Customize rules** - Adjust logic to match your store structure
4. ✅ **Monitor results** - Check breadcrumbs after updating
5. ✅ **Set up automation** - Use Shopify Flow for new products

---

## Files Created

- ✅ `lib/shopify/primary-collection.ts` - Logic for determining primary collection
- ✅ `app/api/admin/set-primary-collections/route.ts` - API endpoint for bulk updates
- ✅ `AUTOMATE-BREADCRUMBS.md` - This guide

---

## Quick Start

1. **Preview changes:**
   ```bash
   curl http://localhost:3001/api/admin/set-primary-collections?dryRun=true&limit=10
   ```

2. **Apply changes:**
   ```bash
   curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=100
   ```

3. **Verify:**
   - Visit a product page
   - Check breadcrumbs show correctly

4. **Customize (optional):**
   - Edit `lib/shopify/primary-collection.ts`
   - Adjust rules to match your needs

**Done!** 🎉




