# Homepage Carousel - Product Handle Guide

## Overview

Homepage sections are stored in the **`home_sections` Postgres table** and edited at **`/admin/home-sections`**.

Product carousels use comma-separated **product handles** — the site fetches live title, price, and images from Shopify.

To bulk seed or sync from the CSV snapshot:

```bash
npm run db:migrate-home-sections
```

## How to Update a Carousel

### Option A — Admin UI (recommended)

1. Go to `/admin/home-sections`
2. Select the section (e.g. `most_wanted_carousel`, `trolle_carousel`)
3. Edit `product_handles` (comma-separated handles) and save
4. Homepage revalidates automatically

### Option B — CSV seed file

1. Edit `exports/home-sections.csv`
2. Run `npm run db:migrate-home-sections` (add `CUSTOM_DATABASE_URL=...` for prod)

## Product Handles

Product handles are the URL-friendly names in your product URLs:

```
https://theequestrian.com.au/horse/shanga-mesh-combo
                                      ^^^^^^^^^^^^^^^^^^
                                      This is the handle
```

Example `product_handles` value:

```
shanga-mesh-combo,ca-coolite-rug,eureka-mini-canvas-rug
```

Each handle automatically loads title, price, image, and product link from Shopify.

## Tips

1. Use best sellers or brand highlights for maximum impact
2. Keep carousels to 6–8 products for a clean scroll
3. Verify handles are published and have images in Shopify

## Troubleshooting

**Product not showing?** Check the handle spelling and that the product is published in Shopify.

**Changes not on homepage?** Admin saves revalidate `/` immediately; CSV seeds require `npm run db:migrate-home-sections`.
