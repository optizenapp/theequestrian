# 🎨 Mega Menu Update Guide

## 📋 How the Mega Menu Works

The mega menu content is loaded from `exports/mega-menu-content.csv` and includes:

- **Featured Image** - Large hero image on the left
- **Quick Links** - 2 quick access links with images
- **Subcategory Cards** - 6 category cards on the right

### **CSV Structure:**

```csv
category,featured_image_url,featured_title,featured_subtitle,featured_link,
quick_link_1_title,quick_link_1_image_url,quick_link_1_link,
quick_link_2_title,quick_link_2_image_url,quick_link_2_link,
card_1_title,card_1_image_url,card_1_link,
...
card_6_title,card_6_image_url,card_6_link
```

---

## 🚀 How to Update the Mega Menu

### **Step 1: Edit the CSV File**

Edit `exports/mega-menu-content.csv` with your changes:

```csv
category,featured_image_url,featured_title,featured_subtitle,featured_link,...
horse,https://cdn.shopify.com/.../image.png,Horse,Best for your horse,/horse,...
rider,https://cdn.shopify.com/.../image.png,Rider,Best for you!,/rider,...
```

**Supported categories:**
- `horse`
- `rider`
- `clothing`
- `pet`
- `accessories`

---

### **Step 2: Commit and Push**

```bash
git add exports/mega-menu-content.csv
git commit -m "Update mega menu content"
git push origin main
```

---

### **Step 3: Vercel Deploys Automatically**

Vercel will:
1. ✅ Deploy the updated CSV file
2. ✅ Next.js reads the new file
3. ✅ Cache detects file modification
4. ✅ Mega menu updates automatically!

**No manual cache clearing needed!** The code automatically detects file changes.

---

## 🔍 How the Cache Works

### **Smart File-Based Caching:**

```tsx
// lib/content/mega-menu-content.ts
let cachedContent: Map<string, MegaMenuContent> | null = null;
let lastModified: number = 0;

function loadMegaMenuContent(): Map<string, MegaMenuContent> {
  const csvPath = path.join(process.cwd(), 'exports', 'mega-menu-content.csv');
  const stats = fs.statSync(csvPath);
  const currentModified = stats.mtimeMs;
  
  // Return cached content if file hasn't changed
  if (cachedContent && lastModified === currentModified) {
    return cachedContent;
  }
  
  // File changed - reload from CSV
  // ... load and parse CSV ...
  
  // Update cache
  cachedContent = contentMap;
  lastModified = currentModified;
}
```

**Key Features:**
- ✅ Caches content in memory for performance
- ✅ Checks file modification time on each request
- ✅ Auto-reloads when file changes
- ✅ No manual cache clearing needed

---

## 📝 CSV Field Reference

### **Featured Image Section:**

| Field | Description | Required |
|-------|-------------|----------|
| `category` | Category slug (horse, rider, etc.) | ✅ Yes |
| `featured_image_url` | Large hero image URL | No |
| `featured_title` | Title text (e.g., "Horse") | No |
| `featured_subtitle` | Subtitle text (e.g., "Best for your horse") | No |
| `featured_link` | Link URL (e.g., "/horse") | No |

### **Quick Links Section:**

| Field | Description | Required |
|-------|-------------|----------|
| `quick_link_1_title` | First quick link title | No |
| `quick_link_1_image_url` | First quick link image | No |
| `quick_link_1_link` | First quick link URL | No |
| `quick_link_2_title` | Second quick link title | No |
| `quick_link_2_image_url` | Second quick link image | No |
| `quick_link_2_link` | Second quick link URL | No |

### **Subcategory Cards (1-6):**

| Field | Description | Required |
|-------|-------------|----------|
| `card_1_title` | First card title | No |
| `card_1_image_url` | First card image | No |
| `card_1_link` | First card URL | No |
| ... | (repeat for cards 2-6) | No |

---

## 🎯 Example: Adding a New Category

### **1. Add row to CSV:**

```csv
clothing,https://cdn.shopify.com/.../clothing-hero.jpg,Clothing,Style & Comfort,/clothing,
Riding Boots,https://cdn.shopify.com/.../boots.jpg,/clothing/boots,
Helmets,https://cdn.shopify.com/.../helmets.jpg,/clothing/helmets,
Jackets,https://cdn.shopify.com/.../jackets.jpg,/clothing/jackets,
Pants,https://cdn.shopify.com/.../pants.jpg,/clothing/pants,
Shirts,https://cdn.shopify.com/.../shirts.jpg,/clothing/shirts,
Gloves,https://cdn.shopify.com/.../gloves.jpg,/clothing/gloves,
Socks,https://cdn.shopify.com/.../socks.jpg,/clothing/socks,
Accessories,https://cdn.shopify.com/.../accessories.jpg,/clothing/accessories
```

### **2. Commit and push:**

```bash
git add exports/mega-menu-content.csv
git commit -m "Add clothing mega menu content"
git push origin main
```

### **3. Done!**

Vercel deploys → Mega menu updates automatically ✅

---

## 🧪 Testing Your Changes

### **1. Local Testing:**

```bash
# Start dev server
npm run dev

# Visit http://localhost:3000
# Hover over navigation to see mega menu
```

### **2. Production Testing:**

After deployment:
1. Visit your site
2. Hover over the navigation
3. Check that your changes appear
4. Verify all images load
5. Test all links work

---

## 🔧 Troubleshooting

### **Issue: Changes not appearing**

**Solution 1: Hard refresh**
```
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows)
```

**Solution 2: Check CSV format**
- Ensure no extra commas
- Ensure all URLs are valid
- Ensure category name matches exactly

**Solution 3: Check Vercel deployment**
- Go to Vercel dashboard
- Check deployment logs
- Verify CSV file was deployed

### **Issue: Images not loading**

**Check:**
- ✅ Image URLs are valid Shopify CDN URLs
- ✅ Images are not deleted from Shopify
- ✅ URLs don't have extra spaces
- ✅ URLs are properly encoded

### **Issue: Links not working**

**Check:**
- ✅ Links start with `/` (e.g., `/horse/boots`)
- ✅ Links match your URL structure
- ✅ Categories exist in your mapping

---

## 📊 Current Categories

Your site currently has mega menu content for:

| Category | Featured Image | Quick Links | Cards |
|----------|----------------|-------------|-------|
| **horse** | ✅ Yes | ✅ 2 | ✅ 6 |
| **rider** | ✅ Yes | ✅ 2 | ✅ 6 |
| **clothing** | ❌ No | ❌ No | ❌ No |
| **pet** | ❌ No | ❌ No | ❌ No |
| **accessories** | ❌ No | ❌ No | ❌ No |

---

## 🎨 Best Practices

### **Images:**

1. **Use Shopify CDN URLs**
   - ✅ `https://cdn.shopify.com/s/files/1/0562/0963/7457/files/image.jpg`
   - ❌ External URLs (slow, unreliable)

2. **Optimize image sizes**
   - Featured image: ~800x600px
   - Quick links: ~400x300px
   - Cards: ~300x300px

3. **Use descriptive alt text**
   - Set in Shopify media library
   - Helps with SEO and accessibility

### **Links:**

1. **Use relative URLs**
   - ✅ `/horse/boots`
   - ❌ `https://theequestrian.com/horse/boots`

2. **Match your URL structure**
   - Use canonical category-based URLs
   - Test links before deploying

3. **Keep links consistent**
   - Use the same format throughout
   - Avoid trailing slashes (unless consistent)

### **Content:**

1. **Keep titles short**
   - Featured title: 1-2 words
   - Card titles: 1-3 words

2. **Write compelling subtitles**
   - Featured subtitle: 3-6 words
   - Focus on benefits

3. **Maintain consistency**
   - Use similar tone across categories
   - Keep formatting consistent

---

## 🚀 Quick Update Workflow

### **Standard Update:**

```bash
# 1. Edit CSV
vim exports/mega-menu-content.csv

# 2. Test locally
npm run dev

# 3. Commit and push
git add exports/mega-menu-content.csv
git commit -m "Update mega menu: [describe changes]"
git push origin main

# 4. Verify on production
# Visit site after Vercel deployment completes
```

### **Batch Update:**

If updating multiple things at once:

```bash
# 1. Make all your changes
# - Edit mega menu CSV
# - Update other files
# - etc.

# 2. Commit everything together
git add .
git commit -m "Update site content: mega menu, categories, etc."
git push origin main
```

---

## 📚 Related Files

- **CSV File:** `exports/mega-menu-content.csv`
- **Loader:** `lib/content/mega-menu-content.ts`
- **Component:** `components/header/HeaderNavigation.tsx`
- **API:** `app/api/mapping/subcategories-with-images/route.ts`

---

## 🎉 Summary

**To update the mega menu:**

1. ✅ Edit `exports/mega-menu-content.csv`
2. ✅ Commit and push to GitHub
3. ✅ Vercel deploys automatically
4. ✅ Mega menu updates (cache auto-refreshes)

**No manual steps needed!** The system handles everything automatically. 🚀
