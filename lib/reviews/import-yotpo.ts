/**
 * Yotpo Review Import Utilities
 * 
 * Import existing reviews from Yotpo API to your own database
 */

interface YotpoReview {
  id: number;
  score: number;
  title: string;
  content: string;
  created_at: string;
  verified_buyer: boolean;
  user: {
    display_name: string;
    email?: string;
  };
  product_id: string;
  images?: Array<{
    original_url: string;
    thumb_url: string;
  }>;
}

interface YotpoResponse {
  status: {
    code: number;
    message: string;
  };
  response: {
    reviews: YotpoReview[];
    pagination: {
      page: number;
      per_page: number;
      total: number;
    };
  };
}

/**
 * Fetch all reviews for a product from Yotpo
 */
export async function fetchYotpoReviews(
  productId: string,
  page: number = 1
): Promise<YotpoReview[]> {
  const appKey = process.env.YOTPO_APP_KEY;
  
  if (!appKey) {
    throw new Error('YOTPO_APP_KEY not configured');
  }

  const url = `https://api.yotpo.com/v1/widget/${appKey}/products/${productId}/reviews.json?page=${page}&per_page=100`;

  try {
    const response = await fetch(url);
    const data: YotpoResponse = await response.json();

    if (data.status.code !== 200) {
      throw new Error(`Yotpo API error: ${data.status.message}`);
    }

    const reviews = data.response.reviews;
    const { page: currentPage, total } = data.response.pagination;
    const totalPages = Math.ceil(total / 100);

    // Recursively fetch all pages
    if (currentPage < totalPages) {
      const nextPageReviews = await fetchYotpoReviews(productId, page + 1);
      return [...reviews, ...nextPageReviews];
    }

    return reviews;
  } catch (error) {
    console.error('Error fetching Yotpo reviews:', error);
    return [];
  }
}

/**
 * Fetch all reviews for all products
 */
export async function fetchAllYotpoReviews(
  productIds: string[]
): Promise<Map<string, YotpoReview[]>> {
  const reviewsMap = new Map<string, YotpoReview[]>();

  for (const productId of productIds) {
    console.log(`Fetching reviews for product ${productId}...`);
    const reviews = await fetchYotpoReviews(productId);
    reviewsMap.set(productId, reviews);
    
    // Rate limiting - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return reviewsMap;
}

/**
 * Transform Yotpo review to your custom format
 */
export function transformYotpoReview(review: YotpoReview) {
  return {
    id: `yotpo_${review.id}`,
    productId: review.product_id,
    rating: review.score,
    title: review.title,
    content: review.content,
    authorName: review.user.display_name,
    authorEmail: review.user.email,
    verifiedPurchase: review.verified_buyer,
    createdAt: new Date(review.created_at),
    images: review.images?.map(img => ({
      url: img.original_url,
      thumbnail: img.thumb_url,
    })) || [],
    source: 'yotpo' as const,
  };
}

/**
 * Export reviews to JSON file for backup/import
 */
export async function exportYotpoReviewsToJSON(
  productIds: string[],
  outputPath: string
): Promise<void> {
  const reviewsMap = await fetchAllYotpoReviews(productIds);
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    totalProducts: productIds.length,
    totalReviews: Array.from(reviewsMap.values()).flat().length,
    reviews: Object.fromEntries(reviewsMap),
  };

  // In a real implementation, you'd write to file system or database
  console.log('Export data:', JSON.stringify(exportData, null, 2));
  
  return;
}





