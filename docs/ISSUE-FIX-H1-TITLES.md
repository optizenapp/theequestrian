# Fix H1 Titles in Collection CSV

**Related to**: [Issue #7 - Update Category and Subcategory Titles via CSV](https://github.com/optizenapp/theequestrian/issues/7)  
**Type**: Content Management / Automation  
**Priority**: Medium  
**Effort**: 2-3 hours

---

## Problem

Many category titles in `exports/collection-content.csv` have problematic formatting:

### Issues Found:
1. **Redundant prefixes**: `FOOTWEAR: Equestrian Footwear`, `RUGS: Winter Rugs`, `SADDLES: Dressage Saddles`
2. **Verbose prefixes**: `Clothing - Kid's Clothing`, `Clothing - Men's Clothing`
3. **Inconsistent formatting**: Mix of ALL CAPS prefixes and normal text
4. **Redundant words**: Category name repeated in title

### Examples:
| URL Path | Current Title (Bad) | Should Be |
|----------|---------------------|-----------|
| `/clothing/kids` | `Clothing - Kid's Clothing` | `Kids Clothing` |
| `/clothing/footwear` | `FOOTWEAR: Equestrian Footwear` | `Footwear` |
| `/horse/rugs/summer` | `RUGS: Summer Rugs, Neck Rugs & Hoods` | `Summer Rugs` |
| `/horse/saddles/dressage` | `SADDLES: Dressage Saddles` | `Dressage Saddles` |
| `/clothing/footwear/western` | `FOOTWEAR: Western & Roper Boots` | `Western & Roper Boots` |

**Total affected**: ~12 categories (out of 238)

---

## Solution

Create an automated script that:
1. Reads `exports/collection-content.csv`
2. Fixes h1_title column by deriving proper titles from URL slugs
3. Removes problematic prefixes intelligently
4. Applies Title Case formatting
5. Creates backup before making changes
6. Shows preview of changes before applying

---

## Title Transformation Rules

### 1. Extract from URL Path
- Use the URL slug to determine the proper title
- Add context from parent categories when needed
- Examples:
  - `/clothing/kids` → "Kids Clothing"
  - `/horse/rugs/summer` → "Summer Rugs"
  - `/clothing/footwear` → "Footwear"

### 2. Smart Prefix Removal
Remove these prefixes:
- `FOOTWEAR:`
- `RUGS:`
- `SADDLES:`
- `CLOTHING -`
- `RIDER:`
- `STABLE:`
- `HORSE:`

**Smart cleaning logic**:
- `FOOTWEAR: Equestrian Footwear` → `Footwear` (remove redundant)
- `RUGS: Winter Rugs, Neck Rugs & Hoods` → `Winter Rugs` (keep descriptive part)
- `Clothing - Kid's Clothing` → `Kids Clothing` (remove prefix, fix possessive)

### 3. Title Case Formatting
- Capitalize each significant word
- Keep lowercase: "and", "or", "of", "&" (except when first word)
- Examples:
  - "kids clothing" → "Kids Clothing"
  - "western & roper boots" → "Western & Roper Boots"

---

## Implementation Plan

### 1. Create Script: `scripts/fix-h1-titles.ts`

**Key functions**:
```typescript
// Generate title from URL path
function generateH1FromUrl(urlPath: string): string

// Remove problematic prefixes
function cleanExistingTitle(currentTitle: string): string

// Determine if title needs fixing
function shouldUpdateTitle(urlPath: string, currentTitle: string): boolean

// Convert to Title Case
function toTitleCase(text: string): string
```

**Features**:
- Dry run mode (preview changes)
- Automatic backup creation
- Validation (no empty titles)
- Detailed change report
- Selective updates (only fix problematic titles)

### 2. Add NPM Command

Update `package.json`:
```json
"fix-h1-titles": "tsx scripts/fix-h1-titles.ts"
```

### 3. Usage

```bash
# Preview changes (dry run)
npm run fix-h1-titles -- --dry-run

# Apply changes with backup
npm run fix-h1-titles

# Apply without confirmation
npm run fix-h1-titles -- --yes
```

---

## Expected Changes

Based on current CSV analysis:

### Titles to Fix (~12 total):

**Clothing Category**:
- `/clothing/kids`: `Clothing - Kid's Clothing` → `Kids Clothing`
- `/clothing/mens`: `Clothing - Men's Clothing` → `Mens Clothing`
- `/clothing/accessories`: `Clothing - Clothing Accessories` → `Clothing Accessories`

**Footwear Category**:
- `/clothing/footwear`: `FOOTWEAR: Equestrian Footwear` → `Footwear`
- `/clothing/footwear/western`: `FOOTWEAR: Western & Roper Boots` → `Western & Roper Boots`
- `/clothing/footwear/casual`: `FOOTWEAR: Casual Footwear` → `Casual Footwear`

**Horse Rugs**:
- `/horse/rugs/summer`: `RUGS: Summer Rugs, Neck Rugs & Hoods` → `Summer Rugs`
- `/horse/rugs/winter`: `RUGS: Winter Rugs, Neck Rugs & Hoods` → `Winter Rugs`
- `/horse/rugs/accessories`: `RUGS: Rug Accessories` → `Rug Accessories`

**Horse Saddles**:
- `/horse/saddles/dressage`: `SADDLES: Dressage Saddles` → `Dressage Saddles`
- `/horse/saddles/accessories`: `SADDLES: Saddle Accessories & Gullets` → `Saddle Accessories & Gullets`
- `/horse/saddles/all-purpose`: `SADDLES: All Purpose Saddles` → `All Purpose Saddles`
- `/horse/saddles/jumping`: `SADDLES: Jumping Saddles` → `Jumping Saddles`
- `/horse/saddles/stock-western`: `SADDLES: Stock & Western Saddles` → `Stock & Western Saddles`

---

## Safety Features

1. **Automatic Backup**: Creates `exports/collection-content.backup.csv` before any changes
2. **Dry Run Mode**: Preview all changes without modifying the file
3. **Validation**: Ensures no titles become empty or invalid
4. **Selective Updates**: Only modifies titles that match problematic patterns
5. **Change Report**: Shows exactly what will change before applying
6. **Confirmation Prompt**: Asks for user confirmation before writing changes

---

## Testing Plan

### 1. Before Running Script
```bash
# Check current state
npm run preview-titles -- --validate
```

### 2. Run Script
```bash
# Preview changes first
npm run fix-h1-titles -- --dry-run

# Apply changes
npm run fix-h1-titles
```

### 3. Verify Changes
```bash
# Validate updated titles
npm run preview-titles -- --validate

# Check specific categories
npm run preview-titles -- --category=clothing
npm run preview-titles -- --category=horse
```

### 4. Test in Browser
```bash
# Restart dev server
npm run dev

# Visit affected pages:
# - http://localhost:3001/clothing/kids
# - http://localhost:3001/clothing/footwear
# - http://localhost:3001/horse/rugs/summer
# - http://localhost:3001/horse/saddles/dressage
```

### 5. Verify Display
Check that:
- [ ] H1 titles display correctly on pages
- [ ] Breadcrumbs still work
- [ ] No console errors
- [ ] Titles are properly formatted (Title Case)
- [ ] No empty or missing titles

---

## Acceptance Criteria

- [ ] Script created: `scripts/fix-h1-titles.ts`
- [ ] NPM command added: `npm run fix-h1-titles`
- [ ] All 12+ problematic titles are fixed
- [ ] Titles follow URL slug context (e.g., "Kids Clothing" not just "Kids")
- [ ] All prefixes removed (`FOOTWEAR:`, `RUGS:`, `SADDLES:`, `Clothing -`)
- [ ] Title Case formatting applied consistently
- [ ] Backup created automatically before changes
- [ ] Dry run mode works correctly
- [ ] Change report is clear and accurate
- [ ] No titles become empty or invalid
- [ ] Validation passes after changes
- [ ] All affected pages display correctly in browser
- [ ] Documentation updated (if needed)

---

## Files to Create/Modify

### Create:
- `scripts/fix-h1-titles.ts` - Main script (~200-250 lines)

### Modify:
- `package.json` - Add npm command
- `exports/collection-content.csv` - Update h1_title column (12+ rows)

### Auto-generated:
- `exports/collection-content.backup.csv` - Backup before changes

---

## Dependencies

**Existing tools**:
- `csv-parse` - Already installed for CSV reading
- `csv-stringify` - Already installed for CSV writing
- `tsx` - Already installed for running TypeScript

**No new dependencies needed!**

---

## Future Enhancements

After this script is working, we can create similar scripts for:
- [ ] Fix `meta_title` column (Issue to be created)
- [ ] Fix `breadcrumb_label` column (Issue to be created)
- [ ] Expand `meta_description` column (Issue to be created)
- [ ] Bulk update multiple columns at once (Issue to be created)

---

## Related Issues

- **Issue #7**: Update Category and Subcategory Titles via CSV (parent issue)
- Documentation already exists in `docs/UPDATING-CATEGORY-TITLES.md`
- Preview tool already exists: `npm run preview-titles`

---

## Estimated Time

- **Script Development**: 1-2 hours
- **Testing**: 30 minutes
- **Documentation**: 15 minutes
- **Total**: 2-3 hours

---

## Priority Justification

**Medium Priority** because:
- Affects user-facing content (H1 titles on category pages)
- Improves SEO (cleaner, more relevant titles)
- Enhances brand consistency
- Not urgent (current titles work, just not optimal)
- Foundation for future column-fixing scripts

---

## Notes

- This script only updates the `h1_title` column
- Other columns (meta_title, descriptions) will be handled by separate scripts
- The script is non-destructive (creates backup first)
- Can be run multiple times safely (idempotent)
- Changes can be reverted from backup if needed

---

## Example Script Output

```
📊 Analyzing collection-content.csv...
   Total categories: 238

🔍 Found 12 titles that need fixing:

  1. /clothing/kids
     Current: "Clothing - Kid's Clothing"
     New:     "Kids Clothing"
     
  2. /clothing/footwear
     Current: "FOOTWEAR: Equestrian Footwear"
     New:     "Footwear"
     
  3. /horse/rugs/summer
     Current: "RUGS: Summer Rugs, Neck Rugs & Hoods"
     New:     "Summer Rugs"
     
  ... (9 more)

📊 Summary:
   ✅ 12 titles will be updated
   ✅ 226 titles are already correct
   
💾 Backup will be created: exports/collection-content.backup.csv

Apply changes? (y/n): _
```

---

## How to Create This GitHub Issue

1. Go to: https://github.com/optizenapp/theequestrian/issues/new
2. Copy the content from this file
3. Set labels: `content-management`, `automation`, `enhancement`
4. Link to Issue #7 in the description
5. Add to Project: https://github.com/users/optizenapp/projects/4

---

**Ready to implement!** This is a well-scoped task with clear requirements and safety measures.
