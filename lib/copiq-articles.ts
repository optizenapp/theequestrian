/**
 * Copiq article handler: save/delete articles from Copiq using Neon SQL.
 */

import { sql } from '@/lib/db/client';
import { uploadBufferToS3 } from '@/lib/s3/storage';
import { getCategoryBySlug } from '@/lib/articles/db';

export interface CopiqSocialPost {
  postId: string;
  platform: string;
  content: string;
  imageUrl?: string;
  maxCharacters?: number;
  copiqPublishUrl: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'FAILED';
  platformPostId?: string;
  platformUrl?: string;
  publishedAt?: string;
  error?: string;
}

export interface CopiqSocialPosts {
  [platform: string]: CopiqSocialPost;
}

export interface CopiqArticle {
  id: string;
  title: string;
  content: string;
  slug: string;
  excerpt?: string;
  status: 'draft' | 'publish' | 'future';
  image?: string;
  keywords?: string;
  seoTitle?: string;
  post_date?: string;
  meta?: {
    article_type?: string;
    category_slug?: string;
    primary_place_slug?: string;
    author_name?: string;
    exclude_from_place_hubs?: boolean;
    social_posts?: CopiqSocialPosts;
    pr_contacts?: string;
  };
}

async function downloadAndUploadImage(
  imageUrl: string,
  slug: string,
  index: number
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const folder = `articles/copiq/${slug}`;
    return await uploadBufferToS3(buffer, folder, contentType);
  } catch {
    return null;
  }
}

async function convertBase64ToImage(base64Image: string, slug: string): Promise<string | null> {
  try {
    if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
      return await downloadAndUploadImage(base64Image, slug, 0);
    }
    const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;
    const [, ext, data] = matches;
    const buffer = Buffer.from(data, 'base64');
    const contentType = `image/${ext}`;
    const folder = `articles/copiq/${slug}`;
    return await uploadBufferToS3(buffer, folder, contentType);
  } catch {
    return null;
  }
}

function mergeSocialPosts(
  existing: CopiqSocialPosts,
  incoming: CopiqSocialPosts
): CopiqSocialPosts {
  const merged = { ...incoming };
  for (const [platform, existingPost] of Object.entries(existing)) {
    if (merged[platform] && existingPost.status === 'PUBLISHED') {
      merged[platform] = {
        ...merged[platform],
        status: existingPost.status,
        platformPostId: existingPost.platformPostId,
        platformUrl: existingPost.platformUrl,
        publishedAt: existingPost.publishedAt,
      };
    }
    if (merged[platform] && !merged[platform].imageUrl && existingPost.imageUrl) {
      merged[platform].imageUrl = existingPost.imageUrl;
    }
  }
  return merged;
}

export async function saveCopiqArticle(data: CopiqArticle) {
  const articleType = data.meta?.article_type || 'news';
  const categorySlug = data.meta?.category_slug;
  const primaryPlaceSlug = data.meta?.primary_place_slug;
  const authorName = data.meta?.author_name || 'The Equestrian Team';
  const excludeFromPlaceHubs = data.meta?.exclude_from_place_hubs ?? false;
  const normalizedStatus = data.status === 'publish' ? 'published' : 'draft';

  let processedContent = data.content;
  let featuredImageUrl: string | null = null;
  let featuredImageAlt: string | null = null;

  if (data.image) {
    featuredImageUrl = await convertBase64ToImage(data.image, data.slug);
  }

  let categoryId: string | null = null;
  if (categorySlug) {
    const cat = await getCategoryBySlug(categorySlug);
    if (cat) categoryId = cat.category_id;
  }

  let primaryPlaceId: string | null = null;
  if (primaryPlaceSlug) {
    const rows = await sql`
      SELECT place_id FROM place WHERE slug = ${primaryPlaceSlug} LIMIT 1
    `;
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row) primaryPlaceId = (row as { place_id: string }).place_id;
  }

  const socialPostsData = data.meta?.social_posts ?? null;
  const prContactsData = data.meta?.pr_contacts
    ? { emails: data.meta.pr_contacts, sent_at: null, sent_by: null }
    : null;

  const existingRows = await sql`
    SELECT article_id, copiq_social_posts FROM article WHERE copiq_id = ${data.id} LIMIT 1
  `;
  const existing = (Array.isArray(existingRows) ? existingRows[0] : null) as
    | { article_id: string; copiq_social_posts: unknown }
    | null;
  const mergedSocialPosts =
    socialPostsData && existing?.copiq_social_posts
      ? mergeSocialPosts(
          existing.copiq_social_posts as unknown as CopiqSocialPosts,
          socialPostsData
        )
      : socialPostsData;

  const publishedAt =
    normalizedStatus === 'published'
      ? data.post_date
        ? new Date(data.post_date)
        : new Date()
      : null;

  if (existing) {
    await sql`
      UPDATE article SET
        title = ${data.title},
        slug = ${data.slug},
        excerpt = ${data.excerpt ?? null},
        content = ${processedContent},
        article_type = ${articleType},
        primary_category_id = ${categoryId},
        status = ${normalizedStatus},
        featured_image_url = ${featuredImageUrl},
        featured_image_alt = ${featuredImageAlt},
        meta_title = ${data.seoTitle ?? null},
        author_name = ${authorName},
        exclude_from_place_hubs = ${excludeFromPlaceHubs},
        published_at = ${publishedAt},
        updated_at = NOW(),
        copiq_social_posts = ${mergedSocialPosts ? JSON.stringify(mergedSocialPosts) : null},
        pr_contacts = ${prContactsData ? JSON.stringify(prContactsData) : null}
      WHERE article_id = ${existing.article_id}
    `;
  } else {
    await sql`
      INSERT INTO article (
        copiq_id, title, slug, excerpt, content, article_type, primary_category_id, status,
        featured_image_url, featured_image_alt, meta_title, author_name, exclude_from_place_hubs,
        published_at, copiq_social_posts, pr_contacts
      ) VALUES (
        ${data.id}, ${data.title}, ${data.slug}, ${data.excerpt ?? null}, ${processedContent},
        ${articleType}, ${categoryId}, ${normalizedStatus},
        ${featuredImageUrl}, ${featuredImageAlt}, ${data.seoTitle ?? null}, ${authorName},
        ${excludeFromPlaceHubs}, ${publishedAt},
        ${mergedSocialPosts ? JSON.stringify(mergedSocialPosts) : null},
        ${prContactsData ? JSON.stringify(prContactsData) : null}
      )
    `;
  }

  const rows = await sql`
    SELECT article_id, slug, article_type, status, exclude_from_place_hubs, primary_category_id, copiq_id
    FROM article WHERE copiq_id = ${data.id} LIMIT 1
  `;
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error('Upsert failed');

  if (primaryPlaceId) {
    const aid = (row as { article_id: string }).article_id;
    await sql`DELETE FROM article_place WHERE article_id = ${aid}`;
    await sql`
      INSERT INTO article_place (article_id, place_id, primary_place)
      VALUES (${aid}, ${primaryPlaceId}, true)
    `;
  } else {
    const aid = (row as { article_id: string }).article_id;
    await sql`DELETE FROM article_place WHERE article_id = ${aid}`;
  }

  return row as {
    article_id: string;
    slug: string;
    article_type: string;
    status: string;
    exclude_from_place_hubs: boolean | null;
    primary_category_id: string | null;
    copiq_id: string | null;
  };
}

export async function deleteCopiqArticle(copiqId: string) {
  const rows = await sql`SELECT article_id FROM article WHERE copiq_id = ${copiqId} LIMIT 1`;
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error(`Article not found with copiq_id: ${copiqId}`);
  const articleId = (row as { article_id: string }).article_id;
  await sql`DELETE FROM article WHERE article_id = ${articleId}`;
}
