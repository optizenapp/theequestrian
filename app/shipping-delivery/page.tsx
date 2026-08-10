import { Metadata } from 'next';
import Link from 'next/link';
import { PolicyLayout } from '@/components/policy/PolicyLayout';
import { generatePolicyPageSchema } from '@/lib/utils/site-schema';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Postage & Delivery | The Equestrian',
  description:
    'Australia-wide postage, multi-warehouse parcels, delivery times, tracking, and why you may see more than one shipping rate.',
  alternates: {
    canonical: `${siteUrl}/shipping-delivery`,
  },
};

export default function ShippingDeliveryPage() {
  const schema = generatePolicyPageSchema({
    path: '/shipping-delivery',
    title: 'Postage & Delivery',
    description:
      'Australia-wide postage, multi-warehouse parcels, delivery times, tracking, and why you may see more than one shipping rate.',
    lastReviewed: '2026-08-10',
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
            We ship Australia-wide with Australia Post and selected couriers. Order before 12pm on a
            business day and your order is likely to leave the warehouse the same day — otherwise,
            generally the next.
          </p>
          <p>
            Rates range from <strong>free to around $20</strong> for large or bulky items, and are
            calculated on your actual cart before you pay. <strong>Express shipping</strong> is
            available at checkout.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Why we ship from multiple warehouses
          </h2>
          <p>
            The Equestrian holds stock in warehouses across Australia rather than in one central
            depot. When you order, each item is dispatched direct from the warehouse that holds it.
          </p>
          <p>That means:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>It gets to you faster.</strong> No internal transfer to a central warehouse
              before it starts heading your way.
            </li>
            <li>
              <strong>Nothing waits on anything else.</strong> If one item takes an extra day, the
              rest of your order is already in transit.
            </li>
            <li>
              <strong>You can buy across every brand we carry in one go</strong> — one cart, one
              checkout.
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Why you might see more than one shipping charge
          </h2>
          <p>
            If your order contains items from more than one warehouse, it arrives as more than one
            parcel — and each parcel is charged its own shipping rate. Every rate is itemised in your
            cart, per parcel, before you pay.
          </p>
          <p>Here&apos;s the honest comparison:</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-3 font-semibold text-gray-900" />
                  <th className="py-2 pr-3 font-semibold text-gray-900">
                    Buying from each store separately
                  </th>
                  <th className="py-2 font-semibold text-gray-900">Buying here</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Shipping charges', '3', '3'],
                  ['Checkouts', '3', '1'],
                  ['Payments', '3', '1'],
                  ['Sets of account details', '3', '1'],
                  ['Places to chase an order', '3', '1'],
                ].map(([label, separate, here]) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-gray-700">{label}</td>
                    <td className="py-2 pr-3">{separate}</td>
                    <td className="py-2 font-semibold text-gray-900">{here}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>Your freight cost is the same either way.</strong> Three parcels have to
            physically travel to you regardless of how many websites you visited to order them. What
            changes is everything else: one cart, one payment, one order, one team to talk to.
          </p>
          <p>
            We could hide this by folding freight into product prices or averaging it across every
            order — but that means customers buying a single item subsidise customers buying five.
            We&apos;d rather show you exactly what each parcel costs and let you decide.
          </p>

          <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Keeping shipping down</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Watch the free-shipping threshold on each parcel.</strong> Your cart shows how
              close each one is. Adding a second item from the <em>same</em> warehouse often ships
              free, where adding it from a different warehouse doesn&apos;t.
            </li>
            <li>
              <strong>Check the warehouse on the product page</strong> before adding — each product
              lists where it ships from.
            </li>
            <li>
              <strong>Split large orders</strong> if you&apos;re not in a hurry for everything.
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Delivery times</h2>
          <p>
            Orders are normally filled the same day, the next day, or within 2 business days. If an
            order can&apos;t be filled in that window for any reason, we&apos;ll contact you to let
            you know.
          </p>
          <p>
            Multi-parcel orders may arrive on different days. This is normal and usually means your
            first parcel arrived sooner than it would have if we&apos;d held everything to ship
            together.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Tracking</h2>
          <p>
            You&apos;ll receive a tracking number from Australia Post or the relevant carrier for
            every Australian delivery — <strong>one per parcel</strong>, so you can follow each
            independently.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Shipping FAQs</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
            Why is my shipping higher than at a single-brand store?
          </h3>
          <p>
            Because you&apos;re receiving more than one parcel. A single-brand store only ever sends
            you one — but you&apos;d need to order from several of them to get the same gear, and
            pay each of their shipping rates. Compare the total across all the orders you&apos;d
            otherwise place, not against one of them.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
            Can you combine my items into one parcel?
          </h3>
          <p>
            Not when they&apos;re held in different warehouses — they&apos;re in different parts of
            the country. Items from the same warehouse are always combined into a single parcel
            automatically.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
            Will my parcels arrive together?
          </h3>
          <p>
            Sometimes, but often not. Each ships independently and each has its own tracking number.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
            How do I know where an item ships from before I add it?
          </h3>
          <p>
            Every product page shows the dispatching warehouse under the Add to Cart button.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
            Do you offer free shipping?
          </h3>
          <p>
            Yes, on many items and above certain order values. Free shipping applies{' '}
            <strong>per parcel</strong>, so it&apos;s calculated on the value of the items in your
            cart from each individual warehouse. Your cart shows how close each parcel is to
            qualifying.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
            Do you ship internationally?
          </h3>
          <p>We currently ship Australia-wide only.</p>

          <p className="pt-4">
            <Link href="/cart" className="font-medium text-action hover:underline">
              Back to cart
            </Link>
          </p>
        </div>
      </PolicyLayout>
    </>
  );
}
