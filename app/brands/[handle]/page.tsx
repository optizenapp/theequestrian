import { notFound } from 'next/navigation';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { getBrandContentByHandle } from '@/lib/content/brand-content';
import { RichContent } from '@/components/collection/RichContent';
import { FAQSection } from '@/components/collection/FAQSection';
import { CollectionDescription } from '@/components/CollectionDescription';
import { generateBrandPageSchema } from '@/lib/utils/brand-page-schema';
import { FAQItem } from '@/lib/content/collections';
import { getBrandProductsFromDb } from '@/lib/brands/get-brand-products';
import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 3600;

interface BrandPageProps {
  params: Promise<{
    handle: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { handle } = await params;
  const brand = await getBrandContentByHandle(handle);

  if (!brand) {
    return {
      title: 'Brand Not Found',
    };
  }

  const title = brand.meta_title || `${brand.title} | The Equestrian`;
  const description = brand.meta_description || `Shop the full range of ${brand.title} equestrian products. Saddles, tack, clothing and more from ${brand.title}.`;
  const canonicalUrl = `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '')}/brands/${handle}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: 'The Equestrian',
    },
  };
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { handle } = await params;
  const { cursor, brand: brandParam, size, color } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;
  const filterBrands = brandParam ? (Array.isArray(brandParam) ? brandParam : brandParam.split(',')) : undefined;
  const filterSizes = size ? (Array.isArray(size) ? size : size.split(',')) : undefined;
  const filterColors = color ? (Array.isArray(color) ? color : color.split(',')) : undefined;

  // 1. Verify Brand Exists in Mapping
  const brand = await getBrandContentByHandle(handle);
  if (!brand) {
    notFound();
  }

  // Brand PLPs always use Postgres + brand rules so new brands work without a matching Shopify collection.
  // Variants for cart CTAs are merged from Storefront inside getBrandProductsFromDb.
  const {
    products,
    pageInfo,
    totalCount: totalProductCount,
    productUrls: productUrlsMap,
    facets,
  } = await getBrandProductsFromDb(brand, 36, afterCursor, {
    brands: filterBrands,
    sizes: filterSizes,
    colors: filterColors,
  });

  // Fetch review stats for all products in one batch (server-side)
  const productHandles = products.map(p => p.handle);
  const reviewStatsMap = await getReviewStatsForProducts(productHandles);

  // Serialize Maps to plain objects for Client Components (Maps are not JSON-serializable in RSC)
  const productUrls = Object.fromEntries(productUrlsMap);
  const reviewStats = Object.fromEntries(reviewStatsMap);
  
  // Parse content
  const pageTitle = brand.h1_title || brand.title;
  const shortDescription = brand.short_description || `Shop our comprehensive collection of ${brand.title} products.`;
  const longDescription = brand.long_description || '';
  
  let faqItems: FAQItem[] = [];
  try {
    if (brand.faq_json) {
      faqItems = JSON.parse(brand.faq_json);
    }
  } catch (e) {
    console.warn(`Failed to parse FAQ JSON for brand ${brand.handle}`, e);
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');

  const enhancedSchema = generateBrandPageSchema({
    brand: {
      handle,
      name: brand.title,
      description: brand.meta_description || shortDescription,
      breadcrumbLabel: brand.breadcrumb_label,
    },
    products,
    totalProductCount: totalProductCount || brand.products_count || products.length,
    productUrls: productUrlsMap,
    siteUrl,
    maxProductsInSchema: 12,
  });

  return (
    <>
      {/* Structured Data - @graph with BreadcrumbList + CollectionPage + ItemList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(enhancedSchema) }}
      />

      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Breadcrumbs */}
        <nav className="container mx-auto px-4 py-4">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <Link href="/brands" className="hover:text-primary transition-colors">
                Brands
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <span className="text-gray-900 font-medium">{brand.breadcrumb_label || brand.title}</span>
            </li>
          </ol>
        </nav>

        {/* Hero Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {pageTitle}
            </h1>
            <div>
              <CollectionDescription description={shortDescription} />
              {totalProductCount > 0 && (
                <p className="mt-4 text-sm text-gray-500">
                  Showing {totalProductCount} results
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Product Grid */}
          <ProductGridWithFilters
            products={products}
            currentCategory="brands"
            currentSubcategory={brand.handle}
            pageInfo={{
              hasNextPage: pageInfo.hasNextPage,
              endCursor: pageInfo.endCursor
            }}
            totalCount={totalProductCount}
            serverFacets={facets}
            productUrls={productUrls}
            reviewStatsMap={reviewStats}
          />

          {/* Long Description (Rich Content) */}
          {longDescription ? (
            <RichContent html={longDescription} />
          ) : (
             /* Fallback content if no custom long description */
             <div className="mt-16 bg-white rounded-lg p-8 shadow-sm">
                <h2>About {brand.title}</h2>
                <p>Discover the premium range of <strong>{brand.title}</strong> products at The Equestrian. 
                Known for their quality and innovation, {brand.title} is a trusted name in the equestrian world.</p>
             </div>
          )}

          {/* FAQ Section */}
          {faqItems.length > 0 && (
            <FAQSection 
              faqs={faqItems}
              categoryTitle={brand.title}
            />
          )}
        </div>
      </div>
    </>
  );
}

