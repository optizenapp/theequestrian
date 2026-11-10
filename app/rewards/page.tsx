import { Metadata } from 'next';
import Link from 'next/link';
import { PolicyLayout } from '@/components/policy/PolicyLayout';
import { generatePolicyPageSchema } from '@/lib/utils/site-schema';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');
const description =
  'Earn Equestrian Rewards on every eligible order and use them on your next one. How rewards are earned, when they are added, and how returns affect them.';

export const metadata: Metadata = {
  title: { absolute: 'Equestrian Rewards | The Equestrian' },
  description,
  alternates: {
    canonical: `${siteUrl}/rewards`,
  },
};

export default function RewardsPage() {
  const schema = generatePolicyPageSchema({
    path: '/rewards',
    title: 'Equestrian Rewards',
    description,
    lastReviewed: '2026-11-10',
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <PolicyLayout title="Equestrian Rewards">
        <div className="space-y-6 text-gray-700">
          <p>
            Every eligible order earns you Equestrian Rewards — credit you can put towards your next
            order with us. There&apos;s nothing to join and no points to convert: you&apos;ll see the exact
            dollar amount on each product and in your cart before you buy.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">How it works</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              <strong>Shop as normal.</strong> Each product page and your cart show what you&apos;ll earn.
            </li>
            <li>
              <strong>Your order ships.</strong> Rewards show as pending while we prepare your order, and
              are added to your account once everything in it has been sent.
            </li>
            <li>
              <strong>Use it next time.</strong> Sign in with the email you order with and your rewards
              balance is available to put towards a future order at checkout.
            </li>
          </ol>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What earns rewards</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Products you buy, based on the price you actually pay after any discounts.</li>
            <li>Postage, gift cards and fees don&apos;t earn rewards.</li>
            <li>The part of an order you pay for with rewards doesn&apos;t earn more rewards.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Returns and cancellations</h2>
          <p>
            If you return part of an order, we only adjust the rewards for the items you sent back —
            the rest of your rewards stay put. Cancelled orders don&apos;t earn rewards. If rewards from a
            returned item have already been used, the difference comes off rewards you earn later; your
            balance never goes below zero.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Good to know</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your rewards don&apos;t expire.</li>
            <li>Rewards have no cash value and can&apos;t be exchanged for money.</li>
            <li>
              Rewards apply to orders placed on{' '}
              <Link href="/" className="underline">theequestrian.com.au</Link> in Australian dollars.
            </li>
          </ul>

          <div className="mt-8 rounded-xl bg-emerald-50 p-6">
            <p className="font-semibold text-emerald-900">See your rewards</p>
            <p className="mt-1 text-sm text-emerald-800">
              Sign in to check your balance, pending rewards and history.
            </p>
            <Link
              href="/account"
              prefetch={false}
              className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Go to my account
            </Link>
          </div>
        </div>
      </PolicyLayout>
    </>
  );
}
