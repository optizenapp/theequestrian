# Sizing Charts Migration Guide

## Overview

This guide explains how to migrate sizing chart content from the current site to the new headless implementation.

## Current Site

**URL:** https://www.theequestrian.com.au/pages/sizing-charts

The current site has a single page with links to external brand sizing pages.

## New Implementation

### Structure

- **Main Index:** `/sizing` - Lists all available brand sizing charts
- **Brand Pages:** `/sizing/[brand-slug]` - Individual brand sizing pages
- **Smart Links:** Product pages automatically link to relevant sizing guides

### Files Created

1. **Configuration:** `lib/sizing/sizing-config.ts`
   - Brand mappings
   - Vendor name to slug mapping
   - Product categories requiring sizing

2. **Pages:**
   - `app/sizing/page.tsx` - Main index page
   - `app/sizing/[brand]/page.tsx` - Dynamic brand pages

3. **Component:** `components/product/SizingGuideLink.tsx`
   - Smart linking component
   - Shows on product pages between description and reviews

4. **Assets:** `public/sizing/[brand]/`
   - Directory structure for sizing chart images

## Migration Steps

### Step 1: Download Sizing Chart Images

For each brand listed on https://www.theequestrian.com.au/pages/sizing-charts:

1. Click through to the brand's sizing page
2. Download all sizing chart images
3. Optimize images (max width 1200px, compress for web)
4. Save to `public/sizing/[brand-slug]/`

**Brand List:**
- Tucci & Ego 7 → `public/sizing/tucci-and-ego-7/`
- DappleEq → `public/sizing/dappleeq/`
- Hitchley & Harrow → `public/sizing/hitchley-harrow/`
- Diamond Deluxe → `public/sizing/diamond-deluxe/`
- Little Equine Co → `public/sizing/little-equine-co/`
- JP Equestrian Fashion → `public/sizing/jp-equestrian/`
- Plum Tack → `public/sizing/plum-tack/`
- Anky → `public/sizing/anky/`
- JNK Collective → `public/sizing/jnk-collective/`
- Lemieux → `public/sizing/lemieux/`
- Roeckl Gloves → `public/sizing/roeckl/`
- Baxter Boots → `public/sizing/baxter/`
- Cavalleria Toscana → `public/sizing/cavalleria-toscana/`
- Ariat → `public/sizing/ariat/`

### Step 2: Update Configuration (if needed)

If image filenames differ from the defaults in `lib/sizing/sizing-config.ts`, update the `images` array for each brand:

```typescript
{
  slug: 'ariat',
  name: 'Ariat',
  displayName: 'Ariat',
  vendorNames: ['Ariat'],
  charts: [
    {
      title: 'Boot Sizing',
      description: 'Sizing guide for Ariat boots',
      images: ['/sizing/ariat/boot-chart.jpg'], // Update filename here
    },
  ],
}
```

### Step 3: Test Pages

1. Start the development server: `npm run dev`
2. Visit `/sizing` to see the main index page
3. Click through to each brand page to verify images load
4. Test a product page to see the sizing link appear

### Step 4: Verify Smart Linking

Test products from different brands to ensure smart linking works:

1. **Ariat product** → Should link to `/sizing/ariat`
2. **Tucci product** → Should link to `/sizing/trailrace`
3. **Unknown brand** → Should link to `/sizing` (main page)
4. **Non-apparel product** (e.g., grooming supplies) → No sizing link

### Step 5: Add More Brands (Optional)

To add a new brand not in the original list:

1. Create directory: `public/sizing/[new-brand-slug]/`
2. Add images to the directory
3. Add brand entry to `BRAND_SIZING_DATA` in `lib/sizing/sizing-config.ts`:

```typescript
{
  slug: 'new-brand',
  name: 'New Brand',
  displayName: 'New Brand Name',
  vendorNames: ['New Brand', 'Brand Variant Name'],
  charts: [
    {
      title: 'Sizing Guide',
      description: 'Complete sizing guide',
      images: ['/sizing/new-brand/chart.jpg'],
    },
  ],
}
```

## Image Optimization Tips

### Using ImageMagick (if installed)

```bash
# Resize to max width 1200px
convert input.jpg -resize 1200x\> output.jpg

# Compress JPEG
convert input.jpg -quality 85 output.jpg

# Convert PNG to optimized JPG
convert input.png -quality 85 output.jpg
```

### Using Online Tools

- TinyPNG: https://tinypng.com/
- Squoosh: https://squoosh.app/
- ImageOptim (Mac): https://imageoptim.com/

## SEO Considerations

- All pages have proper metadata (title, description)
- Breadcrumb schema markup included
- Image alt text automatically generated
- Canonical URLs set correctly
- Mobile responsive design

## Testing Checklist

- [ ] Main sizing page loads at `/sizing`
- [ ] All brand links work from main page
- [ ] Individual brand pages display correctly
- [ ] Images load and are optimized
- [ ] Breadcrumbs work on all pages
- [ ] Product pages show sizing link for apparel/footwear
- [ ] Product pages DON'T show sizing link for non-apparel
- [ ] Smart linking routes to correct brand pages
- [ ] Mobile responsive on all screen sizes
- [ ] SEO metadata present on all pages

## Support

If you encounter issues during migration, check:

1. Image paths match configuration in `lib/sizing/sizing-config.ts`
2. Image files are in correct directories
3. Vendor names in Shopify match `vendorNames` in config
4. Product types are in `SIZING_REQUIRED_CATEGORIES` list

