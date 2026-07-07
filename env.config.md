# Environment Variables Configuration

Copy these variables to your `.env.local` file for local development.

```bash
# Shopify Configuration
SHOPIFY_STORE_DOMAIN=thequestrian.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token_here
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_access_token_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# Vendor store → marketplace sync (Dev Dashboard app — 2026+)
#
# Credential resolution order (per webhook/OAuth request):
#   1. VENDOR_SYNC_APP_CLIENT_ID_<SLUG>  (vendor-specific)
#   2. VENDOR_SYNC_APP_CLIENT_ID          (default fallback)
#
# Slug = shop domain minus ".myshopify.com", uppercased, dashes → underscores.
#   trailrace.myshopify.com          → TRAILRACE
#   ascot-saddlery-vic.myshopify.com → ASCOT_SADDLERY_VIC
#
# Current setup: default = Ascot app; Trailrace uses its own pair.
VENDOR_SYNC_APP_CLIENT_ID=          # Ascot Saddlery app (default)
VENDOR_SYNC_APP_CLIENT_SECRET=      # Ascot Saddlery app (default)

VENDOR_SYNC_APP_CLIENT_ID_TRAILRACE=
VENDOR_SYNC_APP_CLIENT_SECRET_TRAILRACE=

# Optional: require ?secret= on /api/shopify/vendor-oauth/install in production
VENDOR_OAUTH_START_SECRET=

# Yotpo Configuration
YOTPO_APP_KEY=your_yotpo_app_key_here
YOTPO_SECRET_KEY=your_yotpo_secret_key_here

# Webkul Multi-Vendor Configuration
WEBKUL_API_KEY=your_webkul_api_key_here
WEBKUL_API_URL=your_webkul_api_url_here

# Vercel KV (Redis) Configuration
KV_REST_API_URL=your_kv_rest_api_url_here
KV_REST_API_TOKEN=your_kv_rest_api_token_here

# Optional: Error Tracking & Analytics
SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_ga_id_here

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://thequestrian.com

# PDP BNPL on-site messaging (optional — widgets hidden until set)
# Afterpay: https://developers.afterpay.com/afterpay-online-developer/guides/afterpay-messaging/implementation
NEXT_PUBLIC_AFTERPAY_MP_ID=
NEXT_PUBLIC_AFTERPAY_PLACEMENT_ID=
NEXT_PUBLIC_AFTERPAY_CART_PLACEMENT_ID=
# Zip: https://developers.zip.co/docs/product-cart-widget
NEXT_PUBLIC_ZIP_MERCHANT_KEY=
```

## Setup Instructions

1. Copy the variables above to `.env.local`
2. Fill in the actual values from your Shopify, Yotpo, and Webkul accounts
3. For Vercel KV, these will be auto-populated when you deploy to Vercel







