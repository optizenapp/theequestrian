import { Metadata } from 'next';
import { PolicyLayout } from '@/components/policy/PolicyLayout';

export const metadata: Metadata = {
  title: 'FAQs | The Equestrian',
  description: 'Frequently asked questions about shipping, returns, sizing, and ordering.',
};

export default function FaqPage() {
  return (
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
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Do you offer free shipping?</h2>
          <p>Yes, we offer free shipping sitewide on eligible items. Any exceptions are clearly shown at checkout.</p>
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
            <a href="/sizing" className="text-action hover:text-action-hover">
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
            <a href="/returns-refunds" className="text-action hover:text-action-hover">
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
            <a href="/shipping-delivery" className="text-action hover:text-action-hover">
              theequestrian.com.au/shipping-delivery
            </a>
            .
          </p>
        </section>
      </div>
    </PolicyLayout>
  );
}
