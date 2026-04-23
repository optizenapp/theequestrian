import { Metadata } from 'next';
import { PolicyLayout } from '@/components/policy/PolicyLayout';
import { generatePolicyPageSchema } from '@/lib/utils/site-schema';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Postage & Delivery | The Equestrian',
  description: 'Postage, delivery times, tracking, click & collect, and multi-vendor shipping details.',
  alternates: {
    canonical: `${siteUrl}/shipping-delivery`,
  },
};

export default function ShippingDeliveryPage() {
  const schema = generatePolicyPageSchema({
    path: '/shipping-delivery',
    title: 'Postage & Delivery',
    description: 'Postage, delivery times, tracking, click & collect, and multi-vendor shipping details.',
    lastReviewed: '2021-04-19',
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PolicyLayout title="Postage & Delivery">
        <div className="space-y-6 text-gray-700">
        <p>
          We use Australia Post for postage Australia wide. If ordered before 12pm on a business day, it's likely to be
          shipped same day. Otherwise generally the next day. As we ship from various warehouses around Australia to
          ensure fast shipping, rates can range from FREE to $20 for large items. Rates will be calculated at checkout
          for each order. Express Shipping is available at checkout.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Delivery Times</h2>

        <p>
          Orders are normally filled same day, next day or within 2 business days. If an order cannot be fulfilled within
          this time period for any reason, the seller will contact the customers to notify of delays.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Tracking</h2>

        <p>
          A tracking number from Australia Post or alternative carriers will be provided to the customer for all
          Australian deliveries.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Click &amp; Collect</h2>

        <p>
          Click &amp; Collect order will normally be ready for pickup within 2 business days. The customer will be
          notified via email when their Click &amp; Collect order is ready to pick up.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Multi Vendor Carts</h2>

        <p>
          As The Equestrian operates as a multi-vendor marketplace, you have the option to purchase from multiple
          sellers in the same cart. Under these circumstances, you may be required to pay shipping rates and charges
          for each item in your cart, as products may be shipped from multiple locations within Australia. This will be
          made clear in your cart before purchase.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Private Sellers</h2>

        <p>
          The Equestrian is not responsible for postage and delivery for items arranged to be purchased from private
          sellers. Postage, delivery and other charges associated with the sale are the responsibility of the private
          seller and purchaser. Private seller transactions are not possible within The Equestrian site. Payment
          between private sellers and purchasers is to be made with alternative arrangements.
        </p>
        </div>
      </PolicyLayout>
    </>
  );
}



