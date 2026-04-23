-- Canonical brand hub URL segment (`/brands/[handle]`); may differ from slug(brand) after parent rollup.
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_hub_handle TEXT;
