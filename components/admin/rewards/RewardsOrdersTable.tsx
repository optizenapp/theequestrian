'use client';

import { useState } from 'react';
import { formatAud } from '@/lib/rewards/money';
import type { RewardsOrderRow } from '@/lib/rewards/admin-report';

type Props = {
  orders: RewardsOrderRow[];
  onReconciled: () => void;
};

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeZone: 'Australia/Adelaide' });

const statusTone: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  released: 'bg-emerald-100 text-emerald-800',
  void: 'bg-gray-100 text-gray-600',
};

export default function RewardsOrdersTable({ orders, onReconciled }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const recheck = async (orderId: string) => {
    setBusyId(orderId);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = (await response.json()) as { outcome?: { kind: string; reason?: string }; error?: string };
      if (!response.ok || !data.outcome) throw new Error(data.error || `Re-check failed (${response.status})`);
      setMessage(data.outcome.kind === 'skipped' ? `Skipped: ${data.outcome.reason}` : 'Order re-checked');
      onReconciled();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Re-check failed');
    } finally {
      setBusyId(null);
    }
  };

  if (orders.length === 0) {
    return <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No orders recorded yet.</p>;
  }

  return (
    <section className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      {message ? <p role="status" className="border-b border-gray-100 px-4 py-2 text-sm text-gray-600">{message}</p> : null}
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Placed</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Eligible</th>
            <th className="px-4 py-3 text-right">Earned</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => (
            <tr key={order.orderId}>
              <td className="px-4 py-3 font-medium text-gray-900">{order.orderName ?? order.orderId}</td>
              <td className="px-4 py-3 text-gray-600">{dateFormat.format(new Date(order.orderCreatedAt))}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[order.status] ?? ''}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-gray-600">{formatAud(order.eligibleCents)}</td>
              <td className="px-4 py-3 text-right text-gray-900">
                {formatAud(order.currentAwardCents)}
                {order.currentAwardCents !== order.originalAwardCents ? (
                  <span className="block text-xs text-gray-500">was {formatAud(order.originalAwardCents)}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => recheck(order.orderId)}
                  className="text-sm font-medium text-action hover:underline disabled:opacity-60"
                >
                  {busyId === order.orderId ? 'Checking…' : 'Re-check'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
