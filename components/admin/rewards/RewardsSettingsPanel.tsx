'use client';

import { useState } from 'react';
import type { AdminRewardsSettings } from './types';

type Props = {
  settings: AdminRewardsSettings;
  onSaved: (settings: AdminRewardsSettings) => void;
};

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Australia/Adelaide' });

export default function RewardsSettingsPanel({ settings, onSaved }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (key: string, update: Partial<AdminRewardsSettings>) => {
    setSaving(key);
    setError(null);
    try {
      const response = await fetch('/api/admin/rewards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const data = (await response.json()) as { settings?: AdminRewardsSettings; error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error || `Save failed (${response.status})`);
      onSaved(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(null);
    }
  };

  const toggles: Array<{ key: 'recordingEnabled' | 'estimateEnabled'; label: string; helper: string }> = [
    { key: 'recordingEnabled', label: 'Record earnings', helper: 'Track what each paid order earns. Customers see nothing.' },
    { key: 'estimateEnabled', label: 'Show cart estimate', helper: '“You’ll earn $X in Equestrian Rewards” beside checkout.' },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Program settings</h2>
      <p className="mt-1 text-sm text-gray-500">
        Earning rate {(settings.rateBps / 100).toFixed(2)}% · Launched{' '}
        {settings.launchAt ? dateFormat.format(new Date(settings.launchAt)) : 'not yet'}
      </p>
      <ul className="mt-4 divide-y divide-gray-100">
        {toggles.map(({ key, label, helper }) => (
          <li key={key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{helper}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings[key]}
              aria-label={label}
              disabled={saving !== null}
              onClick={() => save(key, { [key]: !settings[key] })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:opacity-60 ${
                settings[key] ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {saving === key ? 'Saving…' : settings[key] ? 'On' : 'Off'}
            </button>
          </li>
        ))}
        <li className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Issue spendable credit / redemption</p>
            <p className="text-xs text-gray-500">Not available yet. Requires customer sign-in and a store-credit test.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-semibold text-gray-500">Off</span>
        </li>
      </ul>
      {error ? <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}
