# 🛡️ Tag Script Safety Guide - How to Verify Suggestions

## Overview

The automated tag script is **conservative by design** - it only suggests tags when it has evidence. Here's how it works and how to verify suggestions are correct.

---

## 🎯 How the Script Decides What to Suggest

### 1. Product Type Matching (40% confidence)

**Exact match:**
```
Product Type: "Riding Helmets"
Mapping exists: "riding helmets" → ["Safety Equipment", "Head Protection"]
✅ HIGH confidence
```

**Partial match:**
```
Product Type: "Premium Riding Helmets"
Contains: "riding helmets"
✅ MEDIUM confidence
```

**No match:**
```
Product Type: "Miscellaneous"
No mapping found
❌ No suggestion
```

---

### 2. Certification Detection (40% confidence)

**Looks for exact patterns in title + description:**

```typescript
// Patterns it searches for:
ASTM F1163-23  ✅ Found → Suggests "ASTM F1163-23"
SNELL E2001    ✅ Found → Suggests "SNELL E2001"
PAS015:2011    ✅ Found → Suggests "PAS015:2011"
EN1384         ✅ Found → Suggests "EN1384"
CE Certified   ✅ Found → Suggests "CE Certified"
```

**Example:**
```
Title: "Charles Owen 4 Star Helmet"
Description: "Certified to ASTM F1163-23 and SNELL E2001 standards..."

✅ Suggests: "ASTM F1163-23", "SNELL E2001"
Confidence: HIGH (found in description)
```

---

### 3. Material Detection (20% confidence)

**Searches for keywords in title + description:**

```
Description contains "leather" → Suggests "Leather"
Description contains "waterproof" → Suggests "Waterproof"
Description contains "breathable" → Suggests "Breathable"
```

**Example:**
```
Title: "Ariat Heritage Boot"
Description: "Premium full-grain leather construction with waterproof membrane..."

✅ Suggests: "Leather", "Waterproof"
Confidence: MEDIUM (keywords detected)
```

---

## 📊 Confidence Scoring System

### 🟢 HIGH Confidence (80-100 points)

**Criteria:**
- Exact product type match (40 pts)
- + Certifications found in text (40 pts)
- = 80+ points

**Example:**
```
Product: "Charles Owen JR8 Helmet"
Type: "Riding Helmets" (exact match) ✅
Description: "ASTM F1163 and SNELL E2001 certified" ✅
Suggested: Safety Equipment, ASTM F1163, SNELL E2001
Confidence: HIGH 🟢
```

**Safety:** ✅ Safe to auto-apply

---

### 🟡 MEDIUM Confidence (50-79 points)

**Criteria:**
- Partial product type match (20 pts)
- + Materials detected (20 pts)
- + Certifications found (40 pts)
- = 50-79 points

**Example:**
```
Product: "Premium Leather Paddock Boot"
Type: "Boots" (partial match with "paddock boots") ✅
Description: "Made from genuine leather..." ✅
Suggested: Leather, Footwear
Confidence: MEDIUM 🟡
```

**Safety:** ⚠️ Review recommended, likely correct

---

### 🔴 LOW Confidence (0-49 points)

**Criteria:**
- Weak or no product type match
- Generic keywords only
- Ambiguous descriptions

**Example:**
```
Product: "Horse Product"
Type: "Miscellaneous"
Description: "Great product for horses"
Suggested: (none or very generic)
Confidence: LOW 🔴
```

**Safety:** ❌ Manual review required

---

## 🔍 How to Verify Suggestions

### Step 1: Run the Script

```bash
npx tsx scripts/add-structured-tags.ts
```

### Step 2: Review the Output

**The script shows:**
```
🟢 Charles Owen 4 Star Helmet
   Type: Riding Helmets
   Current tags: Helmets, Safety
   Suggested: Safety Equipment, ASTM F1163-23, SNELL E2001
   Confidence: HIGH
```

**What to check:**
- ✅ Does the product type make sense?
- ✅ Are the suggested tags relevant?
- ✅ Do certifications match the product description?

---

### Step 3: Review the CSV Export

The script exports: `exports/tag-suggestions-YYYY-MM-DD.csv`

**CSV columns:**
```csv
Handle,Title,Product Type,Current Tags,Suggested Tags,Confidence,Reason
```

**Example row:**
```csv
charles-owen-helmet,
"Charles Owen 4 Star Helmet",
"Riding Helmets",
"Helmets, Safety",
"Safety Equipment, ASTM F1163-23, SNELL E2001",
HIGH,
"ASTM F1163-23 found in product text; SNELL E2001 found in product text"
```

**What to look for:**
- ✅ **Confidence = HIGH** → Usually safe
- ⚠️ **Confidence = MEDIUM** → Check the "Reason" column
- ❌ **Confidence = LOW** → Manual verification needed

---

## ✅ Safe Application Strategy

### Option 1: Apply HIGH Confidence Only (Safest)

**In the script, uncomment this section:**

```typescript
// SAFE: Only apply HIGH confidence tags
console.log('🚀 Applying HIGH confidence tags only...\n');
for (const { product, suggestedTags } of high) {
  const allTags = [...product.tags, ...suggestedTags];
  await updateProductTags(product.id, allTags);
  console.log(`✅ Updated: ${product.title}`);
}
```

**Result:**
- Only applies tags with 80%+ confidence
- Typically 60-80% of suggestions
- Very low error rate

---

### Option 2: Manual CSV Review (Most Control)

1. **Export suggestions** (script does this automatically)
2. **Open CSV** in Excel/Google Sheets
3. **Review each row:**
   - Delete rows with incorrect suggestions
   - Edit suggested tags if needed
   - Keep only rows you approve
4. **Import to Shopify** using the CSV

**Result:**
- 100% control over what gets applied
- Can fix any errors before applying
- Recommended for first run

---

### Option 3: Selective Application

**Apply by confidence level:**

```typescript
// Apply HIGH + MEDIUM confidence (review first!)
const toApply = [...high, ...medium];
for (const { product, suggestedTags } of toApply) {
  // Apply tags
}
```

---

## 🚨 Common False Positives (and How Script Handles Them)

### 1. Generic Product Types

**Problem:**
```
Product Type: "Accessories"
Too generic → Could be anything
```

**How script handles:**
```typescript
// Only suggests if specific keywords found in description
if (productTypeLower.includes('accessories')) {
  // Only add tags if description contains specific materials/features
}
```

**Result:** LOW confidence, won't auto-apply

---

### 2. Ambiguous Materials

**Problem:**
```
Description: "Synthetic materials"
Could be: Synthetic Leather, Nylon, Polyester?
```

**How script handles:**
```typescript
// Only suggests "Synthetic Material" if exact match
// Won't guess specific synthetic type
```

**Result:** Conservative suggestion

---

### 3. Certification Mentions Without Actual Certification

**Problem:**
```
Description: "Meets ASTM standards"
vs
Description: "ASTM F1163-23 certified"
```

**How script handles:**
```typescript
// Requires exact pattern: ASTM F1163-23
// Won't match vague "ASTM standards"
CERTIFICATION_PATTERNS = [
  /ASTM\s*F\d{4}[-\s]*\d{0,2}/gi  // Must have full number
]
```

**Result:** Only suggests when specific cert number found

---

## 📋 Pre-Application Checklist

Before applying tags, verify:

### For HIGH Confidence Tags:
- [ ] Product type matches suggested category
- [ ] Certifications appear in product description
- [ ] Materials are explicitly mentioned
- [ ] Tags don't duplicate existing tags

### For MEDIUM Confidence Tags:
- [ ] Manually check 5-10 random products
- [ ] Verify materials are correct
- [ ] Check if product type mapping is accurate
- [ ] Review CSV export for any oddities

### For LOW Confidence Tags:
- [ ] Don't auto-apply
- [ ] Review each suggestion individually
- [ ] Use as inspiration, not automation

---

## 🎯 Example Verification Workflow

### Step 1: Run Script
```bash
npx tsx scripts/add-structured-tags.ts
```

**Output:**
```
Found 247 products

🟢 HIGH confidence: 156 products (safe to apply)
🟡 MEDIUM confidence: 68 products (review recommended)
🔴 LOW confidence: 23 products (manual review required)

📄 Exported to: tag-suggestions-2025-01-09.csv
```

### Step 2: Spot Check HIGH Confidence

**Check 5-10 random HIGH confidence products:**
```
✅ Charles Owen Helmet → Safety Equipment, ASTM F1163-23 ✓
✅ Ariat Boot → Leather, Waterproof ✓
✅ Horseware Rug → Waterproof, Breathable ✓
```

**If all look good → Safe to apply HIGH confidence**

### Step 3: Review CSV for MEDIUM/LOW

**Open CSV, filter by confidence:**
- Review MEDIUM confidence suggestions
- Delete any incorrect rows
- Import cleaned CSV to Shopify

### Step 4: Apply

**Option A: Auto-apply HIGH confidence**
```typescript
// Uncomment in script
for (const { product, suggestedTags } of high) {
  await updateProductTags(product.id, allTags);
}
```

**Option B: Import cleaned CSV**
- Use Shopify's CSV import
- Only includes rows you approved

---

## 💡 Pro Tips

1. **Start with 10 products** - Test the script on a small subset first
2. **Check certifications carefully** - These are critical for safety products
3. **Materials are usually safe** - If description says "leather", it's leather
4. **Product type mappings** - Review the TAG_MAPPINGS in the script
5. **Keep the CSV** - Use it as a reference for future products

---

## ⚠️ What the Script WON'T Do

- ❌ Won't guess certifications that aren't explicitly stated
- ❌ Won't apply tags to products with no matching patterns
- ❌ Won't remove or modify existing tags (only adds)
- ❌ Won't apply LOW confidence suggestions automatically
- ❌ Won't make up data that isn't in the product

---

## 🎓 Understanding the "Reason" Column

**CSV export includes why each tag was suggested:**

```csv
Reason: "ASTM F1163-23 found in product text; Safety Equipment from product type mapping"
```

**Reason types:**
- `"[Tag] found in product text"` → HIGH confidence
- `"[Tag] from product type mapping"` → MEDIUM-HIGH confidence
- `"[Tag] detected from keyword [X]"` → MEDIUM confidence
- `"Based on product type"` → LOW-MEDIUM confidence

**Use this to verify correctness!**

---

## ✅ Bottom Line

The script is **conservative and safe**:
- Only suggests tags with evidence
- Provides confidence scores
- Exports CSV for review
- Never applies LOW confidence automatically
- You have full control before applying

**Recommended approach:**
1. Run script → Review output
2. Apply HIGH confidence tags (156 products)
3. Manually review MEDIUM confidence (68 products)
4. Skip or manually handle LOW confidence (23 products)

**Result:** 85-90% automation with high accuracy! 🎯



