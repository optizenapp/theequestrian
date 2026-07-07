import { PolicyLayout } from '@/components/policy/PolicyLayout';
import { getStaticPageContent } from '@/lib/content/static-pages';
import { generateFaqPageSchema, type FaqItem } from '@/lib/utils/site-schema';

const FALLBACK_FAQS: FaqItem[] = [
  {
    question: 'How many sellers and brands are available?',
    answer:
      'We connect you with over 10,000 sellers across Australia and global brands, so you can shop one destination for a huge range of equestrian products.',
  },
  {
    question: 'How does shipping work?',
    answer:
      'Shipping rates vary by product and seller. Eligible items may qualify for free shipping — this is shown on the product page. All shipping costs are calculated and displayed at checkout before you pay.',
  },
  {
    question: 'Will my order arrive in multiple shipments?',
    answer:
      'Possibly. We ship from multiple warehouses around Australia, so items in the same order may be sent separately to get them to you faster.',
  },
  {
    question: 'What is your returns and refunds policy?',
    answer:
      'Returns are accepted within 30 days of receiving your items, provided they are unused and in original packaging. Refunds are for the product only and exclude postage.',
  },
];

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractFaqsFromHtml(htmlBlocks: Array<string | null | undefined>): FaqItem[] {
  const html = htmlBlocks.filter(Boolean).join('\n');
  if (!html) {
    return [];
  }

  const headingRegex = /<h[2-4][^>]*>(.*?)<\/h[2-4]>/gi;
  const matches = [...html.matchAll(headingRegex)];
  if (matches.length === 0) {
    return [];
  }

  const faqs: FaqItem[] = [];
  matches.forEach((match, index) => {
    const question = stripHtml(match[1] || '');
    const answerStart = (match.index || 0) + match[0].length;
    const answerEnd = index < matches.length - 1 ? (matches[index + 1].index || html.length) : html.length;
    const answerHtml = html.slice(answerStart, answerEnd);
    const answer = stripHtml(answerHtml);
    if (question && answer) {
      faqs.push({ question, answer });
    }
  });

  return faqs.slice(0, 20);
}

export async function generateMetadata() {
  const page = await getStaticPageContent('faq');
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');
  return {
    title: page?.meta_title || 'FAQs | The Equestrian',
    description:
      page?.meta_description ||
      'Frequently asked questions about shipping, returns, sizing, and ordering.',
    alternates: {
      canonical: `${siteUrl}/faq`,
    },
  };
}

export default async function FaqPage() {
  const page = await getStaticPageContent('faq');
  const title = page?.title || 'Frequently Asked Questions';
  const description =
    page?.meta_description ||
    'Frequently asked questions about shipping, returns, sizing, and ordering.';
  const extractedFaqs = extractFaqsFromHtml([page?.intro_html, page?.body_html, page?.bottom_html]);
  const faqSchema = generateFaqPageSchema('/faq', title, description, extractedFaqs.length > 0 ? extractedFaqs : FALLBACK_FAQS);

  if (page?.body_html || page?.intro_html || page?.bottom_html) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <PolicyLayout title={title}>
          <div className="space-y-6 text-gray-700">
            {page.intro_html ? <div dangerouslySetInnerHTML={{ __html: page.intro_html }} /> : null}
            {page.body_html ? <div dangerouslySetInnerHTML={{ __html: page.body_html }} /> : null}
            {page.bottom_html ? <div dangerouslySetInnerHTML={{ __html: page.bottom_html }} /> : null}
          </div>
        </PolicyLayout>
      </>
    );
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PolicyLayout title="Frequently Asked Questions">
        <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">How many sellers and brands are available?</h2>
          <p>
            We connect you with over 10,000 sellers across Australia and global brands, so you can shop one destination
            for a huge range of equestrian products.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">How does shipping work?</h2>
          <p>
            Shipping rates vary by product and seller. Eligible items may qualify for free shipping — this is
            shown on the product page. All shipping costs are calculated and displayed at checkout before you pay.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Will my order arrive in multiple shipments?</h2>
          <p>
            Possibly. We ship from multiple warehouses around Australia, so items in the same order may be sent
            separately to get them to you faster.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Do I have to checkout multiple times?</h2>
          <p>
            No. You can place a single checkout for items from multiple warehouses or sellers. We handle the split
            behind the scenes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Where can I find sizing charts?</h2>
          <p>
            Our sizing charts are available at{' '}
            <a href="/sizing">
              theequestrian.com.au/sizing
            </a>
            . We recommend checking sizing before ordering.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">What is your returns and refunds policy?</h2>
          <p>
            Returns are accepted within 30 days of receiving your items, provided they are unused and in original
            packaging. Refunds are for the product only and exclude postage. Exchanges may incur shipping charges. For
            full details, visit{' '}
            <a href="/returns-refunds">
              theequestrian.com.au/returns-refunds
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">How does shipping and delivery work?</h2>
          <p>
            We ship Australia wide with tracking. Orders placed before 12pm on a business day are often shipped the same
            day. Delivery times vary by location and carrier, and express options may be available at checkout. For
            full details, visit{' '}
            <a href="/shipping-delivery">
              theequestrian.com.au/shipping-delivery
            </a>
            .
          </p>
        </section>
        </div>
      </PolicyLayout>
    </>
  );
}
