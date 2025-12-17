# Download Sizing Chart Images

## Quick Download Script

I've started downloading the sizing chart images. Here's what's been done and what remains:

### ✅ Completed: Tucci & Ego 7

Downloaded 5 images:
- tucci-chart-1.png
- tucci-chart-2.png
- ego7-chart-1.jpg
- ego7-chart-2.png
- ego7-chart-3.png

### 📋 Remaining Brands

To download the remaining brand images, visit each page and run the curl commands below:

#### 1. DappleEq
Visit: https://theequestrian.myshopify.com/pages/dappleeq-sizing-charts-1

```bash
cd "public/sizing/dappleeq"
# Add curl commands after visiting the page and finding image URLs
```

#### 2. Hitchley & Harrow
Visit: https://theequestrian.myshopify.com/pages/hitchley-harrow-sizing-charts

```bash
cd "public/sizing/hitchley-harrow"
# Add curl commands after visiting the page
```

#### 3. Diamond Deluxe
Visit: https://theequestrian.myshopify.com/pages/diamond-deluxe-sizing-charts

```bash
cd "public/sizing/diamond-deluxe"
# Add curl commands after visiting the page
```

#### 4. Little Equine Co
Visit: https://theequestrian.myshopify.com/pages/little-equine-co-sizing-charts

```bash
cd "public/sizing/little-equine-co"
# Add curl commands after visiting the page
```

#### 5. JP Equestrian Fashion
Visit: https://www.theequestrian.com.au/pages/jp-equestrian-fashion-sizing-chart

```bash
cd "public/sizing/jp-equestrian"
# Add curl commands after visiting the page
```

#### 6. Plum Tack
Visit: https://www.theequestrian.com.au/pages/plum-tack-size-charts

```bash
cd "public/sizing/plum-tack"
# Add curl commands after visiting the page
```

#### 7. Anky
Visit: https://www.theequestrian.com.au/pages/anky-size-charts

```bash
cd "public/sizing/anky"
# Add curl commands after visiting the page
```

#### 8. JNK Collective
Visit: https://www.theequestrian.com.au/pages/jnk-collective-sizing-charts

```bash
cd "public/sizing/jnk-collective"
# Add curl commands after visiting the page
```

#### 9. Lemieux
Visit: https://www.theequestrian.com.au/pages/lemiuex-size-charts

```bash
cd "public/sizing/lemieux"
# Add curl commands after visiting the page
```

#### 10. Roeckl
Visit: https://www.theequestrian.com.au/pages/roeckl-size-chart

```bash
cd "public/sizing/roeckl"
# Add curl commands after visiting the page
```

#### 11. Baxter Boots
Visit: https://www.theequestrian.com.au/pages/baxter-boots-size-guide

```bash
cd "public/sizing/baxter"
# Add curl commands after visiting the page
```

#### 12. Cavalleria Toscana
Visit: https://www.theequestrian.com.au/pages/cavalleria-toscana-sizing-chart

```bash
cd "public/sizing/cavalleria-toscana"
# Add curl commands after visiting the page
```

#### 13. Ariat
(Not on the main list, but configured)

```bash
cd "public/sizing/ariat"
# Add images if available
```

## How to Extract Image URLs

1. Visit the brand's sizing page
2. Right-click on each sizing chart image
3. Select "Copy Image Address" or "Open Image in New Tab"
4. The URL will be in format: `https://cdn.shopify.com/s/files/1/0562/0963/7457/files/[filename]`
5. Use curl to download:

```bash
curl -k -o [local-filename] "[image-url]"
```

## After Downloading

1. Update `lib/sizing/sizing-config.ts` with actual filenames
2. Test the pages at `/sizing/[brand-slug]`
3. Remove the "Coming Soon" banner from `app/sizing/[brand]/page.tsx` once all images are added

## Example: Complete Download Command

```bash
cd "/Users/jonofarrington/Documents/Cursor Project/the-equestrian-headless/public/sizing/[brand]"
curl -k -o chart-1.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/[filename1]" && \
curl -k -o chart-2.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/[filename2]"
```

## Current Status

- ✅ Trailrace: 5 images downloaded
- ⏳ DappleEq: Pending
- ⏳ Hitchley & Harrow: Pending
- ⏳ Diamond Deluxe: Pending
- ⏳ Little Equine Co: Pending
- ⏳ JP Equestrian Fashion: Pending
- ⏳ Plum Tack: Pending
- ⏳ Anky: Pending
- ⏳ JNK Collective: Pending
- ⏳ Lemieux: Pending
- ⏳ Roeckl: Pending
- ⏳ Baxter Boots: Pending
- ⏳ Cavalleria Toscana: Pending
- ⏳ Ariat: Pending

