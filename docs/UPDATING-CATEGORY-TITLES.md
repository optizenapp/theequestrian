# Updating Category and Subcategory Titles

This guide explains how to update category and subcategory display titles in the headless storefront by editing the CSV file.

## 📋 Quick Reference

- **CSV File**: `exports/collection-content.csv`
- **Total Entries**: 238 categories and subcategories
- **After Changes**: Restart dev server (`npm run dev`)
- **Related Issue**: [GitHub Issue #7](https://github.com/optizenapp/theequestrian/issues/7)

## 🎯 What You Can Update

### Title Fields in CSV

| Field | Purpose | Where It Appears | Example |
|-------|---------|------------------|---------|
| `h1_title` | Main page heading | Large heading at top of page | "Horse Products" |
| `meta_title` | SEO & browser tab | Browser tab, Google results | "Horse Products \| The Equestrian" |
| `breadcrumb_label` | Navigation breadcrumbs | "Home / Horse / Boots" | "Horse" |

### Fields You Should NOT Change

| Field | Why Not Change | Notes |
|-------|----------------|-------|
| `url_path` | Breaks routing | URLs are hardcoded in the system |
| `parent_url` | Breaks hierarchy | Determines category relationships |
| `category_level` | Breaks structure | Determines if top-level (1), sub (2), or sub-sub (3) |

## 📝 How to Update Titles

### Step 1: Open the CSV File

```bash
# Open in your preferred editor
open exports/collection-content.csv

# Or use VS Code
code exports/collection-content.csv
```

### Step 2: Find the Row to Update

The CSV has these columns (in order):
1. `url_path` - The URL (e.g., `/horse` or `/horse/boots`)
2. `h1_title` - Main heading
3. `meta_title` - SEO title
4. `meta_description` - SEO description
5. `short_description` - Short description below title
6. `long_description` - Rich HTML content (long)
7. `breadcrumb_label` - Breadcrumb text
8. `parent_url` - Parent category
9. `category_level` - Hierarchy level
10. `status` - published/draft
11. `default_sort` - Sorting preference
12. `faq_json` - FAQ data (JSON)
13. `related_categories_json` - Related links (JSON)

### Step 3: Update Title Fields

**Example: Updating the "Horse" category**

**Before:**
```csv
/horse,Horse,Horse | The Equestrian,...,Horse,,1,...
```

**After:**
```csv
/horse,Premium Horse Products,Premium Horse Products | The Equestrian,...,Horse Products,,1,...
```

**What Changed:**
- `h1_title`: "Horse" → "Premium Horse Products"
- `meta_title`: "Horse | The Equestrian" → "Premium Horse Products | The Equestrian"
- `breadcrumb_label`: "Horse" → "Horse Products"

### Step 4: Save and Test

1. **Save** the CSV file
2. **Restart** the dev server:
   ```bash
   npm run dev
   ```
3. **Visit** the category page: `https://www.theequestrian.com.au/horse`
4. **Check**:
   - ✅ H1 title displays correctly
   - ✅ Browser tab shows new meta title
   - ✅ Breadcrumbs show new label
   - ✅ No broken links

## 💡 Best Practices

### Title Formatting Guidelines

#### H1 Titles (`h1_title`)
- **Purpose**: Main heading visitors see
- **Length**: 2-8 words
- **Style**: Clear, descriptive, keyword-rich
- **Examples**:
  - ✅ "Premium Horse Boots & Leg Protection"
  - ✅ "Ladies Riding Breeches & Jodhpurs"
  - ❌ "Boots" (too vague)
  - ❌ "The Ultimate Collection of Premium Horse Boots..." (too long)

#### Meta Titles (`meta_title`)
- **Purpose**: SEO, browser tabs, social shares
- **Length**: 50-60 characters (including brand)
- **Format**: `{Category} | The Equestrian`
- **Examples**:
  - ✅ "Horse Boots & Protection | The Equestrian" (48 chars)
  - ✅ "Ladies Breeches | The Equestrian" (34 chars)
  - ❌ "Premium High-Quality Horse Boots and Leg Protection Equipment | The Equestrian" (too long)

#### Breadcrumb Labels (`breadcrumb_label`)
- **Purpose**: Navigation path
- **Length**: 1-3 words (shorter than H1)
- **Style**: Concise, clear
- **Examples**:
  - ✅ "Horse Products" or "Horse"
  - ✅ "Boots" or "Horse Boots"
  - ❌ "Premium Horse Boots & Leg Protection" (too long for breadcrumb)

### Consistency Tips

1. **Keep breadcrumbs shorter than H1s**
   - H1: "Premium Horse Boots & Leg Protection"
   - Breadcrumb: "Boots"

2. **Include brand in meta_title**
   - Always end with: `| The Equestrian`

3. **Use keywords naturally**
   - Good: "Ladies Riding Breeches"
   - Bad: "Breeches Ladies Riding Pants Jodhpurs"

4. **Match user language**
   - If customers say "boots", use "boots" not "footwear"

## 🔍 Common Update Scenarios

### Scenario 1: Making Titles More Descriptive

**Problem**: Generic title "Boots"

**Solution**:
```csv
# Before
/horse/boots,Boots,Boots | The Equestrian,...,Boots,/horse,2,...

# After
/horse/boots,Horse Boots & Leg Protection,Horse Boots | The Equestrian,...,Boots,/horse,2,...
```

### Scenario 2: Adding Keywords for SEO

**Problem**: Missing important keywords

**Solution**:
```csv
# Before
/clothing/womens,Ladies Clothing,Ladies Clothing | The Equestrian,...,Ladies,/clothing,2,...

# After
/clothing/womens,Ladies Riding Clothing & Apparel,Ladies Riding Clothing | The Equestrian,...,Ladies,/clothing,2,...
```

### Scenario 3: Improving Breadcrumb Clarity

**Problem**: Breadcrumb too long or confusing

**Solution**:
```csv
# Before
/rider/helmets,Riding Helmets,Riding Helmets | The Equestrian,...,Riding Helmets,/rider,2,...

# After
/rider/helmets,Premium Riding Helmets & Safety Gear,Riding Helmets | The Equestrian,...,Helmets,/rider,2,...
```

## 🛠️ Bulk Updates

### Using Find & Replace (Carefully!)

If you need to update many titles at once:

1. **Make a backup first**:
   ```bash
   cp exports/collection-content.csv exports/collection-content.backup.csv
   ```

2. **Use find/replace** in your editor
   - Be specific to avoid unintended changes
   - Test on a few rows first

3. **Example**: Adding "Premium" to all top-level categories
   - Find: `^(/[^/,]+),([^,]+),`
   - Replace: `$1,Premium $2,`
   - ⚠️ Use with caution!

### Using a Script (Advanced)

For complex bulk updates, consider creating a Node.js script:

```javascript
// scripts/update-titles.js
const fs = require('fs');
const csv = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// Read CSV
const content = fs.readFileSync('exports/collection-content.csv', 'utf-8');
const records = csv.parse(content, { columns: true });

// Update titles
records.forEach(row => {
  if (row.url_path.startsWith('/horse/')) {
    // Add "Premium" to all horse subcategories
    if (!row.h1_title.startsWith('Premium')) {
      row.h1_title = `Premium ${row.h1_title}`;
    }
  }
});

// Write back
const output = stringify(records, { header: true });
fs.writeFileSync('exports/collection-content.csv', output);
```

## 📊 Current Category Structure

### Top-Level Categories (Level 1)
- `/horse` - Horse
- `/rider` - Rider
- `/clothing` - Clothing
- `/pet` - Pet
- `/accessories` - Accessories

### Example Subcategories (Level 2)
- `/horse/boots` - Horse Boots
- `/horse/bits` - Bits
- `/clothing/womens` - Ladies Clothing
- `/rider/helmets` - Helmets

### Example Sub-Subcategories (Level 3)
- `/clothing/womens/breeches` - Jodhpurs & Breeches Ladies
- `/clothing/womens/tights` - Tights
- `/horse/boots/bell-boots` - Bell Boots

## ✅ Testing Checklist

After updating titles, verify:

- [ ] H1 title displays correctly on category page
- [ ] Meta title shows in browser tab
- [ ] Breadcrumb labels are correct
- [ ] SEO title is 50-60 characters
- [ ] No broken links or routing issues
- [ ] Consistent naming across related categories
- [ ] Mobile view looks good
- [ ] No CSV parsing errors in console

## 🐛 Troubleshooting

### Issue: Changes not appearing

**Solution**: Restart the dev server
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Issue: CSV parsing error

**Solution**: Check for:
- Unescaped quotes in descriptions
- Missing commas
- Extra commas
- Line breaks within fields

### Issue: Breadcrumbs not updating

**Solution**: 
- Check `breadcrumb_label` field (column 7)
- Clear browser cache
- Hard refresh (Cmd+Shift+R)

### Issue: SEO title too long

**Solution**:
- Keep under 60 characters total
- Include " | The Equestrian" in count
- Use shorter synonyms

## 📚 Related Files

### Code Files (Reference Only - No Changes Needed)

- `lib/content/collections.ts` - Loads CSV data
- `app/[category]/page.tsx` - Category page component
- `app/[category]/[subcategory]/page.tsx` - Subcategory page
- `components/CollectionBreadcrumbs.tsx` - Breadcrumb component

### Where Titles Are Used

1. **H1 Title** (`h1_title`):
   - `app/[category]/page.tsx` line 227
   - Main `<h1>` element on page

2. **Meta Title** (`meta_title`):
   - `app/[category]/page.tsx` line 290
   - `<title>` tag, OpenGraph, Twitter cards

3. **Breadcrumb Label** (`breadcrumb_label`):
   - `components/CollectionBreadcrumbs.tsx` line 32-38
   - Navigation breadcrumbs

## 🎓 Examples from Current Site

### Well-Formatted Titles

```csv
/clothing/womens,Womens & Ladies Clothing,Ladies Clothing | Buy Online | The Equestrian,...,Ladies & Women,/clothing,2,...
```

**Analysis**:
- ✅ H1: "Womens & Ladies Clothing" (clear, descriptive)
- ✅ Meta: "Ladies Clothing | Buy Online | The Equestrian" (includes CTA)
- ✅ Breadcrumb: "Ladies & Women" (concise)

### Titles That Could Be Improved

```csv
/horse/boots/bell-boots,Bell Boots,Bell Boots | Premium Quality | The Equestrian,...,Bell Boots,/horse/boots,3,...
```

**Suggested Improvement**:
```csv
/horse/boots/bell-boots,Horse Bell Boots & Overreach Boots,Horse Bell Boots | The Equestrian,...,Bell Boots,/horse/boots,3,...
```

**Why Better**:
- More descriptive H1 with alternate term
- Cleaner meta title
- Breadcrumb stays concise

## 💼 When to Update Titles

### Good Times to Update:
- ✅ Rebranding or messaging changes
- ✅ SEO optimization campaigns
- ✅ Improving clarity for customers
- ✅ Adding specificity (e.g., "Boots" → "Horse Boots")
- ✅ A/B testing different messaging

### Be Cautious About:
- ⚠️ Changing well-ranking pages (check Google Search Console first)
- ⚠️ Updating during peak sales periods
- ⚠️ Making changes without tracking impact

## 🔗 Additional Resources

- [GitHub Issue #7](https://github.com/optizenapp/theequestrian/issues/7) - Original issue
- [Google's Title Tag Guidelines](https://developers.google.com/search/docs/appearance/title-link)
- [Moz: Title Tag Best Practices](https://moz.com/learn/seo/title-tag)

## 📞 Need Help?

If you need to:
- **Add completely new categories** → See `exports/MAPPING-TEMPLATE.md`
- **Change URL structure** → Requires code changes (create new issue)
- **Bulk update many titles** → Consider creating a script (see Bulk Updates section)
- **Technical issues** → Check troubleshooting section or create GitHub issue

---

**Last Updated**: January 2026  
**Maintained By**: The Equestrian Development Team
