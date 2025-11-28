# 3-Level Hierarchy Mapping Template

## 📋 Overview

This template supports a 3-level URL structure:
```
/{top_level}/{parent_category}/{subcategory}

Examples:
/rider/apparel/womens-breeches
/horse/rugs/turnout-rugs
/farm-stable/fencing/electric-fencing
```

---

## 📊 CSV Format

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| `top_level` | Top-level category (matches main menu) | `rider`, `horse`, `farm-stable` |
| `parent_category` | Parent category (middle level) | `apparel`, `footwear`, `rugs` |
| `subcategory_handle` | Final subcategory (URL-friendly) | `womens-breeches`, `riding-boots` |
| `product_type` | Exact product type from Shopify | `Womens Breeches`, `Riding Boots` |
| `action` | `include`, `exclude`, or `merge` | `include` |
| `merge_to` | Target subcategory if merging | `womens-breeches` |
| `notes` | Optional notes | Any comments |

---

## 🎯 Top-Level Categories

Based on your menu structure:

- **`rider`** - All rider apparel, footwear, helmets, accessories
- **`horse`** - All horse equipment, care, rugs, boots, tack
- **`farm-stable`** - All farm, stable, and yard supplies

---

## 📝 Example Mapping

```csv
top_level,parent_category,subcategory_handle,product_type,action,merge_to,notes
rider,apparel,womens-breeches,Womens Breeches,include,,
rider,apparel,womens-breeches,Ladies Breeches,merge,womens-breeches,Merge with womens-breeches
rider,apparel,womens-jackets,Womens Jackets,include,,
rider,apparel,womens-base-layers,Base Layers,include,,
rider,apparel,mens-breeches,Mens Breeches,include,,
rider,apparel,mens-jackets,Mens Jackets,include,,
rider,apparel,childrens-breeches,Kids Breeches,include,,
rider,apparel,childrens-jodhpurs,Childrens Jodhpurs,include,,
rider,footwear,riding-boots,Riding Boots,include,,
rider,footwear,paddock-boots,Paddock Boots,include,,
rider,footwear,boot-accessories,Boot Care,include,,
rider,helmets,schooling-helmets,Schooling Helmets,include,,
rider,helmets,show-helmets,Show Helmets,include,,
rider,helmets,helmet-accessories,Helmet Accessories,include,,
rider,accessories,gloves,Riding Gloves,include,,
rider,accessories,spurs,Spurs,include,,
rider,accessories,spurs,RIDER: Spurs,merge,spurs,Merge with spurs
rider,accessories,whips,Riding Whips,include,,
horse,rugs,turnout-lightweight,Lightweight Turnout,include,,
horse,rugs,turnout-medium,Medium Turnout,include,,
horse,rugs,turnout-heavyweight,Heavyweight Turnout,include,,
horse,rugs,stable-rugs,Stable Rugs,include,,
horse,rugs,fleece-rugs,Fleece Rugs,include,,
horse,rugs,fly-sheets,Fly Sheets,include,,
horse,rugs,rug-accessories,Rug Accessories,include,,
horse,boots-bandages,brushing-boots,Brushing Boots,include,,
horse,boots-bandages,tendon-boots,Tendon Boots,include,,
horse,boots-bandages,fetlock-boots,Fetlock Boots,include,,
horse,boots-bandages,polo-wraps,Polo Wraps,include,,
horse,boots-bandages,bandages,Horse Bandages,include,,
horse,grooming,brushes,Grooming Brushes,include,,
horse,grooming,shampoos,Horse Shampoo,include,,
horse,grooming,grooming-kits,Grooming Kits,include,,
horse,grooming,mane-tail-care,Mane & Tail Care,include,,
horse,health,supplements,Horse Supplements,include,,
horse,health,first-aid,First Aid,include,,
horse,health,medications,Horse Medications,include,,
horse,health,wound-care,Wound Care,include,,
horse,tack,saddles,Saddles,include,,
horse,tack,saddle-pads,Saddle Pads,include,,
horse,tack,bridles,Bridles,include,,
horse,tack,bits,Horse Bits,include,,
horse,tack,stirrups,Stirrups,include,,
horse,tack,girths,Girths,include,,
horse,tack,reins,Reins,include,,
horse,tack,halters,Horse Halters,include,,
horse,tack,lead-ropes,Lead Ropes,include,,
horse,toys-treats,horse-toys,Horse Toys,include,,
horse,toys-treats,treats,Horse Treats,include,,
horse,toys-treats,enrichment,Horse Enrichment,include,,
farm-stable,stable,stable-equipment,Stable Equipment,include,,
farm-stable,stable,feed-storage,Feed Storage,include,,
farm-stable,stable,water-systems,Water Systems,include,,
farm-stable,stable,stable-accessories,Stable Accessories,include,,
farm-stable,fencing,electric-fencing,Electric Fencing,include,,
farm-stable,fencing,fence-posts,Fence Posts,include,,
farm-stable,fencing,gates,Farm Gates,include,,
farm-stable,yard,yard-tools,Yard Tools,include,,
farm-stable,yard,wheelbarrows,Wheelbarrows,include,,
farm-stable,yard,muck-management,Muck Management,include,,
farm-stable,feeding,hay-nets,Hay Nets,include,,
farm-stable,feeding,feed-buckets,Feed Buckets,include,,
farm-stable,feeding,water-buckets,Water Buckets,include,,
```

---

## 🔄 Actions Explained

### `include` - Create Subcategory
Creates a page at `/{top_level}/{parent_category}/{subcategory_handle}`

**Example:**
```csv
rider,apparel,womens-breeches,Womens Breeches,include,,
```
→ Creates `/rider/apparel/womens-breeches`

---

### `exclude` - Skip Subcategory
Product only appears in parent category page

**Example:**
```csv
rider,apparel,,Test Product,exclude,,Test items
```
→ No subcategory created, products only in `/rider/apparel`

---

### `merge` - Combine Product Types
Multiple product types into one subcategory

**Example:**
```csv
rider,accessories,spurs,Spurs,include,,Main subcategory
rider,accessories,spurs,RIDER: Spurs,merge,spurs,Merge into spurs
rider,accessories,spurs,Spur Straps,merge,spurs,Merge into spurs
```
→ Creates one subcategory `/rider/accessories/spurs` with all three product types

---

## 🌳 Suggested Category Structure

### RIDER (Rider Equipment & Apparel)
```
/rider/
  ├── apparel/
  │   ├── womens-breeches
  │   ├── womens-jackets
  │   ├── womens-base-layers
  │   ├── womens-show-shirts
  │   ├── mens-breeches
  │   ├── mens-jackets
  │   ├── mens-polo-shirts
  │   ├── childrens-breeches
  │   ├── childrens-jodhpurs
  │   └── childrens-jackets
  ├── footwear/
  │   ├── riding-boots
  │   ├── paddock-boots
  │   ├── boot-accessories
  │   └── boot-care
  ├── helmets/
  │   ├── schooling-helmets
  │   ├── show-helmets
  │   └── helmet-accessories
  └── accessories/
      ├── gloves
      ├── spurs
      ├── whips
      ├── belts
      └── jewelry
```

### HORSE (Horse Equipment & Care)
```
/horse/
  ├── rugs/
  │   ├── turnout-lightweight
  │   ├── turnout-medium
  │   ├── turnout-heavyweight
  │   ├── stable-rugs
  │   ├── fleece-rugs
  │   ├── fly-sheets
  │   ├── coolers
  │   └── rug-accessories
  ├── boots-bandages/
  │   ├── brushing-boots
  │   ├── tendon-boots
  │   ├── fetlock-boots
  │   ├── overreach-boots
  │   ├── polo-wraps
  │   └── bandages
  ├── grooming/
  │   ├── brushes
  │   ├── shampoos
  │   ├── grooming-kits
  │   ├── mane-tail-care
  │   ├── hoof-care
  │   └── grooming-accessories
  ├── health/
  │   ├── supplements
  │   ├── first-aid
  │   ├── medications
  │   ├── wound-care
  │   └── vitamins
  ├── tack/
  │   ├── saddles
  │   ├── saddle-pads
  │   ├── bridles
  │   ├── bits
  │   ├── stirrups
  │   ├── girths
  │   ├── reins
  │   ├── halters
  │   ├── lead-ropes
  │   └── tack-accessories
  └── toys-treats/
      ├── horse-toys
      ├── treats
      └── enrichment
```

### FARM-STABLE (Farm & Stable Supplies)
```
/farm-stable/
  ├── stable/
  │   ├── stable-equipment
  │   ├── feed-storage
  │   ├── water-systems
  │   └── stable-accessories
  ├── fencing/
  │   ├── electric-fencing
  │   ├── fence-posts
  │   ├── gates
  │   └── fence-accessories
  ├── yard/
  │   ├── yard-tools
  │   ├── wheelbarrows
  │   ├── muck-management
  │   └── yard-accessories
  └── feeding/
      ├── hay-nets
      ├── feed-buckets
      ├── water-buckets
      └── feeding-accessories
```

---

## 📊 URL Examples

### Before (2-Level):
```
/footwear/riding-boots
/horse-rugs/turnout-rugs
/breeches/womens-breeches
```

### After (3-Level):
```
/rider/footwear/riding-boots
/horse/rugs/turnout-rugs
/rider/apparel/womens-breeches
```

---

## 🎯 Benefits

### SEO Benefits:
- ✅ **Topical clustering** - All related products under same parent
- ✅ **Keyword targeting** - Better URL hierarchy for search
- ✅ **Internal linking** - Stronger category relationships
- ✅ **Crawl efficiency** - Clearer site structure

### User Experience:
- ✅ **Intuitive navigation** - Logical category grouping
- ✅ **Better breadcrumbs** - Clear path: Home > Rider > Apparel > Women's Breeches
- ✅ **Easier discovery** - Related products grouped together

### Business Benefits:
- ✅ **Scalability** - Easy to add new categories
- ✅ **Merchandising** - Better category page control
- ✅ **Analytics** - Clearer performance tracking per category

---

## 🚀 Next Steps

1. **Copy this template** to `exports/mapping.csv`
2. **Fill in your product types** from `exports/product-types.csv`
3. **Map each product type** to the 3-level structure
4. **Review and adjust** category groupings
5. **Run dry-run** to preview changes
6. **Apply mapping** when ready

---

## ⚠️ Important Notes

### Primary Collection Format:
The `primary_collection` metafield will now be:
```
{top_level}/{parent_category}/{subcategory_handle}
```

Example: `rider/apparel/womens-breeches`

### Breadcrumbs Will Show:
```
Home > Rider > Apparel > Women's Breeches > Product Name
```

### Collection Pages:
You'll need pages for:
- Top level: `/rider/page.tsx`
- Parent category: `/rider/apparel/page.tsx`
- Subcategory: `/rider/apparel/womens-breeches/page.tsx`

---

## 📝 CSV Template (Copy This)

```csv
top_level,parent_category,subcategory_handle,product_type,action,merge_to,notes
```

Save as: `exports/mapping.csv`

Then fill in your product types!

---

## 💡 Tips

1. **Keep it consistent** - Use same parent categories across top levels
2. **Normalize handles** - Lowercase, hyphens, no special chars
3. **Group logically** - Think about user journey
4. **Check product counts** - Focus on categories with 10+ products
5. **Plan for growth** - Leave room for new categories

---

## 🎯 Ready to Map!

Open your `exports/product-types.csv` and start mapping to this 3-level structure! 🚀




## 📋 Overview

This template supports a 3-level URL structure:
```
/{top_level}/{parent_category}/{subcategory}

Examples:
/rider/apparel/womens-breeches
/horse/rugs/turnout-rugs
/farm-stable/fencing/electric-fencing
```

---

## 📊 CSV Format

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| `top_level` | Top-level category (matches main menu) | `rider`, `horse`, `farm-stable` |
| `parent_category` | Parent category (middle level) | `apparel`, `footwear`, `rugs` |
| `subcategory_handle` | Final subcategory (URL-friendly) | `womens-breeches`, `riding-boots` |
| `product_type` | Exact product type from Shopify | `Womens Breeches`, `Riding Boots` |
| `action` | `include`, `exclude`, or `merge` | `include` |
| `merge_to` | Target subcategory if merging | `womens-breeches` |
| `notes` | Optional notes | Any comments |

---

## 🎯 Top-Level Categories

Based on your menu structure:

- **`rider`** - All rider apparel, footwear, helmets, accessories
- **`horse`** - All horse equipment, care, rugs, boots, tack
- **`farm-stable`** - All farm, stable, and yard supplies

---

## 📝 Example Mapping

```csv
top_level,parent_category,subcategory_handle,product_type,action,merge_to,notes
rider,apparel,womens-breeches,Womens Breeches,include,,
rider,apparel,womens-breeches,Ladies Breeches,merge,womens-breeches,Merge with womens-breeches
rider,apparel,womens-jackets,Womens Jackets,include,,
rider,apparel,womens-base-layers,Base Layers,include,,
rider,apparel,mens-breeches,Mens Breeches,include,,
rider,apparel,mens-jackets,Mens Jackets,include,,
rider,apparel,childrens-breeches,Kids Breeches,include,,
rider,apparel,childrens-jodhpurs,Childrens Jodhpurs,include,,
rider,footwear,riding-boots,Riding Boots,include,,
rider,footwear,paddock-boots,Paddock Boots,include,,
rider,footwear,boot-accessories,Boot Care,include,,
rider,helmets,schooling-helmets,Schooling Helmets,include,,
rider,helmets,show-helmets,Show Helmets,include,,
rider,helmets,helmet-accessories,Helmet Accessories,include,,
rider,accessories,gloves,Riding Gloves,include,,
rider,accessories,spurs,Spurs,include,,
rider,accessories,spurs,RIDER: Spurs,merge,spurs,Merge with spurs
rider,accessories,whips,Riding Whips,include,,
horse,rugs,turnout-lightweight,Lightweight Turnout,include,,
horse,rugs,turnout-medium,Medium Turnout,include,,
horse,rugs,turnout-heavyweight,Heavyweight Turnout,include,,
horse,rugs,stable-rugs,Stable Rugs,include,,
horse,rugs,fleece-rugs,Fleece Rugs,include,,
horse,rugs,fly-sheets,Fly Sheets,include,,
horse,rugs,rug-accessories,Rug Accessories,include,,
horse,boots-bandages,brushing-boots,Brushing Boots,include,,
horse,boots-bandages,tendon-boots,Tendon Boots,include,,
horse,boots-bandages,fetlock-boots,Fetlock Boots,include,,
horse,boots-bandages,polo-wraps,Polo Wraps,include,,
horse,boots-bandages,bandages,Horse Bandages,include,,
horse,grooming,brushes,Grooming Brushes,include,,
horse,grooming,shampoos,Horse Shampoo,include,,
horse,grooming,grooming-kits,Grooming Kits,include,,
horse,grooming,mane-tail-care,Mane & Tail Care,include,,
horse,health,supplements,Horse Supplements,include,,
horse,health,first-aid,First Aid,include,,
horse,health,medications,Horse Medications,include,,
horse,health,wound-care,Wound Care,include,,
horse,tack,saddles,Saddles,include,,
horse,tack,saddle-pads,Saddle Pads,include,,
horse,tack,bridles,Bridles,include,,
horse,tack,bits,Horse Bits,include,,
horse,tack,stirrups,Stirrups,include,,
horse,tack,girths,Girths,include,,
horse,tack,reins,Reins,include,,
horse,tack,halters,Horse Halters,include,,
horse,tack,lead-ropes,Lead Ropes,include,,
horse,toys-treats,horse-toys,Horse Toys,include,,
horse,toys-treats,treats,Horse Treats,include,,
horse,toys-treats,enrichment,Horse Enrichment,include,,
farm-stable,stable,stable-equipment,Stable Equipment,include,,
farm-stable,stable,feed-storage,Feed Storage,include,,
farm-stable,stable,water-systems,Water Systems,include,,
farm-stable,stable,stable-accessories,Stable Accessories,include,,
farm-stable,fencing,electric-fencing,Electric Fencing,include,,
farm-stable,fencing,fence-posts,Fence Posts,include,,
farm-stable,fencing,gates,Farm Gates,include,,
farm-stable,yard,yard-tools,Yard Tools,include,,
farm-stable,yard,wheelbarrows,Wheelbarrows,include,,
farm-stable,yard,muck-management,Muck Management,include,,
farm-stable,feeding,hay-nets,Hay Nets,include,,
farm-stable,feeding,feed-buckets,Feed Buckets,include,,
farm-stable,feeding,water-buckets,Water Buckets,include,,
```

---

## 🔄 Actions Explained

### `include` - Create Subcategory
Creates a page at `/{top_level}/{parent_category}/{subcategory_handle}`

**Example:**
```csv
rider,apparel,womens-breeches,Womens Breeches,include,,
```
→ Creates `/rider/apparel/womens-breeches`

---

### `exclude` - Skip Subcategory
Product only appears in parent category page

**Example:**
```csv
rider,apparel,,Test Product,exclude,,Test items
```
→ No subcategory created, products only in `/rider/apparel`

---

### `merge` - Combine Product Types
Multiple product types into one subcategory

**Example:**
```csv
rider,accessories,spurs,Spurs,include,,Main subcategory
rider,accessories,spurs,RIDER: Spurs,merge,spurs,Merge into spurs
rider,accessories,spurs,Spur Straps,merge,spurs,Merge into spurs
```
→ Creates one subcategory `/rider/accessories/spurs` with all three product types

---

## 🌳 Suggested Category Structure

### RIDER (Rider Equipment & Apparel)
```
/rider/
  ├── apparel/
  │   ├── womens-breeches
  │   ├── womens-jackets
  │   ├── womens-base-layers
  │   ├── womens-show-shirts
  │   ├── mens-breeches
  │   ├── mens-jackets
  │   ├── mens-polo-shirts
  │   ├── childrens-breeches
  │   ├── childrens-jodhpurs
  │   └── childrens-jackets
  ├── footwear/
  │   ├── riding-boots
  │   ├── paddock-boots
  │   ├── boot-accessories
  │   └── boot-care
  ├── helmets/
  │   ├── schooling-helmets
  │   ├── show-helmets
  │   └── helmet-accessories
  └── accessories/
      ├── gloves
      ├── spurs
      ├── whips
      ├── belts
      └── jewelry
```

### HORSE (Horse Equipment & Care)
```
/horse/
  ├── rugs/
  │   ├── turnout-lightweight
  │   ├── turnout-medium
  │   ├── turnout-heavyweight
  │   ├── stable-rugs
  │   ├── fleece-rugs
  │   ├── fly-sheets
  │   ├── coolers
  │   └── rug-accessories
  ├── boots-bandages/
  │   ├── brushing-boots
  │   ├── tendon-boots
  │   ├── fetlock-boots
  │   ├── overreach-boots
  │   ├── polo-wraps
  │   └── bandages
  ├── grooming/
  │   ├── brushes
  │   ├── shampoos
  │   ├── grooming-kits
  │   ├── mane-tail-care
  │   ├── hoof-care
  │   └── grooming-accessories
  ├── health/
  │   ├── supplements
  │   ├── first-aid
  │   ├── medications
  │   ├── wound-care
  │   └── vitamins
  ├── tack/
  │   ├── saddles
  │   ├── saddle-pads
  │   ├── bridles
  │   ├── bits
  │   ├── stirrups
  │   ├── girths
  │   ├── reins
  │   ├── halters
  │   ├── lead-ropes
  │   └── tack-accessories
  └── toys-treats/
      ├── horse-toys
      ├── treats
      └── enrichment
```

### FARM-STABLE (Farm & Stable Supplies)
```
/farm-stable/
  ├── stable/
  │   ├── stable-equipment
  │   ├── feed-storage
  │   ├── water-systems
  │   └── stable-accessories
  ├── fencing/
  │   ├── electric-fencing
  │   ├── fence-posts
  │   ├── gates
  │   └── fence-accessories
  ├── yard/
  │   ├── yard-tools
  │   ├── wheelbarrows
  │   ├── muck-management
  │   └── yard-accessories
  └── feeding/
      ├── hay-nets
      ├── feed-buckets
      ├── water-buckets
      └── feeding-accessories
```

---

## 📊 URL Examples

### Before (2-Level):
```
/footwear/riding-boots
/horse-rugs/turnout-rugs
/breeches/womens-breeches
```

### After (3-Level):
```
/rider/footwear/riding-boots
/horse/rugs/turnout-rugs
/rider/apparel/womens-breeches
```

---

## 🎯 Benefits

### SEO Benefits:
- ✅ **Topical clustering** - All related products under same parent
- ✅ **Keyword targeting** - Better URL hierarchy for search
- ✅ **Internal linking** - Stronger category relationships
- ✅ **Crawl efficiency** - Clearer site structure

### User Experience:
- ✅ **Intuitive navigation** - Logical category grouping
- ✅ **Better breadcrumbs** - Clear path: Home > Rider > Apparel > Women's Breeches
- ✅ **Easier discovery** - Related products grouped together

### Business Benefits:
- ✅ **Scalability** - Easy to add new categories
- ✅ **Merchandising** - Better category page control
- ✅ **Analytics** - Clearer performance tracking per category

---

## 🚀 Next Steps

1. **Copy this template** to `exports/mapping.csv`
2. **Fill in your product types** from `exports/product-types.csv`
3. **Map each product type** to the 3-level structure
4. **Review and adjust** category groupings
5. **Run dry-run** to preview changes
6. **Apply mapping** when ready

---

## ⚠️ Important Notes

### Primary Collection Format:
The `primary_collection` metafield will now be:
```
{top_level}/{parent_category}/{subcategory_handle}
```

Example: `rider/apparel/womens-breeches`

### Breadcrumbs Will Show:
```
Home > Rider > Apparel > Women's Breeches > Product Name
```

### Collection Pages:
You'll need pages for:
- Top level: `/rider/page.tsx`
- Parent category: `/rider/apparel/page.tsx`
- Subcategory: `/rider/apparel/womens-breeches/page.tsx`

---

## 📝 CSV Template (Copy This)

```csv
top_level,parent_category,subcategory_handle,product_type,action,merge_to,notes
```

Save as: `exports/mapping.csv`

Then fill in your product types!

---

## 💡 Tips

1. **Keep it consistent** - Use same parent categories across top levels
2. **Normalize handles** - Lowercase, hyphens, no special chars
3. **Group logically** - Think about user journey
4. **Check product counts** - Focus on categories with 10+ products
5. **Plan for growth** - Leave room for new categories

---

## 🎯 Ready to Map!

Open your `exports/product-types.csv` and start mapping to this 3-level structure! 🚀


