import { formatAud } from '@/lib/rewards/money';
import type { CustomerRewards } from '@/lib/rewards/customer-history';

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeZone: 'Australia/Adelaide' });

const statusLabel: Record<string, string> = {
  pending: 'Pending until your order is fulfilled',
  released: 'Earned',
  void: 'Cancelled or refunded',
};

export default function AccountRewards({ rewards, spendable }: { rewards: CustomerRewards; spendable: boolean }) {
  return (
    <section aria-labelledby="rewards-heading" className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 id="rewards-heading" className="text-lg font-semibold text-gray-900">Equestrian Rewards</h2>
      <p className="mt-1 text-sm text-gray-600">You earn rewards on every eligible order. They never expire.</p>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-emerald-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Earned</dt>
          <dd className="mt-1 text-2xl font-semibold text-emerald-900">{formatAud(rewards.availableCents)}</dd>
        </div>
        <div className="rounded-xl bg-amber-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800">Pending</dt>
          <dd className="mt-1 text-2xl font-semibold text-amber-900">{formatAud(rewards.pendingCents)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-gray-500">
        {spendable
          ? 'Earned rewards are added to your account as store credit. Sign in at checkout and apply your store credit to use them.'
          : 'Earned rewards will be ready to use on a future order.'}
      </p>
      {rewards.orders.length === 0 ? (
        <p className="mt-6 text-sm text-gray-600">No rewards yet. They&apos;ll appear here after your next order.</p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100">
          {rewards.orders.map((order) => (
            <li key={`${order.orderName}-${order.orderCreatedAt}`} className="flex items-center justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-medium text-gray-900">{order.orderName}</p>
                <p className="text-xs text-gray-500">
                  {dateFormat.format(new Date(order.orderCreatedAt))} · {statusLabel[order.status] ?? order.status}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatAud(order.awardCents)}</p>
                {order.awardCents !== order.originalAwardCents ? (
                  <p className="text-xs text-gray-500">Adjusted from {formatAud(order.originalAwardCents)}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
