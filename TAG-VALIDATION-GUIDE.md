# Tag Validation Guide - Ensuring Correct Subcategory Tags

## The Problem

Products can have multiple tags, but we need to use the **correct tag** - the one that represents where the product is currently living (the active subcategory), not marketing tags like "sale" or "new".

## How It Works

The automation now validates tags to ensure we're using the correct subcategory tag:

### 1. Excludes Non-Subcategory Tags

These tags are automatically excluded (they're not subcategories):
- `new`, `sale`, `featured`, `bestseller`, `clearance`
- `on-sale`, `sale-item`, `trending`, `popular`
- `limited`, `exclusive`, `pre-order`
- Generic tags that don't represent categories

### 2. Validates Tag Format

- Ensures tag is a valid subcategory name
- Checks length and format
- Verifies it makes sense as a category

### 3. Uses First Valid Subcategory Tag

- Finds the first tag that represents a subcategory
- Ignores marketing/filter tags
- Returns the tag that matches where product is currently located

---

## Example: How It Works

### Product Setup:
- **Collection:** "Riding Wear" (`riding-wear`)
- **Tags:** `["Boots", "Sale", "New", "Bestseller"]`

### Process:
1. ✅ Finds "Boots" - Valid subcategory tag
2. ❌ Skips "Sale" - Marketing tag (excluded)
3. ❌ Skips "New" - Marketing tag (excluded)
4. ❌ Skips "Bestseller" - Marketing tag (excluded)

### Result:
- **Primary Collection:** `riding-wear/boots`
- **Breadcrumb:** `Home > Riding Wear > Boots > Product Name`

---

## Customizing Excluded Tags

### Edit Exclusion List

Open `lib/shopify/primary-collection.ts` and modify the `excludeTags` array:

```typescript
const excludeTags = [
  'new',
  'sale',
  'featured',
  'bestseller',
  'clearance',
  // Add your store-specific exclusions:
  'vendor-name',      // If you tag by vendor
  'custom-tag',       // Any tag that's not a subcategory
  'season-2024',      // If you use seasonal tags
];
```

### Add Custom Validation

You can add custom validation logic:

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

## Verifying Tags Match Subcategories

### Option 1: Check Against Actual Routes

You can verify tags create valid subcategory routes:

```typescript
// Check if collection/tag route exists
const subcategoryExists = await checkSubcategoryRoute(collectionHandle, tag);
if (subcategoryExists) {
  return `${collectionHandle}/${tag}`;
}
```

### Option 2: Use Collection-Based Validation

If you have subcategory collections, verify tags match:

```typescript
// Get child collections for the parent
const childCollections = await getChildCollections(collectionHandle);
const matchingCollection = childCollections.find(
  c => c.handle === tag
);

if (matchingCollection) {
  return `${collectionHandle}/${tag}`;
}
```

---

## Tag Naming Best Practices

### ✅ Good Subcategory Tags:
- `boots`, `breeches`, `shirts`, `jackets`
- `saddles`, `bridles`, `saddle-pads`
- `helmets`, `gloves`, `accessories`

### ❌ Bad Subcategory Tags (Will Be Excluded):
- `sale`, `new`, `featured`
- `bestseller`, `clearance`
- `vendor-acme`, `season-2024`
- Generic marketing tags

### 💡 Recommendation:

**Use consistent tag naming:**
- Use lowercase with hyphens: `riding-boots` not `Riding Boots`
- Keep tags descriptive but concise
- Avoid mixing subcategory tags with marketing tags

---

## Testing Tag Selection

### Test on a Product

1. **Preview what tag will be selected:**
   ```bash
   curl http://localhost:3001/api/admin/set-primary-collections?dryRun=true&limit=1
   ```

2. **Check the result:**
   ```json
   {
     "updates": [{
       "handle": "product-handle",
       "newValue": "riding-wear/boots"  // ← Check this is correct
     }]
   }
   ```

3. **Verify breadcrumb:**
   - Visit `/products/product-handle`
   - Check breadcrumb shows correct subcategory

---

## Troubleshooting

### Wrong Tag Selected?

**Problem:** Automation is using the wrong tag

**Solutions:**
1. ✅ Add the wrong tag to exclusion list
2. ✅ Reorder tags (first valid tag is used)
3. ✅ Customize `findSubcategoryTag()` logic

### Tag Not Being Used?

**Problem:** Valid subcategory tag is being skipped

**Solutions:**
1. ✅ Check if tag is in exclusion list
2. ✅ Verify tag format (lowercase, hyphens)
3. ✅ Check tag validation logic

### No Tag Selected?

**Problem:** Product has tags but none are being used

**Solutions:**
1. ✅ Check if all tags are excluded
2. ✅ Verify tags are valid subcategory names
3. ✅ Adjust exclusion list if needed

---

## Advanced: Verify Against Actual Subcategories

If you want to ensure tags match actual subcategory routes, you can extend the validation:

```typescript
import { getCollectionByHandle } from './collections';

async function verifyTagMatchesSubcategory(
  collectionHandle: string,
  tag: string
): Promise<boolean> {
  // Try to fetch the subcategory collection
  // If it exists, the tag is valid
  const subcategory = await getCollectionByHandle(tag);
  
  // Or check if products exist for collection/tag combination
  // This verifies it's a real subcategory path
  
  return subcategory !== null;
}
```

---

## Summary

**The automation now:**
- ✅ Excludes marketing/filter tags
- ✅ Validates tag format
- ✅ Uses the tag that represents product's current location
- ✅ Ensures tags create valid subcategory paths

**To customize:**
- Edit `excludeTags` array in `primary-collection.ts`
- Modify `findSubcategoryTag()` function
- Add custom validation logic

**Result:**
- Products get the correct subcategory tag
- Breadcrumbs show accurate hierarchy
- No manual tag selection needed






## The Problem

Products can have multiple tags, but we need to use the **correct tag** - the one that represents where the product is currently living (the active subcategory), not marketing tags like "sale" or "new".

## How It Works

The automation now validates tags to ensure we're using the correct subcategory tag:

### 1. Excludes Non-Subcategory Tags

These tags are automatically excluded (they're not subcategories):
- `new`, `sale`, `featured`, `bestseller`, `clearance`
- `on-sale`, `sale-item`, `trending`, `popular`
- `limited`, `exclusive`, `pre-order`
- Generic tags that don't represent categories

### 2. Validates Tag Format

- Ensures tag is a valid subcategory name
- Checks length and format
- Verifies it makes sense as a category

### 3. Uses First Valid Subcategory Tag

- Finds the first tag that represents a subcategory
- Ignores marketing/filter tags
- Returns the tag that matches where product is currently located

---

## Example: How It Works

### Product Setup:
- **Collection:** "Riding Wear" (`riding-wear`)
- **Tags:** `["Boots", "Sale", "New", "Bestseller"]`

### Process:
1. ✅ Finds "Boots" - Valid subcategory tag
2. ❌ Skips "Sale" - Marketing tag (excluded)
3. ❌ Skips "New" - Marketing tag (excluded)
4. ❌ Skips "Bestseller" - Marketing tag (excluded)

### Result:
- **Primary Collection:** `riding-wear/boots`
- **Breadcrumb:** `Home > Riding Wear > Boots > Product Name`

---

## Customizing Excluded Tags

### Edit Exclusion List

Open `lib/shopify/primary-collection.ts` and modify the `excludeTags` array:

```typescript
const excludeTags = [
  'new',
  'sale',
  'featured',
  'bestseller',
  'clearance',
  // Add your store-specific exclusions:
  'vendor-name',      // If you tag by vendor
  'custom-tag',       // Any tag that's not a subcategory
  'season-2024',      // If you use seasonal tags
];
```

### Add Custom Validation

You can add custom validation logic:

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

## Verifying Tags Match Subcategories

### Option 1: Check Against Actual Routes

You can verify tags create valid subcategory routes:

```typescript
// Check if collection/tag route exists
const subcategoryExists = await checkSubcategoryRoute(collectionHandle, tag);
if (subcategoryExists) {
  return `${collectionHandle}/${tag}`;
}
```

### Option 2: Use Collection-Based Validation

If you have subcategory collections, verify tags match:

```typescript
// Get child collections for the parent
const childCollections = await getChildCollections(collectionHandle);
const matchingCollection = childCollections.find(
  c => c.handle === tag
);

if (matchingCollection) {
  return `${collectionHandle}/${tag}`;
}
```

---

## Tag Naming Best Practices

### ✅ Good Subcategory Tags:
- `boots`, `breeches`, `shirts`, `jackets`
- `saddles`, `bridles`, `saddle-pads`
- `helmets`, `gloves`, `accessories`

### ❌ Bad Subcategory Tags (Will Be Excluded):
- `sale`, `new`, `featured`
- `bestseller`, `clearance`
- `vendor-acme`, `season-2024`
- Generic marketing tags

### 💡 Recommendation:

**Use consistent tag naming:**
- Use lowercase with hyphens: `riding-boots` not `Riding Boots`
- Keep tags descriptive but concise
- Avoid mixing subcategory tags with marketing tags

---

## Testing Tag Selection

### Test on a Product

1. **Preview what tag will be selected:**
   ```bash
   curl http://localhost:3001/api/admin/set-primary-collections?dryRun=true&limit=1
   ```

2. **Check the result:**
   ```json
   {
     "updates": [{
       "handle": "product-handle",
       "newValue": "riding-wear/boots"  // ← Check this is correct
     }]
   }
   ```

3. **Verify breadcrumb:**
   - Visit `/products/product-handle`
   - Check breadcrumb shows correct subcategory

---

## Troubleshooting

### Wrong Tag Selected?

**Problem:** Automation is using the wrong tag

**Solutions:**
1. ✅ Add the wrong tag to exclusion list
2. ✅ Reorder tags (first valid tag is used)
3. ✅ Customize `findSubcategoryTag()` logic

### Tag Not Being Used?

**Problem:** Valid subcategory tag is being skipped

**Solutions:**
1. ✅ Check if tag is in exclusion list
2. ✅ Verify tag format (lowercase, hyphens)
3. ✅ Check tag validation logic

### No Tag Selected?

**Problem:** Product has tags but none are being used

**Solutions:**
1. ✅ Check if all tags are excluded
2. ✅ Verify tags are valid subcategory names
3. ✅ Adjust exclusion list if needed

---

## Advanced: Verify Against Actual Subcategories

If you want to ensure tags match actual subcategory routes, you can extend the validation:

```typescript
import { getCollectionByHandle } from './collections';

async function verifyTagMatchesSubcategory(
  collectionHandle: string,
  tag: string
): Promise<boolean> {
  // Try to fetch the subcategory collection
  // If it exists, the tag is valid
  const subcategory = await getCollectionByHandle(tag);
  
  // Or check if products exist for collection/tag combination
  // This verifies it's a real subcategory path
  
  return subcategory !== null;
}
```

---

## Summary

**The automation now:**
- ✅ Excludes marketing/filter tags
- ✅ Validates tag format
- ✅ Uses the tag that represents product's current location
- ✅ Ensures tags create valid subcategory paths

**To customize:**
- Edit `excludeTags` array in `primary-collection.ts`
- Modify `findSubcategoryTag()` function
- Add custom validation logic

**Result:**
- Products get the correct subcategory tag
- Breadcrumbs show accurate hierarchy
- No manual tag selection needed




