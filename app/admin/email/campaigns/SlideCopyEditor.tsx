'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SLIDE_COPY_LIMITS } from '@/lib/email-platform/videos/copy-validation';
import type { SlideCopy } from '@/lib/email-platform/videos/copy-types';

type Props = {
  campaignId: string;
  variant: 'brand' | 'on_sale' | 'category';
};

type FieldKey =
  | 's1.eyebrow' | 's1.title' | 's1.subtitle'
  | 's2.eyebrow' | 's2.title' | 's2.subtitle' | 's2.cta' | 's2.linkText'
  | 's3.eyebrow' | 's3.title'
  | 's4.eyebrow' | 's4.title' | 's4.cta';

const SLIDES: Array<{ slide: 's1' | 's2' | 's3' | 's4'; label: string; fields: FieldKey[] }> = [
  { slide: 's1', label: 'Slide 1 — Hook', fields: ['s1.eyebrow', 's1.title', 's1.subtitle'] },
  { slide: 's2', label: 'Slide 2 — Reason to shop', fields: ['s2.eyebrow', 's2.title', 's2.subtitle', 's2.cta', 's2.linkText'] },
  { slide: 's3', label: 'Slide 3 — Curation', fields: ['s3.eyebrow', 's3.title'] },
  { slide: 's4', label: 'Slide 4 — Closing CTA', fields: ['s4.eyebrow', 's4.title', 's4.cta'] },
];

function emptyCopy(): SlideCopy {
  return {
    s1: { eyebrow: '', title: '', subtitle: '' },
    s2: { eyebrow: '', title: '', subtitle: '', cta: '', linkText: '' },
    s3: { eyebrow: '', title: '' },
    s4: { eyebrow: '', title: '', cta: '' },
  };
}

function getField(copy: SlideCopy, key: FieldKey): string {
  const [s, f] = key.split('.') as [keyof SlideCopy, string];
  return ((copy[s] as unknown) as Record<string, string>)[f] ?? '';
}

function setField(copy: SlideCopy, key: FieldKey, value: string): SlideCopy {
  const [s, f] = key.split('.') as [keyof SlideCopy, string];
  const next = { ...copy, [s]: { ...(copy[s] as object), [f]: value } } as SlideCopy;
  return next;
}

export function SlideCopyEditor({ campaignId, variant }: Props) {
  const [copy, setCopy] = useState<SlideCopy>(emptyCopy);
  const [savedCopy, setSavedCopy] = useState<SlideCopy | null>(null);
  const [busy, setBusy] = useState<'load' | 'generate' | 'save' | 'reset' | null>('load');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isDirty = useMemo(() => JSON.stringify(copy) !== JSON.stringify(savedCopy ?? emptyCopy()), [copy, savedCopy]);

  const load = useCallback(async () => {
    setBusy('load'); setError(null);
    try {
      const res = await fetch(`/api/admin/email/campaigns/${campaignId}/video/copy`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load slide copy');
      const saved = (data.saved as SlideCopy | null) ?? null;
      setSavedCopy(saved);
      setCopy(saved ?? emptyCopy());
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load slide copy'); }
    finally { setBusy(null); }
  }, [campaignId]);

  useEffect(() => { void load(); }, [load]);

  async function generate() {
    setBusy('generate'); setError(null); setInfo(null);
    try {
      const res = await fetch(`/api/admin/email/campaigns/${campaignId}/video/copy-preview`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to generate copy');
      setCopy(data.slideCopy as SlideCopy);
      setInfo(`Generated via ${data.source}${data.rejectionReason ? ` (LLM rejected: ${data.rejectionReason})` : ''}. Review and Save to lock it in.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to generate copy'); }
    finally { setBusy(null); }
  }

  async function save() {
    setBusy('save'); setError(null); setInfo(null);
    try {
      const res = await fetch(`/api/admin/email/campaigns/${campaignId}/video/copy`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideCopy: copy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to save copy');
      setSavedCopy(data.saved as SlideCopy);
      setCopy(data.saved as SlideCopy);
      setInfo('Saved. The next video render will use this copy.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save copy'); }
    finally { setBusy(null); }
  }

  async function reset() {
    if (!savedCopy) { setCopy(emptyCopy()); return; }
    setBusy('reset'); setError(null); setInfo(null);
    try {
      const res = await fetch(`/api/admin/email/campaigns/${campaignId}/video/copy`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to reset copy');
      setSavedCopy(null); setCopy(emptyCopy());
      setInfo('Cleared. The next video will auto-generate copy.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to reset copy'); }
    finally { setBusy(null); }
  }

  const fieldsToShow: FieldKey[] = SLIDES.flatMap((s) => s.fields).filter((k) => !(variant === 'category' && k === 's2.linkText'));

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-slate-900">Slide Copy</h4>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void generate()} disabled={busy !== null}
            className="rounded-full border border-indigo-300 px-3 py-1 text-xs font-semibold text-indigo-700 hover:border-indigo-500 disabled:opacity-60">
            {busy === 'generate' ? 'Generating…' : savedCopy ? 'Regenerate with AI' : 'Generate with AI'}
          </button>
          <button type="button" onClick={() => void save()} disabled={busy !== null || !isDirty}
            className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:border-emerald-500 disabled:opacity-60">
            {busy === 'save' ? 'Saving…' : 'Save copy'}
          </button>
          <button type="button" onClick={() => void reset()} disabled={busy !== null || (!savedCopy && !isDirty)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500 disabled:opacity-60">
            {busy === 'reset' ? 'Resetting…' : savedCopy ? 'Clear saved' : 'Clear'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Leave any field blank to omit it from the slide.</p>
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
      {info ? <p className="mt-2 text-xs text-emerald-700">{info}</p> : null}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {SLIDES.map((slide) => (
          <div key={slide.slide} className="rounded-md border border-slate-200 bg-slate-50/60 p-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{slide.label}</div>
            <div className="mt-2 space-y-2">
              {slide.fields.filter((f) => fieldsToShow.includes(f)).map((key) => {
                const value = getField(copy, key);
                const max = SLIDE_COPY_LIMITS[key];
                const over = value.length > max;
                return (
                  <label key={key} className="block text-[11px] text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{key}</span>
                      <span className={over ? 'text-rose-600' : 'text-slate-400'}>{value.length}/{max}</span>
                    </div>
                    <input type="text" value={value} maxLength={max + 20}
                      onChange={(e) => setCopy(setField(copy, key, e.target.value))}
                      className={`mt-1 w-full rounded border ${over ? 'border-rose-400' : 'border-slate-300'} bg-white px-2 py-1 text-xs text-slate-900`} />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
