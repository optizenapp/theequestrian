# Webkul Price Offset Middleware

Adjusts Shopify variant prices by adding vendor/tag shipping offsets after Webkul syncs products.

## What it does
- Listens to Webkul webhooks for product create/update.
- Fetches product + variant data from Webkul API.
- Computes `adjusted_price = vendor_price + shipping_offset`.
- Updates variant price via Webkul API.
- Stores audit records in Postgres.
- Preserves percent discount by recalculating compare-at price when present.

## Required CSVs
Uses existing CSVs from the headless repo:
- `exports/vendor-shipping-rates.csv` (required)
- `exports/tag-shipping-rates.csv` (optional)

To generate templates from your Webkul catalog:
```bash
npm run extract:vendors  # Creates vendor-rates-template-{timestamp}.csv
npm run extract:tags     # Creates tag-rates-template-{timestamp}.csv
```

## Setup
1) Install dependencies
```bash
npm install
```

2) Configure env
```bash
cp .env.example .env
```

Fill in Webkul OAuth fields from the app (Username/Email/Access Token/Refresh Token):
```
WEBKUL_ACCESS_TOKEN=...
WEBKUL_REFRESH_TOKEN=...
```

If your Webkul setup requires OAuth client credentials, also set:
```
WEBKUL_CLIENT_ID=...
WEBKUL_CLIENT_SECRET=...
```

3) Run bulk adjustment (initial 10k products)
```bash
npm run bulk
```

4) Start webhook server
```bash
npm run dev
```

## DB init
```bash
npm run db:init
```

## Webhooks
Register Webkul webhooks to:
- `POST /webhooks/product`

Recommended topics:
- `products/create`
- `products/update`

## Notes
- Tag overrides win over vendor defaults.
- First matching tag in product tags wins.
- If no vendor/tag match, the variant is skipped and logged.
