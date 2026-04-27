'use client';

import { useState } from 'react';

type Props = {
  campaignId: string;
  status: string;
  scheduledAt: string | null;
  paused: boolean;
  onUpdated: () => void | Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

function isoToLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputValueToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function CampaignScheduleControls({
  campaignId,
  status,
  scheduledAt,
  paused,
  onUpdated,
  onError,
  onSuccess,
}: Props) {
  const initialLocal = isoToLocalInputValue(scheduledAt);
  const [localValue, setLocalValue] = useState(initialLocal);
  const [isSaving, setIsSaving] = useState(false);
  const [isPausing, setIsPausing] = useState(false);

  const canEditSchedule =
    status === 'draft' || status === 'pending_approval' || status === 'scheduled';
  const canPause = canEditSchedule;
  const isDirty = localValue !== initialLocal;

  async function saveSchedule() {
    const iso = localInputValueToIso(localValue);
    if (!iso) {
      onError('Please pick a valid date and time.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/email/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: iso }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(typeof data?.error === 'string' ? data.error : 'Failed to update schedule');
        return;
      }
      onSuccess('Schedule updated.');
      await onUpdated();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to update schedule');
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePause() {
    setIsPausing(true);
    try {
      const path = paused ? 'resume' : 'pause';
      const res = await fetch(`/api/admin/email/campaigns/${campaignId}/${path}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        onError(typeof data?.error === 'string' ? data.error : `Failed to ${path} campaign`);
        return;
      }
      onSuccess(paused ? 'Campaign resumed.' : 'Campaign paused.');
      await onUpdated();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to update campaign');
    } finally {
      setIsPausing(false);
    }
  }

  if (!canEditSchedule) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <label className="flex items-center gap-1.5 text-gray-600">
        <span className="font-medium">Send at</span>
        <input
          type="datetime-local"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
          disabled={isSaving}
        />
      </label>
      <button
        type="button"
        onClick={saveSchedule}
        disabled={!isDirty || isSaving}
        className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-action hover:text-action disabled:opacity-50"
      >
        {isSaving ? 'Saving…' : 'Save schedule'}
      </button>
      {canPause ? (
        <button
          type="button"
          onClick={togglePause}
          disabled={isPausing}
          className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
            paused
              ? 'border-emerald-300 text-emerald-700 hover:border-emerald-500'
              : 'border-amber-300 text-amber-700 hover:border-amber-500'
          }`}
        >
          {isPausing ? 'Saving…' : paused ? 'Resume' : 'Pause'}
        </button>
      ) : null}
    </div>
  );
}
