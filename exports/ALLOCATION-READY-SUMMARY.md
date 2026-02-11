# Product Allocation - Ready for Testing

## ✅ Completed Phases

### Phase 1: CSV Preparation & Validation ✓
- **Merged CSVs**: Combined backup (4,750) + final (5,383) = **10,133 unique products**
- **Validation**: 
  - Valid categories: 10,120 products
  - Missing cat_slug: 2 products (test/shipping items)
  - Invalid cat_slug: 11 products (`/clothing/mens/show-jackets` - category doesn't exist)
- **Files Created**:
  - `exports/ai-classified-products-gpt-4o-2026-02-10-FINAL.csv`
  - `exports/classification-validation-report.txt`
  - `exports/category-validation-report.txt`

### Phase 2: Allocation Script Development ✓
- **Script Created**: `scripts/apply-product-allocations.ts`
- **Features**:
  - ✅ Dry-run mode with preview export
  - ✅ Canonical URL management (deepest hop)
  - ✅ Parent category rendering (automatic via path parsing)
  - ✅ Brand page assignment support
  - ✅ 301 redirect generation for URL changes
  - ✅ Transactional database operations
  - ✅ Batch processing for performance
- **Dry-Run Results**:
  - Success: 10,120 products
  - Skipped: 13 products (invalid/missing categories)
  - Redirects needed: 3,908 URLs
- **Files Created**:
  - `scripts/apply-product-allocations.ts`
  - `scripts/merge-classification-csvs.ts`
  - `scripts/validate-category-slugs.ts`
  - `exports/allocation-preview.csv`

### Phase 3: Scripts & Tools ✓
- **NPM Scripts Added**:
  ```bash
  npm run ai:merge-csvs           # Merge & deduplicate CSVs
  npm run ai:validate-categories  # Validate against DB
  npm run ai:allocate-products    # Apply allocations
  ```

---

## 📋 Next Steps (Requires User Action)

### Phase 3: jono-dev Testing Environment

#### Step 1: Sync jono-dev with main
```bash
# Pull latest main
git checkout main
git pull origin main

# Merge to jono-dev
git checkout jono-dev
git merge main
git push origin jono-dev
```

#### Step 2: Sync Database (if using Neon branching)
```bash
# Option A: Neon branch reset (recommended)
psql 'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-square-dawn-a7cjzpyx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' \
  -c "SELECT neon.branch_reset('jono-dev', 'main');"

# Option B: Manual sync (if branch reset not available)
# 1. Backup current jono-dev data
# 2. Restore from main snapshot
```

#### Step 3: Run Allocation on jono-dev
```bash
# Review the preview first
cat exports/allocation-preview.csv

# Apply to jono-dev database
npm run ai:allocate-products -- --branch=jono-dev
```

**Expected Results:**
- 10,120 products allocated to categories
- 3,908 redirects created
- All products have canonical URLs

#### Step 4: Verification Checks

**A. Product Count Verification**
```sql
-- Check total assignments
SELECT COUNT(*) FROM product_category_assignments;
-- Expected: 10,120

-- Check canonical assignments
SELECT COUNT(*) FROM product_category_assignments WHERE canonical_path IS NOT NULL;
-- Expected: 10,120
```

**B. Canonical URL Spot Checks**
- Sample 20 random products
- Verify canonical URL = `/category/subcategory/sub-subcategory/product-handle`
- Check product renders at canonical path
- Verify product also renders at parent paths

**C. Redirect Validation**
```sql
-- Check redirects created
SELECT COUNT(*) FROM manual_redirects WHERE source = 'ai-classification';
-- Expected: 3,908

-- Sample redirects
SELECT from_path, to_path FROM manual_redirects WHERE source = 'ai-classification' LIMIT 20;
```

Test sample redirects:
- Old URL should 301 → New canonical URL
- No redirect loops
- All redirects resolve correctly

**D. Category Page Rendering**
- Check 10 random category pages (L1, L2, L3)
- Verify products appear correctly
- Test pagination
- Test filtering/sorting

**E. Brand Page Checks** (if applicable)
- Verify products with `suggested_brand_handles` appear on brand pages
- Confirm brand page URLs are non-canonical

---

## 🚨 Issues to Address Before Production

### 1. Invalid Category Slug
**Issue**: 11 products assigned to `/clothing/mens/show-jackets` (category doesn't exist)

**Options**:
- A. Create the missing category in `collection_content` table
- B. Manually reclassify these 11 products to a valid category
- C. Skip these products (they'll remain unallocated)

**Products Affected**: See `exports/category-validation-report.txt`

### 2. Missing cat_slug
**Issue**: 2 products have no `cat_slug` (likely test/shipping products)

**Products**:
- `sticky` | Sticky
- `shipping` | Shipping

**Action**: Exclude from allocation (already skipped by script)

---

## 📊 Allocation Statistics

| Metric | Count |
|--------|-------|
| Total Products | 10,133 |
| Successfully Allocated | 10,120 |
| Skipped (Invalid/Missing) | 13 |
| Redirects Created | 3,908 |
| Categories Used | 299 |
| Products Needing Manual Review | 50 (confidence < 70) |

---

## 🔄 Rollback Plan

If issues are found in jono-dev:

### Option 1: Database Rollback
```sql
-- Backup before allocation
SELECT * FROM product_category_assignments INTO TEMP TABLE pca_backup;

-- Rollback if needed
TRUNCATE product_category_assignments;
INSERT INTO product_category_assignments SELECT * FROM pca_backup;
```

### Option 2: Re-run from Backup
```bash
# The script is idempotent - can be re-run safely
npm run ai:allocate-products -- --branch=jono-dev
```

---

## 🚀 Production Deployment (After jono-dev Approval)

### Step 1: Merge to main
```bash
git checkout main
git merge jono-dev
git push origin main
```

### Step 2: Run Allocation on Production
```bash
npm run ai:allocate-products -- --branch=main
```

### Step 3: Post-Deployment
1. Smoke test 20 random product URLs
2. Verify redirects working
3. Regenerate sitemap
4. Submit to Google Search Console
5. Monitor for 404 errors (next 24-48h)

---

## 📁 Files Generated

| File | Purpose | Location |
|------|---------|----------|
| Final Classifications | Merged & deduplicated products | `exports/ai-classified-products-gpt-4o-2026-02-10-FINAL.csv` |
| Allocation Preview | Dry-run results | `exports/allocation-preview.csv` |
| Validation Report | Category validation results | `exports/category-validation-report.txt` |
| Classification Report | Merge statistics | `exports/classification-validation-report.txt` |

---

## ⚠️ Important Notes

1. **Canonical URLs**: The script enforces "deepest hop" rule - canonical is always the most specific category path
2. **Parent Rendering**: Products automatically render on parent category pages (handled by existing logic)
3. **Brand Pages**: Products with `suggested_brand_handles` are assigned to brand pages (non-canonical)
4. **Redirects**: All URL changes generate 301 redirects to preserve SEO
5. **Idempotent**: The script can be safely re-run - it will clear and recreate assignments

---

## 🎯 Success Criteria

- [ ] All 10,120 products allocated to correct categories
- [ ] Canonical URLs follow deepest hop rule
- [ ] Products render on canonical + parent category pages
- [ ] 3,908 redirects working correctly
- [ ] No 404 errors
- [ ] Category pages show correct product counts
- [ ] Brand page assignments working (if applicable)
- [ ] Site search still functional
- [ ] Sitemap updated with new URLs

---

**Status**: ✅ Ready for jono-dev testing
**Next Action**: User to sync jono-dev and run allocation
**Estimated Time**: 1-2 hours for testing + verification
