'use client';

import { useState } from 'react';
import type { ContentFields, ProposalStatus } from '@/lib/bot-proposals/types';

type Props = {
  id: number;
  status: ProposalStatus;
  hasContent: boolean;
  getContent: () => ContentFields;
  onDone: () => Promise<void>;
};

type Action = 'approve' | 'reject' | 'undo';

export default function ProposalActions({ id, status, hasContent, getContent, onDone }: Props) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(action: Action) {
    if (action === 'undo' && !window.confirm('Restore the copy from before this change? Later edits to these fields will be overwritten.')) {
      return;
    }
    setBusy(action);
    setMessage(null);
    try {
      const body = action === 'approve' && hasContent ? { action, content: getContent() } : { action };
      const response = await fetch(`/api/admin/bot-proposals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
      const text =
        data.status === 'applied' ? 'Published. The page refreshes within a few minutes.'
        : data.status === 'approved' ? 'Approved. This one needs a manual change.'
        : data.status === 'reverted' ? 'Previous copy restored.'
        : 'Rejected.';
      setMessage({ ok: true, text });
      await onDone();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Action failed' });
    } finally {
      setBusy(null);
    }
  }

  const canDecide = status === 'pending' || status === 'failed';
  const button = 'rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60';

  return (
    <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {canDecide && (
        <>
          <button type="button" disabled={busy !== null} onClick={() => run('approve')} className={`${button} bg-action text-white`}>
            {busy === 'approve' ? 'Publishing…' : hasContent ? 'Approve & publish' : 'Approve'}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => run('reject')} className={`${button} border border-gray-300 text-gray-700`}>
            {busy === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
        </>
      )}
      {status === 'applied' && (
        <button type="button" disabled={busy !== null} onClick={() => run('undo')} className={`${button} border border-gray-300 text-gray-700`}>
          {busy === 'undo' ? 'Restoring…' : 'Undo change'}
        </button>
      )}
      {!canDecide && status !== 'applied' && <span className="text-sm text-gray-600">No actions for a {status} proposal.</span>}
      <p role="status" aria-live="polite" className={`text-sm ${message?.ok ? 'text-green-700' : 'text-red-700'}`}>
        {message?.text}
      </p>
    </div>
  );
}
