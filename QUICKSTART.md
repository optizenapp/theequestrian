# Quick Start Guide

Get The Questrian headless storefront running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Shopify store access (thequestrian.myshopify.com)
- Shopify Storefront API access token

## Step 1: Environment Setup

Create `.env.local` file in the project root:

```bash
SHOPIFY_STORE_DOMAIN=thequestrian.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_token_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Step 2: Install & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Step 3: Configure Shopify Metafields

### For Products

1. Go to Shopify Admin > Settings > Custom Data > Products
2. Add metafield definition:
   - **Namespace:** `custom`
   - **Key:** `primary_collection`
   - **Type:** Single line text
   - **Description:** "Primary collection path for canonical URL (format: category/subcategory)"

3. Edit a product and set the metafield value:
   ```
   saddle-pads/jumping-pads
   ```

### For Collections

1. Go to Shopify Admin > Settings > Custom Data > Collections
2. Add metafield definition:
   - **Namespace:** `custom`
   - **Key:** `parent_collection`
   - **Type:** Single line text
   - **Description:** "Parent collection handle for hierarchy"

3. Edit a subcollection and set the metafield value:
   ```
   saddle-pads
   ```

## Step 4: Test the Routes

### Homepage
```
http://localhost:3000/
```

### Category Page
```
http://localhost:3000/saddle-pads
```

### Subcategory Page
```
http://localhost:3000/saddle-pads/jumping-pads
```

### Product Page
```
http://localhost:3000/saddle-pads/jumping-pads/product-handle
```

### Old URL Redirect (should redirect)
```
http://localhost:3000/products/product-handle
→ Redirects to canonical URL
```

## Common Issues

### "Product not found"
- Verify the product handle is correct
- Check Shopify API token has correct permissions
- Ensure product is published

### "Collection not found"
- Verify collection handle matches Shopify
- Check collection is published
- Ensure API token has collection access

### Environment variable errors
- Make sure `.env.local` exists
- Restart dev server after changing env vars
- Check for typos in variable names

## Next Steps

1. **Populate Metafields**: Add `primary_collection` to all products
2. **Set Up Collections**: Configure collection hierarchy with `parent_collection`
3. **Test URLs**: Verify all product URLs work correctly
4. **Add Components**: Build cart, navigation, footer components
5. **Multi-Vendor**: Integrate Webkul API (Phase 2)
6. **Reviews**: Add Yotpo integration (Phase 3)

## Getting Shopify API Token

1. Go to Shopify Admin > Apps > Develop apps
2. Create new app: "Headless Storefront"
3. Configure Storefront API scopes:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_read_collection_listings`
4. Install app and copy the Storefront Access Token
5. Add to `.env.local`

## Useful Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## Need Help?

- 📖 [Full README](./README.md)
- 📋 [Technical Brief](./shopify-headless-migration-brief.md)
- 🔗 [Shopify Storefront API Docs](https://shopify.dev/docs/api/storefront)
- 🔗 [Next.js Docs](https://nextjs.org/docs)







