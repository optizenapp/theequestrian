# Shopify Metafields Setup for Collection Content

## 🎯 Purpose

Set up Shopify metafields to enable **rich content, SEO descriptions, and featured links** on collection and subcollection pages.

---

## 📋 Metafields to Create

### 1. Page Content (Rich HTML)

**Purpose:** Full page content with HTML formatting, internal links, and rich text.

**Settings:**
- **Name:** Page Content
- **Namespace and key:** `custom.page_content`
- **Type:** Rich text / HTML
- **Description:** Rich HTML content for collection pages (supports headings, lists, links, formatting)
- **Storefront Access:** ✅ **ENABLED** (Required!)

**How to Use:**
- Edit directly in Shopify Admin
- Supports HTML formatting (headings, lists, paragraphs)
- Can include internal links to products/collections
- Example:
```html
<h2>About Womens Clothing</h2>
<p>Discover our premium collection of equestrian clothing...</p>
<h3>What to Look For</h3>
<ul>
  <li>Premium materials</li>
  <li>Perfect fit</li>
  <li>Durable construction</li>
</ul>
<p>Check out our <a href="/products/featured-product">Featured Product</a>.</p>
```

---

### 2. SEO Description

**Purpose:** Meta description for search engines (150-160 characters).

**Settings:**
- **Name:** SEO Description
- **Namespace and key:** `custom.seo_description`
- **Type:** Single line text
- **Description:** SEO meta description for collection pages
- **Storefront Access:** ✅ **ENABLED** (Required!)

**How to Use:**
- Write compelling 150-160 character descriptions
- Include primary keywords naturally
- Example: `Shop premium equestrian breeches for women. High-quality materials, perfect fit, and durable construction. Free shipping on orders over $100.`

---

### 3. Featured Links

**Purpose:** Featured product/collection links displayed prominently on the page.

**Settings:**
- **Name:** Featured Links
- **Namespace and key:** `custom.featured_links`
- **Type:** JSON
- **Description:** JSON array of featured product/collection links
- **Storefront Access:** ✅ **ENABLED** (Required!)

**How to Use:**
- Enter JSON array format
- Each link has: `type`, `handle`, `text`
- Example:
```json
[
  {
    "type": "product",
    "handle": "cavallo-cara-grip-breeches",
    "text": "Cavallo Cara Grip Breeches"
  },
  {
    "type": "collection",
    "handle": "womens-clothing",
    "text": "Shop All Womens Clothing"
  },
  {
    "type": "product",
    "handle": "anky-breeches",
    "text": "ANKY Breeches"
  }
]
```

---

## 🔧 Step-by-Step Setup

### Step 1: Create Metafield Definitions

1. Go to **Shopify Admin** → **Settings** → **Custom data**
2. Click **Collections**
3. Click **Add definition**

**For each metafield:**

1. **Page Content:**
   - Name: `Page Content`
   - Namespace and key: `custom.page_content`
   - Type: **Rich text / HTML**
   - ✅ Enable **Storefront Access**
   - Save

2. **SEO Description:**
   - Name: `SEO Description`
   - Namespace and key: `custom.seo_description`
   - Type: **Single line text**
   - ✅ Enable **Storefront Access**
   - Save

3. **Featured Links:**
   - Name: `Featured Links`
   - Namespace and key: `custom.featured_links`
   - Type: **JSON**
   - ✅ Enable **Storefront Access**
   - Save

---

### Step 2: Set Values on Collections

1. Go to **Shopify Admin** → **Products** → **Collections**
2. Click on a collection
3. Scroll to **Metafields** section
4. Fill in the three metafields:

**Page Content:**
- Click **Page Content**
- Enter rich HTML content
- Use the rich text editor or switch to HTML mode
- Save

**SEO Description:**
- Click **SEO Description**
- Enter 150-160 character description
- Save

**Featured Links:**
- Click **Featured Links**
- Enter JSON array (see format above)
- Save

---

## 📝 Content Templates

### Collection Page Template

```html
<h2>About [Collection Name]</h2>
<p>Comprehensive description of the collection, its purpose, and what makes it special. This is your opportunity to tell customers why they should shop this collection.</p>

<h3>What to Look For</h3>
<ul>
  <li>Key feature or benefit 1</li>
  <li>Key feature or benefit 2</li>
  <li>Key feature or benefit 3</li>
</ul>

<h3>Popular Products</h3>
<p>Check out our <a href="/products/product-handle">Featured Product Name</a> or browse our <a href="/collection-handle">Related Collection</a>.</p>

<h3>Why Choose [Collection Name]</h3>
<p>Unique selling points, quality guarantees, or special benefits of this collection.</p>
```

### Featured Links JSON Template

```json
[
  {
    "type": "product",
    "handle": "product-handle-1",
    "text": "Featured Product 1"
  },
  {
    "type": "product",
    "handle": "product-handle-2",
    "text": "Featured Product 2"
  },
  {
    "type": "collection",
    "handle": "related-collection-handle",
    "text": "Shop Related Collection"
  }
]
```

---

## ✅ Verification Checklist

### Metafield Setup
- [ ] `custom.page_content` created (Rich text / HTML)
- [ ] `custom.seo_description` created (Single line text)
- [ ] `custom.featured_links` created (JSON)
- [ ] All metafields have **Storefront Access** enabled

### Test Collection
- [ ] Created test collection
- [ ] Added page content (HTML)
- [ ] Added SEO description
- [ ] Added featured links JSON
- [ ] Verified content displays on frontend
- [ ] Verified featured links work correctly
- [ ] Verified SEO description appears in metadata

---

## 🚨 Common Issues

### Content Not Displaying

**Issue:** Rich content not showing on collection page

**Solutions:**
1. ✅ Verify **Storefront Access** is enabled for metafield
2. ✅ Check metafield namespace/key matches exactly: `custom.page_content`
3. ✅ Verify collection handle matches URL
4. ✅ Check browser console for errors
5. ✅ Clear Next.js cache

### Featured Links Not Working

**Issue:** Featured links show but don't navigate correctly

**Solutions:**
1. ✅ Verify JSON format is valid (use JSON validator)
2. ✅ Check product/collection handles exist
3. ✅ Verify `type` is either `"product"` or `"collection"`
4. ✅ Check handles match exactly (case-sensitive)

### SEO Description Not in Metadata

**Issue:** SEO description not appearing in page `<meta>` tag

**Solutions:**
1. ✅ Verify metafield is set on collection
2. ✅ Check **Storefront Access** is enabled
3. ✅ Verify GraphQL query includes `seoDescriptionMetafield`
4. ✅ Check page metadata generation code

---

## 📚 Additional Resources

- [Shopify Metafields Documentation](https://shopify.dev/docs/apps/build/custom-data/metafields)
- [Storefront API Metafields](https://shopify.dev/docs/api/storefront/latest/objects/Metafield)
- [Rich Text Formatting Guide](https://help.shopify.com/en/manual/products/metafields/metafield-types/rich-text)

---

## 🎯 Next Steps

1. **Set up metafields** (15 minutes)
2. **Add content to 1-2 test collections** (30 minutes)
3. **Verify on frontend** (15 minutes)
4. **Create content templates** for team
5. **Migrate existing content** from old site (if applicable)
6. **Train team** on content management

---

## 💡 Pro Tips

### Content Best Practices

- **Length:** 300-500 words for page content
- **Formatting:** Use headings (H2, H3) for structure
- **Links:** Include 3-5 internal links per page
- **Keywords:** Natural keyword usage (not keyword stuffing)
- **Tone:** Consistent brand voice

### SEO Description Tips

- **Length:** 150-160 characters (optimal)
- **Include:** Primary keyword, value proposition, call to action
- **Unique:** Each collection should have unique description
- **Compelling:** Write to encourage clicks

### Featured Links Tips

- **Quantity:** 3-5 links maximum
- **Mix:** Combine products and collections
- **Relevance:** Link to related/relevant items
- **Text:** Use descriptive, action-oriented text

---

## 🚀 Ready to Start?

1. Create the three metafields in Shopify Admin
2. Add content to a test collection
3. Verify it displays correctly
4. Roll out to all collections

**Need help?** Check the troubleshooting section or review the implementation code in `lib/content/collections.ts`.






## 🎯 Purpose

Set up Shopify metafields to enable **rich content, SEO descriptions, and featured links** on collection and subcollection pages.

---

## 📋 Metafields to Create

### 1. Page Content (Rich HTML)

**Purpose:** Full page content with HTML formatting, internal links, and rich text.

**Settings:**
- **Name:** Page Content
- **Namespace and key:** `custom.page_content`
- **Type:** Rich text / HTML
- **Description:** Rich HTML content for collection pages (supports headings, lists, links, formatting)
- **Storefront Access:** ✅ **ENABLED** (Required!)

**How to Use:**
- Edit directly in Shopify Admin
- Supports HTML formatting (headings, lists, paragraphs)
- Can include internal links to products/collections
- Example:
```html
<h2>About Womens Clothing</h2>
<p>Discover our premium collection of equestrian clothing...</p>
<h3>What to Look For</h3>
<ul>
  <li>Premium materials</li>
  <li>Perfect fit</li>
  <li>Durable construction</li>
</ul>
<p>Check out our <a href="/products/featured-product">Featured Product</a>.</p>
```

---

### 2. SEO Description

**Purpose:** Meta description for search engines (150-160 characters).

**Settings:**
- **Name:** SEO Description
- **Namespace and key:** `custom.seo_description`
- **Type:** Single line text
- **Description:** SEO meta description for collection pages
- **Storefront Access:** ✅ **ENABLED** (Required!)

**How to Use:**
- Write compelling 150-160 character descriptions
- Include primary keywords naturally
- Example: `Shop premium equestrian breeches for women. High-quality materials, perfect fit, and durable construction. Free shipping on orders over $100.`

---

### 3. Featured Links

**Purpose:** Featured product/collection links displayed prominently on the page.

**Settings:**
- **Name:** Featured Links
- **Namespace and key:** `custom.featured_links`
- **Type:** JSON
- **Description:** JSON array of featured product/collection links
- **Storefront Access:** ✅ **ENABLED** (Required!)

**How to Use:**
- Enter JSON array format
- Each link has: `type`, `handle`, `text`
- Example:
```json
[
  {
    "type": "product",
    "handle": "cavallo-cara-grip-breeches",
    "text": "Cavallo Cara Grip Breeches"
  },
  {
    "type": "collection",
    "handle": "womens-clothing",
    "text": "Shop All Womens Clothing"
  },
  {
    "type": "product",
    "handle": "anky-breeches",
    "text": "ANKY Breeches"
  }
]
```

---

## 🔧 Step-by-Step Setup

### Step 1: Create Metafield Definitions

1. Go to **Shopify Admin** → **Settings** → **Custom data**
2. Click **Collections**
3. Click **Add definition**

**For each metafield:**

1. **Page Content:**
   - Name: `Page Content`
   - Namespace and key: `custom.page_content`
   - Type: **Rich text / HTML**
   - ✅ Enable **Storefront Access**
   - Save

2. **SEO Description:**
   - Name: `SEO Description`
   - Namespace and key: `custom.seo_description`
   - Type: **Single line text**
   - ✅ Enable **Storefront Access**
   - Save

3. **Featured Links:**
   - Name: `Featured Links`
   - Namespace and key: `custom.featured_links`
   - Type: **JSON**
   - ✅ Enable **Storefront Access**
   - Save

---

### Step 2: Set Values on Collections

1. Go to **Shopify Admin** → **Products** → **Collections**
2. Click on a collection
3. Scroll to **Metafields** section
4. Fill in the three metafields:

**Page Content:**
- Click **Page Content**
- Enter rich HTML content
- Use the rich text editor or switch to HTML mode
- Save

**SEO Description:**
- Click **SEO Description**
- Enter 150-160 character description
- Save

**Featured Links:**
- Click **Featured Links**
- Enter JSON array (see format above)
- Save

---

## 📝 Content Templates

### Collection Page Template

```html
<h2>About [Collection Name]</h2>
<p>Comprehensive description of the collection, its purpose, and what makes it special. This is your opportunity to tell customers why they should shop this collection.</p>

<h3>What to Look For</h3>
<ul>
  <li>Key feature or benefit 1</li>
  <li>Key feature or benefit 2</li>
  <li>Key feature or benefit 3</li>
</ul>

<h3>Popular Products</h3>
<p>Check out our <a href="/products/product-handle">Featured Product Name</a> or browse our <a href="/collection-handle">Related Collection</a>.</p>

<h3>Why Choose [Collection Name]</h3>
<p>Unique selling points, quality guarantees, or special benefits of this collection.</p>
```

### Featured Links JSON Template

```json
[
  {
    "type": "product",
    "handle": "product-handle-1",
    "text": "Featured Product 1"
  },
  {
    "type": "product",
    "handle": "product-handle-2",
    "text": "Featured Product 2"
  },
  {
    "type": "collection",
    "handle": "related-collection-handle",
    "text": "Shop Related Collection"
  }
]
```

---

## ✅ Verification Checklist

### Metafield Setup
- [ ] `custom.page_content` created (Rich text / HTML)
- [ ] `custom.seo_description` created (Single line text)
- [ ] `custom.featured_links` created (JSON)
- [ ] All metafields have **Storefront Access** enabled

### Test Collection
- [ ] Created test collection
- [ ] Added page content (HTML)
- [ ] Added SEO description
- [ ] Added featured links JSON
- [ ] Verified content displays on frontend
- [ ] Verified featured links work correctly
- [ ] Verified SEO description appears in metadata

---

## 🚨 Common Issues

### Content Not Displaying

**Issue:** Rich content not showing on collection page

**Solutions:**
1. ✅ Verify **Storefront Access** is enabled for metafield
2. ✅ Check metafield namespace/key matches exactly: `custom.page_content`
3. ✅ Verify collection handle matches URL
4. ✅ Check browser console for errors
5. ✅ Clear Next.js cache

### Featured Links Not Working

**Issue:** Featured links show but don't navigate correctly

**Solutions:**
1. ✅ Verify JSON format is valid (use JSON validator)
2. ✅ Check product/collection handles exist
3. ✅ Verify `type` is either `"product"` or `"collection"`
4. ✅ Check handles match exactly (case-sensitive)

### SEO Description Not in Metadata

**Issue:** SEO description not appearing in page `<meta>` tag

**Solutions:**
1. ✅ Verify metafield is set on collection
2. ✅ Check **Storefront Access** is enabled
3. ✅ Verify GraphQL query includes `seoDescriptionMetafield`
4. ✅ Check page metadata generation code

---

## 📚 Additional Resources

- [Shopify Metafields Documentation](https://shopify.dev/docs/apps/build/custom-data/metafields)
- [Storefront API Metafields](https://shopify.dev/docs/api/storefront/latest/objects/Metafield)
- [Rich Text Formatting Guide](https://help.shopify.com/en/manual/products/metafields/metafield-types/rich-text)

---

## 🎯 Next Steps

1. **Set up metafields** (15 minutes)
2. **Add content to 1-2 test collections** (30 minutes)
3. **Verify on frontend** (15 minutes)
4. **Create content templates** for team
5. **Migrate existing content** from old site (if applicable)
6. **Train team** on content management

---

## 💡 Pro Tips

### Content Best Practices

- **Length:** 300-500 words for page content
- **Formatting:** Use headings (H2, H3) for structure
- **Links:** Include 3-5 internal links per page
- **Keywords:** Natural keyword usage (not keyword stuffing)
- **Tone:** Consistent brand voice

### SEO Description Tips

- **Length:** 150-160 characters (optimal)
- **Include:** Primary keyword, value proposition, call to action
- **Unique:** Each collection should have unique description
- **Compelling:** Write to encourage clicks

### Featured Links Tips

- **Quantity:** 3-5 links maximum
- **Mix:** Combine products and collections
- **Relevance:** Link to related/relevant items
- **Text:** Use descriptive, action-oriented text

---

## 🚀 Ready to Start?

1. Create the three metafields in Shopify Admin
2. Add content to a test collection
3. Verify it displays correctly
4. Roll out to all collections

**Need help?** Check the troubleshooting section or review the implementation code in `lib/content/collections.ts`.




