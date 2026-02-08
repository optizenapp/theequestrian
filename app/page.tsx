import { Hero } from '@/components/Hero';
import { TrustSignals } from '@/components/TrustSignals';
import dynamic from 'next/dynamic';
import { getHomeSections } from '@/lib/content/home';
import { getProductsByHandlesAlt } from '@/lib/shopify/products-by-handles';
import { ReviewStars } from '@/components/reviews/ReviewStars';
import type { ShopifyProductCard } from '@/types/shopify';
import Link from 'next/link';
import { LazySection } from '@/components/LazySection';

export const dynamic = 'force-dynamic';

// Aggressively lazy load below-the-fold components to improve LCP
const MostWantedCarousel = dynamic(
  () => import('@/components/MostWantedCarousel').then((mod) => mod.MostWantedCarousel),
  {
    loading: () => <div className="h-96 bg-white animate-pulse rounded-lg" />,
  }
);

const BestDealsSliderContainer = dynamic(
  () => import('@/components/home/BestDealsSliderContainer').then((mod) => mod.BestDealsSliderContainer),
  {
    loading: () => <div className="h-80 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

const HomeRecentArticles = dynamic(
  () => import('@/components/home/HomeRecentArticles').then((mod) => mod.HomeRecentArticles),
  {
    loading: () => <div className="h-80 bg-white animate-pulse rounded-lg" />,
  }
);

const HomeFAQ = dynamic(
  () => import('@/components/home/HomeFAQ').then((mod) => mod.HomeFAQ),
  {
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

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
  const sections = await getHomeSections();

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

  // Schema.org structured data for homepage
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": "https://www.theequestrian.com.au/#organization",
        "name": "The Equestrian",
        "url": "https://www.theequestrian.com.au",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.theequestrian.com.au/logo-full.png",
          "width": 256,
          "height": 256,
          "caption": "The Equestrian Logo"
        },
        "image": "https://www.theequestrian.com.au/logo-full.png",
        "description": "Australia's premium online equestrian store. High-quality riding apparel, horse tack, grooming supplies, and accessories for competitive and leisure riders.",
        "email": "support@theequestrian.com.au",
        "telephone": "+61-419-851-891",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "41B Luck St",
          "addressLocality": "Macclesfield",
          "addressRegion": "SA",
          "postalCode": "5153",
          "addressCountry": "AU"
        },
        "priceRange": "$$",
        "currenciesAccepted": "AUD",
        "paymentAccepted": "Credit Card, PayPal, Afterpay",
        "areaServed": {
          "@type": "Country",
          "name": "Australia"
        },
        "sameAs": [
          "https://www.facebook.com/attheequestrian",
          "https://instagram.com/theequestrianoz",
          "https://www.youtube.com/channel/UCvcpt-fRaAY4PBavZicia1g"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+61-419-851-891",
          "contactType": "customer service",
          "areaServed": "AU",
          "availableLanguage": "en"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://www.theequestrian.com.au/#website",
        "url": "https://www.theequestrian.com.au",
        "name": "The Equestrian",
        "description": "Your premier Australian destination for equestrian fashion and horse gear.",
        "inLanguage": "en-AU",
        "publisher": {
          "@id": "https://www.theequestrian.com.au/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://www.theequestrian.com.au/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "WebPage",
        "@id": "https://www.theequestrian.com.au/#webpage",
        "url": "https://www.theequestrian.com.au",
        "name": "The Equestrian | Premium Horse Riding Gear & Apparel Australia",
        "isPartOf": {
          "@id": "https://www.theequestrian.com.au/#website"
        },
        "about": {
          "@id": "https://www.theequestrian.com.au/#organization"
        },
        "datePublished": "2023-10-01T08:00:00+10:00",
        "description": "Shop The Equestrian for the finest selection of horse tack, riding breeches, helmets, and stable supplies. Located in South Australia."
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.theequestrian.com.au/#faq",
        "isPartOf": {
          "@id": "https://www.theequestrian.com.au/#webpage"
        },
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What type of equestrian products does The Equestrian specialize in?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The Equestrian offers a curated selection of premium riding apparel, horse tack, grooming supplies, and accessories. We cater to both competitive riders (Dressage, Show Jumping, Eventing) and leisure riders across Australia looking for high-quality gear."
            }
          },
          {
            "@type": "Question",
            "name": "How do I choose the correct size for riding breeches and boots?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We recommend consulting the specific Size Guide located on every product page. Since equestrian sizing can vary between brands (such as European vs. Australian sizing), we provide detailed measurements to ensure the perfect fit for safety and comfort in the saddle."
            }
          },
          {
            "@type": "Question",
            "name": "What is The Equestrian's return policy on horse tack and apparel?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We accept returns on items that are clean, unused, and in their original packaging within 30 days of purchase. For safety reasons, certain items like helmets or horse bits may have specific restrictions. Please see our full Returns Policy page for details."
            }
          },
          {
            "@type": "Question",
            "name": "Do you offer free shipping on equestrian gear orders in Australia?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, we offer free standard shipping on qualifying orders within Australia. We ensure all packages, especially saddles and leather goods, are packed securely to arrive in pristine condition."
            }
          },
          {
            "@type": "Question",
            "name": "How should I care for my leather tack to ensure it lasts?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "To maintain the longevity of your bridles and saddles, we recommend cleaning them after every ride with a glycerin soap and conditioning them regularly with a high-quality leather balsam. Store your leather in a cool, dry tack room away from Australian heat and humidity."
            }
          }
        ]
      }
    ]
  };

  // If no CSV is present, keep the existing page usable (minimal fallback)
  if (!sectionsWithProducts.length) {
    return (
      <div>
        <Hero />
        <TrustSignals />
        <HomeRecentArticles />
      </div>
    );
  }

  return (
    <div>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
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
              <LazySection 
                key={section.key}
                fallback={<div className="h-96 bg-white animate-pulse rounded-lg" />}
                minHeight="24rem"
              >
                <MostWantedCarousel
                  products={carouselProducts}
                  eyebrow={section.eyebrow}
                  heading={section.title_html}
                  description={section.body_html}
                />
              </LazySection>
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
            return (
              <LazySection
                key={section.key}
                fallback={<div className="h-80 bg-gray-50 animate-pulse rounded-lg" />}
                minHeight="20rem"
              >
                <BestDealsSliderContainer 
                  section={section}
                />
              </LazySection>
            );

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
            return (
              <LazySection
                key={section.key}
                fallback={<div className="h-80 bg-white animate-pulse rounded-lg" />}
                minHeight="20rem"
              >
                <HomeRecentArticles />
              </LazySection>
            );

          case 'faqs':
            return (
              <LazySection
                key={section.key}
                fallback={<div className="h-64 bg-gray-50 animate-pulse rounded-lg" />}
                minHeight="16rem"
              >
                <HomeFAQ section={section} />
              </LazySection>
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
