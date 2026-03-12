# Copiq API Integration Guide

**Last Updated:** 2 March 2026

This document describes the field mapping and usage for the Yorkshire.com Copiq API integration.

---

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/copiq/posts` | POST | Create or update an article |
| `/api/copiq/posts/[id]` | DELETE | Delete an article by Copiq ID |
| `/api/copiq/search` | GET | Search articles, entities, places and events |
| `/api/copiq/places` | GET | Search for places |
| `/api/copiq/deals` | GET | Search active deals and voucher codes |

---

## Authentication

All requests require an API key in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

---

## POST /api/copiq/posts - Create/Update Article

### Request Body

```json
{
  "id": "copiq-unique-id",
  "title": "Article Title",
  "content": "<p>HTML content here...</p>",
  "slug": "url-friendly-slug",
  "excerpt": "Brief summary for listings",
  "status": "draft",
  "image": "data:image/jpeg;base64,...",
  "seoTitle": "Custom SEO Title",
  "keywords": "yorkshire, news, travel",
  "post_date": "2026-01-28T10:00:00Z",
  "meta": {
    "article_type": "news",
    "category_slug": "community",
    "primary_place_slug": "york",
    "author_name": "Author Name",
    "exclude_from_place_hubs": false,
    "pr_contacts": "pr@agency.com, journalist@paper.co.uk"
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | **Yes** | Copiq's unique article ID. Used for upsert logic. |
| `title` | string | **Yes** | Article headline |
| `content` | string | **Yes** | Full HTML content |
| `slug` | string | **Yes** | URL-friendly slug (lowercase, hyphens only) |
| `excerpt` | string | No | Short description shown in article listings |
| `status` | string | No | See Status Values below |
| `image` | string | No | Base64 data URI for featured image |
| `seoTitle` | string | No | Custom meta title (falls back to `title`) |
| `keywords` | string | No | SEO keywords (comma-separated) |
| `post_date` | string | No | ISO 8601 date for scheduling |
| `meta` | object | No | Additional metadata (see below) |

### Status Values

| Value | Result on Yorkshire.com |
|-------|-------------------------|
| `draft` | Saved as draft, not publicly visible |
| `publish` | Published immediately (or at `post_date` if future) |
| `future` | Treated as draft until `post_date` |

**Note:** Status `publish` is normalised to `published` internally.

### Meta Object Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `article_type` | string | `news` | See Article Types below |
| `category_slug` | string | null | Category slug (see Categories) |
| `primary_place_slug` | string | null | Place slug (see Places) |
| `author_name` | string | `Yorkshire.com Editorial Team` | Author byline |
| `exclude_from_place_hubs` | boolean | `false` | If true, won't show on place pages |
| `pr_contacts` | string | null | Comma-separated PR email addresses for publish notifications |

### Article Types

Yorkshire.com uses a 4-pillar content system:

| Type | Description | Example URL |
|------|-------------|-------------|
| `news` | News articles, press releases | `/news/community/article-slug` |
| `inspiration` | Features, food & drink, outdoors | `/inspiration/food-drink/article-slug` |
| `history` | Heritage, archaeology, genealogy | `/history/heritage/article-slug` |
| `guide` | Travel guides, how-to content | `/guides/visiting/article-slug` |
| `route` | Walking/cycling routes with GPX | `/routes/article-slug` |

### Response

**Success (200):**
```json
{
  "success": true,
  "id": "uuid-article-id",
  "copiq_id": "copiq-unique-id",
  "message": "Article published successfully",
  "url": "https://www.yorkshire.com/news/community/article-slug",
  "status": "published"
}
```

**Error (400/401/500):**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Missing required fields: id, title, content, slug"
}
```

---

## Categories

Use these `category_slug` values in the `meta.category_slug` field:

### News Categories
- `community` - Community news
- `business` - Business & economy
- `crime-punishment` - Crime & Punishment
- `politics` - Politics
- `weather` - Weather
- `sport` - General sports
- `traffic-travel` - Traffic & Travel

### Inspiration Categories
- `food-drink` - Food & Drink
- `arts-culture` - Arts & Culture
- `features` - Features
- `seasonal` - Seasonal content
- `outdoors` - Outdoors & nature

### History Categories
- `heritage` - Heritage
- `genealogy` - Genealogy
- `churches` - Churches
- `industrial` - Industrial history
- `archaeology` - Archaeology
- `domesday-book` - Domesday Book

### Guide Categories
- `visiting` - Visiting Yorkshire
- `accessibility` - Accessibility guides
- `transport` - Transport info
- `tourist-questions` - FAQ/Tourist questions

---

## Places

Use the `/api/copiq/places` endpoint to get valid place slugs.

### GET /api/copiq/places

**Query Parameters:**
- `all=true` - Returns ALL places (recommended: fetch once and cache)
- `q` - Search query (searches name and slug)
- `limit` - Max results (default: 50, max: 200, ignored if `all=true`)

### Get Complete Place List (Recommended)

Fetch all places once and cache locally for lookups:

```
GET /api/copiq/places?all=true
```

**Response:**
```json
{
  "success": true,
  "count": 1847,
  "places": [
    { "name": "York", "slug": "york", "type": "city" },
    { "name": "Leeds", "slug": "leeds", "type": "city" },
    { "name": "Whitby", "slug": "whitby", "type": "town" },
    { "name": "Hurst", "slug": "hurst", "type": "village" },
    ...
  ]
}
```

The response is sorted by type (city, town, village, region) then alphabetically by name. Cache this JSON and use it as a lookup when assigning places to articles.

### Search Places (Alternative)

If you prefer to search on-demand:

```
GET /api/copiq/places?q=york&limit=10
```

### Place Types

| Type | Description |
|------|-------------|
| `city` | Major cities (York, Leeds, Sheffield, Bradford, Hull) |
| `town` | Towns (Whitby, Skipton, Harrogate, Scarborough) |
| `village` | Villages and hamlets |
| `region` | Regions (Yorkshire Dales, North York Moors) |

---

## Image Handling

All images are supplied as **S3 URLs** in your HTML content. Yorkshire automatically processes them.

### What Happens When You Send Images

1. **Detection** - Any `<img src="...">` URLs containing `copiq` and `s3` are found
2. **Download** - Images are fetched from Copiq's S3 bucket
3. **Upload** - Re-uploaded to Yorkshire's S3 bucket (`yorkshire-2026-assets-uk`)
4. **Alt Text** - AI generates descriptive alt text using GPT-4o Vision
5. **URL Replacement** - HTML is updated with Yorkshire S3 URLs and AI alt text
6. **Featured Image** - First body image automatically becomes the featured image

### Example

**Input content:**
```html
<p>Article text here...</p>
<figure>
  <img src="https://copiq-2026.s3.eu-west-2.amazonaws.com/images/bakery.webp" />
</figure>
<p>More text...</p>
<img src="https://copiq-2026.s3.eu-west-2.amazonaws.com/images/interior.jpg" />
```

**After processing:**
```html
<p>Article text here...</p>
<figure>
  <img src="https://yorkshire-2026-assets-uk.s3.eu-west-2.amazonaws.com/articles/copiq/slug/abc123.webp" alt="Freshly baked sourdough loaves displayed on wooden shelves in artisan bakery" />
</figure>
<p>More text...</p>
<img src="https://yorkshire-2026-assets-uk.s3.eu-west-2.amazonaws.com/articles/copiq/slug/def456.jpg" alt="Exposed brick interior with vintage pendant lighting and rustic wooden tables" />
```

- All images downloaded and re-uploaded to Yorkshire S3
- AI-generated alt text added to each image
- First image becomes the featured image with its alt text

### Explicit Featured Image (Optional)

To use a specific image as the featured image (instead of the first body image):

```json
{
  "image": "https://copiq-2026.s3.eu-west-2.amazonaws.com/featured/hero.jpg"
}
```

This image will also receive AI-generated alt text.

### Image Priority

1. If `image` field is provided → use that as featured image
2. Else → first body image becomes featured image
3. All images get AI-generated alt text automatically

---

## Scheduling (Future Publishing)

To schedule an article for future publication:

1. Set `status` to `publish` or `future`
2. Set `post_date` to the desired publish date (ISO 8601 format)

```json
{
  "status": "publish",
  "post_date": "2026-02-14T09:00:00Z"
}
```

**Note:** Currently, scheduling is handled by setting `published_at` in the database. Articles with a future `published_at` will still be visible if `status` is `published`. For true scheduling, set `status: "draft"` and update to `publish` when ready.

---

## URL Structure

Articles are published at URLs based on:
1. **Place** (if `primary_place_slug` is set and `exclude_from_place_hubs` is false)
2. **Article type**
3. **Category**
4. **Slug**

### With Place
```
https://www.yorkshire.com/{place}/{type}/{category}/{slug}
https://www.yorkshire.com/york/news/community/new-cafe-opens
```

### Without Place (Regional)
```
https://www.yorkshire.com/{type}/{category}/{slug}
https://www.yorkshire.com/news/business/yorkshire-economy-grows
```

---

## Example: Full Article Submission

```bash
curl -X POST https://www.yorkshire.com/api/copiq/posts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "copiq-12345",
    "title": "New Artisan Bakery Opens in York",
    "slug": "new-artisan-bakery-opens-york",
    "excerpt": "A family-run bakery serving sourdough and pastries has opened on Gillygate.",
    "content": "<p>A new artisan bakery has opened its doors...</p><figure><img src=\"https://copiq-2026.s3.eu-west-2.amazonaws.com/images/bakery.webp\" alt=\"Bakery interior\" /></figure>",
    "status": "publish",
    "image": "data:image/jpeg;base64,/9j/4AAQ...",
    "seoTitle": "New Bakery in York: Artisan Sourdough & Pastries",
    "post_date": "2026-01-28T10:00:00Z",
    "meta": {
      "article_type": "news",
      "category_slug": "community",
      "primary_place_slug": "york",
      "author_name": "Jono Farrington",
      "exclude_from_place_hubs": false
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "id": "a1b2c3d4-uuid",
  "copiq_id": "copiq-12345",
  "message": "Article published successfully",
  "url": "https://www.yorkshire.com/york/news/community/new-artisan-bakery-opens-york",
  "status": "published"
}
```

---

## Social Posts Integration

**Added:** 12 February 2026

Copiq can now send social posts alongside articles. These are stored on the article, shown in the editor for review/editing, and published to platforms when the editor clicks Publish.

### Sending Social Posts

Include `social_posts` inside the `meta` object when creating or updating an article:

```json
{
  "id": "copiq-12345",
  "title": "Article Title",
  "content": "<p>...</p>",
  "slug": "article-slug",
  "status": "draft",
  "meta": {
    "article_type": "news",
    "category_slug": "community",
    "social_posts": {
      "twitter": {
        "postId": "abc-123-uuid",
        "platform": "TWITTER",
        "content": "Check out this story about a new bakery in York! #Yorkshire",
        "imageUrl": "https://copiq-2026.s3.eu-west-2.amazonaws.com/images/bakery.webp",
        "maxCharacters": 280,
        "copiqPublishUrl": "https://your-copiq-app.com/social/posts/abc-123-uuid/publish-from-external"
      }
    }
  }
}
```

### Social Post Fields

Each platform entry (keyed by platform name, e.g. `twitter`, `facebook`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `postId` | string | **Yes** | Copiq social post ID |
| `platform` | string | **Yes** | Platform enum: `TWITTER`, `FACEBOOK`, etc. |
| `content` | string | **Yes** | Suggested social post text |
| `imageUrl` | string | No | Featured image URL for the social post |
| `maxCharacters` | number | No | Character limit for the platform (default: 280) |
| `copiqPublishUrl` | string | **Yes** | Full URL that Yorkshire.com will POST to when publishing |

### What Happens in Yorkshire.com

1. **Editor sees social posts** in the article sidebar under "Social Posts"
2. **Content is editable** — editors can refine the suggested text
3. **Character counter** shows current length vs `maxCharacters`
4. **Image thumbnail** displayed (read-only)
5. **On Publish** — Yorkshire.com automatically calls each `copiqPublishUrl`
6. **Manual publish/retry** — editors can also publish per-platform individually

### Publish Callback (Yorkshire.com → Copiq)

When publishing, Yorkshire.com sends:

```
POST {copiqPublishUrl}
Authorization: Bearer {COPIQ_API_KEY}
Content-Type: application/json

{
  "content": "Edited post content from the editor",
  "imageUrl": "https://yorkshire-2026-assets-uk.s3.eu-west-2.amazonaws.com/...",
  "externalArticleId": "yorkshire-article-uuid",
  "articleUrl": "https://www.yorkshire.com/..."
}
```

**Payload Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Final social post text (may be edited by Yorkshire.com editors) |
| `imageUrl` | string \| null | Featured image URL if editor attached one, otherwise `null` |
| `externalArticleId` | string | Yorkshire.com article UUID |
| `articleUrl` | string | Full public URL to the published article |

### Expected Response from Copiq

```json
{
  "data": {
    "id": "abc-123-uuid",
    "status": "PUBLISHED",
    "platformPostId": "tweet-id-12345",
    "platformUrl": "https://x.com/yorkshirecom/status/12345"
  }
}
```

Yorkshire.com stores `platformPostId`, `platformUrl`, and `status` back on the article record. Published posts show a green "Published" badge with a link to the live post.

### Error Handling

- Social publish failures **do not block** article publishing
- Failed posts show a warning with a "Retry" button
- Errors are logged server-side with `[Social Publish]` prefix

### Multiple Platforms

The payload supports multiple platforms. Add additional keys alongside `twitter`:

```json
{
  "meta": {
    "social_posts": {
      "twitter": { "postId": "...", "platform": "TWITTER", "content": "...", "copiqPublishUrl": "..." },
      "facebook": { "postId": "...", "platform": "FACEBOOK", "content": "...", "maxCharacters": 63206, "copiqPublishUrl": "..." }
    }
  }
}
```

Each platform gets its own textarea, character counter, and publish button in the editor.

### Social Posts Merge Behaviour

**Important:** When Copiq sends an article update with new `social_posts`, Yorkshire.com now **preserves** already-published statuses instead of overwriting them.

**Merge Logic:**
- If a platform post has `status: 'PUBLISHED'` in Yorkshire.com, the published state is preserved even if Copiq sends updated content
- The `platformPostId`, `platformUrl`, and `publishedAt` fields are retained
- Editor-added images are preserved if Copiq's update doesn't include an `imageUrl` for that platform
- New platforms from Copiq are added alongside existing ones

**Example:**

Editor publishes Twitter post → status becomes `PUBLISHED`. Later, Copiq sends an article update with new Twitter content → Yorkshire.com keeps the `PUBLISHED` status, the live post URL, and prevents re-publishing. The new content text is still updated in the draft field for reference.

This prevents accidental re-publishing and preserves the editor's work (like manually added images).

---

## Manual Article Social Posts

**Added:** 23 February 2026

Yorkshire.com editors can now create social posts for articles **not originated from Copiq** (manually created articles). These posts are sent to Copiq's generic social publishing endpoint.

### How It Works

1. Editor creates an article manually in Yorkshire.com (no Copiq origin)
2. Editor clicks "Add Platform" in the Social Posts section
3. Selects Twitter/X, Facebook, Instagram, or LinkedIn
4. Writes post content and optionally attaches an image
5. Clicks "Publish to [Platform]"
6. Yorkshire.com sends the post to Copiq's generic endpoint
7. Copiq publishes to the platform and returns the live post URL

### Required Copiq Endpoint

Copiq must implement this new generic endpoint:

```
POST {COPIQ_BASE_URL}/api/social-posts
Authorization: Bearer {COPIQ_API_KEY}
Content-Type: application/json

{
  "platform": "twitter",
  "content": "Post text here",
  "imageUrl": "https://yorkshire-2026-assets-uk.s3.eu-west-2.amazonaws.com/...",
  "articleUrl": "https://www.yorkshire.com/news/community/article-slug",
  "externalArticleId": "yorkshire-article-uuid"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | **Yes** | Lowercase platform name: `twitter`, `facebook`, `instagram`, `linkedin` |
| `content` | string | **Yes** | Social post text |
| `imageUrl` | string \| null | No | Featured image URL if attached, otherwise `null` |
| `articleUrl` | string | **Yes** | Full URL to the published article |
| `externalArticleId` | string | **Yes** | Yorkshire.com article UUID |

**Expected Response:**

Same format as the existing publish callback:

```json
{
  "data": {
    "platformPostId": "tweet-id-12345",
    "platformUrl": "https://x.com/yorkshirecom/status/12345"
  }
}
```

Yorkshire.com stores the `platformPostId` and `platformUrl` and displays the "Published" badge with a link.

### Environment Configuration

Copiq's base URL must be configured in Yorkshire.com's environment:

```
COPIQ_BASE_URL="https://your-copiq-app.com"
COPIQ_API_KEY="your-api-key"
```

Both variables are required for manual social posts to work.

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API key | Check Authorization header |
| 400 Validation Error | Missing required fields | Ensure id, title, content, slug are present |
| Category not applied | Invalid category_slug | Use `/api/copiq/places` or check Categories list |
| Place not linked | Invalid place_slug | Use Places endpoint to search valid slugs |
| Image not showing | Invalid base64 format | Ensure format is `data:image/[type];base64,[data]` |
| Article not visible | Status is draft | Set `status: "publish"` |
| Social posts not showing | Missing `meta.social_posts` | Ensure social_posts is inside the `meta` object |
| Social publish fails | Invalid copiqPublishUrl | Check URL is reachable and returns expected JSON |
| Social post not editable | Already published | Published posts are locked; status shown as "Published" |
| PR emails not sent | Missing `meta.pr_contacts` | Ensure pr_contacts is inside the `meta` object |
| PR emails sent twice | `sent_at` was cleared | Emails only send once unless editor clicks "Send Again" |

---

## PR Contact Notifications

When an article is published, Yorkshire.com can automatically send a branded email to PR contacts notifying them that their content is live. This includes the published URL and a link to advertising options.

### How It Works

1. Include `pr_contacts` in the `meta` object when creating/updating an article
2. When the article status is set to `publish`, emails are sent automatically
3. Emails are only sent **once** — a `sent_at` timestamp prevents re-sending
4. Editors can trigger a re-send from the article editor UI if needed

### Example

```json
{
  "id": "copiq-article-123",
  "title": "New Restaurant Opens in York",
  "content": "<p>Content here...</p>",
  "slug": "new-restaurant-york",
  "status": "publish",
  "meta": {
    "article_type": "news",
    "category_slug": "food-drink",
    "primary_place_slug": "york",
    "pr_contacts": "pr@agency.com, journalist@yorkpress.co.uk"
  }
}
```

### Email Template

The `pr_article_published` email template is used, which includes:
- Yorkshire.com branded header
- Article title and link
- Call-to-action for advertising options
- Professional footer with company details

The template can be edited in the admin panel at `/admin/emails`.

### Notes

- PR contacts can also be added manually in the article editor (no Copiq required)
- If the article is saved as `draft`, no emails are sent until it is published
- The `pr_contacts` field is stored as JSONB: `{ emails: "a@b.com", sent_at: "ISO8601"|null }`

---

## GET /api/copiq/deals — Deals & Voucher Search

Search active deals and voucher codes from the Yorkshire.com promotions database — the same data that powers [yorkshire.com/deals](https://www.yorkshire.com/deals). Use this endpoint to power Copiq's listicle and comparison article generation.

### Request

```
GET /api/copiq/deals?q={query}&category={category}&min_discount={n}&sort={sort}&limit={limit}
Authorization: Bearer {api_key}
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | — | Keyword search across deal title, description, and provider name |
| `category` | string | All | Filter by category slug (see table below) |
| `min_discount` | integer | — | Only return deals where discount % extracted from title ≥ this value |
| `sort` | enum | `expiry_asc` | `expiry_asc` — expiring soonest first; `discount_desc` — exclusive/voucher deals first |
| `limit` | integer | 10 | Max results to return (1–50) |
| `status` | string | `active` | Pass `all` to include non-active deals |

### Category Slugs

These match the filter tabs on yorkshire.com/deals exactly:

| Site Label | API `category` value |
|---|---|
| General | `general` |
| Travel | `travel` |
| Automotive | `automotive` |
| Fashion | `fashion` |
| Technology | `technology` |
| Gifts | `gifts` |
| **Accommodation** | `stay` ← note: slug differs from display label |
| Health | `health` |
| Sport & Leisure | `sport-leisure` |
| Home & Garden | `home-garden` |
| Education | `education` |
| Entertainment | `entertainment` |
| Beauty & Health | `beauty` |
| Kids & Baby | `kids` |
| Food & Drink | `food-drink` |

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "30% off selected Endura cycling gear",
      "provider": "Endura",
      "currency": "GBP",
      "voucher_code": "ENDURA30",
      "discount_percent": 30,
      "description": "30% off RRP on selected products",
      "terms": "Subject to availability. While stocks last.",
      "affiliate_url": "https://www.yorkshire.com/go/endura-30off",
      "valid_until": "2026-06-30T23:59:59.000Z",
      "category": "sport-leisure",
      "rating": null,
      "best_for": null
    }
  ],
  "total": 94,
  "deals_table": "| Rank | Deal | Provider | Voucher Code | Saving | Valid Until |\n|---|..."
}
```

### Deal Object Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID — stable deal identifier |
| `name` | string | Deal title as shown on the site |
| `provider` | string | Brand or advertiser name |
| `currency` | string | Always `"GBP"` |
| `voucher_code` | string \| null | Code to apply at checkout, if available |
| `discount_percent` | integer \| null | Extracted from title (e.g. "30% off" → `30`); null if not stated |
| `description` | string \| null | Deal description |
| `terms` | string \| null | Terms and conditions |
| `affiliate_url` | string | Tracked affiliate link |
| `valid_until` | string \| null | ISO 8601 expiry; null means ongoing |
| `category` | string \| null | First category tag from the deal |
| `rating` | null | Not available in current data |
| `best_for` | null | Not available in current data |

### `deals_table` Field

The `deals_table` field is a preformatted markdown table suitable for direct injection into an AI prompt. Columns: Rank, Deal, Provider, Voucher Code, Saving, Valid Until.

### Example Requests

```bash
# Search for travel deals
curl "https://www.yorkshire.com/api/copiq/deals?q=hotel&category=travel&limit=10" \
  -H "Authorization: Bearer {api_key}"

# Top voucher codes in any category
curl "https://www.yorkshire.com/api/copiq/deals?sort=discount_desc&limit=20" \
  -H "Authorization: Bearer {api_key}"

# Food & drink deals with at least 15% off
curl "https://www.yorkshire.com/api/copiq/deals?category=food-drink&min_discount=15" \
  -H "Authorization: Bearer {api_key}"

# Accommodation deals expiring soonest
curl "https://www.yorkshire.com/api/copiq/deals?category=stay&sort=expiry_asc" \
  -H "Authorization: Bearer {api_key}"
```

### Error Responses

| Status | Code | Cause |
|--------|------|-------|
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 400 | `VALIDATION_ERROR` | Invalid `category` value |
| 500 | `INTERNAL_ERROR` | Server-side failure |

---

## Support

For issues or questions, contact the Yorkshire.com development team or submit feedback via the admin panel.
