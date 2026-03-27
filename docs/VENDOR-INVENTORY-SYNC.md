# Vendor store → marketplace Shopify sync

## What this does

- **Source of truth:** Marketplace **Shopify** inventory and price (what Storefront API and **native checkout** use).
- Vendor shops run a **custom Shopify app** that sends webhooks to this app. We **verify HMAC**, **re-fetch** inventory (and optionally prices) from the **vendor** Admin API, then **update marketplace Shopify** so the headless site and checkout stay aligned.
- **Neon** tables store vendor connections, variant mapping, and per-location vendor snapshots (ops / debugging).

## Apply database schema

Run on Neon (once):

`lib/db/schema/vendor-inventory-sync.sql`

## Environment

| Variable | Purpose |
|----------|---------|
| `VENDOR_SYNC_APP_CLIENT_SECRET` | Shopify **custom app API secret** (same secret used to verify webhooks from every vendor store that installed the app). |
| `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN` | Marketplace shop (already used elsewhere). |

Also set in `.env.local` as documented in `env.config.md`.

## Webhook URL (production)

`https://<your-site>/api/webhooks/shopify/vendor-sync`

Topics to register **on each vendor shop**:

- `inventory_levels/update` (required for stock)
- `products/update` (only if `sync_price = true` for that connection)

## Register webhooks on a vendor shop

```bash
export VENDOR_SHOP_DOMAIN=vendor.myshopify.com
export VENDOR_SHOP_ADMIN_ACCESS_TOKEN=shpat_xxx   # token for that shop only
export NEXT_PUBLIC_SITE_URL=https://thequestrian.com
npx tsx scripts/register-vendor-store-webhooks.ts
```

## Seed a vendor connection

Insert into `vendor_shop_connections` (example):

- `shop_domain`: vendor myshopify hostname (must match `X-Shopify-Shop-Domain` from webhooks).
- `marketplace_vendor_name`: exact `Product.vendor` on the **marketplace** catalog (used for shipping rules when `sync_price` runs).
- `access_token`: Admin API token for the **vendor** shop (custom app).
- `inventory_strategy`: `single_location` (use `primary_location_id` or webhook location) or `summed_locations`.
- `sync_price`: `true` only if you want `products/update` to push prices; then set Webkul / ops so Webkul does not overwrite Shopify for that vendor.

## Seed mapping rows

Insert into `vendor_inventory_map` for each vendor variant ↔ marketplace variant:

- Vendor IDs: from the vendor shop Admin API / export.
- Marketplace IDs: numeric Shopify IDs (variant, product, inventory item, **marketplace** location that holds stock for that variant).

Without a map row, inventory webhooks are accepted but **logged as unmapped** and marketplace stock is not updated.

## Price offset webhook interaction

`/api/webhooks/shopify-product-update` skips shipping-offset logic for any `marketplace_vendor_name` that has an **active** `vendor_shop_connections` row with `sync_price = true`, so vendor-sync prices are not double-offset.

## Webkul

Disable inventory/price sync from Webkul → Shopify for opted-in vendors where possible (Dual Sync / Webkul support). Otherwise a scheduled reconciliation job may be needed to re-apply vendor-sourced values after Webkul runs.

## Health check

`GET /api/webhooks/shopify/vendor-sync` returns `{ configured: true/false }`.

## jono-dev branch and database

Pilot work for this feature lives on git branch **`jono-dev`** (see worktree `theequestrian-jono-dev` if you use one).

Point local / preview env at the **jono-dev Neon** database using `CUSTOM_DATABASE_URL` or `DATABASE_URL` (same precedence as `lib/db/client.ts`). **Do not commit** connection strings or passwords.

The vendor sync DDL in this repo was applied once to that Neon database when the branch was set up; re-run the SQL file only if you need a fresh environment.
