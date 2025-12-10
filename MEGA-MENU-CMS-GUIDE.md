# Mega Menu CSV CMS Guide

## 🎯 Overview

The mega menu uses a CSV file as a Content Management System. This gives you **complete control** over all content without touching code:

- **Featured Hero Image** (large image with title/subtitle)
- **2 Quick Links** (below the hero)
- **6 Subcategory Cards** (right side grid - 2 columns × 3 rows)

You control the **image, title, and link** for every single element!

---

## 📁 CSV Location

```
exports/mega-menu-content.csv
```

---

## 📊 CSV Structure

### 1️⃣ Featured Hero Section (Large Image)

| Column | Description | Example |
|--------|-------------|---------|
| `category` | Category handle (lowercase) | `horse`, `rider`, `pet` |
| `featured_image_url` | Large hero image URL | `https://cdn.shopify.com/.../rug.jpg` |
| `featured_title` | Main title | `Premium Horse Rugs` |
| `featured_subtitle` | Subtitle | `Waterproof & Breathable` |
| `featured_link` | Hero link destination | `/horse/rugs` |

### 2️⃣ Quick Links (2 Cards Below Hero)

| Column | Description | Example |
|--------|-------------|---------|
| `quick_link_1_title` | First quick link title | `Riding Boots` |
| `quick_link_1_image_url` | First quick link image | `https://cdn.shopify.com/.../boot.jpg` |
| `quick_link_1_link` | First quick link URL | `/horse/boots` |
| `quick_link_2_title` | Second quick link title | `Saddles` |
| `quick_link_2_image_url` | Second quick link image | `https://cdn.shopify.com/.../saddle.jpg` |
| `quick_link_2_link` | Second quick link URL | `/horse/saddles` |

### 3️⃣ Subcategory Cards (6 Cards - Right Side Grid)

| Column | Description | Example |
|--------|-------------|---------|
| `card_1_title` | First card title | `Horse Rugs` |
| `card_1_image_url` | First card image | `https://cdn.shopify.com/.../rug.jpg` |
| `card_1_link` | First card link | `/horse/rugs` |
| `card_2_title` | Second card title | `Boots & Wraps` |
| `card_2_image_url` | Second card image | `https://cdn.shopify.com/.../boot.jpg` |
| `card_2_link` | Second card link | `/horse/boots` |
| `card_3_title` | Third card title | `Saddles & Tack` |
| `card_3_image_url` | Third card image | `https://cdn.shopify.com/.../saddle.jpg` |
| `card_3_link` | Third card link | `/horse/saddles` |
| `card_4_title` | Fourth card title | `Bridles & Reins` |
| `card_4_image_url` | Fourth card image | `https://cdn.shopify.com/.../bridle.jpg` |
| `card_4_link` | Fourth card link | `/horse/bridles` |
| `card_5_title` | Fifth card title | `Grooming` |
| `card_5_image_url` | Fifth card image | `https://cdn.shopify.com/.../grooming.jpg` |
| `card_5_link` | Fifth card link | `/horse/grooming` |
| `card_6_title` | Sixth card title | `Horse Health` |
| `card_6_image_url` | Sixth card image | `https://cdn.shopify.com/.../health.jpg` |
| `card_6_link` | Sixth card link | `/horse/health` |

---

## 🎨 Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│                     MEGA MENU - HORSE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LEFT SIDE                    RIGHT SIDE (6 CARDS)         │
│  ┌────────────────────────┐  ┌──────────┬──────────┐      │
│  │                        │  │ Card 1   │ Card 2   │      │
│  │   Featured Hero        │  │  [img]   │  [img]   │      │
│  │   (Large Image)        │  │  Title   │  Title   │      │
│  │                        │  ├──────────┼──────────┤      │
│  │   Title & Subtitle     │  │ Card 3   │ Card 4   │      │
│  └────────────────────────┘  │  [img]   │  [img]   │      │
│                              │  Title   │  Title   │      │
│  ┌──────────┬──────────┐    ├──────────┼──────────┤      │
│  │ Quick 1  │ Quick 2  │    │ Card 5   │ Card 6   │      │
│  │  [img]   │  [img]   │    │  [img]   │  [img]   │      │
│  │  Title   │  Title   │    │  Title   │  Title   │      │
│  └──────────┴──────────┘    └──────────┴──────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Example CSV Entry

Here's a complete example for the Horse category:

```csv
category,featured_image_url,featured_title,featured_subtitle,featured_link,quick_link_1_title,quick_link_1_image_url,quick_link_1_link,quick_link_2_title,quick_link_2_image_url,quick_link_2_link,card_1_title,card_1_image_url,card_1_link,card_2_title,card_2_image_url,card_2_link,card_3_title,card_3_image_url,card_3_link,card_4_title,card_4_image_url,card_4_link,card_5_title,card_5_image_url,card_5_link,card_6_title,card_6_image_url,card_6_link
horse,https://cdn.shopify.com/s/files/1/0562/0963/7457/files/turnout-rug-hero.jpg,Premium Horse Rugs,Waterproof & Breathable Collection,/horse/rugs,Riding Boots,https://cdn.shopify.com/.../boot.jpg,/horse/boots,Saddles,https://cdn.shopify.com/.../saddle.jpg,/horse/saddles,Horse Rugs,https://cdn.shopify.com/.../rug1.jpg,/horse/rugs,Boots & Wraps,https://cdn.shopify.com/.../boot1.jpg,/horse/boots,Saddles & Tack,https://cdn.shopify.com/.../saddle1.jpg,/horse/saddles,Bridles & Reins,https://cdn.shopify.com/.../bridle1.jpg,/horse/bridles,Grooming,https://cdn.shopify.com/.../grooming1.jpg,/horse/grooming,Horse Health,https://cdn.shopify.com/.../health1.jpg,/horse/health
```

---

## 🚀 How to Use

### Step 1: Get Image URLs from Shopify

1. Go to any product in Shopify Admin
2. Right-click on the product image
3. Select **"Copy Image Address"**
4. You'll get a URL like: `https://cdn.shopify.com/s/files/1/0562/0963/7457/files/image.jpg`

### Step 2: Fill Out the CSV

Open `exports/mega-menu-content.csv` and fill in one row per category:

```csv
category,featured_image_url,featured_title,...
horse,https://cdn.shopify.com/.../rug.jpg,Premium Horse Rugs,...
rider,https://cdn.shopify.com/.../jacket.jpg,Rider Apparel,...
```

### Step 3: Deploy

```bash
git add exports/mega-menu-content.csv
git commit -m "Update mega menu content"
git push
```

Changes go live in ~5 minutes! ✅

---

## 🛡️ Graceful Fallbacks

**What happens if you leave fields empty?**

| What You Leave Empty | What Happens |
|---------------------|--------------|
| **Entire category row** | Auto-generates from your mapping CSV (shows first 6 subcategories) |
| **Featured hero** | Shows gradient placeholder with generic text |
| **Quick links** | Auto-generates from first 2 subcategory cards |
| **Some cards (1-5)** | Shows only the cards you defined, fills rest with auto-generated |
| **All 6 cards** | Auto-generates all 6 from mapping CSV |

**The mega menu never breaks!** It always has content to show.

---

## 💡 Pro Tips

### 1. Image Sizes

| Element | Recommended Size | Aspect Ratio |
|---------|-----------------|--------------|
| Featured Hero | 1200×800px | 3:2 |
| Quick Links | 400×400px | 1:1 (square) |
| Subcategory Cards | 600×600px | 1:1 (square) |

### 2. Text Guidelines

| Element | Character Limit | Recommendation |
|---------|----------------|----------------|
| Featured Title | 30 chars | 2-4 words (e.g., "Premium Horse Rugs") |
| Featured Subtitle | 50 chars | 3-6 words (e.g., "Waterproof & Breathable") |
| Card Titles | 20 chars | 1-3 words (e.g., "Boots & Wraps") |
| Quick Link Titles | 20 chars | 1-2 words (e.g., "Riding Boots") |

### 3. Link Destinations

- Use relative URLs: `/horse/rugs` (not full URLs)
- Can link to:
  - Subcategory pages: `/horse/rugs`
  - Category pages: `/horse`
  - Product pages: `/horse/rugs/turnout-rug-product`
  - Sale pages: `/on-sale`
  - Any page on your site!

### 4. Seasonal Updates

Update the CSV for seasonal promotions:

```csv
# Winter Season
horse,https://.../winter-rug.jpg,Winter Rugs Sale,Up to 40% Off,...

# Summer Season
horse,https://.../summer-gear.jpg,Summer Essentials,Keep Your Horse Cool,...
```

### 5. Testing Locally

```bash
npm run dev
# Hover over menu items to see changes
```

CSV auto-reloads on file changes during development!

---

## 🔍 Troubleshooting

### Images Not Showing

**Problem:** Image URLs are broken or not loading

**Solution:**
1. Verify the URL works by pasting it in your browser
2. Ensure it's a Shopify CDN URL (`cdn.shopify.com`)
3. Check for typos in the CSV

### Changes Not Appearing

**Problem:** Updated CSV but mega menu looks the same

**Solution:**
1. **Local dev:** Refresh the page (CSV auto-reloads)
2. **Production:** Wait 5 minutes for deployment
3. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+F5)

### CSV Parsing Errors

**Problem:** Mega menu not loading at all

**Solution:**
1. Check CSV syntax (commas, quotes)
2. Ensure no extra commas at end of rows
3. Verify all rows have same number of columns
4. Use a CSV validator tool

---

## 📦 Complete Example

Here's a full CSV with all 5 categories:

```csv
category,featured_image_url,featured_title,featured_subtitle,featured_link,quick_link_1_title,quick_link_1_image_url,quick_link_1_link,quick_link_2_title,quick_link_2_image_url,quick_link_2_link,card_1_title,card_1_image_url,card_1_link,card_2_title,card_2_image_url,card_2_link,card_3_title,card_3_image_url,card_3_link,card_4_title,card_4_image_url,card_4_link,card_5_title,card_5_image_url,card_5_link,card_6_title,card_6_image_url,card_6_link
horse,https://cdn.shopify.com/.../rug.jpg,Premium Horse Rugs,Waterproof & Breathable,/horse/rugs,Boots,https://cdn.shopify.com/.../boot.jpg,/horse/boots,Saddles,https://cdn.shopify.com/.../saddle.jpg,/horse/saddles,Rugs,https://cdn.shopify.com/.../rug1.jpg,/horse/rugs,Boots,https://cdn.shopify.com/.../boot1.jpg,/horse/boots,Saddles,https://cdn.shopify.com/.../saddle1.jpg,/horse/saddles,Bridles,https://cdn.shopify.com/.../bridle1.jpg,/horse/bridles,Grooming,https://cdn.shopify.com/.../groom1.jpg,/horse/grooming,Health,https://cdn.shopify.com/.../health1.jpg,/horse/health
rider,https://cdn.shopify.com/.../jacket.jpg,Rider Apparel,New Season Collection,/rider/jackets,Breeches,https://cdn.shopify.com/.../breech.jpg,/rider/breeches,Helmets,https://cdn.shopify.com/.../helmet.jpg,/rider/helmets,Jackets,https://cdn.shopify.com/.../jacket1.jpg,/rider/jackets,Breeches,https://cdn.shopify.com/.../breech1.jpg,/rider/breeches,Helmets,https://cdn.shopify.com/.../helmet1.jpg,/rider/helmets,Boots,https://cdn.shopify.com/.../rboot1.jpg,/rider/boots,Gloves,https://cdn.shopify.com/.../glove1.jpg,/rider/gloves,Accessories,https://cdn.shopify.com/.../acc1.jpg,/rider/accessories
pet,https://cdn.shopify.com/.../dog-bed.jpg,Pet Essentials,Comfort & Style,/pet/dog,Dog Toys,https://cdn.shopify.com/.../toy.jpg,/pet/dog/toys,Cat Beds,https://cdn.shopify.com/.../catbed.jpg,/pet/cat/beds,Dog Beds,https://cdn.shopify.com/.../dogbed1.jpg,/pet/dog/beds,Dog Toys,https://cdn.shopify.com/.../toy1.jpg,/pet/dog/toys,Cat Toys,https://cdn.shopify.com/.../cattoy1.jpg,/pet/cat/toys,Dog Food,https://cdn.shopify.com/.../food1.jpg,/pet/dog/food,Cat Food,https://cdn.shopify.com/.../catfood1.jpg,/pet/cat/food,Pet Health,https://cdn.shopify.com/.../pethealth1.jpg,/pet/health
clothing,https://cdn.shopify.com/.../casual.jpg,Casual Wear,Everyday Comfort,/clothing/casual,Activewear,https://cdn.shopify.com/.../active.jpg,/clothing/activewear,Outerwear,https://cdn.shopify.com/.../outer.jpg,/clothing/outerwear,T-Shirts,https://cdn.shopify.com/.../tshirt1.jpg,/clothing/tshirts,Hoodies,https://cdn.shopify.com/.../hoodie1.jpg,/clothing/hoodies,Jackets,https://cdn.shopify.com/.../jacket1.jpg,/clothing/jackets,Pants,https://cdn.shopify.com/.../pants1.jpg,/clothing/pants,Shorts,https://cdn.shopify.com/.../shorts1.jpg,/clothing/shorts,Accessories,https://cdn.shopify.com/.../acc1.jpg,/clothing/accessories
accessories,https://cdn.shopify.com/.../bag.jpg,Premium Accessories,Complete Your Look,/accessories/bags,Belts,https://cdn.shopify.com/.../belt.jpg,/accessories/belts,Hats,https://cdn.shopify.com/.../hat.jpg,/accessories/hats,Bags,https://cdn.shopify.com/.../bag1.jpg,/accessories/bags,Belts,https://cdn.shopify.com/.../belt1.jpg,/accessories/belts,Hats,https://cdn.shopify.com/.../hat1.jpg,/accessories/hats,Scarves,https://cdn.shopify.com/.../scarf1.jpg,/accessories/scarves,Jewelry,https://cdn.shopify.com/.../jewelry1.jpg,/accessories/jewelry,Sunglasses,https://cdn.shopify.com/.../sun1.jpg,/accessories/sunglasses
```

---

## ✅ Summary

**What You Control:**
- ✅ Featured hero image + title + subtitle + link
- ✅ 2 quick link cards (image + title + link)
- ✅ 6 subcategory cards (image + title + link)

**What Happens Automatically:**
- ✅ Auto-generates content if CSV is empty
- ✅ Auto-reloads on file changes
- ✅ Never breaks (graceful fallbacks)

**How to Update:**
1. Edit `exports/mega-menu-content.csv`
2. Commit and push
3. Changes live in 5 minutes

**No code changes needed - ever!** 🎯
