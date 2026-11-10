'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import RewardsOrdersTable from '@/components/admin/rewards/RewardsOrdersTable';
import RewardsSettingsPanel from '@/components/admin/rewards/RewardsSettingsPanel';
import StoreCreditPanel from '@/components/admin/rewards/StoreCreditPanel';
import type { AdminRewardsReport } from '@/components/admin/rewards/types';
import { formatAud } from '@/lib/rewards/money';

export default function AdminRewardsPage() {
  const [report, setReport] = useState<AdminRewardsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/rewards', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to load rewards (${response.status})`);
      setReport((await response.json()) as AdminRewardsReport);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = report?.summary;

  return (
    <AdminLayout title="Equestrian Rewards" subtitle="2% back on eligible purchases: recorded earnings and program switches">
      {error ? <p role="alert" className="mb-4 text-sm text-rose-600">{error}</p> : null}
      {!report || !summary ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pending" value={formatAud(summary.pendingCents)} helper={`${summary.pendingOrders} orders awaiting fulfilment`} />
            <StatCard label="Released" value={formatAud(summary.availableCents)} helper={`${summary.releasedOrders} orders fully fulfilled`} />
            <StatCard label="Reversed" value={formatAud(summary.reversedCents)} helper={`of ${formatAud(summary.originalAwardCents)} originally earned`} />
            <StatCard label="Needs attention" value={String(summary.staleOrders)} helper="Pending for more than 30 days" />
          </div>
          <RewardsSettingsPanel
            settings={report.settings}
            onSaved={(settings) => setReport({ ...report, settings })}
          />
          <StoreCreditPanel />
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent orders</h2>
            <RewardsOrdersTable orders={report.orders} onReconciled={load} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
