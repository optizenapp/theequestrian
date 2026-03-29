-- TEMPLATE: copy, fill in IDs/tokens, run against jono-dev Neon (psql or SQL editor).
-- Do not commit filled-in versions with real secrets.

-- 1) One row per vendor Shopify store that sends webhooks to /api/webhooks/shopify/vendor-sync
/*
INSERT INTO vendor_shop_connections (
  shop_domain,
  marketplace_vendor_name,
  access_token,
  inventory_strategy,
  primary_location_id,
  allowed_location_ids,
  sync_price,
  is_active
) VALUES (
  'vendor-shop.myshopify.com',           -- X-Shopify-Shop-Domain from webhooks
  'Ascot Saddlery',                      -- exact Product.vendor on marketplace
  'PASTE_VENDOR_SHOP_ADMIN_TOKEN',       -- Admin API token from custom app on VENDOR shop
  'single_location',
  NULL,                                  -- optional: vendor location id as string
  '[]'::jsonb,                           -- or '["123","456"]' for summed_locations filter
  false,                                 -- true when ready for products/update price sync
  true
);
*/

-- 2) Map vendor variant ↔ marketplace variant (numeric Shopify IDs as text, no gid:// prefix)
/*
INSERT INTO vendor_inventory_map (
  vendor_connection_id,
  vendor_shopify_product_id,
  vendor_shopify_variant_id,
  vendor_inventory_item_id,
  vendor_location_id,
  marketplace_product_id,
  marketplace_variant_id,
  marketplace_inventory_item_id,
  marketplace_location_id,
  sku,
  status
) VALUES (
  1,
  '123456789',
  '987654321',
  '444555666',
  NULL,
  '111222333',
  '333222111',
  '777888999',
  '555666777',                           -- marketplace location that holds stock
  NULL,
  'active'
);
*/
