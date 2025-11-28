# Environment Variables Configuration

Copy these variables to your `.env.local` file for local development.

```bash
# Shopify Configuration
SHOPIFY_STORE_DOMAIN=thequestrian.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token_here
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_access_token_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

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
```

## Setup Instructions

1. Copy the variables above to `.env.local`
2. Fill in the actual values from your Shopify, Yotpo, and Webkul accounts
3. For Vercel KV, these will be auto-populated when you deploy to Vercel







