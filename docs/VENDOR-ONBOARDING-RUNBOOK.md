# Vendor Inventory Sync — Onboarding Runbook

How to onboard any new vendor into the inventory/price sync system.  
There are two paths depending on whether we have admin access to their store.

---

## Pre-flight checklist (do this for every vendor)

Before contacting the vendor or touching anything, confirm:

- [ ] Their products are already imported on our marketplace with `Product.vendor` set to their exact vendor name (e.g. `Ascot Saddlery`)
- [ ] You know their `.myshopify.com` domain (e.g. `ascot-saddlery-vic.myshopify.com`)
- [ ] You know the exact `Product.vendor` string used on our marketplace (check Shopify admin → Products → filter by vendor)

---

## Step 1 — Create a Shopify app for this vendor

> One app per vendor. Each app gets its own client ID/secret tied to that vendor's store.

1. Go to [dev.shopify.com](https://dev.shopify.com) → your Partner org → **Apps** → **Create app**
2. Name it: `The Equestrian Vendor Sync — <VendorName>` (e.g. `The Equestrian Vendor Sync — Jodhpurs Co`)
3. In the app settings, configure:
   - **App URL**: `https://www.theequestrian.com.au/api/shopify/vendor-oauth/install`
   - **Redirect URLs**: `https://www.theequestrian.com.au/api/shopify/vendor-oauth/callback`
   - **Scopes**: `read_products,read_inventory,read_locations`
   - **Use legacy install flow**: `true` (turn ON)
   - **Webhooks API version**: `2026-01`
4. Save. **Do not** release/publish — keep it as a draft version.
5. Go to **Distribution** → **Custom distribution** → select this vendor's store → save.
6. Copy the **Client ID** and **Secret** from the Credentials tab.

---

## Step 2 — Add env vars to Vercel

Slug = shop domain minus `.myshopify.com`, uppercased, dashes → underscores.  
`jodhpurs-co.myshopify.com` → `JODHPURS_CO`

Add to Vercel (All Environments):

| Key | Value |
|-----|-------|
| `VENDOR_SYNC_APP_CLIENT_ID_<SLUG>` | Client ID from step 1 |
| `VENDOR_SYNC_APP_CLIENT_SECRET_<SLUG>` | Secret from step 1 |
| `VENDOR_MARKETPLACE_NAME_<SLUG>` | Exact `Product.vendor` on marketplace |

**Redeploy** after adding env vars.

---

## Step 3A — Install the app (if we have store admin access)

1. Log into the vendor's Shopify admin in your browser
2. Go to Dev Dashboard → this vendor's app → **Distribution** tab
3. Copy the fresh install link (starts with `https://admin.shopify.com/oauth/install_custom_app?...`)
4. Open that link in the same browser tab → click **Install**
5. You should land on `https://www.theequestrian.com.au/api/shopify/vendor-oauth/callback` with "Store connected"

Skip to Step 4.

---

## Step 3B — Install the app (if we do NOT have store admin access)

Send the vendor the email below. They need to be logged in as **store owner** when they click the link.

The install link is in Dev Dashboard → this vendor's app → Distribution tab.

### Email template

> **Subject: The Equestrian — quick app connection (2 minutes)**
>
> Hi [Name],
>
> To keep your inventory and pricing in sync with The Equestrian automatically, we need you to install a small connection app on your Shopify store. It only reads your product and inventory data — it cannot make any changes to your store.
>
> **To install:**
> 1. Make sure you're logged into your Shopify store as the store owner: [https://admin.shopify.com/store/THEIR-STORE-HANDLE](https://admin.shopify.com/store/THEIR-STORE-HANDLE)
> 2. Click this link: **[PASTE INSTALL LINK HERE]**
> 3. You'll see a permissions screen — click **Install**
> 4. You'll be redirected to a confirmation page that says "Store connected" — you can close the tab after that
>
> That's it. The whole process takes about 2 minutes.
>
> The app requests these read-only permissions:
> - View products and variants
> - View inventory levels
> - View store locations
>
> If you have any questions or the link doesn't work, just reply to this email.
>
> Thanks,  
> [Your name]  
> The Equestrian

---

## Step 4 — Verify the token saved

```bash
psql 'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' \
  -c "SELECT id, shop_domain, marketplace_vendor_name, is_active FROM vendor_shop_connections ORDER BY created_at DESC LIMIT 5;"
```

You should see the new vendor row with an `access_token` saved.

---

## Step 5 — Register webhooks on the vendor store

Replace `<VENDOR_DOMAIN>` and `<ACCESS_TOKEN>` with the values from the DB row.

```bash
VENDOR_DOMAIN="jodhpurs-co.myshopify.com"
ACCESS_TOKEN="shpca_xxx"

for TOPIC in "inventory_levels/update" "products/update" "products/create"; do
  curl -s -X POST "https://$VENDOR_DOMAIN/admin/api/2026-01/webhooks.json" \
    -H "X-Shopify-Access-Token: $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"webhook\":{\"topic\":\"$TOPIC\",\"address\":\"https://www.theequestrian.com.au/api/webhooks/shopify/vendor-sync\",\"format\":\"json\"}}" \
    | python3 -c "import sys,json; w=json.load(sys.stdin).get('webhook',{}); print(w.get('topic'), w.get('id','ERROR'))"
done
```

---

## Step 6 — Seed the inventory map

Match vendor variants to marketplace variants by SKU.

```bash
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxx \
VENDOR_DOMAIN=jodhpurs-co.myshopify.com \
VENDOR_LOCATION_ID=<from Shopify locations API> \
VENDOR_CONNECTION_ID=<id from vendor_shop_connections> \
VENDOR_ACCESS_TOKEN=shpca_xxx \
node scripts/seed-vendor-inventory-map.mjs
```

> **Note:** Until a generic seed script exists, adapt `scripts/seed-ascot-inventory-map.mjs` for the new vendor — change the domain, token, location ID, connection ID, and vendor name constants at the top.

Output will show `Matched: X | Unmatched: Y`. Unmatched means those marketplace SKUs don't exist in the vendor's store — usually products imported from a different source or with mismatched SKUs.

---

## Step 7 — Enable sync in the DB

```sql
UPDATE vendor_shop_connections
SET sync_inventory = true,
    sync_price = true,
    reconcile_enabled = true,
    reconcile_cooldown_seconds = 20,
    is_active = true,
    updated_at = NOW()
WHERE shop_domain = 'jodhpurs-co.myshopify.com';
```

Start with `sync_price = false` if you want to test inventory only first, then flip it on once confirmed working.

---

## Step 8 — Smoke test

1. Change an inventory quantity on one product in the vendor's Shopify store
2. Wait ~5 seconds
3. Check the same product on our marketplace — quantity should match
4. Check Vercel logs for `[vendor-sync] inventory` to confirm the webhook fired

---

## Full vendor state reference

```sql
SELECT id, shop_domain, marketplace_vendor_name,
       is_active, sync_inventory, sync_price, reconcile_enabled,
       (SELECT COUNT(*) FROM vendor_inventory_map m WHERE m.vendor_connection_id = c.id) AS mapped_variants
FROM vendor_shop_connections c
ORDER BY id;
```

---

## Disabling a vendor

```sql
-- Pause everything for one vendor
UPDATE vendor_shop_connections SET is_active = false WHERE shop_domain = 'vendor.myshopify.com';

-- Re-enable
UPDATE vendor_shop_connections SET is_active = true WHERE shop_domain = 'vendor.myshopify.com';

-- Disable only price sync
UPDATE vendor_shop_connections SET sync_price = false WHERE shop_domain = 'vendor.myshopify.com';

-- Disable a specific SKU mapping only
UPDATE vendor_inventory_map SET status = 'disabled'
WHERE sku = 'ABC-123'
  AND vendor_connection_id = (SELECT id FROM vendor_shop_connections WHERE shop_domain = 'vendor.myshopify.com');
```
