# ✅ Mega Menu - Complete Control via CSV

## 🎯 What You Asked For

> "can I change the categories we link to in each menu item. want control over image, title, and link"

**Answer: YES! You now have complete control over EVERY element in the mega menu.**

---

## 📊 What You Control

### **1. Featured Hero (Large Image)**
- ✅ Image URL
- ✅ Title
- ✅ Subtitle
- ✅ Link destination

### **2. Quick Links (2 Cards Below Hero)**
- ✅ Image URL (each)
- ✅ Title (each)
- ✅ Link destination (each)

### **3. Subcategory Cards (6 Cards on Right)**
- ✅ Image URL (all 6)
- ✅ Title (all 6)
- ✅ Link destination (all 6)

---

## 📝 How It Works

### **Single CSV File**

```
exports/mega-menu-content.csv
```

### **One Row Per Category**

Each row defines the entire mega menu for that category:

```csv
category,featured_image_url,featured_title,featured_subtitle,featured_link,
quick_link_1_title,quick_link_1_image_url,quick_link_1_link,
quick_link_2_title,quick_link_2_image_url,quick_link_2_link,
card_1_title,card_1_image_url,card_1_link,
card_2_title,card_2_image_url,card_2_link,
card_3_title,card_3_image_url,card_3_link,
card_4_title,card_4_image_url,card_4_link,
card_5_title,card_5_image_url,card_5_link,
card_6_title,card_6_image_url,card_6_link
```

---

## 🎨 Example: Horse Category

### **CSV Entry:**

```csv
horse,
https://cdn.shopify.com/.../winter-rug.jpg,
Winter Horse Rugs,
Waterproof & Warm,
/horse/rugs,
Riding Boots,
https://cdn.shopify.com/.../boot.jpg,
/horse/boots,
Premium Saddles,
https://cdn.shopify.com/.../saddle.jpg,
/horse/saddles,
Turnout Rugs,
https://cdn.shopify.com/.../turnout.jpg,
/horse/rugs/turnout,
Stable Rugs,
https://cdn.shopify.com/.../stable.jpg,
/horse/rugs/stable,
Riding Boots,
https://cdn.shopify.com/.../rboot.jpg,
/horse/boots,
English Saddles,
https://cdn.shopify.com/.../english.jpg,
/horse/saddles/english,
Bridles,
https://cdn.shopify.com/.../bridle.jpg,
/horse/bridles,
Grooming Kits,
https://cdn.shopify.com/.../grooming.jpg,
/horse/grooming
```

### **Result:**

```
┌─────────────────────────────────────────────────────────────┐
│                    HORSE MEGA MENU                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────┐  ┌──────────┬──────────┐      │
│  │                        │  │ Turnout  │ Stable   │      │
│  │  [Winter Rug Image]    │  │  Rugs    │  Rugs    │      │
│  │                        │  │  [img]   │  [img]   │      │
│  │  Winter Horse Rugs     │  ├──────────┼──────────┤      │
│  │  Waterproof & Warm     │  │ Riding   │ English  │      │
│  │  → /horse/rugs         │  │  Boots   │ Saddles  │      │
│  └────────────────────────┘  │  [img]   │  [img]   │      │
│                              ├──────────┼──────────┤      │
│  ┌──────────┬──────────┐    │ Bridles  │ Grooming │      │
│  │ Riding   │ Premium  │    │          │  Kits    │      │
│  │  Boots   │ Saddles  │    │  [img]   │  [img]   │      │
│  │  [img]   │  [img]   │    └──────────┴──────────┘      │
│  └──────────┴──────────┘                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### **Step 1: Get Image URLs**

1. Go to Shopify Admin → Products
2. Right-click any product image
3. **"Copy Image Address"**
4. Paste into CSV

### **Step 2: Fill CSV**

Open `exports/mega-menu-content.csv`:

```csv
category,featured_image_url,featured_title,...
horse,https://cdn.shopify.com/.../rug.jpg,Premium Rugs,...
```

### **Step 3: Deploy**

```bash
git add exports/mega-menu-content.csv
git commit -m "Update Horse mega menu"
git push
```

**Done!** Changes live in 5 minutes. ✅

---

## 💡 Key Features

### **1. Link to Anything**

You're not limited to subcategories! Link to:

- ✅ Subcategory pages: `/horse/rugs`
- ✅ Specific product types: `/horse/rugs/turnout`
- ✅ Individual products: `/horse/rugs/horseware-turnout-rug`
- ✅ Sale pages: `/on-sale`
- ✅ Brand pages: `/brands/horseware`
- ✅ Any URL on your site!

### **2. Custom Titles**

Use marketing-friendly titles instead of technical names:

| Technical | Marketing |
|-----------|-----------|
| `Rugs` | `Winter Warmth Collection` |
| `Boots` | `Protect Their Hooves` |
| `Saddles` | `Premium English Tack` |

### **3. Seasonal Updates**

Change the hero image and featured products by season:

**Winter:**
```csv
horse,https://.../winter-rug.jpg,Winter Rugs Sale,Up to 40% Off,...
```

**Summer:**
```csv
horse,https://.../fly-mask.jpg,Summer Essentials,Keep Cool & Protected,...
```

### **4. Promotional Campaigns**

Feature specific products or sales:

```csv
horse,https://.../black-friday.jpg,Black Friday Deals,Up to 60% Off,/on-sale,...
```

---

## 🛡️ Graceful Fallbacks

**What if you don't fill out the CSV?**

| What You Leave Empty | What Happens |
|---------------------|--------------|
| **Entire row** | Auto-generates from mapping (first 6 subcategories) |
| **Hero image** | Shows gradient placeholder |
| **Quick links** | Uses first 2 cards |
| **Some cards** | Shows what you defined + auto-fills rest |
| **All cards** | Auto-generates all 6 |

**The mega menu NEVER breaks!** Always has content to show.

---

## 📐 Design Guidelines

### **Image Sizes**

| Element | Size | Aspect Ratio |
|---------|------|--------------|
| Hero | 1200×800px | 3:2 (landscape) |
| Quick Links | 400×400px | 1:1 (square) |
| Cards | 600×600px | 1:1 (square) |

### **Text Length**

| Element | Max Length | Example |
|---------|-----------|---------|
| Hero Title | 30 chars | `Premium Horse Rugs` |
| Hero Subtitle | 50 chars | `Waterproof & Breathable` |
| Card Title | 20 chars | `Turnout Rugs` |
| Quick Link Title | 20 chars | `Riding Boots` |

---

## 🎯 Use Cases

### **1. Feature Best Sellers**

```csv
card_1_title,card_1_image_url,card_1_link
Best Seller: Turnout Rug,https://.../turnout.jpg,/products/horseware-turnout-rug
```

### **2. Promote New Arrivals**

```csv
card_1_title,card_1_image_url,card_1_link
New: Winter Collection,https://.../new-winter.jpg,/collections/new-arrivals
```

### **3. Cross-Sell Categories**

```csv
card_1_title,card_1_image_url,card_1_link
Complete the Look,https://.../matching-set.jpg,/horse/accessories
```

### **4. Seasonal Campaigns**

```csv
featured_title,featured_subtitle
Spring Sale,Save Up to 50%
```

---

## 📦 Complete Example

Here's a full Horse category setup:

```csv
category,featured_image_url,featured_title,featured_subtitle,featured_link,quick_link_1_title,quick_link_1_image_url,quick_link_1_link,quick_link_2_title,quick_link_2_image_url,quick_link_2_link,card_1_title,card_1_image_url,card_1_link,card_2_title,card_2_image_url,card_2_link,card_3_title,card_3_image_url,card_3_link,card_4_title,card_4_image_url,card_4_link,card_5_title,card_5_image_url,card_5_link,card_6_title,card_6_image_url,card_6_link
horse,https://cdn.shopify.com/s/files/1/0562/0963/7457/files/winter-rug-hero.jpg,Winter Horse Rugs,Waterproof & Warm - Up to 40% Off,/horse/rugs,Riding Boots,https://cdn.shopify.com/.../boot-quick.jpg,/horse/boots,Premium Saddles,https://cdn.shopify.com/.../saddle-quick.jpg,/horse/saddles,Turnout Rugs,https://cdn.shopify.com/.../turnout-card.jpg,/horse/rugs/turnout,Stable Rugs,https://cdn.shopify.com/.../stable-card.jpg,/horse/rugs/stable,Riding Boots,https://cdn.shopify.com/.../boot-card.jpg,/horse/boots,English Saddles,https://cdn.shopify.com/.../english-card.jpg,/horse/saddles/english,Bridles & Reins,https://cdn.shopify.com/.../bridle-card.jpg,/horse/bridles,Grooming Kits,https://cdn.shopify.com/.../grooming-card.jpg,/horse/grooming
```

---

## ✅ Summary

**You Now Have:**
- ✅ Complete control over all mega menu content
- ✅ 1 hero image + 2 quick links + 6 cards = **9 customizable elements**
- ✅ Control over image, title, and link for each
- ✅ No code changes needed
- ✅ Update via CSV → commit → push → live in 5 minutes
- ✅ Graceful fallbacks if CSV is empty
- ✅ Auto-reloads during development

**Perfect for:**
- 🎯 Seasonal campaigns
- 🎯 Product promotions
- 🎯 Cross-selling
- 🎯 Featured collections
- 🎯 Marketing campaigns

**See full guide:** `MEGA-MENU-CMS-GUIDE.md`

---

## 🎉 Ready to Use!

The CSV is already created at `exports/mega-menu-content.csv` with empty rows for all 5 categories. Just fill it out and push! 🚀

