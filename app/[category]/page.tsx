import { notFound, redirect } from 'next/navigation';
import { getAllProducts } from '@/lib/shopify/products';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';
import { getCollectionContent } from '@/lib/content/collections';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { generateCollectionStructuredData } from '@/lib/structured-data/collection';
import { 
  getProductTypesForCollection, 
  filterProductsByCollection,
  getSubcategoriesForCollection as getMappingSubcategories,
  getCollectionTitle,
  getCollectionHierarchy
} from '@/lib/mapping/collection-mapping';
import Link from 'next/link';
import type { Metadata } from 'next';

// ISR Configuration: Revalidate every 15 minutes
export const revalidate = 900;

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

/**
 * Category Collection Page: /{category}
 * 
 * Uses the mapping CSV to determine which products to show
 * based on their productType field
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;

  // Check if this category exists in our mapping
  const allowedProductTypes = getProductTypesForCollection(category);
  
  if (allowedProductTypes.length === 0) {
    // Try as a product (fallback)
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

  // Fetch ALL products from Shopify
  const allProducts = await getAllProducts();
  
  console.log(`[${category}] Total products from Shopify:`, allProducts.length);
  console.log(`[${category}] Allowed product types:`, allowedProductTypes);
  console.log(`[${category}] Sample product types from Shopify:`, 
    allProducts.slice(0, 5).map(p => ({ title: p.title, productType: p.productType }))
  );
  
  // Filter products by productType using our mapping
  const filteredProducts = filterProductsByCollection(
    allProducts,
    category
  );
  
  console.log(`[${category}] Filtered products:`, filteredProducts.length);

  // Get subcategories from our mapping
  const subcategories = getMappingSubcategories(category);

  // Get collection title from mapping
  const collectionTitle = getCollectionTitle(category);
  
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
        "name": collectionTitle,
        "item": `${siteUrl}/${category}`
      }
    ]
  };

  // Build CollectionPage structured data with hasOfferCatalog
  const collectionSchema = generateCollectionStructuredData(
    collectionTitle,
    `${siteUrl}/${category}`,
    `Shop ${collectionTitle} products at The Equestrian`,
    undefined,
    filteredProducts,
    undefined
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
          <h1 className="text-4xl font-bold mb-4">{collectionTitle}</h1>
          <p className="text-lg text-gray-600">
            Showing {filteredProducts.length} products
          </p>
        </div>

        {/* Subcategories */}
        {subcategories.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Shop by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subcategories.map((subcategory) => (
                <Link
                  key={subcategory.handle}
                  href={`/${category}/${subcategory.handle}`}
                  className="group border rounded-lg p-6 hover:shadow-lg transition-shadow text-center"
                >
                  <h3 className="font-semibold text-lg">{subcategory.label}</h3>
                  <p className="text-sm text-gray-500 mt-2">{subcategory.count} items</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid with Filters */}
        <ProductGridWithFilters
          products={filteredProducts}
          subcategories={subcategories.map(s => ({
            handle: s.handle,
            label: s.label,
            value: s.handle,
            count: s.count,
            productType: s.label
          }))}
          currentCategory={category}
          parentCollectionTitle={collectionTitle}
        />
      </div>
    </div>
    </>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const collectionTitle = getCollectionTitle(category);

  return {
    title: `${collectionTitle} | The Equestrian`,
    description: `Shop ${collectionTitle} products at The Equestrian. Quality equestrian supplies and equipment.`,
  };
}

/**
 * Generate static params for all top-level categories at build time
 * This pre-renders the most important pages for instant loading
 */
export async function generateStaticParams() {
  // Pre-render all top-level categories from mapping
  const topLevelCategories = [
    'horse',
    'rider',
    'clothing',
    'pet',
    'accessories',
  ];

  return topLevelCategories.map((category) => ({
    category,
  }));
}
