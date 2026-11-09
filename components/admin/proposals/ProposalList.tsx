'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ProposalSummary } from '@/lib/bot-proposals/types';
import StatusBadge from './StatusBadge';

const TABS = ['pending', 'applied', 'approved', 'rejected', 'failed', 'reverted', 'all'] as const;

export default function ProposalList() {
  const [status, setStatus] = useState<(typeof TABS)[number]>('pending');
  const [proposals, setProposals] = useState<ProposalSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setProposals(null);
      setError(null);
      try {
        const response = await fetch(`/api/admin/bot-proposals?status=${status}&bot=seo`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Failed to load proposals (${response.status})`);
        const data = (await response.json()) as { proposals: ProposalSummary[] };
        if (!cancelled) setProposals(data.proposals);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load proposals');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={status === tab}
            onClick={() => setStatus(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
              status === tab ? 'bg-action text-white' : 'border border-gray-200 text-gray-700 hover:border-action'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && proposals === null && <p className="text-sm text-gray-500">Loading…</p>}
      {proposals?.length === 0 && <p className="text-sm text-gray-500">No {status} proposals.</p>}

      {proposals && proposals.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {proposals.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/seo-proposals/${p.id}`}
                className="flex flex-col gap-1 px-5 py-4 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-action"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-gray-900">{p.title}</span>
                  <StatusBadge status={p.status} />
                </div>
                <span className="text-sm text-gray-600">
                  {p.pagePath} · “{p.targetQuery}” · {p.kind.replace(/_/g, ' ')} · {p.reportDate}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
