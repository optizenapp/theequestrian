# Shopify Custom Data Features - What You Need

## Quick Answer

**For your URL structure and breadcrumbs, you need ONE feature enabled:**

✅ **Storefront Access** - This allows metafields to be accessed via the Storefront API

**Reference:** [Shopify Custom Data Features](https://help.shopify.com/en/manual/custom-data/features)

---

## Required Feature: Storefront Access

### What It Does
- Makes metafields accessible via the **Storefront API** (which your Next.js app uses)
- Without this, your metafields won't be available in GraphQL queries
- **This is REQUIRED** for your headless setup

### How to Enable

1. **Go to Shopify Admin**
   - Navigate to: **Settings** → **Custom data** → **Products**

2. **Find your metafield definition**
   - Look for: `Primary Collection` (`custom.primary_collection`)

3. **Click on the metafield** to edit it

4. **Enable "Storefront Access"**
   - Check the box: ✅ **Storefront Access**
   - This allows the metafield to be used in your Online Store via the Storefront API

5. **Save**

### Why It's Required

Your Next.js app uses the **Shopify Storefront API** (not Liquid templates), so metafields must have Storefront Access enabled to be queryable:

```graphql
# This query requires Storefront Access to work
query {
  product(handle: "product-handle") {
    metafield(namespace: "custom", key: "primary_collection") {
      value  # ← Won't work without Storefront Access
    }
  }
}
```

---

## Other Features (Optional)

### For Metafields

#### ✅ Use as a Filter in Product Index
- **What:** Allows filtering products by metafield values in search
- **Needed?** ❌ No - Not required for URL structure
- **Useful if:** You want customers to filter products by collection path

#### ✅ Use in Smart Collections
- **What:** Allows creating smart collections based on metafield values
- **Needed?** ❌ No - Not required for URL structure
- **Useful if:** You want dynamic collections based on `primary_collection` values

#### ✅ Customer Account Access
- **What:** Makes metafields available via Customer Account API
- **Needed?** ❌ No - Not required for URL structure
- **Useful if:** You want to show collection info in customer accounts

#### ✅ Use as a Filter in Company Index
- **What:** B2B feature for filtering companies
- **Needed?** ❌ No - Not relevant for your use case

---

## For Metaobjects (Not Currently Used)

Your current setup doesn't use **Metaobjects** (only metafields), so these features don't apply:

- ❌ Storefront Access (for metaobjects)
- ❌ Publish Entries as Web Pages
- ❌ Active-Draft Status
- ❌ Translations
- ❌ Use as a Filter in Metaobject Index

**Note:** If you decide to use metaobjects in the future (e.g., for vendor information, blog posts, etc.), you'd need to enable Storefront Access on those as well.

---

## Setup Checklist

### Step 1: Create Metafield Definition
- ✅ Name: `Primary Collection`
- ✅ Namespace: `custom`
- ✅ Key: `primary_collection`
- ✅ Type: `Single line text`

### Step 2: Enable Storefront Access ⚠️ **CRITICAL**
- ✅ Go to Settings → Custom data → Products
- ✅ Click on `Primary Collection` metafield
- ✅ Enable **Storefront Access**
- ✅ Save

### Step 3: Set Values on Products
- ✅ Edit products
- ✅ Set `primary_collection` values (e.g., `riding-wear/breeches`)

---

## Verification

### Test Storefront Access

After enabling Storefront Access, test with a GraphQL query:

```graphql
query TestMetafieldAccess {
  product(handle: "your-product-handle") {
    title
    metafield(namespace: "custom", key: "primary_collection") {
      value
    }
  }
}
```

**Expected Result:**
- ✅ If Storefront Access is enabled: Returns the metafield value
- ❌ If Storefront Access is disabled: Returns `null` or error

### Common Error Without Storefront Access

If you see this error or `null` values:

```
Error: Metafield not accessible via Storefront API
```

**Solution:** Enable Storefront Access on the metafield definition.

---

## Summary Table

| Feature | Required? | Purpose | Your Use Case |
|---------|-----------|---------|--------------|
| **Storefront Access** | ✅ **YES** | Access metafields via Storefront API | **Required** - Your Next.js app uses Storefront API |
| Use as Filter (Product Index) | ❌ No | Filter products by metafield | Optional - Could be useful later |
| Use in Smart Collections | ❌ No | Create dynamic collections | Optional - Could be useful later |
| Customer Account Access | ❌ No | Show in customer accounts | Not needed |
| Company Index Filters | ❌ No | B2B filtering | Not relevant |

---

## Important Notes

### ⚠️ Storefront Access is Required

**Without Storefront Access:**
- ❌ Metafields won't appear in Storefront API queries
- ❌ Your breadcrumbs won't work
- ❌ Structured data won't include collection paths
- ❌ Product pages will work, but without breadcrumbs

**With Storefront Access:**
- ✅ Metafields accessible via Storefront API
- ✅ Breadcrumbs work correctly
- ✅ Structured data includes hierarchy
- ✅ Full functionality enabled

### 🔒 Security Note

Enabling Storefront Access makes metafield values **publicly accessible** via the Storefront API. This is fine for collection paths (which are already public), but be careful with sensitive data.

**Safe to make public:**
- ✅ Collection paths (`riding-wear/breeches`)
- ✅ Product attributes
- ✅ Display information

**Don't make public:**
- ❌ Internal notes
- ❌ Cost/pricing data
- ❌ Supplier information
- ❌ Private metadata

---

## Troubleshooting

### Metafield Returns Null

**Problem:** GraphQL query returns `null` for metafield value

**Solutions:**
1. ✅ Check Storefront Access is enabled
2. ✅ Verify metafield definition exists
3. ✅ Check namespace/key matches exactly (`custom.primary_collection`)
4. ✅ Ensure value is set on the product

### Metafield Not Showing in Admin

**Problem:** Can't find metafield when editing product

**Solutions:**
1. ✅ Check metafield definition is created
2. ✅ Verify you're looking in the right section (Metafields)
3. ✅ Refresh the page
4. ✅ Check you have permission to edit products

### Storefront Access Option Missing

**Problem:** Can't find "Storefront Access" checkbox

**Solutions:**
1. ✅ Make sure you're editing the metafield **definition** (not the value)
2. ✅ Go to Settings → Custom data → Products → Click on metafield name
3. ✅ Check you're using a supported Shopify plan (Storefront Access available on all plans)
4. ✅ Try refreshing the page

---

## References

- [Shopify Custom Data Features](https://help.shopify.com/en/manual/custom-data/features)
- [Storefront API Metafields](https://shopify.dev/docs/api/storefront/latest/objects/Metafield)
- [Our Metafield Setup Guide](./METAFIELD-SETUP.md)
- [URL Structure Documentation](./URL-STRUCTURE.md)

---

## Quick Setup Reminder

**Minimum Required Steps:**

1. ✅ Create `custom.primary_collection` metafield definition
2. ✅ **Enable Storefront Access** ← **Don't forget this!**
3. ✅ Set values on products

That's it! 🎉






## Quick Answer

**For your URL structure and breadcrumbs, you need ONE feature enabled:**

✅ **Storefront Access** - This allows metafields to be accessed via the Storefront API

**Reference:** [Shopify Custom Data Features](https://help.shopify.com/en/manual/custom-data/features)

---

## Required Feature: Storefront Access

### What It Does
- Makes metafields accessible via the **Storefront API** (which your Next.js app uses)
- Without this, your metafields won't be available in GraphQL queries
- **This is REQUIRED** for your headless setup

### How to Enable

1. **Go to Shopify Admin**
   - Navigate to: **Settings** → **Custom data** → **Products**

2. **Find your metafield definition**
   - Look for: `Primary Collection` (`custom.primary_collection`)

3. **Click on the metafield** to edit it

4. **Enable "Storefront Access"**
   - Check the box: ✅ **Storefront Access**
   - This allows the metafield to be used in your Online Store via the Storefront API

5. **Save**

### Why It's Required

Your Next.js app uses the **Shopify Storefront API** (not Liquid templates), so metafields must have Storefront Access enabled to be queryable:

```graphql
# This query requires Storefront Access to work
query {
  product(handle: "product-handle") {
    metafield(namespace: "custom", key: "primary_collection") {
      value  # ← Won't work without Storefront Access
    }
  }
}
```

---

## Other Features (Optional)

### For Metafields

#### ✅ Use as a Filter in Product Index
- **What:** Allows filtering products by metafield values in search
- **Needed?** ❌ No - Not required for URL structure
- **Useful if:** You want customers to filter products by collection path

#### ✅ Use in Smart Collections
- **What:** Allows creating smart collections based on metafield values
- **Needed?** ❌ No - Not required for URL structure
- **Useful if:** You want dynamic collections based on `primary_collection` values

#### ✅ Customer Account Access
- **What:** Makes metafields available via Customer Account API
- **Needed?** ❌ No - Not required for URL structure
- **Useful if:** You want to show collection info in customer accounts

#### ✅ Use as a Filter in Company Index
- **What:** B2B feature for filtering companies
- **Needed?** ❌ No - Not relevant for your use case

---

## For Metaobjects (Not Currently Used)

Your current setup doesn't use **Metaobjects** (only metafields), so these features don't apply:

- ❌ Storefront Access (for metaobjects)
- ❌ Publish Entries as Web Pages
- ❌ Active-Draft Status
- ❌ Translations
- ❌ Use as a Filter in Metaobject Index

**Note:** If you decide to use metaobjects in the future (e.g., for vendor information, blog posts, etc.), you'd need to enable Storefront Access on those as well.

---

## Setup Checklist

### Step 1: Create Metafield Definition
- ✅ Name: `Primary Collection`
- ✅ Namespace: `custom`
- ✅ Key: `primary_collection`
- ✅ Type: `Single line text`

### Step 2: Enable Storefront Access ⚠️ **CRITICAL**
- ✅ Go to Settings → Custom data → Products
- ✅ Click on `Primary Collection` metafield
- ✅ Enable **Storefront Access**
- ✅ Save

### Step 3: Set Values on Products
- ✅ Edit products
- ✅ Set `primary_collection` values (e.g., `riding-wear/breeches`)

---

## Verification

### Test Storefront Access

After enabling Storefront Access, test with a GraphQL query:

```graphql
query TestMetafieldAccess {
  product(handle: "your-product-handle") {
    title
    metafield(namespace: "custom", key: "primary_collection") {
      value
    }
  }
}
```

**Expected Result:**
- ✅ If Storefront Access is enabled: Returns the metafield value
- ❌ If Storefront Access is disabled: Returns `null` or error

### Common Error Without Storefront Access

If you see this error or `null` values:

```
Error: Metafield not accessible via Storefront API
```

**Solution:** Enable Storefront Access on the metafield definition.

---

## Summary Table

| Feature | Required? | Purpose | Your Use Case |
|---------|-----------|---------|--------------|
| **Storefront Access** | ✅ **YES** | Access metafields via Storefront API | **Required** - Your Next.js app uses Storefront API |
| Use as Filter (Product Index) | ❌ No | Filter products by metafield | Optional - Could be useful later |
| Use in Smart Collections | ❌ No | Create dynamic collections | Optional - Could be useful later |
| Customer Account Access | ❌ No | Show in customer accounts | Not needed |
| Company Index Filters | ❌ No | B2B filtering | Not relevant |

---

## Important Notes

### ⚠️ Storefront Access is Required

**Without Storefront Access:**
- ❌ Metafields won't appear in Storefront API queries
- ❌ Your breadcrumbs won't work
- ❌ Structured data won't include collection paths
- ❌ Product pages will work, but without breadcrumbs

**With Storefront Access:**
- ✅ Metafields accessible via Storefront API
- ✅ Breadcrumbs work correctly
- ✅ Structured data includes hierarchy
- ✅ Full functionality enabled

### 🔒 Security Note

Enabling Storefront Access makes metafield values **publicly accessible** via the Storefront API. This is fine for collection paths (which are already public), but be careful with sensitive data.

**Safe to make public:**
- ✅ Collection paths (`riding-wear/breeches`)
- ✅ Product attributes
- ✅ Display information

**Don't make public:**
- ❌ Internal notes
- ❌ Cost/pricing data
- ❌ Supplier information
- ❌ Private metadata

---

## Troubleshooting

### Metafield Returns Null

**Problem:** GraphQL query returns `null` for metafield value

**Solutions:**
1. ✅ Check Storefront Access is enabled
2. ✅ Verify metafield definition exists
3. ✅ Check namespace/key matches exactly (`custom.primary_collection`)
4. ✅ Ensure value is set on the product

### Metafield Not Showing in Admin

**Problem:** Can't find metafield when editing product

**Solutions:**
1. ✅ Check metafield definition is created
2. ✅ Verify you're looking in the right section (Metafields)
3. ✅ Refresh the page
4. ✅ Check you have permission to edit products

### Storefront Access Option Missing

**Problem:** Can't find "Storefront Access" checkbox

**Solutions:**
1. ✅ Make sure you're editing the metafield **definition** (not the value)
2. ✅ Go to Settings → Custom data → Products → Click on metafield name
3. ✅ Check you're using a supported Shopify plan (Storefront Access available on all plans)
4. ✅ Try refreshing the page

---

## References

- [Shopify Custom Data Features](https://help.shopify.com/en/manual/custom-data/features)
- [Storefront API Metafields](https://shopify.dev/docs/api/storefront/latest/objects/Metafield)
- [Our Metafield Setup Guide](./METAFIELD-SETUP.md)
- [URL Structure Documentation](./URL-STRUCTURE.md)

---

## Quick Setup Reminder

**Minimum Required Steps:**

1. ✅ Create `custom.primary_collection` metafield definition
2. ✅ **Enable Storefront Access** ← **Don't forget this!**
3. ✅ Set values on products

That's it! 🎉




