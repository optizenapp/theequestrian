# Brand audit workflow

1. **Run audit (read-only CSV)**  
   `npm run brands:audit`  
   Produces timestamped files under `exports/`:  
   - `brand-audit-products-*.csv` — per product: inferred brand, confidence, `needs_review`  
   - `brand-audit-inventory-*.csv` — deduplicated brands with counts  
   - `brand-audit-missing-pages-*.csv` — inferred brands with no `brand_content` row yet  

2. **Review**  
   Fix rows where `needs_review=true` or `inferred_brand` is wrong; keep `handle` + final `brand` text.

3. **Apply approved mapping**  
   Build a two-column CSV: `handle,brand` (UTF-8). Then:  
   `npm run brands:apply-csv -- exports/your-approved-brands.csv`

4. **Sync brand hub rows**  
   `npm run brands:sync-pages`  
   Upserts `brand_content` from distinct `products.brand`, sets `rules` to BRAND match, refreshes `products_count`. Preserves existing `rules` when already set.

5. **Re-sync Shopify → DB**  
   `npm run db:sync` does not overwrite `products.brand` (column omitted from Shopify upsert).
