'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatAud } from '@/lib/rewards/money';
import type { AdminStoreCreditStatus } from './types';

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Australia/Adelaide' });

const statusTone: Record<string, string> = {
  posted: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-gray-100 text-gray-600',
  in_flight: 'bg-rose-100 text-rose-800',
  ambiguous: 'bg-rose-100 text-rose-800',
};

async function postAction(body: Record<string, unknown>): Promise<string> {
  const response = await fetch('/api/admin/rewards/store-credit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { outcome?: { kind: string; reason?: string; amountCents?: number; error?: string }; resolved?: boolean; error?: string };
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  if (data.outcome) {
    const { kind, reason, amountCents, error } = data.outcome;
    return [kind, amountCents !== undefined ? formatAud(amountCents) : null, reason, error].filter(Boolean).join(' · ');
  }
  return data.resolved ? 'Resolved' : 'Already resolved';
}

export default function StoreCreditPanel() {
  const [status, setStatus] = useState<AdminStoreCreditStatus | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/rewards/store-credit', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to load store credit (${response.status})`);
      setStatus((await response.json()) as AdminStoreCreditStatus);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load store credit');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMessage(null);
    try {
      setMessage(await postAction(body));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Store credit</h2>
      {!status ? (
        <p className="mt-2 text-sm text-gray-500">Checking Shopify access…</p>
      ) : status.scopeError ? (
        <p role="alert" className="mt-2 text-sm text-rose-600">Couldn&apos;t check Shopify access: {status.scopeError}</p>
      ) : status.missingScopes.length > 0 ? (
        <p role="alert" className="mt-2 text-sm text-rose-600">
          The Admin API app is missing: {status.missingScopes.join(', ')}. Add them before switching issuance on.
        </p>
      ) : (
        <p className="mt-2 text-sm text-emerald-700">Shopify store credit access OK.</p>
      )}

      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void run({ action: 'sync', customerId }, 'Write store credit for this customer now (if any is owed)?');
        }}
      >
        <label htmlFor="sync-customer" className="text-sm text-gray-700">Sync one customer</label>
        <input
          id="sync-customer"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          placeholder="Shopify customer ID"
          className="w-56 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
        <button type="submit" disabled={busy || !customerId.trim()} className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Working…' : 'Sync'}
        </button>
      </form>
      {message ? <p role="status" className="mt-2 text-sm text-gray-700">{message}</p> : null}

      {status && status.postings.length > 0 ? (
        <ul className="mt-4 divide-y divide-gray-100 text-sm">
          {status.postings.map((posting) => (
            <li key={posting.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-gray-700">
                {dateFormat.format(new Date(posting.createdAt))} · {posting.kind} {formatAud(posting.amountCents)} ·{' '}
                <span className="text-gray-500">{posting.customerId.replace('gid://shopify/Customer/', 'customer ')}</span>
                {posting.error ? <span className="block text-xs text-gray-500">{posting.error}</span> : null}
              </span>
              <span className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[posting.status] ?? ''}`}>{posting.status}</span>
                {posting.status === 'in_flight' || posting.status === 'ambiguous' ? (
                  <>
                    <button type="button" disabled={busy} onClick={() => run({ action: 'resolve', postingId: posting.id, outcome: 'posted' }, 'Confirm this transaction IS in Shopify?')} className="text-xs font-medium text-action hover:underline">It happened</button>
                    <button type="button" disabled={busy} onClick={() => run({ action: 'resolve', postingId: posting.id, outcome: 'failed' }, 'Confirm this transaction is NOT in Shopify?')} className="text-xs font-medium text-action hover:underline">It didn&apos;t</button>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
