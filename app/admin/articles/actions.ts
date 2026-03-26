'use server';

import { sql } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';

export async function createArticleAction(formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const excerpt = (formData.get('excerpt') as string) || null;
    const content = formData.get('content') as string;
    const articleType = (formData.get('article_type') as string) || 'news';
    const categoryId = (formData.get('category_id') as string) || null;
    const statusRaw = formData.get('status') as string;
    const normalizedStatus = statusRaw === 'publish' ? 'published' : (statusRaw || 'draft');
    const featuredImageUrl = (formData.get('featured_image_url') as string) || null;
    const featuredImageAlt = (formData.get('featured_image_alt') as string) || null;
    const metaTitle = (formData.get('meta_title') as string) || null;
    const metaDescription = (formData.get('meta_description') as string) || null;
    const headlessCtaPath = ((formData.get('headless_cta_path') as string) || '').trim() || null;
    const headlessCtaLabel = ((formData.get('headless_cta_label') as string) || '').trim() || null;
    const headlessRelatedHandles =
      ((formData.get('headless_related_handles') as string) || '').trim() || null;
    const excludeFromPlaceHubs = formData.get('exclude_from_place_hubs') === 'on';
    const placeIds = formData.getAll('place_ids') as string[];
    const primaryPlaceId = (formData.get('primary_place_id') as string) || null;
    const copiqSocialPostsRaw = formData.get('copiq_social_posts') as string | null;
    const prContactsRaw = formData.get('pr_contacts') as string | null;
    const authorId = (formData.get('author_id') as string) || null;
    const copiqSocialPosts = copiqSocialPostsRaw ? JSON.parse(copiqSocialPostsRaw) : null;
    const prContacts = prContactsRaw ? JSON.parse(prContactsRaw) : null;

    const inserted = await sql`
      INSERT INTO article (
        title, slug, excerpt, content, article_type, primary_category_id, status,
        featured_image_url, featured_image_alt, meta_title, meta_description,
        headless_cta_path, headless_cta_label, headless_related_handles,
        exclude_from_place_hubs, published_at, author_id, copiq_social_posts, pr_contacts
      ) VALUES (
        ${title}, ${slug}, ${excerpt}, ${content}, ${articleType}, ${categoryId}, ${normalizedStatus},
        ${featuredImageUrl}, ${featuredImageAlt}, ${metaTitle}, ${metaDescription},
        ${headlessCtaPath}, ${headlessCtaLabel}, ${headlessRelatedHandles},
        ${excludeFromPlaceHubs}, ${normalizedStatus === 'published' ? new Date() : null}, ${authorId},
        ${copiqSocialPosts ? JSON.stringify(copiqSocialPosts) : null},
        ${prContacts ? JSON.stringify(prContacts) : null}
      )
      RETURNING article_id
    `;
    const row = Array.isArray(inserted) ? inserted[0] : null;
    if (!row) throw new Error('Insert failed');
    const articleId = (row as { article_id: string }).article_id;

    if (placeIds.length > 0) {
      for (const placeId of placeIds) {
        await sql`
          INSERT INTO article_place (article_id, place_id, primary_place)
          VALUES (${articleId}, ${placeId}, ${placeId === primaryPlaceId})
        `;
      }
    }

    revalidatePath('/admin/articles');
    revalidatePath('/news');
    return { success: true, articleId };
  } catch (error: unknown) {
    console.error('Create article error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateArticleAction(articleId: string, formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const excerpt = (formData.get('excerpt') as string) || null;
    const content = formData.get('content') as string;
    const articleType = (formData.get('article_type') as string) || 'news';
    const categoryId = (formData.get('category_id') as string) || null;
    const statusRaw = formData.get('status') as string;
    const normalizedStatus = statusRaw === 'publish' ? 'published' : (statusRaw || 'draft');
    const featuredImageUrl = (formData.get('featured_image_url') as string) || null;
    const featuredImageAlt = (formData.get('featured_image_alt') as string) || null;
    const metaTitle = (formData.get('meta_title') as string) || null;
    const metaDescription = (formData.get('meta_description') as string) || null;
    const headlessCtaPath = ((formData.get('headless_cta_path') as string) || '').trim() || null;
    const headlessCtaLabel = ((formData.get('headless_cta_label') as string) || '').trim() || null;
    const headlessRelatedHandles =
      ((formData.get('headless_related_handles') as string) || '').trim() || null;
    const excludeFromPlaceHubs = formData.get('exclude_from_place_hubs') === 'on';
    const placeIds = formData.getAll('place_ids') as string[];
    const primaryPlaceId = (formData.get('primary_place_id') as string) || null;
    const copiqSocialPostsRaw = formData.get('copiq_social_posts') as string | null;
    const prContactsRaw = formData.get('pr_contacts') as string | null;
    const authorId = (formData.get('author_id') as string) || null;
    const copiqSocialPosts = copiqSocialPostsRaw ? JSON.parse(copiqSocialPostsRaw) : null;
    const prContacts = prContactsRaw ? JSON.parse(prContactsRaw) : null;

    await sql`
      UPDATE article SET
        title = ${title}, slug = ${slug}, excerpt = ${excerpt}, content = ${content},
        article_type = ${articleType}, primary_category_id = ${categoryId}, status = ${normalizedStatus},
        featured_image_url = ${featuredImageUrl}, featured_image_alt = ${featuredImageAlt},
        meta_title = ${metaTitle}, meta_description = ${metaDescription},
        headless_cta_path = ${headlessCtaPath},
        headless_cta_label = ${headlessCtaLabel},
        headless_related_handles = ${headlessRelatedHandles},
        exclude_from_place_hubs = ${excludeFromPlaceHubs},
        published_at = ${normalizedStatus === 'published' ? new Date() : null},
        updated_at = NOW(), author_id = ${authorId},
        copiq_social_posts = ${copiqSocialPosts ? JSON.stringify(copiqSocialPosts) : null},
        pr_contacts = ${prContacts ? JSON.stringify(prContacts) : null}
      WHERE article_id = ${articleId}
    `;

    await sql`DELETE FROM article_place WHERE article_id = ${articleId}`;
    if (placeIds.length > 0) {
      for (const placeId of placeIds) {
        await sql`
          INSERT INTO article_place (article_id, place_id, primary_place)
          VALUES (${articleId}, ${placeId}, ${placeId === primaryPlaceId})
        `;
      }
    }

    revalidatePath('/admin/articles');
    revalidatePath(`/admin/articles/${articleId}/edit`);
    revalidatePath('/news');
    revalidatePath(`/news/${slug}`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Update article error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteArticleAction(articleId: string) {
  try {
    await sql`DELETE FROM article WHERE article_id = ${articleId}`;
    revalidatePath('/admin/articles');
    revalidatePath('/news');
    return { success: true };
  } catch (error: unknown) {
    console.error('Delete article error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function publishSocialPostsAction(
  articleId: string,
  socialPosts: Record<
    string,
    {
      postId: string;
      platform: string;
      content: string;
      copiqPublishUrl: string;
      [key: string]: unknown;
    }
  >
) {
  const results: Record<string, { success: boolean; platformPostId?: string; platformUrl?: string; error?: string }> = {};
  const copiqApiKey = process.env.COPIQ_API_KEY;
  const copiqBaseUrl = process.env.COPIQ_BASE_URL;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au').replace(/\/+$/, '');
  const articleUrl = `${baseUrl}/news/placeholder`;
  for (const [platform, post] of Object.entries(socialPosts)) {
    if (!post.content) {
      results[platform] = { success: false, error: 'Missing content' };
      continue;
    }
    if ((post as { status?: string }).status === 'PUBLISHED') {
      results[platform] = {
        success: true,
        platformPostId: (post as { platformPostId?: string }).platformPostId,
        platformUrl: (post as { platformUrl?: string }).platformUrl,
      };
      continue;
    }
    try {
      let response: Response;
      if ((post as { copiqPublishUrl?: string }).copiqPublishUrl) {
        response = await fetch((post as { copiqPublishUrl: string }).copiqPublishUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(copiqApiKey ? { Authorization: `Bearer ${copiqApiKey}` } : {}),
          },
          body: JSON.stringify({
            content: post.content,
            imageUrl: (post as { imageUrl?: string }).imageUrl ?? null,
            externalArticleId: articleId,
            articleUrl,
          }),
        });
      } else if (copiqBaseUrl) {
        response = await fetch(`${copiqBaseUrl}/api/social-posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(copiqApiKey ? { Authorization: `Bearer ${copiqApiKey}` } : {}),
          },
          body: JSON.stringify({
            platform: post.platform.toLowerCase(),
            content: post.content,
            imageUrl: (post as { imageUrl?: string }).imageUrl ?? null,
            articleUrl,
            externalArticleId: articleId,
          }),
        });
      } else {
        results[platform] = { success: false, error: 'COPIQ_BASE_URL not configured' };
        continue;
      }
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        results[platform] = { success: false, error: `HTTP ${response.status}: ${errText.slice(0, 200)}` };
        continue;
      }
      const data = (await response.json()) as { data?: { platformPostId?: string; platformUrl?: string } };
      results[platform] = {
        success: true,
        platformPostId: data.data?.platformPostId,
        platformUrl: data.data?.platformUrl,
      };
    } catch (err: unknown) {
      results[platform] = { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  try {
    const rows = await sql`SELECT copiq_social_posts FROM article WHERE article_id = ${articleId} LIMIT 1`;
    const current = Array.isArray(rows) ? (rows[0] as { copiq_social_posts?: Record<string, unknown> } | undefined) : null;
    const currentPosts = current?.copiq_social_posts ?? {};
    const updated = { ...currentPosts };
    for (const [platform, result] of Object.entries(results)) {
      if (updated[platform]) {
        updated[platform] = {
          ...(updated[platform] as object),
          ...(result.success
            ? { status: 'PUBLISHED', platformPostId: result.platformPostId, platformUrl: result.platformUrl, publishedAt: new Date().toISOString() }
            : { status: 'FAILED', error: result.error }),
        };
      }
    }
    await sql`
      UPDATE article SET copiq_social_posts = ${JSON.stringify(updated)}
      WHERE article_id = ${articleId}
    `;
  } catch (e) {
    console.error('[Social Publish] Failed to update article:', e);
  }
  return { results };
}
