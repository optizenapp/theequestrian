import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_NAME_DISPLAY } from '@/lib/seo/site-identity';
import { Hero } from '@/components/Hero';
import { HeroSlider } from '@/components/HeroSlider';
import { TrustSignals } from '@/components/TrustSignals';
import dynamicImport from 'next/dynamic';
import { getCachedHomeSectionsWithProducts } from '@/lib/content/home-page-cached';
import Link from 'next/link';
import { LazySection } from '@/components/LazySection';

/** Keep the document cache aligned with the cached home-section/product data. */
export const revalidate = 300;

const _homeSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/+$/, '');

export const metadata: Metadata = {
  title: `${SITE_NAME_DISPLAY} | Premium Horse Riding Gear & Apparel Australia`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: _homeSiteUrl,
    types: {
      'application/rss+xml': `${_homeSiteUrl}/rss.xml`,
    },
  },
  openGraph: {
    title: `${SITE_NAME_DISPLAY} | Premium Horse Riding Gear & Apparel Australia`,
    description: SITE_DESCRIPTION,
    url: _homeSiteUrl,
    siteName: SITE_NAME_DISPLAY,
    locale: 'en_AU',
    type: 'website',
  },
};

// Aggressively lazy load below-the-fold components to improve LCP
const MostWantedCarousel = dynamicImport(
  () => import('@/components/MostWantedCarousel').then((mod) => mod.MostWantedCarousel),
  {
    loading: () => <div className="h-96 bg-white animate-pulse rounded-lg" />,
  }
);

const BestDealsSliderContainer = dynamicImport(
  () => import('@/components/home/BestDealsSliderContainer').then((mod) => mod.BestDealsSliderContainer),
  {
    loading: () => <div className="h-80 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

const HomeRecentArticles = dynamicImport(
  () => import('@/components/home/HomeRecentArticles').then((mod) => mod.HomeRecentArticles),
  {
    loading: () => <div className="h-80 bg-white animate-pulse rounded-lg" />,
  }
);

const HomeFAQ = dynamicImport(
  () => import('@/components/home/HomeFAQ').then((mod) => mod.HomeFAQ),
  {
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

function InlineHtml({ html }: { html?: string }) {
  if (!html) return null;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default async function Home() {
  const sectionsWithProducts = await getCachedHomeSectionsWithProducts();

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/+$/, '');

  // Schema.org structured data for homepage
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": `${siteUrl}#organization`,
        "name": SITE_NAME,
        "url": siteUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${siteUrl}/logo-full.png`,
          "width": 256,
          "height": 256,
          "caption": "The Equestrian Logo"
        },
        "image": `${siteUrl}/logo-full.png`,
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
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "@id": `${siteUrl}#return-policy`,
          "applicableCountry": "AU",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 30,
          "returnMethod": "https://schema.org/ReturnByMail",
          "returnFees": "https://schema.org/FreeReturn",
          "refundType": "https://schema.org/FullRefund",
          "returnPolicyCountry": "AU"
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
        "@id": `${siteUrl}#website`,
        "url": siteUrl,
        "name": SITE_NAME_DISPLAY,
        "alternateName": SITE_NAME,
        "description": SITE_DESCRIPTION,
        "inLanguage": "en-AU",
        "publisher": {
          "@id": `${siteUrl}#organization`
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${siteUrl}/search?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        "url": `${siteUrl}/`,
        "name": "The Equestrian | Premium Horse Riding Gear & Apparel Australia",
        "isPartOf": {
          "@id": `${siteUrl}#website`
        },
        "about": {
          "@id": `${siteUrl}#organization`
        },
        "datePublished": "2023-10-01T08:00:00+10:00",
        "description": "Shop The Equestrian for the finest selection of horse tack, riding breeches, helmets, and stable supplies. Located in South Australia."
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        "isPartOf": {
          "@id": `${siteUrl}/#webpage`
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
            "name": "How does shipping work for equestrian gear orders in Australia?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Shipping rates vary by product and seller. Eligible items may qualify for free shipping, which is shown on the product page. All shipping costs are calculated and displayed at checkout before you pay."
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
        <Suspense fallback={<div className="h-80 bg-white" />}>
          <HomeRecentArticles />
        </Suspense>
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
      {sectionsWithProducts.map((section, index) => {
        switch (section.type) {
          case 'hero':
            if (section.hero_slides && section.hero_slides.length > 0) {
              return (
                <HeroSlider
                  key={section.key}
                  slides={section.hero_slides}
                  intervalMs={4000}
                  title={<InlineHtml html={section.title_html} />}
                  subtitle={<InlineHtml html={section.subtitle_html} />}
                  ctaText={section.cta_text}
                  ctaLink={section.cta_link}
                  secondaryCtaText={section.secondary_cta_text}
                  secondaryCtaLink={section.secondary_cta_link}
                />
              );
            }
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
          case 'most_wanted_grid': {
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
                  heading={<InlineHtml html={section.title_html} />}
                  description={<InlineHtml html={section.body_html || section.subtitle_html} />}
                />
              </LazySection>
            );
          }

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
              <Suspense
                key={section.key}
                fallback={<div className="h-80 bg-white" />}
              >
                <HomeRecentArticles />
              </Suspense>
            );

          case 'faqs':
            if (!section.faqs || section.faqs.length === 0) {
              return null;
            }
            return (
              <LazySection
                key={section.key}
                fallback={<div className="h-64 bg-gray-50 animate-pulse rounded-lg" />}
                minHeight="16rem"
              >
                <HomeFAQ section={section} />
              </LazySection>
            );

          case 'rich_text':
            // Render consecutive rich_text entries as one responsive grid.
            if (sectionsWithProducts[index - 1]?.type === 'rich_text') {
              return null;
            }

            const richTextGroup = sectionsWithProducts.slice(index).filter((item, itemIndex, arr) => {
              if (itemIndex === 0) return item.type === 'rich_text';
              return arr[itemIndex - 1]?.type === 'rich_text' && item.type === 'rich_text';
            });

            if (!richTextGroup.length) return null;

            return (
              <section key={section.key} className="bg-white py-6 sm:py-8">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                  <div className="grid gap-6 md:grid-cols-2">
                    {richTextGroup.map((item) => (
                      <article
                        key={item.key}
                        className="rounded-3xl border border-primary/20 bg-gradient-to-br from-white via-primary-pale/20 to-secondary-pale/30 p-6 shadow-sm sm:p-8"
                      >
                        <div className="mb-5 flex items-center gap-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                          <span className="h-px flex-1 bg-primary/25" />
                        </div>
                        <div className="text-center">
                          {item.eyebrow && (
                            <p className="mb-3 text-xs font-semibold tracking-[0.35em] uppercase text-primary-dark">
                              {item.eyebrow}
                            </p>
                          )}
                          {item.title_html && (
                            <h2 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                              <InlineHtml html={item.title_html} />
                            </h2>
                          )}
                          {item.subtitle_html && (
                            <p className="mt-3 text-gray-700">
                              <InlineHtml html={item.subtitle_html} />
                            </p>
                          )}
                        </div>
                        {item.body_html && (
                          <div
                            className="prose prose-lg mt-5 max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 [&_p]:mb-5 [&_p]:leading-8 [&_a]:font-medium [&_a]:text-[#E91E8C] [&_a]:underline [&_a]:decoration-[#E91E8C] [&_a]:underline-offset-2 hover:[&_a]:text-[#d01a7d]"
                            dangerouslySetInnerHTML={{ __html: item.body_html }}
                          />
                        )}
                      </article>
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
