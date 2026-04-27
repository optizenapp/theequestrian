'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAutoCampaignAdminSnapshot, parseAdminJson } from './load-admin-data';
import AutoCampaignsTestActions from './AutoCampaignsTestActions';
import AutoCampaignsFlowTest from './AutoCampaignsFlowTest';
import AutoCampaignsSimpleSettings from './AutoCampaignsSimpleSettings';
import type { AutoCampaignType } from '@/lib/email-platform/auto-campaigns/types';
import { AUTO_TYPES, DEFAULT_SLOTS, type SlotByType } from './slot-config';

export default function AutoCampaignsPageClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [enabledTypes, setEnabledTypes] = useState<Record<AutoCampaignType, boolean>>({
    brand: true,
    on_sale: true,
    category: true,
  });
  const [listIds, setListIds] = useState<string[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [slotsByType, setSlotsByType] = useState<SlotByType>(DEFAULT_SLOTS);
  const [completedStatsByType, setCompletedStatsByType] = useState<Record<AutoCampaignType, number>>({
    brand: 0,
    on_sale: 0,
    category: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { settings, lists: loadedLists } = await fetchAutoCampaignAdminSnapshot();
      const audience = (settings.audience as { listIds?: unknown } | undefined) ?? {};
      const configuredTypes = (settings.enabledTypes as Record<string, unknown> | undefined) ?? {};
      const slots = Array.isArray(settings.slots) ? (settings.slots as Array<{ type: AutoCampaignType; weekday: number; hour: number }>) : [];
      const completed = (settings.completedStatsByType as Record<string, unknown> | undefined) ?? {};
      const nextSlots: SlotByType = { ...DEFAULT_SLOTS };
      for (const type of AUTO_TYPES) {
        const slot = slots.find((s) => s.type === type);
        if (!slot) continue;
        nextSlots[type] = {
          weekday: Math.min(6, Math.max(0, Number(slot.weekday) || 0)),
          hour: Math.min(23, Math.max(0, Number(slot.hour) || 0)),
        };
      }
      setEnabled(settings.enabled === true);
      setEnabledTypes({
        brand: configuredTypes.brand !== false,
        on_sale: configuredTypes.on_sale !== false,
        category: configuredTypes.category !== false,
      });
      setListIds(Array.isArray(audience.listIds) ? audience.listIds.filter((x): x is string => typeof x === 'string') : []);
      setLists(loadedLists);
      setSlotsByType(nextSlots);
      setCompletedStatsByType({
        brand: Number(completed.brand ?? 0),
        on_sale: Number(completed.on_sale ?? 0),
        category: Number(completed.category ?? 0),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const res = await fetch('/api/admin/email/auto-campaigns/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          audience: { listIds, segmentIds: [] },
          enabledTypes,
          slots: AUTO_TYPES.map((type) => ({
            type,
            weekday: slotsByType[type].weekday,
            hour: slotsByType[type].hour,
          })),
        }),
      });
      await parseAdminJson(res);
      setMsg('Saved.');
      setTimeout(() => setMsg(''), 2500);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">
          ← Email platform
        </Link>
        <Link href="/admin/email/campaigns" className="text-sm font-semibold text-action hover:underline">
          Campaigns
        </Link>
      </div>
      {err ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div> : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Master flow</h3>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          Enable auto campaign flow
        </label>
      </section>

      <AutoCampaignsSimpleSettings
        enabledTypes={enabledTypes}
        setEnabledTypes={setEnabledTypes}
        slotsByType={slotsByType}
        setSlotsByType={setSlotsByType}
        lists={lists}
        listIds={listIds}
        setListIds={setListIds}
        completedStatsByType={completedStatsByType}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={saving} onClick={() => void save()} className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      <AutoCampaignsFlowTest />
      <AutoCampaignsTestActions onError={setErr} />
    </div>
  );
}
