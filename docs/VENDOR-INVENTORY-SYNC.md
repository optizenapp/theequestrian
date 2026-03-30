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
| `VENDOR_SYNC_APP_CLIENT_ID` | Dev Dashboard app **Client ID** (API key). Required for OAuth install (2026+). |
| `VENDOR_SYNC_APP_CLIENT_SECRET` | App **client secret**: verifies **webhooks** (HMAC) and exchanges **OAuth codes** for access tokens. One secret for the whole app. |
| `VENDOR_OAUTH_START_SECRET` | Optional. If set, `/api/shopify/vendor-oauth/install` requires matching `?secret=…` so random people cannot start installs. |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (used to build OAuth `redirect_uri` and links). On Vercel, `VERCEL_URL` is a fallback. |
| `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN` | **Marketplace** shop (writes inventory/price there). |

Also set in `.env.local` as documented in `env.config.md`.

## Shopify 2026: Dev Dashboard vs legacy “Develop apps”

As of **1 January 2026**, Shopify **does not allow creating new legacy custom apps** from the store admin (**Settings → Develop apps**). New apps are created under your **Partner organisation** in the **[Dev Dashboard](https://shopify.dev/docs/apps/build/dev-dashboard)** (or via **Shopify CLI**). Existing legacy apps keep working; if deleted, they cannot be recreated the old way.

Implications for this integration:

| Topic | Legacy custom app (old) | Dev Dashboard app (2026+) |
|--------|-------------------------|----------------------------|
| Where the app lives | Inside the merchant store | Your Partner org ([dev.shopify.com/dashboard](https://dev.shopify.com/dashboard)) |
| Getting the app on Trailrace | Create + install in that store | **Custom distribution** → install link, or use our **OAuth install** URL below |
| Vendor Admin API token | Permanent `shpat_…` copied once | **OAuth** [authorization code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant): exchange `code` for token (often `shpua_…`); we **store it** in `vendor_shop_connections.access_token` |
| Webhook HMAC | That app’s secret | **Same** `VENDOR_SYNC_APP_CLIENT_SECRET` for every shop that installed **this** Dev Dashboard app |
| Token exchange | N/A | `POST` `https://{shop}/admin/oauth/access_token` with `Content-Type: application/x-www-form-urlencoded` (not JSON) |

**Collaborators** build the app in **your** Dev Dashboard, not inside the client’s dashboard. You distribute to the client store with an install link or by opening our install URL while logged into the store.

### OAuth routes (this repo)

After you create the app in the Dev Dashboard and configure URLs:

1. **Allowed redirection URL(s)** must include exactly:  
   `https://<your-public-host>/api/shopify/vendor-oauth/callback`
2. Open (while able to approve the app on the vendor store):

   `https://<your-public-host>/api/shopify/vendor-oauth/install?shop=trailrace.myshopify.com&marketplace_vendor_name=Trailrace`  
   Add `&secret=...` if `VENDOR_OAUTH_START_SECRET` is set.

3. Approve scopes on Shopify. The **callback** exchanges the code and **upserts** `vendor_shop_connections` (`shop_domain`, `marketplace_vendor_name`, `access_token`).

4. Register webhooks using the token now in the database (e.g. copy `access_token` for `register-vendor-store-webhooks.ts`, or run SQL `SELECT access_token FROM vendor_shop_connections WHERE shop_domain = 'trailrace.myshopify.com'`).

Official references: [Authorization code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant), [Custom distribution](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method), [Dev Dashboard](https://shopify.dev/docs/apps/build/dev-dashboard).
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

**Preferred (2026+):** complete OAuth via `/api/shopify/vendor-oauth/install` (see [checklist §D](#d-connect-trailrace-oauth)).

**Manual / legacy:** insert into `vendor_shop_connections`:

- `shop_domain`: vendor myshopify hostname (must match `X-Shopify-Shop-Domain` from webhooks).
- `marketplace_vendor_name`: exact `Product.vendor` on the **marketplace** catalog (used for shipping rules when `sync_price` runs).
- `access_token`: vendor shop Admin API token (`shpat_…` legacy or OAuth `shpua_…`).
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
## Single vendor store checklist (e.g. Trailrace)

### A) One Dev Dashboard app for all vendors (recommended)

Use **one** app in the Dev Dashboard. **`VENDOR_SYNC_APP_CLIENT_SECRET`** verifies webhooks from **every** store that installs it. Each store gets its **own** row in `vendor_shop_connections` with its **own** `access_token` (via OAuth).

### B) Create the app (2026 — Dev Dashboard)

1. Open **[Dev Dashboard](https://dev.shopify.com/dashboard)** (Partner → *App distribution* → *Visit Dev Dashboard* if needed).
2. **Create app** → choose a workflow for **API / automation** (no embedded UI required).
3. Create an **app version** / configure **Admin API** scopes: `read_products`, `read_inventory`, `read_locations` (read-only on the **vendor** store).
4. **Client credentials**: copy **Client ID** → `VENDOR_SYNC_APP_CLIENT_ID`; **Client secret** → `VENDOR_SYNC_APP_CLIENT_SECRET` on Vercel and locally.
5. **URLs**:
   - **Allowed redirection URL(s):** `https://<your-host>/api/shopify/vendor-oauth/callback`
   - **App URL** can be your marketing URL or the same site root (Shopify may hit it on install; our flow starts from `/install` below).
6. **Distribution:** [Custom distribution](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method) — add the Trailrace store and use Shopify’s install link **or** our install URL in step D.

### C) Legacy custom app (only if one already exists)

If Trailrace **already** has a **legacy** custom app (created before 2026), you may keep using its static `shpat_…` token: insert/update `vendor_shop_connections` manually and set `VENDOR_SYNC_APP_CLIENT_SECRET` to **that** app’s secret. **You cannot create new legacy apps** in the store admin after Jan 2026.

### D) Connect Trailrace (OAuth)

1. Set env vars: `VENDOR_SYNC_APP_CLIENT_ID`, `VENDOR_SYNC_APP_CLIENT_SECRET`, `NEXT_PUBLIC_SITE_URL`.
2. Visit (adjust host and vendor name; add `secret` if you configured `VENDOR_OAUTH_START_SECRET`):

   `/api/shopify/vendor-oauth/install?shop=trailrace.myshopify.com&marketplace_vendor_name=Trailrace`

3. Finish Shopify approval. Confirm Neon has a row in `vendor_shop_connections`.

Note `marketplace_vendor_name` must match **exact** `Product.vendor` on the **marketplace** catalog.

### E) Register webhooks (Trailrace → your Next.js URL)

Webhook address must be the **public** URL of the deployment that runs this code, e.g.  
`https://<your-vercel-host>/api/webhooks/shopify/vendor-sync`

Topics:

- `inventory_levels/update` (required for stock)
- `products/update` only if you will set `sync_price = true` for Trailrace

Either configure webhooks in the **Dev Dashboard** for this app, or:

```bash
export VENDOR_SHOP_DOMAIN=trailrace.myshopify.com
export VENDOR_SHOP_ADMIN_ACCESS_TOKEN=<access_token from vendor_shop_connections after OAuth>
export NEXT_PUBLIC_SITE_URL=https://<same-host-as-above>
npx tsx scripts/register-vendor-store-webhooks.ts
```

### F) Neon: `vendor_shop_connections` (manual alternative)

If you did **not** use OAuth, insert one row with `shop_domain`, `marketplace_vendor_name`, and `access_token` (legacy `shpat_…`). OAuth **already** inserts this row.

### G) Neon: `vendor_inventory_map`

For each variant you want synced, add a row linking **Trailrace** variant / inventory item IDs to **marketplace** variant / inventory item / **location** IDs (numeric strings, no `gid://`). Without rows, webhooks run but stock is **not** updated (logged as unmapped).

### H) Webkul

In Webkul, turn **off** sync of **price** and **inventory** to marketplace Shopify for Trailrace if the product/settings allow—so Webkul does not overwrite what this app sets.

### I) Smoke test

Change quantity on a **mapped** variant in Trailrace admin; confirm marketplace Shopify inventory at the mapped location updates within a minute. Check deployment logs for `[vendor-sync]`.
## jono-dev branch and database

Pilot work for this feature lives on git branch **`jono-dev`** (see worktree `theequestrian-jono-dev` if you use one).

Point local / preview env at the **jono-dev Neon** database using `CUSTOM_DATABASE_URL` or `DATABASE_URL` (same precedence as `lib/db/client.ts`). **Do not commit** connection strings or passwords.

The vendor sync DDL in this repo was applied once to that Neon database when the branch was set up; re-run the SQL file only if you need a fresh environment.
