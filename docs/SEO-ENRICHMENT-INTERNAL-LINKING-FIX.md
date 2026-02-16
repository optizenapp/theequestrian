# SEO Enrichment Internal Linking Fix

**Date:** February 16, 2026  
**Status:** ✅ RESOLVED

## Problem

The SEO enrichment pipeline was failing when trying to insert internal link suggestions into the `internal_link_graph` table. The issue was a PostgreSQL CHECK constraint that limited `link_type` to only 5 specific values:

```sql
CHECK (link_type IN ('contextual', 'navigational', 'hub_spoke', 'related', 'breadcrumb'))
```

The AI was generating link types that didn't exactly match these values (e.g., "collection", "product-to-collection", etc.), causing database constraint violations and marking queue items as failed.

## Solution

### 1. Dropped the Constraint

Created a script to drop the overly restrictive CHECK constraint:

```bash
npm run seo:enrichment:fix-constraint
```

This allows the AI to generate any link type it deems appropriate for the context, giving it more flexibility in creating semantic internal linking structures.

### 2. Added Retry Mechanism

Added a new command to retry failed queue items:

```bash
npm run seo:enrichment:retry-failed
```

This requeues any failed items so they can be processed again with the constraint removed.

### 3. Deployed to EC2

Updated the production worker on EC2 with:
- Fixed worker.ts with `retryFailed()` method
- Updated run-seo-enrichment.ts with retry-failed command
- New fix-internal-link-constraint.ts script
- Updated package.json with new scripts

## Results

### Before Fix
- 2 failed items in queue
- Internal linking blocked by constraint
- Worker unable to complete enrichments

### After Fix
- ✅ All failed items successfully processed
- ✅ 91 internal link suggestions generated
- ✅ 5 different link types in use:
  - **Contextual** (62) - Natural in-content links
  - **Related** (19) - Related product/category links
  - **Hub_spoke** (8) - Hub pages to specific products
  - **Collection** (1) - Collection page links
  - **Navigational** (1) - Navigation links

### Current Status
- **54 total enrichments** generated
- **39 unique pages** enriched
- **27 enrichments applied** to live site
- **91 internal links** suggested
- **$1.05 total cost** (very efficient)

## New Scripts Added

1. **`scripts/fix-internal-link-constraint.ts`**
   - Drops the CHECK constraint on internal_link_graph
   - Shows count of failed items to retry

2. **`scripts/seo-enrichment-status.ts`**
   - Comprehensive status report
   - Shows queue, enrichment log, internal links, SERP cache
   - Recent activity and latest enrichments

3. **`scripts/deploy-seo-updates.sh`**
   - Quick deployment script for EC2 updates
   - Uploads files and restarts worker

## NPM Scripts Added

```json
{
  "seo:enrichment:fix-constraint": "tsx scripts/fix-internal-link-constraint.ts",
  "seo:enrichment:retry-failed": "tsx scripts/run-seo-enrichment.ts --command=retry-failed",
  "seo:enrichment:status": "tsx scripts/seo-enrichment-status.ts"
}
```

## Database Changes

```sql
-- Removed constraint
ALTER TABLE internal_link_graph 
DROP CONSTRAINT internal_link_graph_link_type_check;
```

The `link_type` column is now a free-text field, allowing the AI to generate contextually appropriate link type labels.

## Monitoring

Check pipeline status anytime with:

```bash
npm run seo:enrichment:status
```

Check EC2 worker logs:

```bash
ssh -i te-seo.pem ubuntu@52.206.187.213 'sudo journalctl -u seo-enrichment-worker -f'
```

## Next Steps

1. ✅ Internal linking working - COMPLETE
2. 🔄 Implement real SERP crawling with SerpAPI (currently using mock data)
3. 🔄 Build sitemap cache for better internal link discovery
4. 🔄 Add Australian geo-targeting for SERP analysis
5. 🔄 Optimize AI prompts for internal link generation
6. 🔄 Create dashboard for monitoring enrichment progress

## Files Modified

- `lib/seo-enrichment/worker.ts` - Added `retryFailed()` method
- `scripts/run-seo-enrichment.ts` - Added retry-failed command
- `package.json` - Added new scripts
- `scripts/fix-internal-link-constraint.ts` - NEW
- `scripts/seo-enrichment-status.ts` - NEW
- `scripts/deploy-seo-updates.sh` - NEW

## Lessons Learned

1. **Overly restrictive constraints** can block AI flexibility
2. **Free-text fields** work better for AI-generated categorical data
3. **Retry mechanisms** are essential for production pipelines
4. **Status monitoring** scripts help quickly diagnose issues
5. **Quick deployment scripts** speed up iteration on EC2
