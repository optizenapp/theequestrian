import { notFound, redirect } from 'next/navigation';
import { getCollectionByHandle, getChildCollections } from '@/lib/shopify/collections';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';
import { getCollectionContent } from '@/lib/content/collections';
import { getSubcategoriesForCollection } from '@/lib/filters/category-filter';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { generateCollectionStructuredData } from '@/lib/structured-data/collection';
import Link from 'next/link';
import type { Metadata } from 'next';

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

/**
 * Category Collection Page: /{category}
 * 
 * Handles both:
 * - Top-level category collections
 * - Fallback product pages (products without primary_collection)
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;

  // Try to fetch as a collection first
  const collection = await getCollectionByHandle(category);

  if (!collection) {
    // If not a collection, try as a product (fallback)
    const product = await getProductByHandle(category);
    
    if (!product) {
      notFound();
    }

    // If product has a primary collection, redirect to canonical URL
    if (product.primaryCollection) {
      const canonicalUrl = getProductCanonicalUrl(product, '');
      redirect(canonicalUrl);
    }

    // Render fallback product page
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
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

              {/* Collections */}
              {product.collections.edges.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Categories:</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.collections.edges.map(({ node: collection }) => (
                      <a
                        key={collection.id}
                        href={`/${collection.handle}`}
                        className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                      >
                        {collection.title}
                      </a>
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
    );
  }

  // Get child collections (subcategories)
  const subcollections = await getChildCollections(category);

  // Get product type subcategories
  const productTypeSubcategories = await getSubcategoriesForCollection(category);

  // Get rich content for the collection
  const content = getCollectionContent(collection);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  // Build BreadcrumbList structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl || "/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": collection.title,
        "item": `${siteUrl}/${category}`
      }
    ]
  };

  // Build CollectionPage structured data with hasOfferCatalog
  const collectionSchema = generateCollectionStructuredData(
    collection.title,
    `${siteUrl}/${category}`,
    collection.description,
    collection.image?.url,
    collection.products.edges.map(({ node }) => node), // Include products for hasOfferCatalog
    undefined // No parent collection
  );

  return (
    <>
      {/* Structured Data - BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      
      {/* Structured Data - CollectionPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Collection Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{collection.title}</h1>
            
            {/* Rich Content */}
            {content.html && (
              <div 
                className="prose prose-lg max-w-none mb-8"
                dangerouslySetInnerHTML={{ __html: content.html }}
              />
            )}

            {/* Featured Links */}
            {content.featuredLinks.length > 0 && (
              <div className="mt-8 mb-8">
                <h2 className="text-2xl font-semibold mb-4">Featured</h2>
                <div className="flex flex-wrap gap-4">
                  {content.featuredLinks.map((link, index) => (
                    <Link
                      key={index}
                      href={link.type === 'product' 
                        ? `/products/${link.handle}`
                        : `/${link.handle}`
                      }
                      className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {link.text}
                    </Link>
                  ))}
                </div>
              </div>
          )}
        </div>

        {/* Subcollections */}
        {subcollections.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Shop by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subcollections.map((subcollection) => (
                <Link
                  key={subcollection.id}
                  href={`/${category}/${subcollection.handle}`}
                  className="group border rounded-lg p-6 hover:shadow-lg transition-shadow text-center"
                >
                  {subcollection.image && (
                    <div className="aspect-square overflow-hidden rounded-lg mb-4 bg-gray-100">
                      <img
                        src={subcollection.image.url}
                        alt={subcollection.image.altText || subcollection.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold text-lg">{subcollection.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid with Filters */}
        <ProductGridWithFilters
          products={collection.products.edges.map(({ node }) => node)}
          subcategories={productTypeSubcategories}
          currentCategory={category}
          parentCollectionTitle={collection.title}
        />
      </div>
    </div>
    </>
  );
}

/**
 * Generate metadata for SEO
 */
