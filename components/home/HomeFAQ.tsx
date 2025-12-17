import { HomeSection } from '@/lib/content/home';

function InlineHtml({ html }: { html?: string }) {
  if (!html) return null;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function HomeFAQ({ section }: { section: HomeSection }) {
  if (!section.faqs || section.faqs.length === 0) {
    return null;
  }

  return (
    <>
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            {section.eyebrow && (
              <p className="text-sm uppercase tracking-[0.4em] text-gray-400 mb-3">{section.eyebrow}</p>
            )}
            <h3 className="text-3xl font-bold text-gray-900">
              <InlineHtml html={section.title_html} />
            </h3>
          </div>
          
          <div className="space-y-4">
            {section.faqs.map((faq, index) => (
              <details 
                key={index} 
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-6 text-lg font-semibold text-gray-900 transition-colors hover:bg-gray-50/50">
                  <span className="flex-1">{faq.question}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all group-hover:bg-gray-100 group-open:bg-primary group-open:text-white">
                    <svg
                      className="h-5 w-5 transition-transform duration-300 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="border-t border-gray-100 px-6 pb-6 pt-4 text-gray-600 leading-relaxed animate-accordion-down">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

