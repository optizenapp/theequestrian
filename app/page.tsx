import { Hero } from '@/components/Hero';
import { TrustSignals } from '@/components/TrustSignals';
import { BestDealsSlider } from '@/components/BestDealsSlider';
import { MostWantedCarousel } from '@/components/MostWantedCarousel';
import { HomeRecentArticles } from '@/components/home/HomeRecentArticles';
import { getHomeSections } from '@/lib/content/home';
import { getProductsByHandlesAlt } from '@/lib/shopify/products-by-handles';
import { ReviewStars } from '@/components/reviews/ReviewStars';
import type { ShopifyProductCard } from '@/types/shopify';
import Link from 'next/link';

// Helper to check if product is ShopifyProductCard (duplicated from MostWantedCarousel for now)
function isShopifyProduct(product: any): product is ShopifyProductCard {
  return 'handle' in product && 'priceRange' in product;
}

function formatGridProduct(product: any) {
  if (isShopifyProduct(product)) {
    const price = parseFloat(product.priceRange.minVariantPrice.amount);
    const comparePrice = product.compareAtPriceRange?.minVariantPrice?.amount
      ? parseFloat(product.compareAtPriceRange.minVariantPrice.amount)
      : null;
    
    const hasDiscount = comparePrice && comparePrice > price;
    const priceDisplay = hasDiscount
      ? `$${price.toFixed(2)} (was $${comparePrice.toFixed(2)})`
      : `$${price.toFixed(2)}`;

    // Get rating from custom Postgres lookup
    const rating = product.reviewRating?.value 
      ? parseFloat(product.reviewRating.value)
      : null;
    
    const reviewCount = product.reviewCount?.value ? parseInt(product.reviewCount.value) : undefined;

    return {
      title: product.title,
      price: priceDisplay,
      rating,
      reviewCount,
      tag: hasDiscount ? 'On Sale' : 'Best Seller',
      image: product.images.edges[0]?.node.url || '',
      handle: product.handle,
      primaryCollection: product.primaryCollection?.value || product.metafield?.value,
    };
  }
  
  return {
    title: product.title,
    price: product.price,
    rating: product.rating ? parseFloat(product.rating) : undefined,
    reviewCount: undefined,
    tag: product.tag,
    image: product.image,
    handle: undefined,
    primaryCollection: undefined,
  };
}

function InlineHtml({ html }: { html?: string }) {
  if (!html) return null;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default async function Home() {
  const sections = getHomeSections();

  // Fetch real products for sections that use product handles
  const sectionsWithProducts = await Promise.all(
    sections.map(async (section) => {
      if (section.product_handles && section.product_handles.length > 0) {
        const products = await getProductsByHandlesAlt(section.product_handles);
        return { ...section, fetchedProducts: products };
      }
      return section;
    })
  );

  // If no CSV is present, keep the existing page usable (minimal fallback)
  if (!sectionsWithProducts.length) {
    return (
      <div>
        <Hero />
        <TrustSignals />
        <BestDealsSlider />
        <HomeRecentArticles />
      </div>
    );
  }

  return (
    <div>
      {sectionsWithProducts.map((section) => {
        switch (section.type) {
          case 'hero':
            return (
              <Hero
                key={section.key}
                title={<InlineHtml html={section.title_html} />}
                subtitle={<InlineHtml html={section.subtitle_html} />}
                ctaText={section.cta_text}
                ctaLink={section.cta_link}
                secondaryCtaText={section.secondary_cta_text}
                secondaryCtaLink={section.secondary_cta_link}
                backgroundImageSrc={section.image_url}
                backgroundImageAlt={section.image_alt}
              />
            );

          case 'trust_signals':
            return <TrustSignals key={section.key} />;

          case 'most_wanted_carousel':
            // Use fetched products if available, otherwise fall back to manual items
            const carouselProducts = ('fetchedProducts' in section && section.fetchedProducts)
              ? section.fetchedProducts
              : (section.most_wanted_items || []);
            
            return (
              <MostWantedCarousel
                key={section.key}
                products={carouselProducts}
                eyebrow={section.eyebrow}
                heading={section.title_html}
                description={section.body_html}
              />
            );

          case 'most_wanted_grid':
            // Use fetched products if available, otherwise fall back to manual items
            const gridProducts = ('fetchedProducts' in section && section.fetchedProducts)
              ? section.fetchedProducts
              : (section.most_wanted_items || []);
            
            return (
              <section key={section.key} className="bg-gray-50 py-16">
                <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
                  <div className="text-center space-y-2">
                    {section.eyebrow && (
                      <p className="text-sm font-semibold tracking-[0.4em] uppercase text-gray-400">
                        {section.eyebrow}
                      </p>
                    )}
                    <h3 className="text-3xl font-bold text-gray-900">
                      <InlineHtml html={section.title_html} />
                    </h3>
                    {section.subtitle_html && (
                      <p className="text-gray-600 max-w-3xl mx-auto">
                        <InlineHtml html={section.subtitle_html} />
                      </p>
                    )}
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {gridProducts.map((item: any, index: number) => {
                      const formatted = formatGridProduct(item);
                      const productUrl = formatted.handle && formatted.primaryCollection
                        ? `/${formatted.primaryCollection}/${formatted.handle}`
                        : '#';

                      const CardContent = (
                        <>
                          <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-gray-100">
                            {formatted.image && (
                              <img src={formatted.image} alt={formatted.title} className="h-full w-full object-cover" />
                            )}
                          </div>
                          <p className="mt-4 text-xs text-primary font-semibold uppercase tracking-[0.4em]">
                            {formatted.tag}
                          </p>
                          <h4 className="mt-2 text-lg font-semibold text-gray-900 line-clamp-2">
                            {formatted.title}
                          </h4>
                          <p className="mt-1 text-base text-gray-700">{formatted.price}</p>
                          {formatted.rating !== null && formatted.rating !== undefined && (
                            <div className="mt-2">
                              <ReviewStars 
                                rating={formatted.rating} 
                                size="sm"
                                showNumber={true}
                                count={formatted.reviewCount}
                              />
                            </div>
                          )}
                        </>
                      );

                      return (
                        <div
                          key={`${formatted.title}-${index}`}
                          className="flex h-full"
                        >
                          {formatted.handle ? (
                            <Link 
                              href={productUrl}
                              className="w-full rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                            >
                              {CardContent}
                            </Link>
                          ) : (
                            <div className="w-full rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                              {CardContent}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );

          case 'best_deals_slider':
            return <BestDealsSlider key={section.key} />;

          case 'signup':
            return (
              <section key={section.key} className="bg-[#1DC4C6] py-12">
                <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center text-white sm:px-6">
                  {section.eyebrow && (
                    <p className="text-sm uppercase tracking-[0.4em]">{section.eyebrow}</p>
                  )}
                  {section.title_html && (
                    <h3 className="text-3xl font-bold">
                      <InlineHtml html={section.title_html} />
                    </h3>
                  )}
                  {section.body_html && (
                    <p className="max-w-2xl text-white/90">
                      <InlineHtml html={section.body_html} />
                    </p>
                  )}
                  <div className="flex w-full max-w-md items-center gap-3">
                    <input
                      type="email"
                      placeholder="Email address"
                      className="flex-1 rounded-full border border-white/60 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/70 focus:border-white focus:outline-none"
                    />
                    <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1DC4C6]">
                      {section.cta_text || 'Sign up'}
                    </button>
                  </div>
                </div>
              </section>
            );

          case 'recent_articles':
            return <HomeRecentArticles key={section.key} />;

          case 'faqs':
            return (
              <section key={section.key} className="bg-gray-50 py-16">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                  <div className="text-center">
                    {section.eyebrow && (
                      <p className="text-sm uppercase tracking-[0.4em] text-gray-400">{section.eyebrow}</p>
                    )}
                    <h3 className="text-3xl font-bold text-gray-900">
                      <InlineHtml html={section.title_html} />
                    </h3>
                  </div>
                  <div className="mt-10 grid gap-6 md:grid-cols-3">
                    {(section.faqs || []).map((faq) => (
                      <div key={faq.question} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h4 className="text-lg font-semibold text-gray-900">{faq.question}</h4>
                        <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          case 'seen_in':
            return (
              <section key={section.key} className="bg-white py-12">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                  <div className="text-center">
                    {section.eyebrow && (
                      <p className="text-sm uppercase tracking-[0.4em] text-gray-400">{section.eyebrow}</p>
                    )}
                    <h3 className="text-2xl font-bold text-gray-900">
                      <InlineHtml html={section.title_html} />
                    </h3>
                  </div>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                    {(section.seen_in || []).map((label) => (
                      <span key={label} className="text-sm font-semibold tracking-widest text-gray-500">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
