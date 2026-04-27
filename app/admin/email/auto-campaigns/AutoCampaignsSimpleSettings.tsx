'use client';

import type { AutoCampaignType } from '@/lib/email-platform/auto-campaigns/types';

type Props = {
  enabledTypes: Record<AutoCampaignType, boolean>;
  setEnabledTypes: (next: Record<AutoCampaignType, boolean>) => void;
  slotsByType: Record<AutoCampaignType, { weekday: number; hour: number }>;
  setSlotsByType: (next: Record<AutoCampaignType, { weekday: number; hour: number }>) => void;
  lists: Array<{ id: string; name: string }>;
  listIds: string[];
  setListIds: (next: string[]) => void;
  completedStatsByType: Record<AutoCampaignType, number>;
};

export default function AutoCampaignsSimpleSettings({
  enabledTypes,
  setEnabledTypes,
  slotsByType,
  setSlotsByType,
  lists,
  listIds,
  setListIds,
  completedStatsByType,
}: Props) {
  const weekdayOptions = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Campaign types</h3>
        <p className="mt-1 text-xs text-gray-600">Prompts are hardcoded per type and reused automatically.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {(['brand', 'on_sale', 'category'] as AutoCampaignType[]).map((type) => (
            <label key={type} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabledTypes[type]}
                  onChange={(e) => setEnabledTypes({ ...enabledTypes, [type]: e.target.checked })}
                />
                <span className="font-medium">
                  {type === 'on_sale' ? 'On sale' : type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              </span>
              <span className="mt-2 block text-xs text-gray-500">Build slot</span>
              <div className="mt-1 flex items-center gap-2">
                <select
                  value={slotsByType[type].weekday}
                  onChange={(e) =>
                    setSlotsByType({
                      ...slotsByType,
                      [type]: { ...slotsByType[type], weekday: Number(e.target.value) },
                    })
                  }
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                >
                  {weekdayOptions.map((label, idx) => (
                    <option key={label} value={idx}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={slotsByType[type].hour}
                  onChange={(e) =>
                    setSlotsByType({
                      ...slotsByType,
                      [type]: { ...slotsByType[type], hour: Math.min(23, Math.max(0, Number(e.target.value) || 0)) },
                    })
                  }
                  className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                />
                <span className="text-xs text-gray-500">:00</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Audience lists</h3>
        <p className="mt-1 text-xs text-gray-600">Recipients are selected from the checked lists.</p>
        <div className="mt-3 max-h-40 space-y-1 overflow-auto rounded border border-gray-300 px-2 py-2">
          {lists.length === 0 ? (
            <p className="text-xs text-gray-500">No lists found.</p>
          ) : (
            lists.map((list) => (
              <label key={list.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={listIds.includes(list.id)}
                  onChange={() =>
                    setListIds(listIds.includes(list.id) ? listIds.filter((x) => x !== list.id) : [...listIds, list.id])
                  }
                />
                <span>{list.name}</span>
              </label>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <h3 className="text-sm font-semibold text-sky-900">Rules</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-sky-900">
          <li>If master flow is off, no auto campaign is built.</li>
          <li>If a campaign type is disabled, that slot is skipped.</li>
          <li>New auto campaigns are always created as pending approval.</li>
          <li>After send completion, one resend to non-openers is attempted after 24h.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Completed campaigns by type</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3 text-sm">Brand: <strong>{completedStatsByType.brand}</strong></div>
          <div className="rounded-lg border border-gray-200 p-3 text-sm">On sale: <strong>{completedStatsByType.on_sale}</strong></div>
          <div className="rounded-lg border border-gray-200 p-3 text-sm">Category: <strong>{completedStatsByType.category}</strong></div>
        </div>
      </section>
    </>
  );
}
