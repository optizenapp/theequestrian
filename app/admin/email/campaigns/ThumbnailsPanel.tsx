'use client';

import { useState } from 'react';
import type { CampaignVideoVariantThumbnails } from './page';

type Props = {
  campaignId: string;
  variantThumbnails: Record<string, CampaignVideoVariantThumbnails> | null | undefined;
  onRegenerated?: () => void;
};

const VARIANT_LABELS: Record<string, string> = {
  landscape_16_9: 'Landscape 16:9',
  vertical_9_16: 'Vertical 9:16',
};

export function ThumbnailsPanel({ campaignId, variantThumbnails, onRegenerated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const variants = variantThumbnails ? Object.entries(variantThumbnails) : [];

  async function handleRegenerate() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/email/campaigns/${campaignId}/video/regenerate-thumbnail`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : 'Failed to regenerate thumbnails';
        throw new Error(msg);
      }
      setInfo(`Regenerated ${(data.updated || []).join(', ') || 'thumbnails'}`);
      onRegenerated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to regenerate thumbnails');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-slate-900">Thumbnails</h4>
        <button
          type="button"
          onClick={() => void handleRegenerate()}
          disabled={busy || variants.length === 0}
          className="rounded-full border border-indigo-300 px-3 py-1 text-xs font-semibold text-indigo-700 hover:border-indigo-500 disabled:opacity-60"
        >
          {busy ? 'Regenerating…' : 'Regenerate thumbnails'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Custom branded thumbnail (preferred) and a late-frame fallback. The custom one is uploaded to YouTube on publish.
      </p>
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
      {info ? <p className="mt-2 text-xs text-emerald-700">{info}</p> : null}
      {variants.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">No thumbnails available yet — generate the video first.</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {variants.map(([variantKey, thumbs]) => (
            <div key={variantKey} className="rounded-md border border-slate-200 bg-slate-50/60 p-2">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {VARIANT_LABELS[variantKey] ?? variantKey}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ThumbCell label="Custom" url={thumbs.custom} accent="emerald" />
                <ThumbCell label="Frame" url={thumbs.frame} accent="slate" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThumbCell({ label, url, accent }: { label: string; url: string | null; accent: 'emerald' | 'slate' }) {
  const ring = accent === 'emerald' ? 'ring-emerald-200' : 'ring-slate-200';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500">
        <span className="font-semibold">{label}</span>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800">
            Open
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className={`block overflow-hidden rounded ring-1 ${ring}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="block h-auto w-full" />
        </a>
      ) : (
        <div className={`flex h-20 items-center justify-center rounded text-[11px] text-slate-400 ring-1 ${ring}`}>
          Not available
        </div>
      )}
    </div>
  );
}
