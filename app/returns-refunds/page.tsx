import { Metadata } from 'next';
import { PolicyLayout } from '@/components/policy/PolicyLayout';
import { generatePolicyPageSchema } from '@/lib/utils/site-schema';

export const metadata: Metadata = {
  title: 'Returns & Refunds | The Equestrian',
  description: 'Returns and refunds policy for online orders, timeframes, and conditions.',
};

export default function ReturnsRefundsPage() {
  const schema = generatePolicyPageSchema({
    path: '/returns-refunds',
    title: 'Returns & Refunds | The Equestrian',
    description: 'Returns and refunds policy for online orders, timeframes, and conditions.',
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PolicyLayout title="Returns & Refunds">
        <div className="space-y-6 text-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Purchased via an "Add To Cart" and online checkout only</h2>

        <ul className="list-disc pl-6 space-y-2">
          <li>You are able to return unwanted goods to us within 30 days of receiving your items.</li>
          <li>Refunds will only be for the product and do not include postage.</li>
          <li>Refunds will be made by the original payment method.</li>
          <li>Please be sure of your size before ordering, freight charges for returning incorrectly sized items are the responsibility of the customer.</li>
          <li>All goods are to be returned in their original packaging including labels and header cards and are to be unused.</li>
          <li>Any exchanges will be charged at our usual postage rates.</li>
          <li>A 6% fee is charged on all Afterpay refunds.</li>
          <li>
            Please contact{' '}
            <a href="mailto:support@theequestrian.com.au" className="text-action hover:text-action-hover">
              support@theequestrian.com.au
            </a>{' '}
            to arrange refunds or exchanges.
          </li>
        </ul>
        </div>
      </PolicyLayout>
    </>
  );
}



