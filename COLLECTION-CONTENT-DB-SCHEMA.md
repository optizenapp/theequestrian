# Collection Content Database Schema

## Overview
This document describes the database structure for storing category and subcategory page content. Use this schema to generate and insert content into the `collection_content` table in our Neon Postgres database.

---

## Database Connection
- **Database**: Neon Postgres (PostgreSQL)
- **Table Name**: `collection_content`
- **Connection String**: Available in environment variables (`POSTGRES_URL` or `DATABASE_URL`)

---

## Table Structure

### Primary Columns

| Column Name | Data Type | Required | Default | Description |
|------------|-----------|----------|---------|-------------|
| `id` | SERIAL | Auto | - | Auto-incrementing primary key |
| `url_path` | TEXT | ✅ Yes | - | Unique URL path (e.g., `/horse/boots`) |
| `h1_title` | TEXT | ✅ Yes | - | Main page heading (H1) |
| `meta_title` | TEXT | No | - | SEO title tag (50-60 chars) |
| `meta_description` | TEXT | No | - | SEO meta description (150-160 chars) |
| `short_description` | TEXT | No | - | Brief intro text (1-2 sentences) |
| `long_description` | TEXT | No | - | Rich HTML content (see HTML schema below) |
| `breadcrumb_label` | TEXT | No | - | Display name in breadcrumbs |
| `parent_url` | TEXT | No | - | Parent category URL |
| `category_level` | INTEGER | ✅ Yes | 1 | 1=top-level, 2=subcategory, 3=sub-subcategory |
| `faq_items` | JSONB | No | `[]` | FAQ array (see JSON schema below) |
| `related_categories` | JSONB | No | `[]` | Related links array (see JSON schema below) |
| `status` | TEXT | No | `'published'` | 'published', 'draft', or 'archived' |
| `default_sort` | TEXT | No | `'best-selling'` | Default product sort order |
| `generated_by` | TEXT | No | - | Source: 'openai', 'claude', 'manual', 'script' |
| `version` | INTEGER | No | 1 | Content version number |
| `created_at` | TIMESTAMPTZ | Auto | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto | NOW() | Last update timestamp (auto-updated) |

---

## Column Details & Examples

### 1. `url_path` (TEXT, REQUIRED, UNIQUE)
- **Format**: Must start with `/` (e.g., `/horse/boots`)
- **Purpose**: Unique identifier for the collection page
- **Examples**:
  - Top-level: `/horse`, `/rider`, `/clothing`, `/pet`
  - Subcategory: `/horse/boots`, `/clothing/womens`, `/rider/helmets`
  - Sub-subcategory: `/horse/boots/bell-boots`, `/clothing/womens/breeches`

### 2. `h1_title` (TEXT, REQUIRED)
- **Purpose**: Main page heading visible to users
- **Guidelines**: 
  - Descriptive and SEO-friendly
  - Include primary keyword
  - 3-8 words ideal
- **Examples**:
  - `"Horse Boots & Leg Protection"`
  - `"Ladies' Riding Breeches & Jodhpurs"`
  - `"Riding Helmets & Safety Equipment"`

### 3. `meta_title` (TEXT, OPTIONAL)
- **Purpose**: SEO title tag (shown in search results)
- **Guidelines**:
  - 50-60 characters
  - Include brand name: `"... | The Equestrian"`
  - Include primary keyword
- **Examples**:
  - `"Horse Boots & Leg Protection | The Equestrian"`
  - `"Ladies' Breeches & Jodhpurs | The Equestrian"`

### 4. `meta_description` (TEXT, OPTIONAL)
- **Purpose**: SEO meta description (shown in search results)
- **Guidelines**:
  - 150-160 characters
  - Include primary keywords
  - Include call-to-action
  - Mention "Australia" or "Australian"
- **Examples**:
  - `"Shop premium horse boots and leg protection from top equestrian brands. Free shipping Australia-wide. Expert advice available."`
  - `"Quality ladies' riding breeches and jodhpurs. Technical fabrics, perfect fit, fast Australian delivery. Shop now!"`

### 5. `short_description` (TEXT, OPTIONAL)
- **Purpose**: Brief intro text displayed below H1
- **Guidelines**:
  - 1-2 sentences
  - Engaging and informative
  - Highlight key benefits
- **Examples**:
  - `"Quality horse boots selected for protection and performance. Trusted brands, expert advice, and fast delivery across Australia."`
  - `"Technical riding breeches designed for comfort and durability. Perfect fit, moisture-wicking fabrics, and professional styling."`

### 6. `long_description` (TEXT, OPTIONAL)
- **Purpose**: Rich HTML content for SEO and user education
- **Guidelines**:
  - Use HTML tags (see HTML Schema below)
  - 200-400 words
  - Include internal links to related categories
  - Structure: Intro → Features/Benefits → Shop by Category
- **Example**:
```html
<h2>Premium Horse Boots & Leg Protection</h2>
<p>Browse our comprehensive collection of horse boots, carefully selected for quality and performance. Each product is chosen from trusted equestrian brands with proven track records in protection and durability.</p>

<h3>What Makes Great Horse Boots?</h3>
<ul>
  <li><strong>Protection & Support:</strong> Advanced impact absorption and tendon support for maximum safety</li>
  <li><strong>Perfect Fit:</strong> Anatomically designed to move with your horse while staying secure</li>
  <li><strong>Breathable Materials:</strong> Moisture-wicking fabrics that prevent overheating</li>
  <li><strong>Easy Maintenance:</strong> Durable construction that withstands frequent washing</li>
</ul>

<h3>Shop by Type</h3>
<p>Browse our specialized categories including <a href="/horse/boots/bell-boots">bell boots</a>, <a href="/horse/boots/tendon-boots">tendon boots</a>, and <a href="/horse/boots/travel-boots">travel boots</a>. Each category features products from world-leading equestrian brands.</p>
```

### 7. `breadcrumb_label` (TEXT, OPTIONAL)
- **Purpose**: Display name in breadcrumbs (can be shorter than h1_title)
- **Examples**:
  - `"Horse"` (instead of "Horse Equipment & Supplies")
  - `"Boots"` (instead of "Horse Boots & Leg Protection")
  - `"Breeches"` (instead of "Ladies' Riding Breeches & Jodhpurs")

### 8. `parent_url` (TEXT, OPTIONAL)
- **Purpose**: Parent category URL for hierarchy
- **Examples**:
  - For `/horse/boots`: parent_url = `/horse`
  - For `/horse/boots/bell-boots`: parent_url = `/horse/boots`
  - For `/horse`: parent_url = NULL (top-level)

### 9. `category_level` (INTEGER, REQUIRED)
- **Purpose**: Indicates hierarchy level
- **Values**:
  - `1` = Top-level category (e.g., `/horse`, `/rider`, `/clothing`)
  - `2` = Subcategory (e.g., `/horse/boots`, `/clothing/womens`)
  - `3` = Sub-subcategory (e.g., `/horse/boots/bell-boots`)

### 10. `faq_items` (JSONB, OPTIONAL)
- **Purpose**: FAQ section for SEO and user help
- **Format**: JSON array of objects
- **Guidelines**:
  - 2-5 FAQs per page recommended
  - Questions should be specific to the category
  - Answers should be helpful and informative (50-150 words)
- **Schema**:
```json
[
  {
    "question": "What size horse boots do I need?",
    "answer": "Measure your horse's leg circumference at the widest point. Most boots come in Small, Medium, Large, and X-Large. Check individual product sizing charts for specific measurements. If between sizes, size up for comfort."
  },
  {
    "question": "How do I clean horse boots?",
    "answer": "Most boots can be hand washed with mild soap and warm water. Remove dirt and debris after each use. Air dry completely before storage. Avoid machine washing unless specified by manufacturer."
  }
]
```

### 11. `related_categories` (JSONB, OPTIONAL)
- **Purpose**: Internal linking to related categories
- **Format**: JSON array of objects
- **Guidelines**:
  - 2-4 related categories recommended
  - Link to complementary products
  - Include descriptive text
- **Schema**:
```json
[
  {
    "url": "/horse/bandages",
    "title": "Horse Bandages & Wraps",
    "description": "Complement your boots with quality bandages"
  },
  {
    "url": "/horse/grooming",
    "title": "Grooming Supplies",
    "description": "Keep your horse looking their best"
  }
]
```

### 12. `status` (TEXT, OPTIONAL)
- **Purpose**: Content visibility status
- **Values**:
  - `'published'` = Live on site (default)
  - `'draft'` = Not visible to users
  - `'archived'` = Hidden but kept for history

### 13. `generated_by` (TEXT, OPTIONAL)
- **Purpose**: Track content source
- **Values**: `'openai'`, `'claude'`, `'manual'`, `'script'`

---

## HTML Schema for `long_description`

### Allowed HTML Tags

```html
<!-- Headings (for structure) -->
<h2>Main Section Title</h2>
<h3>Subsection Title</h3>

<!-- Paragraphs -->
<p>Regular paragraph text with <strong>bold</strong> and <em>italic</em> formatting.</p>

<!-- Unordered Lists -->
<ul>
  <li>Bullet point 1</li>
  <li>Bullet point 2</li>
  <li><strong>Bold Label:</strong> Description text</li>
</ul>

<!-- Ordered Lists -->
<ol>
  <li>Numbered item 1</li>
  <li>Numbered item 2</li>
</ol>

<!-- Links (internal only) -->
<a href="/horse/boots">horse boots</a>

<!-- Line breaks (use sparingly) -->
<br>
```

### HTML Content Structure (Recommended)

```html
<h2>[Category Name]</h2>
<p>[Opening paragraph: 2-3 sentences introducing the category]</p>

<h3>What Makes Great [Category]?</h3>
<ul>
  <li><strong>Feature 1:</strong> Description</li>
  <li><strong>Feature 2:</strong> Description</li>
  <li><strong>Feature 3:</strong> Description</li>
  <li><strong>Feature 4:</strong> Description</li>
</ul>

<h3>Shop by [Type/Category/Style]</h3>
<p>Browse our specialized categories including <a href="/path1">category 1</a>, <a href="/path2">category 2</a>, and <a href="/path3">category 3</a>. Each category features products from world-leading brands.</p>
```

### HTML Guidelines

✅ **DO:**
- Use semantic HTML tags (h2, h3, p, ul, li)
- Include internal links to related categories
- Use `<strong>` for emphasis in lists
- Keep structure clean and readable
- Include 3-5 feature points in lists

❌ **DON'T:**
- Use inline styles (e.g., `style="color: red"`)
- Include JavaScript or `<script>` tags
- Use forms or input elements
- Add external links (only internal site links)
- Use `<h1>` tags (reserved for page title)

---

## Sample Insert Query

```sql
INSERT INTO collection_content (
  url_path,
  h1_title,
  meta_title,
  meta_description,
  short_description,
  long_description,
  breadcrumb_label,
  parent_url,
  category_level,
  faq_items,
  related_categories,
  status,
  generated_by
) VALUES (
  '/horse/boots',
  'Horse Boots & Leg Protection',
  'Horse Boots & Leg Protection | The Equestrian',
  'Shop premium horse boots from top equestrian brands. Bell boots, tendon boots, travel boots and more. Free shipping Australia-wide.',
  'Quality horse boots selected for protection and performance. Trusted brands, expert advice, and fast delivery across Australia.',
  '<h2>Premium Horse Boots</h2><p>Browse our comprehensive collection...</p>',
  'Boots',
  '/horse',
  2,
  '[{"question":"What size boots?","answer":"Measure your horse..."}]'::jsonb,
  '[{"url":"/horse/bandages","title":"Bandages","description":"Complement your boots"}]'::jsonb,
  'published',
  'openai'
);
```

---

## Validation Rules

### Constraints
- `url_path` must be unique
- `url_path` must start with `/`
- `category_level` must be 1, 2, or 3
- `status` must be 'published', 'draft', or 'archived'
- `h1_title` is required
- `faq_items` must be valid JSON array
- `related_categories` must be valid JSON array

### Recommendations
- `meta_title`: 50-60 characters
- `meta_description`: 150-160 characters
- `short_description`: 1-2 sentences (100-200 characters)
- `long_description`: 200-400 words
- `faq_items`: 2-5 FAQs
- `related_categories`: 2-4 links

---

## Content Generation Guidelines

### SEO Best Practices
1. Include primary keyword in `h1_title`, `meta_title`, and `meta_description`
2. Use natural language (avoid keyword stuffing)
3. Include location keywords ("Australia", "Australian")
4. Add call-to-action in meta descriptions
5. Use descriptive anchor text for internal links

### Content Quality
1. Write for humans first, search engines second
2. Be specific and informative
3. Highlight unique selling points
4. Use active voice
5. Keep paragraphs short (2-3 sentences)

### Internal Linking Strategy
1. Link to parent categories (breadcrumb trail)
2. Link to child categories (navigation)
3. Link to related/complementary categories
4. Use descriptive anchor text (not "click here")

---

## Example: Complete Category Content

```json
{
  "url_path": "/horse/boots",
  "h1_title": "Horse Boots & Leg Protection",
  "meta_title": "Horse Boots & Leg Protection | The Equestrian",
  "meta_description": "Shop premium horse boots from top equestrian brands. Bell boots, tendon boots, travel boots and more. Free shipping Australia-wide. Expert advice available.",
  "short_description": "Quality horse boots selected for protection and performance. Trusted brands, expert advice, and fast delivery across Australia.",
  "long_description": "<h2>Premium Horse Boots & Leg Protection</h2><p>Browse our comprehensive collection of horse boots, carefully selected for quality and performance. Each product is chosen from trusted equestrian brands with proven track records in protection and durability.</p><h3>What Makes Great Horse Boots?</h3><ul><li><strong>Protection & Support:</strong> Advanced impact absorption and tendon support for maximum safety during training and competition</li><li><strong>Perfect Fit:</strong> Anatomically designed to move with your horse while staying securely in place</li><li><strong>Breathable Materials:</strong> Moisture-wicking fabrics that prevent overheating and maintain comfort</li><li><strong>Easy Maintenance:</strong> Durable construction that withstands frequent washing and daily use</li></ul><h3>Shop by Type</h3><p>Browse our specialized categories including <a href=\"/horse/boots/bell-boots\">bell boots</a>, <a href=\"/horse/boots/tendon-boots\">tendon boots</a>, and <a href=\"/horse/boots/travel-boots\">travel boots</a>. Each category features products from world-leading equestrian brands trusted by professionals.</p>",
  "breadcrumb_label": "Boots",
  "parent_url": "/horse",
  "category_level": 2,
  "faq_items": [
    {
      "question": "What type of horse boots do I need?",
      "answer": "The right boots depend on your horse's activity level and discipline. For jumping and eventing, tendon boots offer crucial protection. For turnout, bell boots prevent overreach injuries. For therapy and recovery, consider ice boots or magnetic boots. Our team can help you choose based on your specific needs."
    },
    {
      "question": "How do I know if boots fit properly?",
      "answer": "Properly fitted boots should sit snugly without restricting movement or causing pressure points. Check that straps are secure but not too tight, and ensure the boots don't rotate during movement. If you're unsure, consult our sizing guides or contact our expert team for personalized fitting advice."
    }
  ],
  "related_categories": [
    {
      "url": "/horse/bandages",
      "title": "Horse Bandages & Wraps",
      "description": "Complement your boots with quality bandages"
    },
    {
      "url": "/horse/grooming",
      "title": "Grooming Supplies",
      "description": "Keep your horse looking their best"
    }
  ],
  "status": "published",
  "generated_by": "openai"
}
```

---

## Notes for AI Content Generation

1. **Analyze the URL path** to understand category hierarchy and context
2. **Research the category** to generate accurate, helpful content
3. **Use the existing CSV** (`exports/collection-content.csv`) as reference for tone and style
4. **Include Australian context** where relevant (shipping, climate, etc.)
5. **Generate unique content** for each category (avoid templates)
6. **Validate JSON** before inserting (faq_items and related_categories)
7. **Escape special characters** in HTML and JSON properly
8. **Test queries** before bulk insertion

---

## Database Access

To insert content, use the Neon Postgres connection:

```typescript
import { sql } from '@/lib/db/client';

await sql`
  INSERT INTO collection_content (
    url_path, h1_title, meta_title, ...
  ) VALUES (
    ${url_path}, ${h1_title}, ${meta_title}, ...
  )
`;
```

---

## Questions?

Refer to:
- Full SQL schema: `lib/db/schema/collection-content.sql`
- Existing content examples: `exports/collection-content.csv`
- Category mapping: `exports/mapping-template-draft2.csv`
