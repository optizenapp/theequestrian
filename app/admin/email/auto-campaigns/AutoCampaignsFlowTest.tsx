'use client';

import { useCallback, useState } from 'react';
import type { AutoCampaignType } from '@/lib/email-platform/auto-campaigns/types';
import { getTomorrowWeekdaySydney } from './auto-flow-test-helpers';
import {
  backupSlotsPatchTomorrowAndBuild,
  fetchSettingsExport,
  restoreSettingsFromFileText,
  restoreSlotsFromSessionBackup,
  triggerJsonDownload,
} from './auto-flow-test-api';
import AutoCampaignsFlowTestSteps from './AutoCampaignsFlowTestSteps';

const TYPES: AutoCampaignType[] = ['brand', 'on_sale', 'category'];
const BTN =
  'rounded border border-amber-700 bg-white px-2 py-1 text-xs font-medium hover:bg-amber-100 dark:border-amber-500 dark:bg-amber-950 dark:hover:bg-amber-900';

export default function AutoCampaignsFlowTest() {
  const [flowType, setFlowType] = useState<AutoCampaignType>('brand');
  const [slotHour, setSlotHour] = useState(9);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const downloadSnapshot = useCallback(async () => {
    setMsg(null);
    setBusy(true);
    try {
      const got = await fetchSettingsExport();
      if (!got.ok) {
        setMsg(got.error);
        return;
      }
      triggerJsonDownload(got.data, `auto-campaign-settings-${new Date().toISOString().slice(0, 10)}.json`);
      setMsg('Snapshot downloaded.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const restoreFromFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setMsg(null);
      setBusy(true);
      try {
        const text = await file.text();
        const r = await restoreSettingsFromFileText(text);
        setMsg(r.ok ? 'Settings restored from file. Reload if the page looks stale.' : r.error);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Restore failed');
      } finally {
        setBusy(false);
      }
    };
    input.click();
  }, []);

  const restoreSlotsBackup = useCallback(async () => {
    setMsg(null);
    setBusy(true);
    try {
      const r = await restoreSlotsFromSessionBackup();
      setMsg(r.ok ? 'Slots restored from tab backup.' : r.error);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const setTomorrowSlotAndBuild = useCallback(async () => {
    setMsg(null);
    setBusy(true);
    try {
      const r = await backupSlotsPatchTomorrowAndBuild(flowType, slotHour);
      setMsg(r.ok ? r.message : r.error);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Build failed');
    } finally {
      setBusy(false);
    }
  }, [flowType, slotHour]);

  const wd = getTomorrowWeekdaySydney();
  const wdNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <h3 className="mb-2 font-semibold">Full flow test (now)</h3>
      <AutoCampaignsFlowTestSteps tomorrowLabel={wdNames[wd]} />
      <div className="flex flex-wrap items-end gap-2">
        <button type="button" disabled={busy} onClick={downloadSnapshot} className={BTN}>
          Export settings JSON
        </button>
        <button type="button" disabled={busy} onClick={restoreFromFile} className={BTN}>
          Restore from JSON file
        </button>
        <label className="text-xs">
          Type
          <select
            className="ml-1 rounded border border-amber-700 bg-white px-1 py-0.5 dark:border-amber-500 dark:bg-amber-950"
            value={flowType}
            onChange={(e) => setFlowType(e.target.value as AutoCampaignType)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Hour (Sydney)
          <input
            type="number"
            min={0}
            max={23}
            className="ml-1 w-14 rounded border border-amber-700 bg-white px-1 py-0.5 dark:border-amber-500 dark:bg-amber-950"
            value={slotHour}
            onChange={(e) => setSlotHour(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={setTomorrowSlotAndBuild}
          className="rounded bg-amber-700 px-2 py-1 text-xs font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          Set tomorrow slot &amp; build
        </button>
        <button type="button" disabled={busy} onClick={restoreSlotsBackup} className={BTN}>
          Restore tab slot backup
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs whitespace-pre-wrap">{msg}</p> : null}
    </div>
  );
}
