# 🚀 Quick Start: Automate Breadcrumbs

## The Problem

You want breadcrumbs on products, but can't set metafield values manually for hundreds of products.

## The Solution

Automatically set `primary_collection` metafield values based on rules:
- **Primary Collection:** Product's first collection
- **Subcategory:** Product's first relevant tag
- **Format:** `collection-handle/tag-name`

---

## Option 1: Shopify Flow (Easiest - No Code)

### Step 1: Create Flow

1. Go to **Shopify Admin** → **Settings** → **Automation** → **Flows**
2. Click **Create flow**
3. Choose **Product** → **Product created or updated**

### Step 2: Add Condition

- **Condition:** Product has at least one collection

### Step 3: Add Action

- **Action:** Set metafield value
- **Metafield:** `custom.primary_collection`
- **Value:** Use this Liquid code:

```liquid
{% assign first_collection = product.collections.first %}
{% assign subcategory_tag = null %}

{% comment %} Exclude non-subcategory tags (marketing/filter tags) {% endcomment %}
{% assign exclude_tags = 'new,sale,featured,bestseller,bestselling,clearance,on-sale,sale-item,trending,popular,limited,limited-edition,exclusive,pre-order,backorder,out-of-stock,in-stock' | split: ',' %}

{% comment %} Find first valid subcategory tag {% endcomment %}
{% for tag in product.tags %}
  {% assign tag_normalized = tag | downcase | handleize %}
  {% assign is_excluded = false %}
  
  {% comment %} Check if tag is excluded {% endcomment %}
  {% for excluded in exclude_tags %}
    {% if tag_normalized == excluded %}
      {% assign is_excluded = true %}
      {% break %}
    {% endif %}
  {% endfor %}
  
  {% comment %} Use first non-excluded tag as subcategory {% endcomment %}
  {% unless is_excluded %}
    {% assign subcategory_tag = tag %}
    {% break %}
  {% endunless %}
{% endfor %}

{% comment %} Build the path {% endcomment %}
{% if subcategory_tag %}
  {{ first_collection.handle }}/{{ subcategory_tag | handleize }}
{% else %}
  {{ first_collection.handle }}
{% endif %}
```

### Step 4: Activate

- Save and activate the flow
- It will automatically set metafields for new/updated products

### Step 5: Run on Existing Products

- Go to **Products** → Select all products
- Click **Bulk actions** → **Update products**
- This triggers the flow for all selected products

---

## Option 2: Use the API Route (Requires Setup)

### Step 1: Preview Changes

```bash
curl http://localhost:3001/api/admin/set-primary-collections?dryRun=true&limit=10
```

### Step 2: Apply Changes

```bash
curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=100
```

**Note:** This requires Admin API setup. See `AUTOMATE-BREADCRUMBS.md` for full setup.

---

## Option 3: Customize Rules

Edit `lib/shopify/primary-collection.ts` to customize:

- Which collection to use (priority collections)
- Which tags to exclude
- Custom tag selection logic

---

## Recommended: Shopify Flow

**Why:** 
- ✅ No code required
- ✅ Works immediately
- ✅ Automatically runs for new products
- ✅ Easy to test and adjust

**Steps:**
1. Create Flow (5 minutes)
2. Add Liquid code above
3. Activate
4. Run on existing products

**Done!** 🎉

---

## Verify It Works

1. **Check a product:**
   - Edit product in Shopify
   - Scroll to Metafields
   - Should see `primary_collection` value set

2. **Visit product page:**
   - Go to `/products/[handle]`
   - Should see breadcrumbs at top

3. **Check structured data:**
   - View page source
   - Search for `BreadcrumbList`
   - Should see breadcrumb schema

---

## Need Help?

- See `AUTOMATE-BREADCRUMBS.md` for detailed guide
- See `SETTING-METAFIELD-VALUES.md` for manual setup
- Customize rules in `lib/shopify/primary-collection.ts`


## The Problem

You want breadcrumbs on products, but can't set metafield values manually for hundreds of products.

## The Solution

Automatically set `primary_collection` metafield values based on rules:
- **Primary Collection:** Product's first collection
- **Subcategory:** Product's first relevant tag
- **Format:** `collection-handle/tag-name`

---

## Option 1: Shopify Flow (Easiest - No Code)

### Step 1: Create Flow

1. Go to **Shopify Admin** → **Settings** → **Automation** → **Flows**
2. Click **Create flow**
3. Choose **Product** → **Product created or updated**

### Step 2: Add Condition

- **Condition:** Product has at least one collection

### Step 3: Add Action

- **Action:** Set metafield value
- **Metafield:** `custom.primary_collection`
- **Value:** Use this Liquid code:

```liquid
{% assign first_collection = product.collections.first %}
{% assign subcategory_tag = null %}

{% comment %} Exclude non-subcategory tags (marketing/filter tags) {% endcomment %}
{% assign exclude_tags = 'new,sale,featured,bestseller,bestselling,clearance,on-sale,sale-item,trending,popular,limited,limited-edition,exclusive,pre-order,backorder,out-of-stock,in-stock' | split: ',' %}

{% comment %} Find first valid subcategory tag {% endcomment %}
{% for tag in product.tags %}
  {% assign tag_normalized = tag | downcase | handleize %}
  {% assign is_excluded = false %}
  
  {% comment %} Check if tag is excluded {% endcomment %}
  {% for excluded in exclude_tags %}
    {% if tag_normalized == excluded %}
      {% assign is_excluded = true %}
      {% break %}
    {% endif %}
  {% endfor %}
  
  {% comment %} Use first non-excluded tag as subcategory {% endcomment %}
  {% unless is_excluded %}
    {% assign subcategory_tag = tag %}
    {% break %}
  {% endunless %}
{% endfor %}

{% comment %} Build the path {% endcomment %}
{% if subcategory_tag %}
  {{ first_collection.handle }}/{{ subcategory_tag | handleize }}
{% else %}
  {{ first_collection.handle }}
{% endif %}
```

### Step 4: Activate

- Save and activate the flow
- It will automatically set metafields for new/updated products

### Step 5: Run on Existing Products

- Go to **Products** → Select all products
- Click **Bulk actions** → **Update products**
- This triggers the flow for all selected products

---

## Option 2: Use the API Route (Requires Setup)

### Step 1: Preview Changes

```bash
curl http://localhost:3001/api/admin/set-primary-collections?dryRun=true&limit=10
```

### Step 2: Apply Changes

```bash
curl -X POST http://localhost:3001/api/admin/set-primary-collections?limit=100
```

**Note:** This requires Admin API setup. See `AUTOMATE-BREADCRUMBS.md` for full setup.

---

## Option 3: Customize Rules

Edit `lib/shopify/primary-collection.ts` to customize:

- Which collection to use (priority collections)
- Which tags to exclude
- Custom tag selection logic

---

## Recommended: Shopify Flow

**Why:** 
- ✅ No code required
- ✅ Works immediately
- ✅ Automatically runs for new products
- ✅ Easy to test and adjust

**Steps:**
1. Create Flow (5 minutes)
2. Add Liquid code above
3. Activate
4. Run on existing products

**Done!** 🎉

---

## Verify It Works

1. **Check a product:**
   - Edit product in Shopify
   - Scroll to Metafields
   - Should see `primary_collection` value set

2. **Visit product page:**
   - Go to `/products/[handle]`
   - Should see breadcrumbs at top

3. **Check structured data:**
   - View page source
   - Search for `BreadcrumbList`
   - Should see breadcrumb schema

---

## Need Help?

- See `AUTOMATE-BREADCRUMBS.md` for detailed guide
- See `SETTING-METAFIELD-VALUES.md` for manual setup
- Customize rules in `lib/shopify/primary-collection.ts`

