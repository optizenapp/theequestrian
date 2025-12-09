import Link from 'next/link';
import { getProductCanonicalUrl } from '@/lib/shopify/products';
import { ProductPrice } from './ProductPrice';
import { ProductCardBreadcrumbs } from './ProductCardBreadcrumbs';
import { getBreadcrumbsForProduct } from '@/lib/mapping/collection-mapping';
import type { ShopifyProduct } from '@/types/shopify';

interface ProductCardProps {
  product: ShopifyProduct;
  priority?: boolean;
  showBreadcrumbs?: boolean;
}

/**
 * Product Card Component
 * Modeled after Back Market's clean card style
 */
export function ProductCard({ product, priority = false, showBreadcrumbs = false }: ProductCardProps) {
  const href = getProductCanonicalUrl(product);
  const image = product.images.edges[0]?.node;
  
  // Ensure we have a valid price object
  const price = product.priceRange?.minVariantPrice || { amount: '0', currencyCode: 'USD' };
  const compareAtPrice = (product as any).compareAtPriceRange?.minVariantPrice;

  // Get breadcrumb paths if enabled
  const breadcrumbPaths = showBreadcrumbs && product.productType 
    ? getBreadcrumbsForProduct(product.productType)
    : [];

  return (
    <Link 
      href={href}
      className="group relative flex flex-col h-full bg-surface rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
    >
      {/* Badge / Tag (Optional - Example: 'Top Seller') */}
      {product.availableForSale && (
        <div className="absolute top-4 left-4 z-10">
          {/* <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-md">
            Refurbished
          </span> */}
        </div>
      )}

      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-50 mb-4">
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
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
            <span className="text-sm">No image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          {/* Breadcrumbs (if enabled) */}
          {showBreadcrumbs && breadcrumbPaths.length > 0 && (
            <ProductCardBreadcrumbs 
              paths={breadcrumbPaths}
              className="mb-2"
            />
          )}

          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          
          {/* Rating Stars (Placeholder) */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex text-yellow-400 text-xs">
              {'★★★★☆'}
            </div>
            <span className="text-xs text-gray-500">(12)</span>
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
