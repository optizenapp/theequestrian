# Sizing Chart Images

This directory contains sizing chart images for all brands. Each brand has its own subdirectory.

## Directory Structure

```
sizing/
├── tucci-and-ego-7/    # Tucci & Ego 7 sizing charts
├── dappleeq/           # DappleEq sizing charts
├── hitchley-harrow/    # Hitchley & Harrow sizing charts
├── diamond-deluxe/     # Diamond Deluxe sizing charts
├── little-equine-co/   # Little Equine Co sizing charts
├── jp-equestrian/      # JP Equestrian Fashion sizing charts
├── plum-tack/          # Plum Tack sizing charts
├── anky/               # Anky sizing charts
├── jnk-collective/     # JNK Collective sizing charts
├── lemieux/            # Lemieux sizing charts
├── roeckl/             # Roeckl Gloves sizing charts
├── baxter/             # Baxter Boots sizing charts
├── cavalleria-toscana/ # Cavalleria Toscana sizing charts
└── ariat/              # Ariat sizing charts
```

## Adding New Sizing Charts

1. Place sizing chart images in the appropriate brand folder
2. Use descriptive filenames (e.g., `boot-chart.jpg`, `apparel-chart.jpg`)
3. Optimize images for web (recommended max width: 1200px)
4. Supported formats: JPG, PNG, WebP
5. Update the configuration in `lib/sizing/sizing-config.ts` if needed

## Image Guidelines

- **Resolution**: High enough to read measurements clearly
- **File Size**: Optimize to keep under 500KB per image
- **Format**: JPG for photos, PNG for charts with text
- **Naming**: Use lowercase with hyphens (e.g., `boot-sizing-chart.jpg`)

## Migration from Current Site

To migrate from https://www.theequestrian.com.au/pages/sizing-charts:

1. Download all sizing chart images from each brand's sizing page
2. Place them in the corresponding brand folder here
3. Update image filenames in `lib/sizing/sizing-config.ts` if they differ
4. Test the pages at `/sizing` and `/sizing/[brand-slug]`

