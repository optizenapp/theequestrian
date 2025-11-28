/**
 * Custom Review System Types
 */

export interface Review {
  id: string;
  productId: string;
  productHandle: string;
  rating: number; // 1-5
  title: string;
  content: string;
  authorName: string;
  authorEmail?: string;
  verifiedPurchase: boolean;
  helpful: number; // Helpful votes count
  notHelpful: number; // Not helpful votes count
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  images?: ReviewImage[];
  source: 'custom' | 'yotpo' | 'imported';
  metadata?: Record<string, any>;
}

export interface ReviewImage {
  id: string;
  url: string;
  thumbnail: string;
  alt?: string;
}

export interface ReviewStats {
  productId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchaseCount: number;
  withPhotosCount: number;
}

export interface ReviewFormData {
  productId: string;
  rating: number;
  title: string;
  content: string;
  authorName: string;
  authorEmail: string;
  orderId?: string; // For verified purchase
  images?: File[];
}

export interface ReviewFilters {
  rating?: number;
  verifiedOnly?: boolean;
  withPhotos?: boolean;
  sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
  page?: number;
  perPage?: number;
}





