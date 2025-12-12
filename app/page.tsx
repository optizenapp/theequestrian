import { Hero } from '@/components/Hero';
import { TrustSignals } from '@/components/TrustSignals';
import { BestDealsSlider } from '@/components/BestDealsSlider';
import { MostWantedCarousel } from '@/components/MostWantedCarousel';
import { HomeRecentArticles } from '@/components/home/HomeRecentArticles';
import { getHomeSections } from '@/lib/content/home';

function InlineHtml({ html }: { html?: string }) {
  if (!html) return null;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function Home() {
  const sections = getHomeSections();

  // If no CSV is present, keep the existing page usable (minimal fallback)
  if (!sections.length) {
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
      {sections.map((section) => {
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
              />
            );

          case 'trust_signals':
            return <TrustSignals key={section.key} />;

          case 'most_wanted_carousel':
            return (
              <MostWantedCarousel
                key={section.key}
                products={section.most_wanted_items || []}
                eyebrow={section.eyebrow}
                heading={section.title_html}
                description={section.body_html}
              />
            );

          case 'most_wanted_grid':
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
                    {(section.most_wanted_items || []).map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                      >
                        <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-gray-100">
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                        </div>
                        <p className="mt-4 text-xs text-primary font-semibold uppercase tracking-[0.4em]">
                          {item.tag}
                        </p>
                        <h4 className="mt-2 text-lg font-semibold text-gray-900 line-clamp-2">
                          {item.title}
                        </h4>
                        <p className="mt-1 text-base text-gray-700">{item.price}</p>
                        <p className="text-sm text-gray-500">Rating {item.rating} ✦</p>
                      </div>
                    ))}
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
