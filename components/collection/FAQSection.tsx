import type { FAQItem } from '@/lib/content/collections';

interface FAQSectionProps {
  faqs: FAQItem[];
  categoryTitle: string;
  emitJsonLd?: boolean;
}

export function FAQSection({ faqs, emitJsonLd = true }: FAQSectionProps) {
  if (!faqs || faqs.length === 0) {
    return null;
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      {emitJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}

      <section className="mt-12 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group border border-gray-200 rounded-lg overflow-hidden bg-white"
            >
              <summary className="w-full px-6 py-4 text-left hover:bg-gray-50 cursor-pointer font-semibold text-gray-900 flex items-center justify-between list-none [&::-webkit-details-marker]:hidden">
                <span className="pr-8">{faq.question}</span>
                <svg
                  className="w-5 h-5 text-gray-500 shrink-0 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
