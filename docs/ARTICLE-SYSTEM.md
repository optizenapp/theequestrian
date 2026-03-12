# Article System

Admin and Copiq integration for news/blog articles. Articles are stored in Neon (PostgreSQL) and displayed at `/news/[slug]`.

## Environment Variables

Add these to `.env.local` (or your deployment env):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` or `POSTGRES_URL` | Yes | Neon PostgreSQL connection string (already used by the site) |
| `AWS_ACCESS_KEY_ID` | For uploads | AWS access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | For uploads | AWS secret key |
| `AWS_REGION` | For uploads | e.g. `ap-southeast-2` (Sydney) |
| `AWS_S3_BUCKET_NAME` or `AWS_S3_BUCKET` | For uploads | S3 bucket for article images (e.g. `theequestrian-articles-images`) |
| `COPIQ_API_KEY` | For Copiq | API key for Copiq authentication (Bearer token) |
| `COPIQ_BASE_URL` | For social | Copiq base URL for social publishing (optional) |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Site origin, e.g. `https://theequestrian.com.au` (used for article URLs and sitemaps) |

## Database

- **Which DB**: The app and scripts use `DATABASE_URL` or `POSTGRES_URL` from `.env.local` / `.env`. To use the **jono-dev** Neon DB for article migrations and migration, set `DATABASE_URL` in `.env.local` to the jono-dev connection string (host `ep-square-dawn-a7cjzpyx-pooler.ap-southeast-2.aws.neon.tech`) so migrations and `db:migrate-articles` run against that database.
- **Migrations**: Run `npm run db:article-migrations` to apply article system migrations (place, entity, article, article_category, article_place, etc.).
- **Migrate Shopify articles**: Run `npm run db:migrate-articles` to copy all articles from the Shopify “news” blog into Neon (featured + inline images are downloaded and re-uploaded to S3 under `articles/migrated/{slug}/`). Skip with `DRY_RUN=1` to only list what would be migrated. Prerequisites: article migrations applied, `AWS_*` and `SHOPIFY_*` env set.
- **ORM**: Raw SQL via Neon (`@/lib/db/client`). No Prisma.

## Admin

- **List**: `/admin/articles` — list, search, filter by status, pagination.
- **New**: `/admin/articles/new` — create article (title, slug, excerpt, content HTML, category, places, featured image URL, meta, status).
- **Edit**: `/admin/articles/[id]/edit` — edit existing article.
- **Uncategorized**: `/admin/articles/uncategorized` — assign category to articles in “Uncategorized”.

Article URLs on the site: **`/news/[slug]`** (see `lib/articles/index.ts` → `getArticleUrl()`).

To show DB-backed articles on the public site, update `app/news/[handle]/page.tsx` to load from the `article` table (e.g. via `getArticleBySlug` from `@/lib/articles/db`) when the article is not found in Shopify, and render the same layout.

## Copiq API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/copiq/test` | GET | Health check / API key verification |
| `/api/copiq/posts` | POST | Create or update article (upsert by `copiq_id`) |
| `/api/copiq/posts/[id]` | GET | Get article by article_id or copiq_id; returns canonical URL |
| `/api/copiq/posts/[id]` | DELETE | Delete article by Copiq ID |
| `/api/copiq/search` | GET | Search articles (query param `q`, optional `type`, `limit`) |
| `/api/copiq/places` | GET | List/search places for article linking |
| `/api/copiq/deals` | GET | Stub (returns empty list; implement when you have deals data) |

**Auth**: `Authorization: Bearer <COPIQ_API_KEY>`.

## Key Files

- `lib/articles/` — types, DB queries, `getArticleUrl()`
- `lib/copiq-articles.ts` — Copiq save/delete (Neon SQL, S3 uploads)
- `lib/copiq-auth.ts` — Copiq API key check
- `lib/s3/storage.ts` — S3 upload helpers
- `app/admin/articles/` — admin UI and actions
- `app/api/copiq/` — Copiq API routes
- `app/api/admin/articles/` — uncategorized list, category assignment
- `scripts/run-article-migrations.ts` — run article migrations
- `scripts/migrate-shopify-articles-to-db.ts` — migrate Shopify news articles into Neon + S3

## Image storage

**Store only image URLs in the database**; actual files live in S3.

- **Featured image**: `article.featured_image_url` and `article.featured_image_alt` — S3 URLs after migration (e.g. `articles/migrated/{slug}/featured.jpg`).
- **Inline images**: Inside `article.content` HTML as `<img src="...">` — Shopify CDN or S3 URLs.

**S3 layout**: `articles/migrated/{article-slug}/featured.{ext}` and `articles/migrated/{article-slug}/inline-{n}.{ext}`. No binary blobs in Postgres. Use bucket `theequestrian-articles-images` in region `ap-southeast-2` (set `AWS_S3_BUCKET_NAME` and `AWS_REGION`).

## Adding categories or places

Insert into `article_category` or `place` via SQL or a small script. The “Uncategorized” category is seeded by migration `047_seed_uncategorized.sql`.
