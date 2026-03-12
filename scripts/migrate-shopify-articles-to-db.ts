/**
 * Migrate existing Shopify news articles into Neon DB.
 * - Fetches all articles from Shopify blog "news"
 * - Downloads featured + inline images and uploads to S3
 * - Inserts into article table with S3 URLs
 *
 * Prerequisites:
 * - npm run db:article-migrations (article tables exist)
 * - AWS_* and SHOPIFY_* env vars set
 *
 * Run: npx tsx scripts/migrate-shopify-articles-to-db.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/migrate-shopify-articles-to-db.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { getBlog } from '@/lib/shopify/blogs';
import { sql } from '@/lib/db/client';
import { uploadBufferToS3 } from '@/lib/s3/storage';
import type { ShopifyArticle } from '@/types/shopify';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const BLOG_HANDLE = 'news';
const S3_MIGRATED_PREFIX = 'articles/migrated';

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function migrateFeaturedImage(
  slug: string,
  imageUrl: string | undefined,
  altText: string | null
): Promise<{ url: string | null; alt: string | null }> {
  if (!imageUrl) return { url: null, alt: null };
  const downloaded = await downloadImage(imageUrl);
  if (!downloaded) {
    console.warn(`  [${slug}] Could not download featured image, keeping original URL`);
    return { url: imageUrl, alt: altText };
  }
  const folder = `${S3_MIGRATED_PREFIX}/${slug}/featured`;
  const url = await uploadBufferToS3(
    downloaded.buffer,
    folder,
    downloaded.contentType as string
  );
  return { url, alt: altText };
}

/**
 * Replace all <img src="..."> in HTML with S3 URLs (download + upload each image).
 */
async function migrateInlineImages(slug: string, contentHtml: string): Promise<string> {
  const imgRegex = /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi;
  const matches = [...contentHtml.matchAll(imgRegex)];
  if (matches.length === 0) return contentHtml;

  let out = contentHtml;
  for (let i = 0; i < matches.length; i++) {
    const [fullTag, before, src, after] = matches[i];
    if (!src || src.startsWith('data:')) continue;
    const downloaded = await downloadImage(src);
    if (!downloaded) continue;
    const folder = `${S3_MIGRATED_PREFIX}/${slug}/inline`;
    const newUrl = await uploadBufferToS3(
      downloaded.buffer,
      folder,
      downloaded.contentType as string
    );
    out = out.replace(fullTag, `<img${before} src="${newUrl}"${after}>`);
  }
  return out;
}

async function getUncategorizedCategoryId(): Promise<string | null> {
  const rows = await sql`
    SELECT category_id FROM article_category
    WHERE slug = 'uncategorized' OR name ILIKE '%Uncategorized%'
    LIMIT 1
  `;
  const row = Array.isArray(rows) ? rows[0] : null;
  return row ? (row as { category_id: string }).category_id : null;
}

async function articleExistsBySlug(slug: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM article WHERE slug = ${slug} LIMIT 1`;
  return Array.isArray(rows) && rows.length > 0;
}

async function insertArticle(
  node: ShopifyArticle,
  featuredUrl: string | null,
  featuredAlt: string | null,
  contentHtml: string,
  uncategorizedId: string | null
) {
  const slug = node.handle;
  const publishedAt = node.publishedAt ? new Date(node.publishedAt) : null;
  await sql`
    INSERT INTO article (
      slug, title, excerpt, content, article_type, status,
      published_at, author_name, meta_title, meta_description,
      featured_image_url, featured_image_alt, primary_category_id
    ) VALUES (
      ${slug}, ${node.title}, ${node.excerpt ?? null}, ${contentHtml}, 'news', 'published',
      ${publishedAt}, ${node.author?.name ?? 'The Equestrian'}, ${node.seo?.title ?? null}, ${node.seo?.description ?? null},
      ${featuredUrl}, ${featuredAlt}, ${uncategorizedId}
    )
  `;
}

async function main() {
  console.log('Fetching articles from Shopify blog "%s"...', BLOG_HANDLE);
  const blog = await getBlog(BLOG_HANDLE, 250);
  if (!blog) {
    console.error('Blog not found or no access.');
    process.exit(1);
  }

  const articles = blog.articles.edges.map((e) => e.node);
  console.log('Found %d articles.', articles.length);
  if (articles.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would migrate:', articles.map((a) => a.handle).join(', '));
    return;
  }

  const uncategorizedId = await getUncategorizedCategoryId();
  if (!uncategorizedId) {
    console.warn('No uncategorized category found; articles will have primary_category_id NULL.');
  }

  let migrated = 0;
  let skipped = 0;

  for (const node of articles) {
    const slug = node.handle;
    if (await articleExistsBySlug(slug)) {
      console.log('Skip (exists): %s', slug);
      skipped++;
      continue;
    }

    console.log('Migrating: %s', slug);

    const { url: featuredUrl, alt: featuredAlt } = await migrateFeaturedImage(
      slug,
      node.image?.url,
      node.image?.altText ?? null
    );

    const contentHtml = await migrateInlineImages(slug, node.contentHtml);

    await insertArticle(node, featuredUrl, featuredAlt, contentHtml, uncategorizedId);
    migrated++;
  }

  console.log('\nDone. Migrated: %d, Skipped: %d', migrated, skipped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
