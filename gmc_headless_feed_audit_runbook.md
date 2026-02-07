
# Headless Shopify → Google Merchant Center Feed Audit & Optimisation Runbook

## Purpose
This document provides a step-by-step execution framework for auditing and optimising a custom (headless) Shopify product feed submitted to Google Merchant Center (GMC). It is designed for automated agents or technical operators to prevent policy violations, avoid product disapprovals, and maximise visibility and ROAS.

This runbook assumes:
- Migration from standard Shopify feed → custom/headless feed
- Large SKU count increase due to variant-level syncing
- Direct control over feed generation logic

---

# Phase 1 — Critical Compliance Audit (Execute First)

## Goal
Prevent account suspension, mass disapprovals, and spam/duplicate signals.

These checks are mandatory before any optimisation work.

---

## Check 1 — Variant Grouping (item_group_id)

### Risk
If variants are not grouped correctly, Google flags duplicate products and “double serving”.

### Requirements
For every product family:
- Each variant must have a unique `id`
- All variants must share the same `item_group_id`

### Correct Example

id = 88921-red-m  
id = 88921-red-l  
id = 88921-blue-m  

item_group_id = 88921

### Fail Conditions
- Missing `item_group_id`
- Different group IDs per variant
- Parent ID reused as variant ID
- Variants treated as independent products

### Action
Audit 50 product families and confirm grouping consistency.

---

## Check 2 — Variant Image Accuracy

### Risk
Variant color mismatch causes disapprovals: Image does not match product.

### Requirements
Feed must use:
1. Variant image if available
2. Color-specific fallback image
3. Parent image only if no color variation exists

### Fail Conditions
- All variants use hero image regardless of color
- Color attribute does not match image
- Variant image field empty when variant has image

### Action
Compare color attribute vs image and flag mismatches.

---

## Check 3 — Variant Deep Link URLs

### Risk
Landing page mismatch damages quality score and conversion rate.

### Requirement
Feed URL must preselect variant:

/product/product-name?variant=VARIANT_ID

### Fail Conditions
- All variants link to base product URL
- Variant click loads wrong default selection
- URL parameter missing

### Action
Click variant links and confirm correct variant preloads.

---

## Check 4 — ID Stability

### Risk
Changing IDs resets product history and learning.

### Requirement
IDs must be:
- Stable across feed refreshes
- Deterministic
- Not regenerated hashes

### Action
Compare current vs previous feed snapshot and detect ID churn.

---

# Phase 2 — Merchant Center Diagnostics Scan

## Goal
Detect live policy and data quality failures.

### Action
Retrieve GMC Diagnostics report and disapproval counts.

### Flag Conditions
- Image mismatch surge
- Duplicate product warnings
- Landing page mismatch
- Structured data mismatch
- Invalid GTIN errors

---

# Phase 3 — Free Listings Optimisation

## Goal
Increase organic product visibility.

Execute only after Phase 1 passes.

---

## Title Construction Logic

Bad:
Cool T-Shirt

Good:
Brand + Title + Color + Size + Material

Example:
Nike Cool T-Shirt Navy Large Cotton

Build deterministic title concatenation logic without keyword stuffing.

---

## Google Product Category Mapping

Map internal product types to Google taxonomy IDs.

Do not rely on auto-categorisation.

Maintain a mapping table.

---

## Required Attribute Coverage

Ensure feed includes when applicable:

color  
size  
gender  
age_group  
material  
pattern  
brand  
gtin or mpn  

Flag missing attributes by category.

---

# Phase 4 — Paid Ads Performance Levers

## Custom Labels Strategy

custom_label_0 = price_tier  
custom_label_1 = margin_tier  
custom_label_2 = seasonality  
custom_label_3 = stock_pressure  
custom_label_4 = performance_bucket  

Example values:

under_50 | 50_to_100 | over_100  
high | medium | low  
summer | winter | evergreen  
high_stock | low_stock  
bestseller | slow_mover  

Populate programmatically and avoid blanks.

---

## GTIN Validation

If GTIN exists it must be valid.

Fail Conditions:
- Empty GTIN when available
- Fake placeholder GTINs
- Invalid format

Validate checksum and flag invalid codes.

---

# Phase 5 — Feed Sampling Audit Procedure

Extract a product family sample including:
- Parent
- Two variants

Fields required:

id  
item_group_id  
title  
link  
image_link  
color  
size  
material  
brand  
gtin  
custom_labels  
price  
availability  

Run validation rules before full feed approval.

---

# Phase 6 — Technical Source Verification

Record:

Feed generation method  
ID source  
Update frequency  

Flag unstable pipelines.

---

# Pass / Fail Gate

## Feed is SAFE if:
- Variant grouping correct
- Variant images correct
- Variant URLs deep link correctly
- IDs stable
- Diagnostics clean
- Required attributes present

## Feed is NOT SAFE if:
- Variants ungrouped
- Image mismatch detected
- URL mismatch detected
- IDs unstable
- Diagnostics show policy spikes

---

# Output Requirements for Agent

Agent should output:
- Pass / Fail status
- List of violations
- Severity level (Critical / High / Medium / Low)
- Recommended fix per violation
- Sample corrected field values

---

# End of Runbook
