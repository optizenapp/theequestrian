import Link from 'next/link';
import { ProductPrice } from './ProductPrice';
import { ProductReviewBadge } from './reviews/ProductReviewBadge';
import type { ShopifyProduct } from '@/types/shopify';

interface ProductCardProps {
  product: ShopifyProduct;
  priority?: boolean;
  showBreadcrumbs?: boolean;
  canonicalUrl?: string; // Optional: pass the canonical URL from server component
}

/**
 * Product Card Component
 * Modeled after Back Market's clean card style
 * 
 * Links directly to the canonical category-based URL (e.g., /horse/rugs/product-handle)
 * If canonicalUrl is not provided, falls back to /products/{handle}
 */
export function ProductCard({ product, priority = false, showBreadcrumbs = false, canonicalUrl }: ProductCardProps) {
  // Use provided canonical URL, or fallback to /products/{handle}
  const productHref = canonicalUrl || `/products/${product.handle}`;
  const image = product.images.edges[0]?.node;
  
  // Ensure we have a valid price object
  const price = product.priceRange?.minVariantPrice || { amount: '0', currencyCode: 'USD' };
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;

  return (
    <Link 
      href={productHref}
      className="group relative flex flex-col h-full bg-surface rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
    >
      {/* Badge / Tag */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
        {product.availableForSale && product.compareAtPriceRange?.minVariantPrice && 
         parseFloat(product.compareAtPriceRange.minVariantPrice.amount) > parseFloat(product.priceRange.minVariantPrice.amount) && (
          <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
            Sale
          </span>
        )}
      </div>

      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white mb-4">
        {image ? (
          <img
            src={image.url}
            alt={image.altText || product.title}
            className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
            loading={priority ? 'eager' : 'lazy'}
            width={image.width || 500}
            height={image.height || 500}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white text-gray-400">
            <span className="text-sm">No image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          
          {/* Review Badge */}
          <div className="mb-2">
            <ProductReviewBadge productId={product.id} productHandle={product.handle} />
          </div>
        </div>

        <div className="mt-2">
          <ProductPrice 
            price={price} 
            compareAtPrice={compareAtPrice}
            currencyCode={price.currencyCode}
          />
          
          {!product.availableForSale && (
             <span className="text-xs text-red-600 font-medium mt-1 block">
               Out of stock
             </span>
          )}
        </div>
      </div>
    </Link>
  );
}
