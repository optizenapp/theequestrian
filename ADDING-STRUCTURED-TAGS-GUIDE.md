# 🏷️ Adding Structured Tags to Products - Complete Guide

## Why Add Structured Tags?

Structured tags enable your product schema to automatically extract:
- ✅ Safety certifications (ASTM, SNELL, PAS015)
- ✅ Materials (Leather, Synthetic, Cotton)
- ✅ Weather features (Waterproof, Breathable)
- ✅ Manufacturer part numbers (MPN)

**Result:** Better SEO, richer structured data, higher search rankings!

---

## 📋 Tag Format Reference

### Safety Certifications
```
ASTM F1163-23
SNELL E2001
PAS015:2011
EN1384
CE Certified
```

### Materials
```
Leather
Synthetic Leather
Full Grain Leather
Cotton
Wool
Nylon
Polyester
Aramid Fibres
Mesh
```

### Weather Protection
```
Waterproof
Water Resistant
Breathable
Windproof
UV Protection
```

### Features
```
Stretch Fabric
Grip Enhancement
Impact Protection
Reflective
Anti-Slip
Quick Dry
```

### Manufacturer Part Number
```
MPN:4STAR-BLK
MPN:HERITAGE-BROWN
MPN:PRO-CHOICE-XL
```

---

## 🎯 Method 1: Shopify Admin (Manual)

### For Individual Products

**Best for:** Adding tags to 1-10 products

1. **Login to Shopify Admin**
2. **Go to:** Products → All products
3. **Click on a product** to edit
4. **Scroll to "Tags" section**
5. **Type tags** (press Enter after each):
   ```
   Leather
   Waterproof
   ASTM F1163-23
   ```
6. **Click "Save"**

### For Multiple Products (Bulk Edit)

**Best for:** Adding same tags to 10-50 products

1. **Go to:** Products → All products
2. **Select products** using checkboxes
3. **Click "More actions"** → "Add tags"
4. **Enter tags** (comma-separated):
   ```
   Leather, Waterproof, Breathable
   ```
5. **Click "Add tags"**

**Example:** Select all helmets → Add tags: `Safety Equipment, Head Protection`

---

## 📊 Method 2: CSV Import (Bulk)

### Best for: 50+ products

#### Step 1: Export Current Products

1. **Shopify Admin** → Products
2. **Click "Export"** button
3. **Select:** "All products"
4. **Format:** CSV for Excel, Numbers, or other spreadsheet programs
5. **Click "Export products"**
6. **Download the CSV file**

#### Step 2: Edit the CSV

Open in Excel/Google Sheets:

**Important Columns:**
- `Handle` - Don't change this!
- `Title` - Product name
- `Tags` - Add your new tags here

**How to add tags:**

**Option A: Add to existing tags**
```csv
Handle,Title,Tags
ariat-boot,"Ariat Boot","existing-tag, Leather, Waterproof"
```

**Option B: Replace all tags** (be careful!)
```csv
Handle,Title,Tags
ariat-boot,"Ariat Boot","Leather, Waterproof, ASTM F1163-23"
```

**Tips:**
- Keep existing tags unless you want to replace them
- Tags are comma-separated
- No quotes needed around individual tags
- Case-sensitive (use "Leather" not "leather")

#### Example CSV:

```csv
Handle,Title,Tags
charles-owen-helmet,"Charles Owen 4 Star Helmet","Helmets, SNELL E2001, PAS015:2011, Aramid Fibres, Safety Equipment"
ariat-heritage-boot,"Ariat Heritage Paddock Boot","Boots, Leather, Waterproof, Footwear"
horseware-turnout,"Horseware Turnout Rug","Rugs, Waterproof, Breathable, 1200D"
```

#### Step 3: Import the CSV

1. **Products** → "Import"
2. **Click "Add file"** → Select your edited CSV
3. **Important:** Check "Overwrite any current products that have the same handle"
4. **Click "Import products"**
5. **Wait for completion** (you'll get an email)

#### Step 4: Verify

1. Check a few products to ensure tags were added
2. If something went wrong, you can re-import the original CSV

---

## 🤖 Method 3: Automated Script (Advanced)

### Best for: Automatic tag suggestions based on product data

I've created a script that analyzes your products and suggests tags!

#### Step 1: Run the Analysis Script

```bash
npx tsx scripts/add-structured-tags.ts
```

**What it does:**
- Scans all products
- Detects materials from descriptions
- Finds certifications in product text
- Suggests tags based on product type
- Shows you what it would add

**Example output:**
```
📦 Charles Owen 4 Star Helmet
   Type: Riding Helmets
   Suggested tags: Safety Equipment, Head Protection, SNELL E2001, Aramid Fibres

📦 Ariat Heritage Boot
   Type: Paddock Boots
   Suggested tags: Leather, Footwear, Waterproof
```

#### Step 2: Review Suggestions

The script shows suggestions but **doesn't apply them automatically** (safe!)

#### Step 3: Apply Tags (Optional)

If you want to auto-apply:

1. Open `scripts/add-structured-tags.ts`
2. Find this section (around line 180):
```typescript
// For now, just show suggestions (uncomment below to actually update)
/*
for (const { product, suggestedTags } of updates) {
  const allTags = [...product.tags, ...suggestedTags];
  await updateProductTags(product.id, allTags);
  console.log(`✅ Updated: ${product.title}`);
}
*/
```
3. Remove the `/*` and `*/` to uncomment
4. Run again: `npx tsx scripts/add-structured-tags.ts`

---

## 📝 Product Type → Tag Mapping

Use this as a reference for what tags to add:

### Helmets
```
Safety Equipment
Head Protection
SNELL E2001 (if certified)
ASTM F1163-23 (if certified)
PAS015:2011 (if certified)
```

### Boots
```
Leather (or Synthetic Leather)
Footwear
Waterproof (if applicable)
```

### Breeches/Riding Pants
```
Riding Apparel
Stretch Fabric
Breathable
```

### Jackets
```
Riding Apparel
Weather Protection
Waterproof (if applicable)
Breathable (if applicable)
```

### Saddles/Bridles
```
Leather
Horse Tack
Full Grain Leather (if premium)
```

### Horse Rugs/Blankets
```
Horse Blanket
Waterproof (for turnout rugs)
Breathable
1200D (or fabric weight)
```

### Gloves
```
Riding Apparel
Grip Enhancement
Leather (or Synthetic)
```

### Safety Vests
```
Safety Equipment
Impact Protection
BETA Level 3 (if certified)
```

---

## 🎯 Quick Start: Tag Your Top 20 Products

**Priority products to tag first:**

1. **Best sellers** - Highest traffic
2. **Helmets** - Safety certs are critical
3. **Boots** - Material info improves conversions
4. **High-margin items** - Better ROI

**Time estimate:** 5-10 minutes for 20 products

---

## ✅ Verification Checklist

After adding tags, verify they're working:

### 1. Check Product Page
- View any product page
- Right-click → "View Page Source"
- Search for `additionalProperty`
- You should see your tags as structured data:

```json
"additionalProperty": [
  {
    "@type": "PropertyValue",
    "name": "Safety Certification",
    "value": "ASTM F1163-23"
  },
  {
    "@type": "PropertyValue",
    "name": "Material",
    "value": "Leather"
  }
]
```

### 2. Google Rich Results Test
1. Go to: https://search.google.com/test/rich-results
2. Enter product URL
3. Check for `additionalProperty` in schema
4. Should show no errors

### 3. Schema Validator
1. Go to: https://validator.schema.org/
2. Enter product URL
3. Verify PropertyValue entities appear

---

## 📊 Expected Results

### Before Tags
```json
{
  "@type": "Product",
  "name": "Charles Owen Helmet",
  "description": "Safety helmet with ASTM certification..."
  // Certifications buried in text ❌
}
```

### After Tags
```json
{
  "@type": "Product",
  "name": "Charles Owen Helmet",
  "description": "Safety helmet with ASTM certification...",
  "additionalProperty": [
    { "name": "Safety Certification", "value": "ASTM F1163-23" },
    { "name": "Safety Certification", "value": "SNELL E2001" },
    { "name": "Material", "value": "Aramid Fibres" }
  ]
  // Certifications explicitly structured ✅
}
```

**SEO Impact:** Google can now filter/match products by exact certifications!

---

## 🚀 Ongoing Maintenance

### For New Products
When adding new products, remember to add structured tags:

**Checklist:**
- [ ] Material (Leather, Synthetic, etc.)
- [ ] Safety certifications (if applicable)
- [ ] Weather features (if applicable)
- [ ] MPN tag (if you have part number)

### Monthly Audit
1. Export products to CSV
2. Filter by product type
3. Check if tags are consistent
4. Add missing tags

---

## 💡 Pro Tips

1. **Be consistent** - Always use "Leather" not "leather" or "LEATHER"
2. **Don't over-tag** - 5-10 relevant tags is better than 50 generic ones
3. **Use exact certification names** - "ASTM F1163-23" not "ASTM certified"
4. **Test one product first** - Verify schema works before bulk updating
5. **Keep a tag list** - Document your standard tags for consistency

---

## ❓ Common Questions

**Q: Will adding tags affect my existing site?**
A: No! Tags only enhance structured data. Your site will work exactly the same.

**Q: How many tags should I add per product?**
A: 5-10 relevant tags is ideal. Quality over quantity.

**Q: What if I add the wrong tag?**
A: Just remove it in Shopify admin. Schema will automatically update.

**Q: Do I need to add tags to all products?**
A: No! Start with your top sellers and high-value products.

**Q: Will this work with my existing tags?**
A: Yes! New tags are added alongside existing ones.

---

## 📞 Need Help?

If you get stuck:
1. Check `WORLD-CLASS-SCHEMA-GUIDE.md` for schema details
2. Test with Google Rich Results Test
3. Start with just 1-2 products to verify it works

**Remember:** Even adding tags to just your top 20 products will significantly improve your structured data! 🎯


