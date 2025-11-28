# 🔧 Metafield Setup Guide

## Overview

To get structured data and breadcrumbs working, you need to set up **one metafield** in Shopify. This is the only required metafield for the URL structure and SEO features to work.

**Reference:** [Shopify Metafield Definitions Documentation](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions)

## Required Metafield: Primary Collection

### Purpose
- Generates breadcrumbs on product pages
- Determines which collection path shows in structured data
- Helps search engines understand product hierarchy

### Setup Methods

You can create metafield definitions in two ways:

1. **Manual Setup (Shopify Admin UI)** - Recommended for quick setup
2. **Programmatic Setup (GraphQL Admin API)** - For automation/bulk operations

---

## Method 1: Manual Setup via Shopify Admin UI

### Step 1: Create the Metafield Definition

1. Go to **Shopify Admin** → **Settings** → **Custom data** → **Products**
2. Click **Add definition**
3. Fill in the form:

   **Name:** `Primary Collection`
   
   **Namespace and key:** 
   - Namespace: `custom` (or any namespace you prefer)
   - Key: `primary_collection`
   - **Full identifier:** `custom.primary_collection`
   
   **Type:** `Single line text` (`single_line_text_field`)
   
   **Description:** `The primary collection path for this product. Format: collection-handle/tag-name (e.g., "riding-wear/breeches")`
   
   **Validation:** Optional - you can add a pattern like `^[a-z0-9-]+(/[a-z0-9-]+)?$` to ensure proper format

4. **Enable Storefront Access** ⚠️ **CRITICAL**
   - After saving, click on the metafield definition again
   - Enable the checkbox: ✅ **Storefront Access**
   - This allows the metafield to be accessed via the Storefront API (required for your Next.js app)
   - Save again

**Note:** The namespace `custom` is a standard namespace you can use. Only the `$app` namespace is reserved for apps using TOML configuration.

**⚠️ Important:** Without Storefront Access enabled, your metafields won't be accessible via the Storefront API, and breadcrumbs won't work. See [Custom Data Features Guide](./CUSTOM-DATA-FEATURES.md) for details.

#### 2. Set Values on Products

For each product in your store:

1. Go to **Products** → Select a product
2. Scroll down to **Metafields** section
3. Find **Primary Collection** field
4. Enter the collection path in this format:

   ```
   collection-handle/tag-name
   ```

   **Examples:**
   - `riding-wear/breeches` - Product in "Riding Wear" collection with "breeches" tag
   - `riding-wear` - Product in "Riding Wear" collection (no tag/subcollection)
   - `equipment/saddles` - Product in "Equipment" collection with "saddles" tag

5. Click **Save**

### Format Rules

- Use **handles** (URL-friendly names), not display names
- Format: `collection-handle/tag-name`
- Use lowercase with hyphens (e.g., `riding-wear`, not `Riding Wear`)
- If product is only in a collection (no tag), use just: `collection-handle`
- If product has a tag/subcollection, use: `collection-handle/tag-name`

### Examples

| Product | Collection | Tag/Subcollection | Metafield Value |
|---------|------------|-------------------|-----------------|
| Paddock Boot | Riding Wear | Boots | `riding-wear/boots` |
| Show Shirt | Riding Wear | Shirts | `riding-wear/shirts` |
| Saddle Pad | Equipment | - | `equipment` |
| Helmet | Safety | - | `safety` |

## What Happens Without This Metafield?

### ✅ Still Works:
- Product pages display correctly
- Product structured data (price, availability) works
- Collection pages work
- All URLs work

### ⚠️ Missing:
- Breadcrumbs won't show on product pages
- BreadcrumbList structured data won't include collection hierarchy
- Less SEO benefit from hierarchy signals

**Note:** The site will work fine without this metafield, but you'll get maximum SEO benefit by setting it up.

## Method 2: Programmatic Setup via GraphQL Admin API

If you want to create the metafield definition programmatically (useful for automation or bulk operations), you can use the GraphQL Admin API:

```graphql
mutation CreateMetafieldDefinition {
  metafieldDefinitionCreate(definition: {
    name: "Primary Collection"
    namespace: "custom"
    key: "primary_collection"
    description: "The primary collection path for this product. Format: collection-handle/tag-name (e.g., 'riding-wear/breeches')"
    type: "single_line_text_field"
    ownerType: PRODUCT
  }) {
    createdDefinition {
      id
      name
      namespace
      key
    }
    userErrors {
      field
      message
      code
    }
  }
}
```

**Reference:** See [Shopify's Metafield Definitions Guide](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions#step-1-create-a-metafield-definition) for complete API documentation.

---

## Optional: Parent Collection Metafield

The code also checks for `custom.parent_collection` on collections, but this is **not currently required** for the basic functionality. It's there for future enhancements.

If you want to set it up anyway:

1. Go to **Settings** → **Custom data** → **Collections**
2. Create metafield:
   - **Name:** `Parent Collection`
   - **Namespace:** `custom`
   - **Key:** `parent_collection`
   - **Type:** `Single line text` (`single_line_text_field`)
3. Set value to parent collection handle (e.g., `riding-wear`)

Or via GraphQL:

```graphql
mutation CreateParentCollectionMetafield {
  metafieldDefinitionCreate(definition: {
    name: "Parent Collection"
    namespace: "custom"
    key: "parent_collection"
    description: "The parent collection handle for this subcollection"
    type: "single_line_text_field"
    ownerType: COLLECTION
  }) {
    createdDefinition {
      id
      name
      namespace
      key
    }
  }
}
```

## Bulk Setup Tips

### Option 1: Shopify Admin (Manual)
- Set metafield on products one by one
- Good for small stores (< 50 products)
- Time-consuming but reliable

### Option 2: CSV Import
1. Export products from Shopify
2. Add column: `Metafield: custom.primary_collection [single_line_text_field]`
3. Fill in values
4. Import back to Shopify

### Option 3: Shopify API/Script
Use Shopify Admin API or a script to bulk update:

```javascript
// Example using Shopify Admin API
// This is pseudocode - you'd need to implement with actual API calls

products.forEach(product => {
  const primaryCollection = determinePrimaryCollection(product);
  
  updateProductMetafield(
    product.id,
    'custom.primary_collection',
    primaryCollection
  );
});
```

### Option 4: Shopify Flow (Automation)
Create a Shopify Flow that:
- Triggers when product is created/updated
- Determines primary collection based on product tags/collections
- Sets metafield automatically

### Option 5: GraphQL Admin API Script
Use the GraphQL Admin API to bulk update metafields programmatically:

```graphql
mutation UpdateProductMetafield($id: ID!, $metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields, ownerId: $id) {
    metafields {
      id
      namespace
      key
      value
    }
    userErrors {
      field
      message
    }
  }
}
```

**Reference:** [Shopify Metafields API Documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet)

## Verification

### Check if Metafield is Set

1. **In Shopify Admin:**
   - Edit any product
   - Scroll to Metafields section
   - Should see "Primary Collection" field with a value

2. **On Your Site:**
   - Visit a product page: `/products/[handle]`
   - View page source (Ctrl+U / Cmd+U)
   - Search for `BreadcrumbList`
   - Should see breadcrumb schema with collection path

3. **In GraphQL (Storefront API):**
   ```graphql
   query {
     product(handle: "your-product-handle") {
       metafield(namespace: "custom", key: "primary_collection") {
         value
       }
     }
   }
   ```

   **Or via Admin API:**
   ```graphql
   query {
     product(id: "gid://shopify/Product/123456") {
       metafields(first: 10, namespace: "custom") {
         edges {
           node {
             namespace
             key
             value
           }
         }
       }
     }
   }
   ```

### Test Breadcrumbs

1. Visit a product page with metafield set
2. Should see breadcrumb navigation at top:
   ```
   Home > Riding Wear > Breeches > Product Name
   ```
3. Each breadcrumb should be clickable

## Troubleshooting

### Breadcrumbs Not Showing?

1. ✅ Check metafield is created in Shopify
2. ✅ Check metafield value is set on product
3. ✅ Check format is correct (`collection/tag` or just `collection`)
4. ✅ Check namespace/key matches: `custom.primary_collection`
5. ✅ Clear browser cache and reload

### Wrong Collection Showing?

- Check metafield value matches actual collection handle
- Verify collection handle (lowercase, hyphens, not spaces)
- Check tag name matches exactly (case-sensitive)

### Metafield Not Saving?

- Ensure you're using the correct namespace: `custom`
- Check you have permission to edit products
- Try refreshing the page and saving again

## Quick Reference

**Metafield Details:**
- **Full Name:** `custom.primary_collection`
- **Type:** Single line text
- **Format:** `collection-handle/tag-name` or `collection-handle`
- **Required:** No (but recommended for SEO)
- **Used For:** Breadcrumbs, structured data, SEO hierarchy

**Where It's Used:**
- Product pages (`/products/[handle]`)
- BreadcrumbList structured data
- Product canonical URL generation (for redirects)

## Next Steps

Once metafields are set up:

1. ✅ Test product pages show breadcrumbs
2. ✅ Verify structured data in Google Rich Results Test
3. ✅ Check breadcrumbs are clickable and correct
4. ✅ Monitor in Google Search Console for structured data

## Support & References

**Official Documentation:**
- [Shopify Metafield Definitions Guide](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions)
- [Shopify Metafields API Reference](https://shopify.dev/docs/api/admin-graphql/latest/objects/Metafield)

**Project Documentation:**
- Check `STRUCTURED-DATA.md` for structured data details
- Check `URL-STRUCTURE.md` for URL routing details
- Verify GraphQL queries in `lib/shopify/queries.ts`

**Important Notes:**
- Namespace `custom` is a standard namespace (not reserved)
- Only `$app` namespace is reserved for apps using TOML configuration
- Metafield definitions created via Admin UI can be updated/deleted through the UI
- Definitions created via GraphQL API can be managed programmatically


## Overview

To get structured data and breadcrumbs working, you need to set up **one metafield** in Shopify. This is the only required metafield for the URL structure and SEO features to work.

**Reference:** [Shopify Metafield Definitions Documentation](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions)

## Required Metafield: Primary Collection

### Purpose
- Generates breadcrumbs on product pages
- Determines which collection path shows in structured data
- Helps search engines understand product hierarchy

### Setup Methods

You can create metafield definitions in two ways:

1. **Manual Setup (Shopify Admin UI)** - Recommended for quick setup
2. **Programmatic Setup (GraphQL Admin API)** - For automation/bulk operations

---

## Method 1: Manual Setup via Shopify Admin UI

### Step 1: Create the Metafield Definition

1. Go to **Shopify Admin** → **Settings** → **Custom data** → **Products**
2. Click **Add definition**
3. Fill in the form:

   **Name:** `Primary Collection`
   
   **Namespace and key:** 
   - Namespace: `custom` (or any namespace you prefer)
   - Key: `primary_collection`
   - **Full identifier:** `custom.primary_collection`
   
   **Type:** `Single line text` (`single_line_text_field`)
   
   **Description:** `The primary collection path for this product. Format: collection-handle/tag-name (e.g., "riding-wear/breeches")`
   
   **Validation:** Optional - you can add a pattern like `^[a-z0-9-]+(/[a-z0-9-]+)?$` to ensure proper format

4. **Enable Storefront Access** ⚠️ **CRITICAL**
   - After saving, click on the metafield definition again
   - Enable the checkbox: ✅ **Storefront Access**
   - This allows the metafield to be accessed via the Storefront API (required for your Next.js app)
   - Save again

**Note:** The namespace `custom` is a standard namespace you can use. Only the `$app` namespace is reserved for apps using TOML configuration.

**⚠️ Important:** Without Storefront Access enabled, your metafields won't be accessible via the Storefront API, and breadcrumbs won't work. See [Custom Data Features Guide](./CUSTOM-DATA-FEATURES.md) for details.

#### 2. Set Values on Products

For each product in your store:

1. Go to **Products** → Select a product
2. Scroll down to **Metafields** section
3. Find **Primary Collection** field
4. Enter the collection path in this format:

   ```
   collection-handle/tag-name
   ```

   **Examples:**
   - `riding-wear/breeches` - Product in "Riding Wear" collection with "breeches" tag
   - `riding-wear` - Product in "Riding Wear" collection (no tag/subcollection)
   - `equipment/saddles` - Product in "Equipment" collection with "saddles" tag

5. Click **Save**

### Format Rules

- Use **handles** (URL-friendly names), not display names
- Format: `collection-handle/tag-name`
- Use lowercase with hyphens (e.g., `riding-wear`, not `Riding Wear`)
- If product is only in a collection (no tag), use just: `collection-handle`
- If product has a tag/subcollection, use: `collection-handle/tag-name`

### Examples

| Product | Collection | Tag/Subcollection | Metafield Value |
|---------|------------|-------------------|-----------------|
| Paddock Boot | Riding Wear | Boots | `riding-wear/boots` |
| Show Shirt | Riding Wear | Shirts | `riding-wear/shirts` |
| Saddle Pad | Equipment | - | `equipment` |
| Helmet | Safety | - | `safety` |

## What Happens Without This Metafield?

### ✅ Still Works:
- Product pages display correctly
- Product structured data (price, availability) works
- Collection pages work
- All URLs work

### ⚠️ Missing:
- Breadcrumbs won't show on product pages
- BreadcrumbList structured data won't include collection hierarchy
- Less SEO benefit from hierarchy signals

**Note:** The site will work fine without this metafield, but you'll get maximum SEO benefit by setting it up.

## Method 2: Programmatic Setup via GraphQL Admin API

If you want to create the metafield definition programmatically (useful for automation or bulk operations), you can use the GraphQL Admin API:

```graphql
mutation CreateMetafieldDefinition {
  metafieldDefinitionCreate(definition: {
    name: "Primary Collection"
    namespace: "custom"
    key: "primary_collection"
    description: "The primary collection path for this product. Format: collection-handle/tag-name (e.g., 'riding-wear/breeches')"
    type: "single_line_text_field"
    ownerType: PRODUCT
  }) {
    createdDefinition {
      id
      name
      namespace
      key
    }
    userErrors {
      field
      message
      code
    }
  }
}
```

**Reference:** See [Shopify's Metafield Definitions Guide](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions#step-1-create-a-metafield-definition) for complete API documentation.

---

## Optional: Parent Collection Metafield

The code also checks for `custom.parent_collection` on collections, but this is **not currently required** for the basic functionality. It's there for future enhancements.

If you want to set it up anyway:

1. Go to **Settings** → **Custom data** → **Collections**
2. Create metafield:
   - **Name:** `Parent Collection`
   - **Namespace:** `custom`
   - **Key:** `parent_collection`
   - **Type:** `Single line text` (`single_line_text_field`)
3. Set value to parent collection handle (e.g., `riding-wear`)

Or via GraphQL:

```graphql
mutation CreateParentCollectionMetafield {
  metafieldDefinitionCreate(definition: {
    name: "Parent Collection"
    namespace: "custom"
    key: "parent_collection"
    description: "The parent collection handle for this subcollection"
    type: "single_line_text_field"
    ownerType: COLLECTION
  }) {
    createdDefinition {
      id
      name
      namespace
      key
    }
  }
}
```

## Bulk Setup Tips

### Option 1: Shopify Admin (Manual)
- Set metafield on products one by one
- Good for small stores (< 50 products)
- Time-consuming but reliable

### Option 2: CSV Import
1. Export products from Shopify
2. Add column: `Metafield: custom.primary_collection [single_line_text_field]`
3. Fill in values
4. Import back to Shopify

### Option 3: Shopify API/Script
Use Shopify Admin API or a script to bulk update:

```javascript
// Example using Shopify Admin API
// This is pseudocode - you'd need to implement with actual API calls

products.forEach(product => {
  const primaryCollection = determinePrimaryCollection(product);
  
  updateProductMetafield(
    product.id,
    'custom.primary_collection',
    primaryCollection
  );
});
```

### Option 4: Shopify Flow (Automation)
Create a Shopify Flow that:
- Triggers when product is created/updated
- Determines primary collection based on product tags/collections
- Sets metafield automatically

### Option 5: GraphQL Admin API Script
Use the GraphQL Admin API to bulk update metafields programmatically:

```graphql
mutation UpdateProductMetafield($id: ID!, $metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields, ownerId: $id) {
    metafields {
      id
      namespace
      key
      value
    }
    userErrors {
      field
      message
    }
  }
}
```

**Reference:** [Shopify Metafields API Documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet)

## Verification

### Check if Metafield is Set

1. **In Shopify Admin:**
   - Edit any product
   - Scroll to Metafields section
   - Should see "Primary Collection" field with a value

2. **On Your Site:**
   - Visit a product page: `/products/[handle]`
   - View page source (Ctrl+U / Cmd+U)
   - Search for `BreadcrumbList`
   - Should see breadcrumb schema with collection path

3. **In GraphQL (Storefront API):**
   ```graphql
   query {
     product(handle: "your-product-handle") {
       metafield(namespace: "custom", key: "primary_collection") {
         value
       }
     }
   }
   ```

   **Or via Admin API:**
   ```graphql
   query {
     product(id: "gid://shopify/Product/123456") {
       metafields(first: 10, namespace: "custom") {
         edges {
           node {
             namespace
             key
             value
           }
         }
       }
     }
   }
   ```

### Test Breadcrumbs

1. Visit a product page with metafield set
2. Should see breadcrumb navigation at top:
   ```
   Home > Riding Wear > Breeches > Product Name
   ```
3. Each breadcrumb should be clickable

## Troubleshooting

### Breadcrumbs Not Showing?

1. ✅ Check metafield is created in Shopify
2. ✅ Check metafield value is set on product
3. ✅ Check format is correct (`collection/tag` or just `collection`)
4. ✅ Check namespace/key matches: `custom.primary_collection`
5. ✅ Clear browser cache and reload

### Wrong Collection Showing?

- Check metafield value matches actual collection handle
- Verify collection handle (lowercase, hyphens, not spaces)
- Check tag name matches exactly (case-sensitive)

### Metafield Not Saving?

- Ensure you're using the correct namespace: `custom`
- Check you have permission to edit products
- Try refreshing the page and saving again

## Quick Reference

**Metafield Details:**
- **Full Name:** `custom.primary_collection`
- **Type:** Single line text
- **Format:** `collection-handle/tag-name` or `collection-handle`
- **Required:** No (but recommended for SEO)
- **Used For:** Breadcrumbs, structured data, SEO hierarchy

**Where It's Used:**
- Product pages (`/products/[handle]`)
- BreadcrumbList structured data
- Product canonical URL generation (for redirects)

## Next Steps

Once metafields are set up:

1. ✅ Test product pages show breadcrumbs
2. ✅ Verify structured data in Google Rich Results Test
3. ✅ Check breadcrumbs are clickable and correct
4. ✅ Monitor in Google Search Console for structured data

## Support & References

**Official Documentation:**
- [Shopify Metafield Definitions Guide](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions)
- [Shopify Metafields API Reference](https://shopify.dev/docs/api/admin-graphql/latest/objects/Metafield)

**Project Documentation:**
- Check `STRUCTURED-DATA.md` for structured data details
- Check `URL-STRUCTURE.md` for URL routing details
- Verify GraphQL queries in `lib/shopify/queries.ts`

**Important Notes:**
- Namespace `custom` is a standard namespace (not reserved)
- Only `$app` namespace is reserved for apps using TOML configuration
- Metafield definitions created via Admin UI can be updated/deleted through the UI
- Definitions created via GraphQL API can be managed programmatically

