import Link from 'next/link';
import type { ShopifyProduct } from '@/types/shopify';

interface ProductCardProps {
  product: ShopifyProduct;
  priority?: boolean;
}

/**
 * Product Card Component (Back Market style)
 * 
 * Features:
 * - Clean white card with subtle shadow
 * - Product image with hover zoom
 * - Price with optional strikethrough for compare-at price
 * - "Starting at" for products with variants
 * - Hover lift effect
 * - Brand colors for CTAs
 */
