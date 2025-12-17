# Sizing Charts - Quick Start Guide

## ✅ Implementation Complete

All code has been implemented and is ready to use. The only remaining step is to add the actual sizing chart images.

## What Works Right Now

1. **Main Sizing Page** (`/sizing`)
   - Lists all 14 brands
   - Fully functional navigation
   - SEO optimized

2. **Brand Pages** (`/sizing/[brand]`)
   - 14 brand pages ready
   - Will display images once added
   - Static generation configured

3. **Smart Product Links**
   - Automatically appears on product pages
   - Only shows for apparel/footwear/helmets
   - Links to correct brand page

## Quick Test

### Start Development Server
```bash
npm run dev
```

### Test URLs
```
http://localhost:3000/sizing
http://localhost:3000/sizing/ariat
http://localhost:3000/sizing/tucci-and-ego-7
http://localhost:3000/products/[any-boot-or-breech-product]
```

## Adding Images (5 Minutes)

### Step 1: Get Images
Visit: https://www.theequestrian.com.au/pages/sizing-charts

### Step 2: Download & Place
For each brand link:
1. Click through to sizing page
2. Right-click and save images
3. Place in `public/sizing/[brand-slug]/`

Example:
```
Ariat sizing images → public/sizing/ariat/
Tucci sizing images → public/sizing/trailrace/
```

### Step 3: Update Config (if needed)
If your image filenames differ from defaults, update `lib/sizing/sizing-config.ts`:

```typescript
// Find the brand and update image paths
{
  slug: 'ariat',
  // ...
  charts: [
    {
      title: 'Boot Sizing',
      images: ['/sizing/ariat/your-actual-filename.jpg'], // Update here
    },
  ],
}
```

### Step 4: Restart Dev Server
```bash
# Ctrl+C to stop
npm run dev
```

## Default Image Paths

The config expects these filenames (but you can change them):

```
/sizing/tucci-and-ego-7/tucci-chart-1.png
/sizing/tucci-and-ego-7/tucci-chart-2.png
/sizing/tucci-and-ego-7/ego7-chart-1.jpg
/sizing/tucci-and-ego-7/ego7-chart-2.png
/sizing/tucci-and-ego-7/ego7-chart-3.png
/sizing/ariat/boot-chart.jpg
/sizing/ariat/breeches-chart.jpg
/sizing/dappleeq/sizing-chart.jpg
/sizing/hitchley-harrow/sizing-chart.jpg
/sizing/diamond-deluxe/sizing-chart.jpg
/sizing/little-equine-co/size-chart.jpg
/sizing/jp-equestrian/sizing-guide.jpg
/sizing/plum-tack/sizing-guide.jpg
/sizing/anky/sizing-guide.jpg
/sizing/jnk-collective/sizing-guide.jpg
/sizing/lemieux/sizing-guide.jpg
/sizing/roeckl/size-chart.jpg
/sizing/baxter/boot-sizing.jpg
/sizing/cavalleria-toscana/size-charts.jpg
```

## Troubleshooting

### Images Not Showing?
1. Check file path matches config
2. Check file extension (.jpg vs .png)
3. Restart dev server
4. Clear browser cache

### Sizing Link Not Appearing on Product?
1. Check product has a vendor set in Shopify
2. Check product type includes sizing keywords (boots, breeches, etc.)
3. See `SIZING_REQUIRED_CATEGORIES` in config

### Brand Page 404?
1. Check brand slug matches config
2. Restart dev server (for new brands)

## File Reference

| File | Purpose |
|------|---------|
| `lib/sizing/sizing-config.ts` | All configuration |
| `app/sizing/page.tsx` | Main index page |
| `app/sizing/[brand]/page.tsx` | Brand pages |
| `components/product/SizingGuideLink.tsx` | Product link component |
| `public/sizing/` | Image storage |

## Need Help?

See detailed guides:
- `SIZING-CHARTS-MIGRATION.md` - Full migration guide
- `SIZING-IMPLEMENTATION-COMPLETE.md` - Technical details
- `public/sizing/README.md` - Image guidelines

