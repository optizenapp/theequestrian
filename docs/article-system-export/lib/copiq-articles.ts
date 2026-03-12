/**
 * Copiq Article Handler
 * 
 * Handles article creation, updates, and deletion from Copiq.
 * Includes image processing: downloads from Copiq S3, uploads to Yorkshire S3.
 * Generates AI alt text for all images using GPT-4o Vision.
 */

import { prisma } from './prisma';
import { uploadBufferToS3 } from './s3/storage';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Copiq Article Data Structure
 */
export interface CopiqSocialPost {
  postId: string;
  platform: string;
  content: string;
  imageUrl?: string;
  maxCharacters?: number;
  copiqPublishUrl: string;
  // Populated after publishing
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
  id: string;                    // Copiq's unique ID
  title: string;
  content: string;               // HTML content
  slug: string;
  excerpt?: string;
  status: 'draft' | 'publish' | 'future';
  image?: string;                // URL to featured image (S3)
  keywords?: string;
  seoTitle?: string;
  post_date?: string;            // ISO 8601
  meta?: {
    article_type?: string;
    category_slug?: string;
    primary_place_slug?: string;
    author_name?: string;
    exclude_from_place_hubs?: boolean;
    social_posts?: CopiqSocialPosts;
    pr_contacts?: string;   // Comma-separated email addresses for PR notifications
  };
}

/**
 * Generate alt text for an image using GPT-4o Vision
 */
async function generateImageAltText(imageUrl: string, articleTitle: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use mini for cost efficiency on bulk processing
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Generate alt text for this image that will appear in a Yorkshire tourism article titled "${articleTitle}".

Requirements:
- Be descriptive and specific (what's actually in the image)
- Maximum 125 characters
- Don't start with "image of", "photo of", or "picture of"
- Focus on visual elements: landscape, architecture, people, atmosphere
- If it's a Yorkshire location, mention the place name if recognizable

Respond with ONLY the alt text, nothing else.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'low', // Cost savings
              },
            },
          ],
        },
      ],
      max_tokens: 100,
      temperature: 0.5,
    });

    const altText = response.choices[0].message.content?.trim() || '';
    console.log(`[Copiq] Generated alt text: "${altText}"`);
    return altText;
  } catch (error) {
    console.error('[Copiq] Alt text generation failed:', error);
    return 'Image from article'; // Fallback
  }
}

/**
 * Download image from URL and upload to Yorkshire S3
 */
async function downloadAndUploadImage(
  imageUrl: string,
  slug: string,
  index: number
): Promise<string | null> {
  try {
    console.log(`[Copiq] Downloading image: ${imageUrl}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`[Copiq] Failed to download image: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';

    // Upload to Yorkshire S3
    const folder = `articles/copiq/${slug}`;
    const publicUrl = await uploadBufferToS3(buffer, folder, contentType);

    console.log(`[Copiq] ✓ Uploaded image ${index + 1}: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('[Copiq] Image download/upload failed:', error);
    return null;
  }
}

/**
 * Convert base64 image to S3 and return URL
 */
async function convertBase64ToImage(
  base64Image: string,
  slug: string
): Promise<string | null> {
  try {
    // Check if it's a URL instead of base64
    if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
      return await downloadAndUploadImage(base64Image, slug, 0);
    }

    // Extract image data from base64
    const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      console.error('[Copiq] Invalid image format - must be data:image/[type];base64,... or URL');
      return null;
    }

    const [, extension, data] = matches;
    const buffer = Buffer.from(data, 'base64');

    // Upload to Yorkshire S3
    const folder = `articles/copiq/${slug}`;
    const contentType = `image/${extension}`;
    const publicUrl = await uploadBufferToS3(buffer, folder, contentType);

    console.log(`[Copiq] ✓ Uploaded base64 image: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('[Copiq] Image upload failed:', error);
    return null;
  }
}

/**
 * Process HTML content to download Copiq S3 images, replace URLs, and add AI alt text
 * Returns: { processedContent, extractedImages, featuredImageAlt }
 */
async function processBodyImages(
  htmlContent: string,
  slug: string,
  articleTitle: string
): Promise<{ processedContent: string; extractedImages: string[]; featuredImageAlt: string }> {
  const extractedImages: string[] = [];
  let processedContent = htmlContent;
  let featuredImageAlt = '';

  // Match full img tags with Copiq S3 URLs
  const imgTagPattern = /<img\s+[^>]*src=["'](https?:\/\/copiq[^"']+\.s3[^"']+)["'][^>]*>/gi;
  const matches: Array<{ fullTag: string; url: string }> = [];
  let match;
  
  while ((match = imgTagPattern.exec(htmlContent)) !== null) {
    matches.push({ fullTag: match[0], url: match[1] });
  }

  if (matches.length === 0) {
    console.log('[Copiq] No Copiq S3 images found in content');
    return { processedContent, extractedImages, featuredImageAlt };
  }

  console.log(`[Copiq] Found ${matches.length} Copiq S3 images to process`);

  // Process each image
  for (let i = 0; i < matches.length; i++) {
    const { fullTag, url: originalUrl } = matches[i];
    const newUrl = await downloadAndUploadImage(originalUrl, slug, i);

    if (newUrl) {
      extractedImages.push(newUrl);

      // Generate AI alt text
      const altText = await generateImageAltText(newUrl, articleTitle);
      
      // Store first image's alt text for featured image
      if (i === 0) {
        featuredImageAlt = altText;
      }

      // Build new img tag with updated URL and alt text
      let newTag = fullTag;
      
      // Replace the src URL
      newTag = newTag.replace(originalUrl, newUrl);
      
      // Update or add alt attribute
      if (/alt=["'][^"']*["']/i.test(newTag)) {
        // Replace existing alt (even if empty)
        newTag = newTag.replace(/alt=["'][^"']*["']/i, `alt="${altText}"`);
      } else {
        // Add alt attribute before closing >
        newTag = newTag.replace(/>$/, ` alt="${altText}">`);
      }

      // Replace the full tag in content
      processedContent = processedContent.replace(fullTag, newTag);
    }
  }

  console.log(`[Copiq] ✓ Processed ${extractedImages.length} images with AI alt text`);
  return { processedContent, extractedImages, featuredImageAlt };
}

/**
 * Merge incoming social posts with existing ones, preserving published states and editor-added images
 */
function mergeSocialPosts(existing: CopiqSocialPosts, incoming: CopiqSocialPosts): CopiqSocialPosts {
  const merged = { ...incoming };
  for (const [platform, existingPost] of Object.entries(existing)) {
    if (merged[platform] && existingPost.status === 'PUBLISHED') {
      // Preserve published state; Copiq's new content still updates the draft text
      merged[platform] = {
        ...merged[platform],
        status: existingPost.status,
        platformPostId: existingPost.platformPostId,
        platformUrl: existingPost.platformUrl,
        publishedAt: existingPost.publishedAt,
      };
    }
    // Preserve editor-added images where Copiq sent none
    if (merged[platform] && !merged[platform].imageUrl && existingPost.imageUrl) {
      merged[platform].imageUrl = existingPost.imageUrl;
    }
  }
  return merged;
}

/**
 * Save or update article from Copiq
 */
export async function saveCopiqArticle(data: CopiqArticle) {
  // Extract custom fields with defaults
  const articleType = data.meta?.article_type || 'news';
  const categorySlug = data.meta?.category_slug;
  const primaryPlaceSlug = data.meta?.primary_place_slug;
  const authorName = data.meta?.author_name || 'Yorkshire.com Editorial Team';
  const excludeFromPlaceHubs = data.meta?.exclude_from_place_hubs || false;

  // Validate article_type
  const validTypes = ['news', 'inspiration', 'history', 'guide', 'route'];
  if (!validTypes.includes(articleType)) {
    console.warn('[Copiq] Invalid article_type:', articleType, '- defaulting to news');
  }

  // Normalize status
  const normalizedStatus = data.status === 'publish' ? 'published' : 'draft';

  // Process body images first (download from Copiq S3, upload to Yorkshire S3, generate alt text)
  const { processedContent, extractedImages, featuredImageAlt } = await processBodyImages(
    data.content, 
    data.slug,
    data.title
  );

  // Handle featured image
  let featuredImageUrl: string | null = null;
  let finalFeaturedImageAlt: string | null = null;
  
  if (data.image) {
    // Explicit featured image URL provided
    featuredImageUrl = await convertBase64ToImage(data.image, data.slug);
    if (featuredImageUrl) {
      // Generate alt text for explicit featured image
      finalFeaturedImageAlt = await generateImageAltText(featuredImageUrl, data.title);
    }
  } else if (extractedImages.length > 0) {
    // Use first body image as featured image
    featuredImageUrl = extractedImages[0];
    finalFeaturedImageAlt = featuredImageAlt;
    console.log(`[Copiq] Using first body image as featured: ${featuredImageUrl}`);
  }

  // Get category ID if category_slug provided
  let categoryId: string | null = null;
  if (categorySlug) {
    const category = await prisma.article_category.findUnique({
      where: { slug: categorySlug },
      select: { category_id: true },
    });
    if (category) {
      categoryId = category.category_id;
    } else {
      console.warn('[Copiq] Category not found:', categorySlug, '- article will be uncategorized');
    }
  }

  // Get place ID if primary_place_slug provided
  let primaryPlaceId: string | null = null;
  if (primaryPlaceSlug) {
    const place = await prisma.place.findUnique({
      where: { slug: primaryPlaceSlug },
      select: { place_id: true },
    });
    if (place) {
      primaryPlaceId = place.place_id;
    } else {
      console.warn('[Copiq] Place not found:', primaryPlaceSlug, '- article will be regional');
    }
  }

  // Prepare social posts data (from Copiq payload)
  const socialPostsData = data.meta?.social_posts || null;

  // Prepare PR contacts data
  const prContactsData = data.meta?.pr_contacts
    ? { emails: data.meta.pr_contacts, sent_at: null, sent_by: null }
    : null;

  // Fetch existing article to merge social posts properly
  const existingArticle = await prisma.article.findUnique({
    where: { copiq_id: data.id },
    select: { copiq_social_posts: true },
  });

  // Merge social posts if both exist
  const mergedSocialPosts = socialPostsData && existingArticle?.copiq_social_posts
    ? mergeSocialPosts(existingArticle.copiq_social_posts as unknown as CopiqSocialPosts, socialPostsData)
    : socialPostsData;

  // Upsert article (create or update based on copiq_id)
  const article = await prisma.article.upsert({
    where: { copiq_id: data.id },
    update: {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt || null,
      content: processedContent, // Use processed content with Yorkshire S3 URLs and AI alt text
      article_type: articleType,
      primary_category_id: categoryId,
      status: normalizedStatus,
      featured_image_url: featuredImageUrl,
      featured_image_alt: finalFeaturedImageAlt, // AI-generated alt text
      meta_title: data.seoTitle || null,
      author_name: authorName,
      exclude_from_place_hubs: excludeFromPlaceHubs,
      published_at: normalizedStatus === 'published' 
        ? (data.post_date ? new Date(data.post_date) : new Date())
        : null,
      updated_at: new Date(),
      // Merge social posts: preserve existing publish status, add new platforms
      ...(mergedSocialPosts ? { copiq_social_posts: mergedSocialPosts as any } : {}),
      ...(prContactsData ? { pr_contacts: prContactsData as any } : {}),
    },
    create: {
      copiq_id: data.id,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt || null,
      content: processedContent, // Use processed content with Yorkshire S3 URLs and AI alt text
      article_type: articleType,
      primary_category_id: categoryId,
      status: normalizedStatus,
      featured_image_url: featuredImageUrl,
      featured_image_alt: finalFeaturedImageAlt, // AI-generated alt text
      meta_title: data.seoTitle || null,
      author_name: authorName,
      exclude_from_place_hubs: excludeFromPlaceHubs,
      published_at: normalizedStatus === 'published'
        ? (data.post_date ? new Date(data.post_date) : new Date())
        : null,
      ...(socialPostsData ? { copiq_social_posts: socialPostsData as any } : {}),
      ...(prContactsData ? { pr_contacts: prContactsData as any } : {}),
    },
  });

  // Handle place linking
  if (primaryPlaceId) {
    // Remove existing place links
    await prisma.article_place.deleteMany({
      where: { article_id: article.article_id },
    });

    // Create new place link
    await prisma.article_place.create({
      data: {
        article_id: article.article_id,
        place_id: primaryPlaceId,
        primary_place: true,
      },
    });
  } else {
    // Remove any existing place links if no place specified
    await prisma.article_place.deleteMany({
      where: { article_id: article.article_id },
    });
  }

  return article;
}

/**
 * Delete article by Copiq ID
 */
export async function deleteCopiqArticle(copiqId: string) {
  const article = await prisma.article.findUnique({
    where: { copiq_id: copiqId },
  });

  if (!article) {
    throw new Error(`Article not found with copiq_id: ${copiqId}`);
  }

  await prisma.article.delete({
    where: { article_id: article.article_id },
  });
}
