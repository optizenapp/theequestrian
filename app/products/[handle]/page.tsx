import { notFound } from 'next/navigation';
import { getProductByHandle } from '@/lib/shopify/products';
import type { Metadata } from 'next';

interface ProductPageProps {
  params: Promise<{
    handle: string;
  }>;
}

/**
 * Canonical Product Page: /products/{handle}
 * 
 * This is the single source of truth for all product URLs.
 * All other product URL patterns should redirect here.
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;

  // Fetch product from Shopify
  const product = await getProductByHandle(handle);

  if (!product) {
    notFound();
  }

  // Build breadcrumb from primary collection
  const breadcrumbs = product.primaryCollection 
    ? product.primaryCollection.split('/')
    : [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  // Build BreadcrumbList structured data
  const breadcrumbSchema = breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl || "/"
      },
      ...breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": crumb.replace(/-/g, ' '),
        "item": `${siteUrl}/${breadcrumbs.slice(0, index + 1).join('/')}`
      })),
      {
        "@type": "ListItem",
        "position": breadcrumbs.length + 2,
        "name": product.title,
        "item": `${siteUrl}/products/${handle}`
      }
    ]
  } : null;

  // Build Product structured data
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description,
    "image": product.images.edges.length > 0 ? product.images.edges[0].node.url : undefined,
    "offers": {
      "@type": "Offer",
      "url": `${siteUrl}/products/${handle}`,
      "priceCurrency": product.priceRange.minVariantPrice.currencyCode,
      "price": product.priceRange.minVariantPrice.amount,
      "availability": product.availableForSale 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock"
    }
  };

  return (
    <>
      {/* Structured Data - BreadcrumbList */}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      
      {/* Structured Data - Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          {breadcrumbs.length > 0 && (
            <nav className="text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <a href="/" className="hover:underline">Home</a>
                </li>
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mx-2">/</span>
                    <a 
                      href={`/${breadcrumbs.slice(0, index + 1).join('/')}`}
                      className="hover:underline capitalize"
                    >
                      {crumb.replace(/-/g, ' ')}
                    </a>
                  </li>
                ))}
                <li className="flex items-center">
                  <span className="mx-2">/</span>
                  <span className="text-gray-900">{product.title}</span>
                </li>
              </ol>
            </nav>
          )}

        {/* Product Content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            {product.images.edges.length > 0 && (
              <img
                src={product.images.edges[0].node.url}
                alt={product.images.edges[0].node.altText || product.title}
                className="w-full rounded-lg"
              />
            )}
          </div>

          {/* Product Details */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
            
            <div className="text-2xl font-semibold mb-6">
              {product.priceRange.minVariantPrice.currencyCode}{' '}
              {product.priceRange.minVariantPrice.amount}
            </div>

            <div 
              className="prose mb-6"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />

            {/* Variants */}
            {product.variants.edges.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Options:</h3>
                <div className="space-y-2">
                  {product.variants.edges.map(({ node: variant }) => (
                    <div key={variant.id} className="flex items-center gap-2">
                      <span>{variant.title}</span>
                      <span className="text-gray-600">
                        - {variant.price.currencyCode} {variant.price.amount}
                      </span>
                      {!variant.availableForSale && (
                        <span className="text-red-500 text-sm">(Out of stock)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <button
              className="w-full bg-black text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300"
              disabled={!product.availableForSale}
            >
              {product.availableForSale ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

/**
 * Generate metadata for SEO
 */
