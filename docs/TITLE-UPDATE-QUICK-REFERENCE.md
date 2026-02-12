# Category Title Updates - Quick Reference Card

## 🎯 File to Edit
```
exports/collection-content.csv
```

## 📝 What to Update

| Field | Column # | What It Does | Max Length |
|-------|----------|--------------|------------|
| `h1_title` | 2 | Main heading on page | ~60 chars |
| `meta_title` | 3 | Browser tab & SEO | 50-60 chars |
| `breadcrumb_label` | 7 | Navigation breadcrumbs | ~30 chars |

## ⚠️ DO NOT Change

- `url_path` (Column 1) - Breaks routing
- `parent_url` (Column 8) - Breaks hierarchy  
- `category_level` (Column 9) - Breaks structure

## 🚀 Quick Workflow

1. **Open CSV**
   ```bash
   code exports/collection-content.csv
   ```

2. **Find & Edit** your category row
   - Update columns 2, 3, and 7
   - Keep URLs unchanged

3. **Preview Changes**
   ```bash
   npm run preview-titles -- --validate
   ```

4. **Restart Server**
   ```bash
   npm run dev
   ```

5. **Test**
   - Visit: `https://www.theequestrian.com.au/your-category`
   - Check: H1, browser tab, breadcrumbs

## 💡 Title Format Examples

### Good Examples ✅
```
H1:         "Premium Horse Boots & Leg Protection"
Meta:       "Horse Boots | The Equestrian"
Breadcrumb: "Boots"
```

### Bad Examples ❌
```
H1:         "Boots" (too vague)
Meta:       "The Ultimate Premium Horse Boots Collection..." (too long)
Breadcrumb: "Premium Horse Boots & Leg Protection" (too long)
```

## 🛠️ Helpful Commands

```bash
# Preview all titles
npm run preview-titles

# Preview specific category
npm run preview-titles -- --category=horse

# Preview only top-level categories
npm run preview-titles -- --level=1

# Validate all titles for issues
npm run preview-titles -- --validate

# Help
npm run preview-titles -- --help
```

## 📏 Length Guidelines

| Field | Ideal Length | Why |
|-------|--------------|-----|
| H1 | 2-8 words | Readability |
| Meta Title | 50-60 chars | Google truncates at ~60 |
| Breadcrumb | 1-3 words | Navigation space |
| Meta Description | 150-160 chars | Google snippet length |

## 🔍 Common Issues & Fixes

### Issue: Meta title too long
```csv
# Before (78 chars)
Premium High-Quality Horse Boots and Protection Equipment | The Equestrian

# After (48 chars)
Horse Boots & Protection | The Equestrian
```

### Issue: Breadcrumb too long
```csv
# Before
Premium Horse Boots & Leg Protection

# After
Boots
```

### Issue: H1 too generic
```csv
# Before
Boots

# After
Horse Boots & Leg Protection
```

## 📊 CSV Column Order

```
1.  url_path              ← DON'T CHANGE
2.  h1_title              ← UPDATE THIS
3.  meta_title            ← UPDATE THIS
4.  meta_description      ← Optional
5.  short_description     ← Optional
6.  long_description      ← Optional
7.  breadcrumb_label      ← UPDATE THIS
8.  parent_url            ← DON'T CHANGE
9.  category_level        ← DON'T CHANGE
10. status
11. default_sort
12. faq_json
13. related_categories_json
```

## 🎨 Title Style Guide

### H1 Titles
- Descriptive & keyword-rich
- Natural language
- Include category context
- Example: "Ladies Riding Breeches & Jodhpurs"

### Meta Titles
- Always end with "| The Equestrian"
- Front-load keywords
- Under 60 characters
- Example: "Riding Breeches | The Equestrian"

### Breadcrumbs
- Short & clear
- 1-3 words max
- No adjectives
- Example: "Breeches"

## ⚡ Pro Tips

1. **Make a backup first**
   ```bash
   cp exports/collection-content.csv exports/collection-content.backup.csv
   ```

2. **Use find/replace carefully**
   - Test on one row first
   - Be specific with patterns

3. **Check validation before committing**
   ```bash
   npm run preview-titles -- --validate
   ```

4. **Test on mobile too**
   - Long titles may wrap awkwardly

5. **Keep consistency**
   - Similar categories should have similar format

## 📞 Need More Help?

See full documentation: `docs/UPDATING-CATEGORY-TITLES.md`

---

**Quick Start**: Edit `exports/collection-content.csv` → Run `npm run preview-titles -- --validate` → Run `npm run dev` → Test!
