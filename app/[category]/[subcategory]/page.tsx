import { notFound } from 'next/navigation';
import { getCollectionByHandle } from '@/lib/shopify/collections';
import { getCollectionContent } from '@/lib/content/collections';
import { getProductsByCollectionAndType } from '@/lib/shopify/products-by-type';
import { getSubcategoriesForCollection } from '@/lib/filters/category-filter';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { generateCollectionStructuredData } from '@/lib/structured-data/collection';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { ShopifyProduct } from '@/types/shopify';

interface SubcategoryPageProps {
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
}

/**
 * Subcategory Collection Page: /{category}/{subcategory}
 * 
 * Handles two cases:
 * 1. Subcategory is a Shopify collection (backward compatible)
 * 2. Subcategory is a productType (product type-based URLs)
 */
export default async function SubcategoryPage({ params }: SubcategoryPageProps) {
  const { category, subcategory } = await params;

  // First, try to fetch as a Shopify collection (backward compatible)
  let collection = await getCollectionByHandle(subcategory);
  let products: ShopifyProduct[] = [];
  let subcategoryTitle = subcategory.replace(/-/g, ' ');
  let isProductTypeBased = false;

  if (!collection) {
    // Not a collection - treat as productType subcategory
    // Fetch parent collection
    const parentCollection = await getCollectionByHandle(category);
    
    if (!parentCollection) {
      notFound();
    }

    // Get products filtered by productType
    // Try to match productType by normalizing the subcategory handle
    // e.g., "riding-boots" should match "Riding Boots" productType
    
    // Try multiple formats to match productType
    const alternatives = [
      subcategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), // "Riding Boots" (preferred)
      subcategoryTitle.charAt(0).toUpperCase() + subcategoryTitle.slice(1), // "Riding boots"
      subcategoryTitle, // "riding boots"
      subcategoryTitle.toUpperCase(), // "RIDING BOOTS"
      subcategory, // "riding-boots" (original)
    ];
    
    for (const alt of alternatives) {
      products = await getProductsByCollectionAndType(category, alt);
      if (products.length > 0) {
        // Find the actual productType from the matched products
        const actualProductType = products[0].productType;
        if (actualProductType) {
          subcategoryTitle = actualProductType;
        } else {
          subcategoryTitle = alt;
        }
        break;
      }
    }

    if (products.length === 0) {
    notFound();
  }

    // Create a mock collection object for rendering
    collection = {
      ...parentCollection,
      title: subcategoryTitle,
      description: `Shop ${subcategoryTitle} in ${parentCollection.title}`,
    };
    isProductTypeBased = true;
  } else {
    // It's a real collection - use its products
    products = collection.products.edges.map(({ node }) => node);
    subcategoryTitle = collection.title;
  }

  // Get product type subcategories for filters
  const productTypeSubcategories = await getSubcategoriesForCollection(category);

  // Verify this is a child of the category (optional validation)
  // if (collection.parentCollection !== category) {
  //   notFound();
  // }

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
        "name": category.replace(/-/g, ' '),
        "item": `${siteUrl}/${category}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": subcategoryTitle,
        "item": `${siteUrl}/${category}/${subcategory}`
      }
    ]
  };

  // Build CollectionPage structured data with hasOfferCatalog
  const collectionSchema = generateCollectionStructuredData(
    subcategoryTitle,
    `${siteUrl}/${category}/${subcategory}`,
    collection.description || `Shop ${subcategoryTitle} in ${category.replace(/-/g, ' ')}`,
    collection.image?.url,
    products, // Include products for hasOfferCatalog
    {
      name: category.replace(/-/g, ' '),
      url: `${siteUrl}/${category}`,
    }
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
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href={`/${category}`} className="hover:underline">
            {category.replace(/-/g, ' ')}
          </Link>
          {' / '}
            <span className="text-gray-900">{subcategoryTitle}</span>
        </nav>

        {/* Collection Header */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{subcategoryTitle}</h1>
            
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

        {/* Products Grid with Filters */}
        <ProductGridWithFilters
          products={products}
          subcategories={productTypeSubcategories}
          currentCategory={category}
          currentSubcategory={subcategory}
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
