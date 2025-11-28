# ✅ Setup Checklist - Get Everything Working

## Quick Answer: What You Need

**Only ONE metafield is required:** `custom.primary_collection` on Products

This enables:
- ✅ Breadcrumbs on product pages
- ✅ BreadcrumbList structured data
- ✅ SEO hierarchy signals

**Reference:** [Shopify Metafield Definitions Docs](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions)

## Step-by-Step Setup

### Step 1: Create Metafield Definition (5 minutes)

**Option A: Manual Setup (Recommended)**

1. **Go to Shopify Admin**
   - Navigate to: **Settings** → **Custom data** → **Products**

2. **Click "Add definition"**

3. **Fill in the form:**
   ```
   Name: Primary Collection
   Namespace: custom
   Key: primary_collection
   Type: Single line text (single_line_text_field)
   Description: The primary collection path. Format: collection-handle/tag-name
   ```

4. **Click "Save"**

5. **Enable Storefront Access** ⚠️ **CRITICAL**
   - Click on the metafield definition you just created
   - Enable checkbox: ✅ **Storefront Access**
   - This allows your Next.js app to access the metafield via Storefront API
   - Save again

✅ **Done!** Metafield definition is created with Storefront Access enabled.

**Option B: Programmatic Setup (GraphQL Admin API)**

If you prefer to create it via API:

```graphql
mutation CreateMetafieldDefinition {
  metafieldDefinitionCreate(definition: {
    name: "Primary Collection"
    namespace: "custom"
    key: "primary_collection"
    type: "single_line_text_field"
    ownerType: PRODUCT
  }) {
    createdDefinition { id name namespace key }
  }
}
```

See [full documentation](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions#step-1-create-a-metafield-definition) for details.

### Step 2: Set Values on Products (Ongoing)

For each product:

1. **Edit product** in Shopify Admin
2. **Scroll to "Metafields"** section
3. **Find "Primary Collection"** field
4. **Enter value** in format: `collection-handle/tag-name`

**Examples:**
- `riding-wear/breeches` - Product in Riding Wear → Breeches
- `riding-wear` - Product in Riding Wear (no subcategory)
- `equipment/saddles` - Product in Equipment → Saddles

5. **Save product**

### Step 3: Verify It Works

1. **Visit a product page** on your site: `/products/[handle]`
2. **Check for breadcrumbs** at the top of the page
3. **View page source** (Ctrl+U) and search for `BreadcrumbList`
4. **Should see** structured data with your collection path

## What Works Without Metafields?

### ✅ Already Working:
- Product pages display
- Product structured data (price, availability)
- Collection pages
- Subcollection pages
- All URLs and redirects
- Collection structured data

### ⚠️ Missing Without Metafields:
- Breadcrumbs on product pages
- Product breadcrumb structured data
- Full SEO hierarchy signals

**Bottom line:** Site works fine, but you get maximum SEO benefit with metafields set up.

## Bulk Setup Options

### Small Store (< 50 products)
- ✅ Manual setup in Shopify Admin
- Set metafield on each product

### Medium Store (50-500 products)
- ✅ CSV import with metafield column
- ✅ Shopify Flow automation
- ✅ Bulk edit apps

### Large Store (500+ products)
- ✅ Shopify Admin API script
- ✅ Third-party bulk edit tools
- ✅ Custom automation

## Quick Test

After setting up:

```bash
# Visit a product page
http://localhost:3001/products/[any-product-handle]

# Should see:
✅ Breadcrumb navigation at top
✅ Structured data in page source
✅ No errors in console
```

## Troubleshooting

**No breadcrumbs showing?**
- ✅ Metafield created? (Settings → Custom data → Products)
- ✅ Value set on product? (Edit product → Metafields)
- ✅ Format correct? (`collection/tag` or `collection`)
- ✅ Namespace/key correct? (`custom.primary_collection`)

**Wrong collection showing?**
- ✅ Check metafield value matches collection handle
- ✅ Verify handle format (lowercase, hyphens)
- ✅ Tag name matches exactly

## Files to Reference

- **`METAFIELD-SETUP.md`** - Detailed metafield guide with API examples
- **`STRUCTURED-DATA.md`** - Structured data documentation
- **`URL-STRUCTURE.md`** - URL routing details
- **[Shopify Official Docs](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions)** - Metafield definitions reference

## Summary

**Minimum Required:**
1. ✅ Create `custom.primary_collection` metafield definition
2. ✅ Set values on products (can do gradually)

**That's it!** Everything else is already working. 🎉


## Quick Answer: What You Need

**Only ONE metafield is required:** `custom.primary_collection` on Products

This enables:
- ✅ Breadcrumbs on product pages
- ✅ BreadcrumbList structured data
- ✅ SEO hierarchy signals

**Reference:** [Shopify Metafield Definitions Docs](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions)

## Step-by-Step Setup

### Step 1: Create Metafield Definition (5 minutes)

**Option A: Manual Setup (Recommended)**

1. **Go to Shopify Admin**
   - Navigate to: **Settings** → **Custom data** → **Products**

2. **Click "Add definition"**

3. **Fill in the form:**
   ```
   Name: Primary Collection
   Namespace: custom
   Key: primary_collection
   Type: Single line text (single_line_text_field)
   Description: The primary collection path. Format: collection-handle/tag-name
   ```

4. **Click "Save"**

5. **Enable Storefront Access** ⚠️ **CRITICAL**
   - Click on the metafield definition you just created
   - Enable checkbox: ✅ **Storefront Access**
   - This allows your Next.js app to access the metafield via Storefront API
   - Save again

✅ **Done!** Metafield definition is created with Storefront Access enabled.

**Option B: Programmatic Setup (GraphQL Admin API)**

If you prefer to create it via API:

```graphql
mutation CreateMetafieldDefinition {
  metafieldDefinitionCreate(definition: {
    name: "Primary Collection"
    namespace: "custom"
    key: "primary_collection"
    type: "single_line_text_field"
    ownerType: PRODUCT
  }) {
    createdDefinition { id name namespace key }
  }
}
```

See [full documentation](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions#step-1-create-a-metafield-definition) for details.

### Step 2: Set Values on Products (Ongoing)

For each product:

1. **Edit product** in Shopify Admin
2. **Scroll to "Metafields"** section
3. **Find "Primary Collection"** field
4. **Enter value** in format: `collection-handle/tag-name`

**Examples:**
- `riding-wear/breeches` - Product in Riding Wear → Breeches
- `riding-wear` - Product in Riding Wear (no subcategory)
- `equipment/saddles` - Product in Equipment → Saddles

5. **Save product**

### Step 3: Verify It Works

1. **Visit a product page** on your site: `/products/[handle]`
2. **Check for breadcrumbs** at the top of the page
3. **View page source** (Ctrl+U) and search for `BreadcrumbList`
4. **Should see** structured data with your collection path

## What Works Without Metafields?

### ✅ Already Working:
- Product pages display
- Product structured data (price, availability)
- Collection pages
- Subcollection pages
- All URLs and redirects
- Collection structured data

### ⚠️ Missing Without Metafields:
- Breadcrumbs on product pages
- Product breadcrumb structured data
- Full SEO hierarchy signals

**Bottom line:** Site works fine, but you get maximum SEO benefit with metafields set up.

## Bulk Setup Options

### Small Store (< 50 products)
- ✅ Manual setup in Shopify Admin
- Set metafield on each product

### Medium Store (50-500 products)
- ✅ CSV import with metafield column
- ✅ Shopify Flow automation
- ✅ Bulk edit apps

### Large Store (500+ products)
- ✅ Shopify Admin API script
- ✅ Third-party bulk edit tools
- ✅ Custom automation

## Quick Test

After setting up:

```bash
# Visit a product page
http://localhost:3001/products/[any-product-handle]

# Should see:
✅ Breadcrumb navigation at top
✅ Structured data in page source
✅ No errors in console
```

## Troubleshooting

**No breadcrumbs showing?**
- ✅ Metafield created? (Settings → Custom data → Products)
- ✅ Value set on product? (Edit product → Metafields)
- ✅ Format correct? (`collection/tag` or `collection`)
- ✅ Namespace/key correct? (`custom.primary_collection`)

**Wrong collection showing?**
- ✅ Check metafield value matches collection handle
- ✅ Verify handle format (lowercase, hyphens)
- ✅ Tag name matches exactly

## Files to Reference

- **`METAFIELD-SETUP.md`** - Detailed metafield guide with API examples
- **`STRUCTURED-DATA.md`** - Structured data documentation
- **`URL-STRUCTURE.md`** - URL routing details
- **[Shopify Official Docs](https://shopify.dev/docs/apps/build/custom-data/metafields/definitions)** - Metafield definitions reference

## Summary

**Minimum Required:**
1. ✅ Create `custom.primary_collection` metafield definition
2. ✅ Set values on products (can do gradually)

**That's it!** Everything else is already working. 🎉

