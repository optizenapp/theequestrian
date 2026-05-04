'use client';

import { useState } from 'react';
import { parseAdminJson } from './load-admin-data';
import type { AutoCampaignType } from '@/lib/email-platform/auto-campaigns/types';

type Props = {
  onError: (message: string) => void;
  selections: {
    brandHandle: string;
    categoryCollectionHandle: string;
  };
};

export default function AutoCampaignsTestActions({ onError, selections }: Props) {
  const [actionLog, setActionLog] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testType, setTestType] = useState<AutoCampaignType>('brand');
  const [sendingTest, setSendingTest] = useState(false);

  const run = async (path: string, label: string) => {
    setActionLog(`${label}…`);
    onError('');
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await parseAdminJson(res);
      setActionLog(`${label}: ${JSON.stringify(data)}`);
    } catch (e) {
      setActionLog('');
      onError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const sendImmediateTest = async () => {
    if (!testEmail.trim()) {
      onError('Enter a test email address first.');
      return;
    }
    setSendingTest(true);
    setActionLog('Sending immediate test…');
    onError('');
    try {
      const res = await fetch('/api/admin/email/auto-campaigns/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail.trim(), type: testType, selections }),
      });
      const data = await parseAdminJson(res);
      setActionLog(`Send test: ${JSON.stringify(data)}`);
    } catch (e) {
      setActionLog('');
      onError(e instanceof Error ? e.message : 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const runBuildAll = async () => {
    setActionLog('Build all…');
    onError('');
    try {
      const res = await fetch('/api/admin/email/auto-campaigns/run-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections }),
      });
      const data = await parseAdminJson(res);
      setActionLog(`Build all: ${JSON.stringify(data)}`);
    } catch (e) {
      setActionLog('');
      onError(e instanceof Error ? e.message : 'Build failed');
    }
  };

  const runBuildType = async (type: AutoCampaignType) => {
    setActionLog(`Build ${type}…`);
    onError('');
    try {
      const res = await fetch('/api/admin/email/auto-campaigns/run-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, selections }),
      });
      const data = await parseAdminJson(res);
      setActionLog(`Build ${type}: ${JSON.stringify(data)}`);
    } catch (e) {
      setActionLog('');
      onError(e instanceof Error ? e.message : 'Build failed');
    }
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <h3 className="text-sm font-semibold text-amber-900">Test actions</h3>
      <p className="mt-1 text-xs text-amber-900/80">Build uses the schedules configured above; release uses a 48h lookback for due scheduled rows.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2 rounded border border-amber-200 bg-white p-3">
        <button
          type="button"
          onClick={() => void runBuildAll()}
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:border-action"
        >
          Build all 3 now
        </button>
        <button type="button" onClick={() => void runBuildType('brand')} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:border-action">
          Build brand
        </button>
        <button type="button" onClick={() => void runBuildType('on_sale')} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:border-action">
          Build on sale
        </button>
        <button type="button" onClick={() => void runBuildType('category')} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:border-action">
          Build category
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void run('/api/admin/email/auto-campaigns/run-release', 'Release')} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:border-action">
          Release now
        </button>
        <button type="button" onClick={() => void run('/api/admin/email/auto-campaigns/run-resend', 'Resend worker')} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:border-action">
          Run resend worker
        </button>
      </div>
      <div className="mt-4 rounded-lg border border-amber-200 bg-white p-3">
        <p className="text-xs font-semibold text-amber-900">Immediate inbox test (no list send)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value as AutoCampaignType)}
            className="rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="brand">Brand</option>
            <option value="on_sale">On sale</option>
            <option value="category">Category</option>
          </select>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-w-[220px] rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={sendingTest}
            onClick={() => void sendImmediateTest()}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:border-action disabled:opacity-50"
          >
            {sendingTest ? 'Sending…' : 'Send test now'}
          </button>
        </div>
      </div>
      {actionLog ? <pre className="mt-3 max-h-40 overflow-auto rounded border border-amber-100 bg-white p-2 text-xs text-gray-800">{actionLog}</pre> : null}
    </section>
  );
}
