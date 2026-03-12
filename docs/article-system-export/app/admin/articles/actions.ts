"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email";
import { getArticleUrl } from "@/lib/articles";

/**
 * Track image usage for an article
 * - Finds or creates entity_image record for the URL
 * - Creates image_usage record linking to the article
 */
async function trackImageUsage(articleId: string, imageUrl: string | null, usageType: 'featured' | 'inline') {
  if (!imageUrl) return;
  
  try {
    // Find existing entity_image record for this URL
    let entityImage = await prisma.entity_image.findFirst({
      where: { image_url: imageUrl }
    });
    
    // If not found, create one (for legacy images)
    if (!entityImage) {
      entityImage = await prisma.entity_image.create({
        data: {
          image_url: imageUrl,
          source: 'legacy',
        }
      });
    }
    
    // Check if usage already tracked
    const existingUsage = await prisma.image_usage.findFirst({
      where: {
        image_id: entityImage.image_id,
        article_id: articleId,
        usage_type: usageType
      }
    });
    
    if (!existingUsage) {
      await prisma.image_usage.create({
        data: {
          image_id: entityImage.image_id,
          article_id: articleId,
          usage_type: usageType
        }
      });
    }
  } catch (error) {
    console.error('Error tracking image usage:', error);
    // Don't fail the article save if usage tracking fails
  }
}

/**
 * Extract image URLs from HTML content
 */
function extractImageUrls(html: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const urls: string[] = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

export async function createArticleAction(formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const excerpt = formData.get("excerpt") as string;
    const content = formData.get("content") as string;
    const articleType = formData.get("article_type") as string;
    const categoryId = formData.get("category_id") as string;
    const status = formData.get("status") as string;
    const featuredImageUrl = formData.get("featured_image_url") as string;
    const featuredImageAlt = formData.get("featured_image_alt") as string;
    const metaTitle = formData.get("meta_title") as string;
    const metaDescription = formData.get("meta_description") as string;
    const excludeFromPlaceHubs = formData.get("exclude_from_place_hubs") === "on";
    
    // Get place IDs (can be multiple)
    const placeIds = formData.getAll("place_ids") as string[];
    const primaryPlaceId = formData.get("primary_place_id") as string;

    // Normalize status to 'published' for consistency
    const normalizedStatus = status === 'publish' ? 'published' : (status || 'draft');
    
    // Parse social posts if provided
    const copiqSocialPostsRaw = formData.get("copiq_social_posts") as string | null;
    const copiqSocialPosts = copiqSocialPostsRaw ? JSON.parse(copiqSocialPostsRaw) : undefined;

    // Parse PR contacts if provided
    const prContactsRaw = formData.get("pr_contacts") as string | null;
    const prContacts = prContactsRaw ? JSON.parse(prContactsRaw) : undefined;

    const authorId = formData.get("author_id") as string | null;

    // Create article
    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        article_type: articleType,
        primary_category_id: categoryId || null,
        status: normalizedStatus,
        featured_image_url: featuredImageUrl || null,
        featured_image_alt: featuredImageAlt || null,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        exclude_from_place_hubs: excludeFromPlaceHubs,
        published_at: normalizedStatus === 'published' ? new Date() : null,
        author_id: authorId || null,
        ...(copiqSocialPosts ? { copiq_social_posts: copiqSocialPosts } : {}),
        ...(prContacts ? { pr_contacts: prContacts } : {}),
      },
      include: {
        article_category: true,
        article_place: { include: { place: true } },
      },
    });

    // Link places
    if (placeIds.length > 0) {
      await prisma.article_place.createMany({
        data: placeIds.map(placeId => ({
          article_id: article.article_id,
          place_id: placeId,
          primary_place: placeId === primaryPlaceId,
        })),
      });
    }

    // Track image usage
    await trackImageUsage(article.article_id, featuredImageUrl, 'featured');
    const inlineImages = extractImageUrls(content);
    for (const imgUrl of inlineImages) {
      await trackImageUsage(article.article_id, imgUrl, 'inline');
    }

    // Send PR notification emails if publishing with contacts that haven't been notified
    if (normalizedStatus === 'published' && prContacts?.emails && !prContacts.sent_at) {
      await sendPrNotificationEmails(article.article_id, title, article, prContacts.emails);
    }

    revalidatePath("/admin/articles");
    return { success: true, articleId: article.article_id };
  } catch (error: any) {
    console.error("Create article error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateArticleAction(articleId: string, formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const excerpt = formData.get("excerpt") as string;
    const content = formData.get("content") as string;
    const articleType = formData.get("article_type") as string;
    const categoryId = formData.get("category_id") as string;
    const status = formData.get("status") as string;
    const featuredImageUrl = formData.get("featured_image_url") as string;
    const featuredImageAlt = formData.get("featured_image_alt") as string;
    const metaTitle = formData.get("meta_title") as string;
    const metaDescription = formData.get("meta_description") as string;
    const excludeFromPlaceHubs = formData.get("exclude_from_place_hubs") === "on";
    
    const placeIds = formData.getAll("place_ids") as string[];
    const primaryPlaceId = formData.get("primary_place_id") as string;

    // Normalize status to 'published' for consistency
    const normalizedStatus = status === 'publish' ? 'published' : (status || 'draft');

    // Parse social posts if provided
    const copiqSocialPostsRaw = formData.get("copiq_social_posts") as string | null;
    const copiqSocialPosts = copiqSocialPostsRaw ? JSON.parse(copiqSocialPostsRaw) : undefined;

    // Parse PR contacts if provided
    const prContactsRaw = formData.get("pr_contacts") as string | null;
    const prContacts = prContactsRaw ? JSON.parse(prContactsRaw) : undefined;

    const authorId = formData.get("author_id") as string | null;

    // Update article
    const article = await prisma.article.update({
      where: { article_id: articleId },
      data: {
        title,
        slug,
        excerpt,
        content,
        article_type: articleType,
        primary_category_id: categoryId || null,
        status: normalizedStatus,
        featured_image_url: featuredImageUrl || null,
        featured_image_alt: featuredImageAlt || null,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        exclude_from_place_hubs: excludeFromPlaceHubs,
        published_at: normalizedStatus === 'published' ? new Date() : null,
        updated_at: new Date(),
        author_id: authorId || null,
        ...(copiqSocialPosts ? { copiq_social_posts: copiqSocialPosts } : {}),
        ...(prContacts ? { pr_contacts: prContacts } : {}),
      },
      include: {
        article_category: true,
        article_place: { include: { place: true } },
      },
    });

    // Update place links
    await prisma.article_place.deleteMany({
      where: { article_id: articleId },
    });

    if (placeIds.length > 0) {
      await prisma.article_place.createMany({
        data: placeIds.map(placeId => ({
          article_id: article.article_id,
          place_id: placeId,
          primary_place: placeId === primaryPlaceId,
        })),
      });
    }

    // Track image usage (clear old and add new)
    await prisma.image_usage.deleteMany({
      where: { article_id: articleId }
    });
    await trackImageUsage(article.article_id, featuredImageUrl, 'featured');
    const inlineImages = extractImageUrls(content);
    for (const imgUrl of inlineImages) {
      await trackImageUsage(article.article_id, imgUrl, 'inline');
    }

    // Send PR notification emails if publishing with contacts that haven't been notified
    if (normalizedStatus === 'published' && prContacts?.emails && !prContacts.sent_at) {
      await sendPrNotificationEmails(articleId, title, article, prContacts.emails);
    }

    revalidatePath("/admin/articles");
    revalidatePath(`/admin/articles/${articleId}/edit`);
    return { success: true };
  } catch (error: any) {
    console.error("Update article error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send PR notification emails when an article is published.
 * Non-blocking: failures are logged but don't break the publish flow.
 * Updates pr_contacts.sent_at on success.
 */
async function sendPrNotificationEmails(
  articleId: string,
  articleTitle: string,
  article: { slug: string; article_type: string; exclude_from_place_hubs?: boolean | null; article_category?: { slug: string } | null; article_place?: Array<{ place: { slug: string } }> },
  emailsCsv: string
) {
  try {
    const articleUrl = getArticleUrl(article);
    const fullUrl = `https://www.yorkshire.com${articleUrl}`;
    const advertiseUrl = 'https://www.yorkshire.com/advertise';
    const emails = emailsCsv.split(',').map(e => e.trim()).filter(Boolean);

    if (emails.length === 0) return;

    console.log(`[PR Notify] Sending to ${emails.length} contacts for "${articleTitle}"`);

    let allSent = true;
    for (const email of emails) {
      const result = await sendEmail({
        templateKey: 'pr_article_published',
        to: email,
        variables: {
          contact_name: 'there',
          article_title: articleTitle,
          article_url: fullUrl,
          advertise_url: advertiseUrl,
        },
      });

      if (!result.success) {
        console.error(`[PR Notify] Failed to send to ${email}:`, result.error);
        allSent = false;
      } else {
        console.log(`[PR Notify] ✓ Sent to ${email}`);
      }
    }

    // Stamp sent_at so we don't re-send
    if (allSent) {
      await prisma.article.update({
        where: { article_id: articleId },
        data: {
          pr_contacts: {
            emails: emailsCsv,
            sent_at: new Date().toISOString(),
          },
        },
      });
    }
  } catch (error) {
    console.error('[PR Notify] Error sending PR emails:', error);
    // Non-blocking — don't fail the publish
  }
}

/**
 * Publish social posts to Copiq platforms
 * Called when editor publishes an article, or manually via retry button.
 * Non-blocking: failures don't affect article publishing.
 */
export async function publishSocialPostsAction(
  articleId: string,
  socialPosts: Record<string, {
    postId: string;
    platform: string;
    content: string;
    copiqPublishUrl: string;
    [key: string]: any;
  }>
) {
  const results: Record<string, {
    success: boolean;
    platformPostId?: string;
    platformUrl?: string;
    error?: string;
  }> = {};

  const copiqApiKey = process.env.COPIQ_API_KEY;
  const copiqBaseUrl = process.env.COPIQ_BASE_URL;

  for (const [platform, post] of Object.entries(socialPosts)) {
    if (!post.content) {
      results[platform] = { success: false, error: 'Missing content' };
      continue;
    }

    // Skip already published posts
    if (post.status === 'PUBLISHED') {
      results[platform] = { success: true, platformPostId: post.platformPostId, platformUrl: post.platformUrl };
      continue;
    }

    try {
      // Build the article's public URL for Copiq callback
      const articleRecord = await prisma.article.findUnique({
        where: { article_id: articleId },
        select: { slug: true, article_type: true, primary_category_id: true },
      });
      let articleUrl: string | undefined;
      if (articleRecord?.slug && articleRecord.article_type) {
        // Resolve category slug for full URL path
        let catSlug = '';
        if (articleRecord.primary_category_id) {
          const cat = await prisma.article_category.findUnique({
            where: { category_id: articleRecord.primary_category_id },
            select: { slug: true },
          });
          catSlug = cat?.slug ? `/${cat.slug}` : '';
        }
        articleUrl = `https://www.yorkshire.com/${articleRecord.article_type}${catSlug}/${articleRecord.slug}`;
      }

      let response: Response;

      if (post.copiqPublishUrl) {
        // Copiq-originated post: use specific publish URL
        response = await fetch(post.copiqPublishUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(copiqApiKey ? { 'Authorization': `Bearer ${copiqApiKey}` } : {}),
          },
          body: JSON.stringify({
            content: post.content,
            imageUrl: post.imageUrl ?? null,
            externalArticleId: articleId,
            ...(articleUrl ? { articleUrl } : {}),
          }),
        });
      } else if (copiqBaseUrl) {
        // Manual post: use generic Copiq endpoint
        response = await fetch(`${copiqBaseUrl}/api/social-posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(copiqApiKey ? { 'Authorization': `Bearer ${copiqApiKey}` } : {}),
          },
          body: JSON.stringify({
            platform: post.platform.toLowerCase(),
            content: post.content,
            imageUrl: post.imageUrl ?? null,
            articleUrl,
            externalArticleId: articleId,
          }),
        });
      } else {
        results[platform] = { success: false, error: 'COPIQ_BASE_URL not configured' };
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const publishUrl = post.copiqPublishUrl || `${copiqBaseUrl}/api/social-posts`;
        console.error(`[Social Publish] ${platform} failed (${response.status}) at ${publishUrl}:`, errorText);
        results[platform] = { success: false, error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` };
        continue;
      }

      const data = await response.json();
      results[platform] = {
        success: true,
        platformPostId: data.data?.platformPostId,
        platformUrl: data.data?.platformUrl,
      };

      console.log(`[Social Publish] ${platform} published:`, data.data?.platformUrl);
    } catch (error: any) {
      console.error(`[Social Publish] ${platform} error:`, error);
      results[platform] = { success: false, error: error.message || 'Network error' };
    }
  }

  // Update article with publish results
  try {
    const article = await prisma.article.findUnique({
      where: { article_id: articleId },
      select: { copiq_social_posts: true },
    });

    const currentPosts = (article?.copiq_social_posts as Record<string, any>) || {};
    const updatedPosts = { ...currentPosts };

    for (const [platform, result] of Object.entries(results)) {
      if (updatedPosts[platform]) {
        if (result.success) {
          updatedPosts[platform] = {
            ...updatedPosts[platform],
            status: 'PUBLISHED',
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
            publishedAt: new Date().toISOString(),
          };
        } else {
          updatedPosts[platform] = {
            ...updatedPosts[platform],
            status: 'FAILED',
            error: result.error,
          };
        }
      }
    }

    await prisma.article.update({
      where: { article_id: articleId },
      data: { copiq_social_posts: updatedPosts },
    });
  } catch (dbError) {
    console.error('[Social Publish] Failed to update article with results:', dbError);
  }

  return { results };
}

export async function deleteArticleAction(articleId: string) {
  try {
    await prisma.article.delete({
      where: { article_id: articleId },
    });

    revalidatePath("/admin/articles");
    return { success: true };
  } catch (error: any) {
    console.error("Delete article error:", error);
    return { success: false, error: error.message };
  }
}

