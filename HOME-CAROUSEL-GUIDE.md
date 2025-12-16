# Homepage Carousel - Product Handle Guide

## Overview

The homepage "Most Wanted" carousel now pulls **real product data from Shopify** instead of manually managing JSON. You just need to provide product handles (URLs) in the CSV!

## How It Works

### ✅ Before (Manual JSON - Complex)
```csv
most_wanted_items_json: "[{\"title\":\"...\",\"price\":\"...\",\"image\":\"...\"}]"
```
- Had to manually enter title, price, image, rating
- Data could become outdated
- Prices wouldn't sync with Shopify

### ✅ After (Product Handles - Simple)
```csv
product_handles: "product-1,product-2,product-3"
```
- Just list product handles (comma-separated)
- Automatically fetches: title, price, images, availability
- Always up-to-date with Shopify
- Prices sync automatically

## How to Update the Carousel

### 1. Find Product Handles

Product handles are the URL-friendly names in your product URLs:

```
https://theequestrian.com.au/horse/shanga-mesh-combo
                                      ^^^^^^^^^^^^^^^^^^
                                      This is the handle
```

### 2. Edit the CSV

Open: `exports/home-sections.csv`

Find the row with `type: most_wanted_carousel`

Update the `product_handles` column with comma-separated handles:

```csv
product_handles: "shanga-mesh-combo,ca-coolite-rug,eureka-mini-canvas-rug"
```

### 3. Save and Deploy

- **Local**: Changes appear immediately (auto-reload in dev)
- **Production**: Commit and push to deploy

```bash
git add exports/home-sections.csv
git commit -m "Update homepage carousel products"
git push origin main
```

## Example

Current CSV (simplified):

```csv
key,type,enabled,product_handles
most_wanted_carousel,most_wanted_carousel,true,"shanga-mesh-combo,shanga-towel-rug,007-mineral-salt-blocks,ca-coolite-rug"
```

This will automatically:
- ✅ Fetch product titles from Shopify
- ✅ Show current prices (with sale prices if applicable)
- ✅ Display product images
- ✅ Link to product pages
- ✅ Show "On Sale" badge if discounted
- ✅ Update automatically when you change prices in Shopify

## Features

### Automatic Data
- **Title**: From Shopify product title
- **Price**: Current price (shows "was $X" if on sale)
- **Image**: First product image
- **Link**: Direct link to product page
- **Tag**: "On Sale" if discounted, otherwise "Best Seller"
- **Rating**: Default 4.8 (can be enhanced with review metafields)

### Backwards Compatible
- Old JSON format still works
- Migrate at your own pace
- Both formats supported simultaneously

## Tips

1. **Use Best Sellers**: Pick your top-selling products for maximum impact
2. **Mix Categories**: Show variety (rugs, supplements, tack, etc.)
3. **Keep it Fresh**: Update monthly to showcase new arrivals
4. **Limit to 8**: Optimal number for the carousel (4-8 products)
5. **Check Availability**: Products marked unavailable won't show well

## Troubleshooting

### Product not showing?
- Check the handle is correct (no typos)
- Verify product is published in Shopify
- Check product has an image

### Wrong price showing?
- Prices sync from Shopify automatically
- Update price in Shopify, it will reflect immediately

### Need more products?
- Just add more handles: `product-1,product-2,product-3,product-4`
- Separate with commas, no spaces needed

## Next Steps

You can now easily manage your homepage carousel by just updating product handles in the CSV. No more manual JSON editing! 🎉
