# Setting Metafield Values on Products - Step by Step

## What Does "Set Values on Products" Mean?

After creating the metafield **definition**, you need to **set the actual value** on each product. This tells the system which collection path to use for breadcrumbs.

---

## Visual Example

### Step 1: Metafield Definition (You Already Did This ✅)
**Location:** Settings → Custom data → Products

This creates the **field** that will appear on products. Think of it like creating a form field.

### Step 2: Set Values on Products (What You Need to Do)
**Location:** Edit Product → Metafields section

This is where you **fill in the actual data** for each product. Think of it like filling out the form.

---

## Step-by-Step: How to Set Values

### For Each Product:

1. **Go to Shopify Admin** → **Products**

2. **Click on a product** to edit it

3. **Scroll down** to the **Metafields** section
   - It's usually near the bottom of the product edit page
   - Look for a section labeled "Metafields" or "Custom data"

4. **Find the "Primary Collection" field**
   - This is the metafield you created
   - It should show as "Primary Collection" or `custom.primary_collection`

5. **Enter the collection path** in this format:
   ```
   collection-handle/tag-name
   ```

6. **Click Save** on the product

---

## Examples: What Values to Enter

### Example 1: Product in Collection with Tag

**Product:** "Paddock Boot Brown"
- **Collection:** "Riding Wear"
- **Tag/Subcategory:** "Boots"
- **Collection handle:** `riding-wear` (lowercase, hyphens)
- **Tag name:** `boots` (lowercase, hyphens)

**Enter this value:**
```
riding-wear/boots
```

**Result:** Breadcrumb shows: `Home > Riding Wear > Boots > Paddock Boot Brown`

---

### Example 2: Product in Collection Only (No Tag)

**Product:** "Saddle Pad"
- **Collection:** "Equipment"
- **No tag/subcategory**
- **Collection handle:** `equipment`

**Enter this value:**
```
equipment
```

**Result:** Breadcrumb shows: `Home > Equipment > Saddle Pad`

---

### Example 3: Product with Subcategory

**Product:** "Show Breeches"
- **Collection:** "Riding Wear"
- **Tag/Subcategory:** "Breeches"
- **Collection handle:** `riding-wear`
- **Tag name:** `breeches`

**Enter this value:**
```
riding-wear/breeches
```

**Result:** Breadcrumb shows: `Home > Riding Wear > Breeches > Show Breeches`

---

## How to Find Collection Handles and Tag Names

### Finding Collection Handle:

1. Go to **Products** → **Collections**
2. Click on a collection
3. Look at the URL: `.../collections/riding-wear`
4. The handle is `riding-wear` (the part after `/collections/`)

**Or:**
- Collection handle is usually the collection name in lowercase with hyphens
- "Riding Wear" → `riding-wear`
- "Saddle Pads" → `saddle-pads`

### Finding Tag Name:

1. Edit a product
2. Look at the **Tags** section
3. Tags are usually lowercase with hyphens
- "Boots" → `boots`
- "Show Breeches" → `show-breeches`

---

## Format Rules

### ✅ Correct Format:
```
riding-wear/boots
equipment
saddle-pads/jumping-pads
```

### ❌ Wrong Format:
```
Riding Wear/Boots          ← Use lowercase
riding_wear/boots          ← Use hyphens, not underscores
/riding-wear/boots         ← Don't start with /
riding-wear/boots/         ← Don't end with /
```

### Key Rules:
- ✅ Use **lowercase** only
- ✅ Use **hyphens** (`-`) not spaces or underscores
- ✅ Format: `collection-handle/tag-name`
- ✅ If no tag: just `collection-handle`
- ✅ No leading or trailing slashes

---

## Real-World Example Walkthrough

Let's say you have a product called **"Leather Paddock Boot"**:

### Step 1: Identify Collection and Tag

1. **Which collection is it in?**
   - Let's say: "Riding Wear"
   - Handle: `riding-wear`

2. **Does it have a tag/subcategory?**
   - Let's say it's tagged: "Boots"
   - Tag name: `boots`

### Step 2: Edit the Product

1. Go to **Products** → Find "Leather Paddock Boot"
2. Click to edit
3. Scroll to **Metafields** section

### Step 3: Enter the Value

1. Find **Primary Collection** field
2. Enter: `riding-wear/boots`
3. Click **Save**

### Step 4: Verify

1. Visit product page: `/products/leather-paddock-boot`
2. Should see breadcrumb: `Home > Riding Wear > Boots > Leather Paddock Boot`

---

## What Happens If You Don't Set Values?

### ✅ Still Works:
- Product pages display correctly
- Product structured data works (price, availability)
- All URLs work
- Collection pages work

### ⚠️ Missing:
- No breadcrumbs on product pages
- BreadcrumbList structured data won't include collection hierarchy
- Less SEO benefit from hierarchy signals

**Bottom line:** Products work fine, but breadcrumbs won't show without values set.

---

## Bulk Setup Options

### Option 1: Manual (Small Store)
- Edit each product one by one
- Set the metafield value
- Good for < 50 products

### Option 2: CSV Import
1. Export products from Shopify
2. Add column: `Metafield: custom.primary_collection [single_line_text_field]`
3. Fill in values (e.g., `riding-wear/boots`)
4. Import back to Shopify

### Option 3: Bulk Edit Apps
- Use Shopify apps like "Bulk Product Editor"
- Set metafield values in bulk

### Option 4: Shopify Flow (Automation)
- Create a Flow that sets metafield based on product's collections/tags
- Automatically sets value when product is created/updated

---

## Quick Reference

| Product Location | Collection Handle | Tag Name | Metafield Value |
|-----------------|-------------------|----------|----------------|
| Riding Wear → Boots | `riding-wear` | `boots` | `riding-wear/boots` |
| Equipment → Saddles | `equipment` | `saddles` | `equipment/saddles` |
| Safety (no tag) | `safety` | - | `safety` |
| Riding Wear → Breeches | `riding-wear` | `breeches` | `riding-wear/breeches` |

---

## Summary

**"Set values on products"** means:

1. ✅ You've created the metafield definition (done)
2. ⚠️ Now you need to **fill in the actual value** on each product
3. The value tells the system: "This product belongs to this collection path"
4. Format: `collection-handle/tag-name` (e.g., `riding-wear/boots`)

**It's like:**
- Creating a form field (metafield definition) ✅
- Filling out the form (setting values on products) ⚠️

**Without values:** Products work, but no breadcrumbs
**With values:** Products work + breadcrumbs show + better SEO

---

## Need Help?

- Check `METAFIELD-SETUP.md` for detailed setup guide
- Check `URL-STRUCTURE.md` for how breadcrumbs work
- Test on one product first, then do the rest






## What Does "Set Values on Products" Mean?

After creating the metafield **definition**, you need to **set the actual value** on each product. This tells the system which collection path to use for breadcrumbs.

---

## Visual Example

### Step 1: Metafield Definition (You Already Did This ✅)
**Location:** Settings → Custom data → Products

This creates the **field** that will appear on products. Think of it like creating a form field.

### Step 2: Set Values on Products (What You Need to Do)
**Location:** Edit Product → Metafields section

This is where you **fill in the actual data** for each product. Think of it like filling out the form.

---

## Step-by-Step: How to Set Values

### For Each Product:

1. **Go to Shopify Admin** → **Products**

2. **Click on a product** to edit it

3. **Scroll down** to the **Metafields** section
   - It's usually near the bottom of the product edit page
   - Look for a section labeled "Metafields" or "Custom data"

4. **Find the "Primary Collection" field**
   - This is the metafield you created
   - It should show as "Primary Collection" or `custom.primary_collection`

5. **Enter the collection path** in this format:
   ```
   collection-handle/tag-name
   ```

6. **Click Save** on the product

---

## Examples: What Values to Enter

### Example 1: Product in Collection with Tag

**Product:** "Paddock Boot Brown"
- **Collection:** "Riding Wear"
- **Tag/Subcategory:** "Boots"
- **Collection handle:** `riding-wear` (lowercase, hyphens)
- **Tag name:** `boots` (lowercase, hyphens)

**Enter this value:**
```
riding-wear/boots
```

**Result:** Breadcrumb shows: `Home > Riding Wear > Boots > Paddock Boot Brown`

---

### Example 2: Product in Collection Only (No Tag)

**Product:** "Saddle Pad"
- **Collection:** "Equipment"
- **No tag/subcategory**
- **Collection handle:** `equipment`

**Enter this value:**
```
equipment
```

**Result:** Breadcrumb shows: `Home > Equipment > Saddle Pad`

---

### Example 3: Product with Subcategory

**Product:** "Show Breeches"
- **Collection:** "Riding Wear"
- **Tag/Subcategory:** "Breeches"
- **Collection handle:** `riding-wear`
- **Tag name:** `breeches`

**Enter this value:**
```
riding-wear/breeches
```

**Result:** Breadcrumb shows: `Home > Riding Wear > Breeches > Show Breeches`

---

## How to Find Collection Handles and Tag Names

### Finding Collection Handle:

1. Go to **Products** → **Collections**
2. Click on a collection
3. Look at the URL: `.../collections/riding-wear`
4. The handle is `riding-wear` (the part after `/collections/`)

**Or:**
- Collection handle is usually the collection name in lowercase with hyphens
- "Riding Wear" → `riding-wear`
- "Saddle Pads" → `saddle-pads`

### Finding Tag Name:

1. Edit a product
2. Look at the **Tags** section
3. Tags are usually lowercase with hyphens
- "Boots" → `boots`
- "Show Breeches" → `show-breeches`

---

## Format Rules

### ✅ Correct Format:
```
riding-wear/boots
equipment
saddle-pads/jumping-pads
```

### ❌ Wrong Format:
```
Riding Wear/Boots          ← Use lowercase
riding_wear/boots          ← Use hyphens, not underscores
/riding-wear/boots         ← Don't start with /
riding-wear/boots/         ← Don't end with /
```

### Key Rules:
- ✅ Use **lowercase** only
- ✅ Use **hyphens** (`-`) not spaces or underscores
- ✅ Format: `collection-handle/tag-name`
- ✅ If no tag: just `collection-handle`
- ✅ No leading or trailing slashes

---

## Real-World Example Walkthrough

Let's say you have a product called **"Leather Paddock Boot"**:

### Step 1: Identify Collection and Tag

1. **Which collection is it in?**
   - Let's say: "Riding Wear"
   - Handle: `riding-wear`

2. **Does it have a tag/subcategory?**
   - Let's say it's tagged: "Boots"
   - Tag name: `boots`

### Step 2: Edit the Product

1. Go to **Products** → Find "Leather Paddock Boot"
2. Click to edit
3. Scroll to **Metafields** section

### Step 3: Enter the Value

1. Find **Primary Collection** field
2. Enter: `riding-wear/boots`
3. Click **Save**

### Step 4: Verify

1. Visit product page: `/products/leather-paddock-boot`
2. Should see breadcrumb: `Home > Riding Wear > Boots > Leather Paddock Boot`

---

## What Happens If You Don't Set Values?

### ✅ Still Works:
- Product pages display correctly
- Product structured data works (price, availability)
- All URLs work
- Collection pages work

### ⚠️ Missing:
- No breadcrumbs on product pages
- BreadcrumbList structured data won't include collection hierarchy
- Less SEO benefit from hierarchy signals

**Bottom line:** Products work fine, but breadcrumbs won't show without values set.

---

## Bulk Setup Options

### Option 1: Manual (Small Store)
- Edit each product one by one
- Set the metafield value
- Good for < 50 products

### Option 2: CSV Import
1. Export products from Shopify
2. Add column: `Metafield: custom.primary_collection [single_line_text_field]`
3. Fill in values (e.g., `riding-wear/boots`)
4. Import back to Shopify

### Option 3: Bulk Edit Apps
- Use Shopify apps like "Bulk Product Editor"
- Set metafield values in bulk

### Option 4: Shopify Flow (Automation)
- Create a Flow that sets metafield based on product's collections/tags
- Automatically sets value when product is created/updated

---

## Quick Reference

| Product Location | Collection Handle | Tag Name | Metafield Value |
|-----------------|-------------------|----------|----------------|
| Riding Wear → Boots | `riding-wear` | `boots` | `riding-wear/boots` |
| Equipment → Saddles | `equipment` | `saddles` | `equipment/saddles` |
| Safety (no tag) | `safety` | - | `safety` |
| Riding Wear → Breeches | `riding-wear` | `breeches` | `riding-wear/breeches` |

---

## Summary

**"Set values on products"** means:

1. ✅ You've created the metafield definition (done)
2. ⚠️ Now you need to **fill in the actual value** on each product
3. The value tells the system: "This product belongs to this collection path"
4. Format: `collection-handle/tag-name` (e.g., `riding-wear/boots`)

**It's like:**
- Creating a form field (metafield definition) ✅
- Filling out the form (setting values on products) ⚠️

**Without values:** Products work, but no breadcrumbs
**With values:** Products work + breadcrumbs show + better SEO

---

## Need Help?

- Check `METAFIELD-SETUP.md` for detailed setup guide
- Check `URL-STRUCTURE.md` for how breadcrumbs work
- Test on one product first, then do the rest




