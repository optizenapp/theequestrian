# Issue #7: Update Category and Subcategory Titles via CSV

**Status**: ✅ Ready to Work On  
**Issue**: https://github.com/optizenapp/theequestrian/issues/7  
**Type**: Content Management / CSV Update

## 🎯 What This Issue Is About

This issue provides the tools and documentation to update category and subcategory display titles throughout the headless storefront by editing a CSV file. No code changes required!

## 📚 Documentation Created

### 1. **Full Guide** (Comprehensive)
📄 `docs/UPDATING-CATEGORY-TITLES.md`

**What's inside:**
- Complete CSV structure explanation
- Step-by-step update instructions
- Best practices for title formatting
- SEO guidelines
- Common scenarios and examples
- Troubleshooting guide
- 50+ examples

**Use when:** You need detailed information or are updating titles for the first time.

### 2. **Quick Reference** (Cheat Sheet)
📄 `docs/TITLE-UPDATE-QUICK-REFERENCE.md`

**What's inside:**
- One-page quick reference
- Essential commands
- Common fixes
- Length guidelines
- Pro tips

**Use when:** You know what you're doing and just need a quick reminder.

## 🛠️ Tools Created

### Preview & Validation Script
📄 `scripts/preview-titles.ts`

**Commands:**

```bash
# Show all category titles
npm run preview-titles

# Show only horse category
npm run preview-titles -- --category=horse

# Show only top-level categories (level 1)
npm run preview-titles -- --level=1

# Show only subcategories (level 2)
npm run preview-titles -- --level=2

# Validate all titles for issues
npm run preview-titles -- --validate

# Combine filters
npm run preview-titles -- --category=horse --level=2

# Get help
npm run preview-titles -- --help
```

**What it does:**
- ✅ Preview current titles
- ✅ Filter by category or level
- ✅ Validate title lengths
- ✅ Check for SEO issues
- ✅ Provide suggestions
- ✅ Generate reports

## 🚀 Quick Start Guide

### Step 1: Preview Current Titles

```bash
# See all top-level categories
npm run preview-titles -- --level=1
```

**Output:**
```
📁 /horse
   H1 Title:     Horse
   Meta Title:   Horse | The Equestrian (22 chars)
   Breadcrumb:   Horse
   Level:        1
   Status:       published
```

### Step 2: Check for Issues

```bash
# Validate all titles
npm run preview-titles -- --validate
```

**Output:**
```
⚠️  Found 5 potential issues:

📍 /horse
   ⚠️  meta_description: Meta description too short (<120 chars)
      Current: "Shop Horse products at The Equestrian..."
      💡 Expand to 150-160 characters for better SEO
```

### Step 3: Edit the CSV

```bash
# Open in your editor
code exports/collection-content.csv
```

**Find the row** for your category (e.g., `/horse`)

**Update these columns:**
- Column 2: `h1_title` - Main heading
- Column 3: `meta_title` - SEO title
- Column 7: `breadcrumb_label` - Breadcrumb text

**Example change:**
```csv
# Before
/horse,Horse,Horse | The Equestrian,...,Horse,,1,...

# After
/horse,Premium Horse Products,Premium Horse Products | The Equestrian,...,Horse Products,,1,...
```

### Step 4: Validate Your Changes

```bash
# Check your specific category
npm run preview-titles -- --category=horse --validate
```

### Step 5: Test in Browser

```bash
# Restart dev server
npm run dev

# Visit your category
# http://localhost:3001/horse
```

**Check:**
- ✅ H1 title displays correctly
- ✅ Browser tab shows new meta title
- ✅ Breadcrumbs show new label
- ✅ No console errors

## 📊 Current State

### Total Categories: 238

**Breakdown:**
- Level 1 (Top Categories): 5
  - `/horse` - Horse
  - `/rider` - Rider
  - `/clothing` - Clothing
  - `/pet` - Pet
  - `/accessories` - Accessories

- Level 2 (Subcategories): ~50
  - Example: `/horse/boots` - Horse Boots
  - Example: `/clothing/womens` - Ladies Clothing

- Level 3 (Sub-subcategories): ~183
  - Example: `/clothing/womens/breeches` - Jodhpurs & Breeches Ladies

### Known Issues (from validation)

Run `npm run preview-titles -- --validate` to see current issues:
- Meta descriptions too short on top-level categories
- Some breadcrumb labels could be shortened
- Some H1 titles could be more descriptive

## 💡 Common Update Scenarios

### Scenario 1: Make a Category More Descriptive

**Goal:** Change "Horse" to "Premium Horse Products"

```bash
# 1. Preview current state
npm run preview-titles -- --category=horse --level=1

# 2. Edit CSV
code exports/collection-content.csv
# Change: /horse,Horse,... → /horse,Premium Horse Products,...

# 3. Validate
npm run preview-titles -- --category=horse --validate

# 4. Test
npm run dev
```

### Scenario 2: Improve SEO for a Category

**Goal:** Better meta titles and descriptions

```bash
# 1. Check current SEO
npm run preview-titles -- --category=clothing --validate

# 2. Edit CSV - update meta_title and meta_description columns

# 3. Validate length
npm run preview-titles -- --category=clothing --validate

# 4. Test
npm run dev
```

### Scenario 3: Shorten Long Breadcrumbs

**Goal:** Make breadcrumbs more concise

```bash
# 1. Find long breadcrumbs
npm run preview-titles -- --validate | grep "breadcrumb"

# 2. Edit CSV - update breadcrumb_label column

# 3. Verify
npm run preview-titles -- --category=your-category
```

## 📏 Title Guidelines Summary

| Field | Ideal Length | Purpose |
|-------|--------------|---------|
| **h1_title** | 2-8 words (~60 chars) | Main page heading |
| **meta_title** | 50-60 chars | SEO, browser tab |
| **breadcrumb_label** | 1-3 words (~30 chars) | Navigation |
| **meta_description** | 150-160 chars | SEO snippet |

## ⚠️ Important Rules

### ✅ DO Update These:
- `h1_title` (Column 2)
- `meta_title` (Column 3)
- `meta_description` (Column 4)
- `short_description` (Column 5)
- `breadcrumb_label` (Column 7)

### ❌ DON'T Change These:
- `url_path` (Column 1) - Breaks routing
- `parent_url` (Column 8) - Breaks hierarchy
- `category_level` (Column 9) - Breaks structure

## 🔄 Workflow Checklist

- [ ] Preview current titles: `npm run preview-titles`
- [ ] Check for issues: `npm run preview-titles -- --validate`
- [ ] Make backup: `cp exports/collection-content.csv exports/collection-content.backup.csv`
- [ ] Edit CSV file
- [ ] Validate changes: `npm run preview-titles -- --validate`
- [ ] Restart server: `npm run dev`
- [ ] Test in browser
- [ ] Check H1, meta title, breadcrumbs
- [ ] Verify mobile view
- [ ] Commit changes

## 📁 Files Involved

### Files You Edit:
- `exports/collection-content.csv` - The main content file

### Files You Use (No Edits):
- `scripts/preview-titles.ts` - Preview/validation tool
- `docs/UPDATING-CATEGORY-TITLES.md` - Full documentation
- `docs/TITLE-UPDATE-QUICK-REFERENCE.md` - Quick reference

### Files That Use This Data (Reference Only):
- `lib/content/collections.ts` - Loads CSV data
- `app/[category]/page.tsx` - Category pages
- `app/[category]/[subcategory]/page.tsx` - Subcategory pages
- `components/CollectionBreadcrumbs.tsx` - Breadcrumb display

## 🎓 Learning Resources

### Start Here:
1. Read: `docs/TITLE-UPDATE-QUICK-REFERENCE.md` (5 min)
2. Run: `npm run preview-titles -- --level=1` (see examples)
3. Run: `npm run preview-titles -- --validate` (see issues)

### Go Deeper:
4. Read: `docs/UPDATING-CATEGORY-TITLES.md` (15 min)
5. Try: Update one category as practice
6. Review: Check your changes in browser

## 🐛 Troubleshooting

### Changes not showing?
```bash
# Restart the dev server
# Press Ctrl+C to stop, then:
npm run dev
```

### CSV parsing error?
```bash
# Check for common issues:
# - Unescaped quotes
# - Missing commas
# - Extra line breaks

# Restore backup if needed:
cp exports/collection-content.backup.csv exports/collection-content.csv
```

### Validation errors?
```bash
# See specific issues:
npm run preview-titles -- --category=your-category --validate

# Common fixes:
# - Shorten meta_title to <60 chars
# - Expand meta_description to 150-160 chars
# - Shorten breadcrumb_label to <30 chars
```

## 📞 Need Help?

1. **Check documentation**: `docs/UPDATING-CATEGORY-TITLES.md`
2. **Run validation**: `npm run preview-titles -- --validate`
3. **Check examples**: `docs/TITLE-UPDATE-QUICK-REFERENCE.md`
4. **Create GitHub issue**: If you find a bug or need a feature

## ✨ What's Next?

After mastering title updates, you might want to:
- Update meta descriptions for better SEO
- Add FAQ sections to categories
- Update long descriptions with rich content
- Add related category links

See the full CSV structure in the documentation for more advanced content management.

---

**Ready to start?** Run `npm run preview-titles -- --help` to see all options!

**Quick test:** `npm run preview-titles -- --category=horse --validate`
