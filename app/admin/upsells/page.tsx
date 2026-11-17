'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProductTypeTriggerPicker } from '@/components/admin/upsells/ProductTypeTriggerPicker';
import type { CartUpsellOffer, CartUpsellTriggerType } from '@/lib/cart-upsells/types';

type FormState = {
  name: string;
  enabled: boolean;
  priority: number;
  headline: string;
  triggerType: CartUpsellTriggerType;
  triggerValuesText: string;
  candidateHandlesText: string;
  maxProducts: number;
};

const emptyForm = (): FormState => ({
  name: '',
  enabled: true,
  priority: 100,
  headline: 'Complete your order',
  triggerType: 'product_type',
  triggerValuesText: '',
  candidateHandlesText: '',
  maxProducts: 3,
});

/** One value per line only — types like "Tack, Rug & Stable Cleaning" contain commas. */
function linesToList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export default function AdminUpsellsPage() {
  const [offers, setOffers] = useState<CartUpsellOffer[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/upsells', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = (await res.json()) as { offers: CartUpsellOffer[] };
      setOffers(data.offers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (offer: CartUpsellOffer) => {
    setEditingId(offer.id);
    setForm({
      name: offer.name,
      enabled: offer.enabled,
      priority: offer.priority,
      headline: offer.headline,
      triggerType: offer.triggerType,
      triggerValuesText: offer.triggerValues.join('\n'),
      candidateHandlesText: offer.candidateHandles.join('\n'),
      maxProducts: offer.maxProducts,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const body = {
      name: form.name,
      enabled: form.enabled,
      priority: form.priority,
      headline: form.headline,
      triggerType: form.triggerType,
      triggerValues: linesToList(form.triggerValuesText),
      candidateHandles: linesToList(form.candidateHandlesText),
      maxProducts: form.maxProducts,
    };
    try {
      const res = await fetch(
        editingId ? `/api/admin/upsells/${editingId}` : '/api/admin/upsells',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this upsell offer?')) return;
    const res = await fetch(`/api/admin/upsells/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError('Delete failed');
      return;
    }
    if (editingId === id) resetForm();
    await load();
  };

  const suggest = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/upsells/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: form.triggerType,
          triggerValues: linesToList(form.triggerValuesText),
          limit: 8,
        }),
      });
      const data = (await res.json()) as {
        handles?: string[];
        error?: string;
        source?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Suggest failed');
      const handles = data.handles || [];
      setForm((f) => ({
        ...f,
        candidateHandlesText: [...new Set([...linesToList(f.candidateHandlesText), ...handles])].join(
          '\n'
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggest failed');
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <AdminLayout
      title="Cart Upsells"
      subtitle="Curated trigger → product pool for cart drawer and /cart"
    >
      {error ? <p role="alert" className="mb-4 text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? `Edit offer #${editingId}` : 'New offer'}
          </h2>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="font-medium text-gray-700">Name</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="font-medium text-gray-700">Headline (shown in cart)</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                />
                Enabled
              </label>
              <label className="flex items-center gap-2">
                Priority
                <input
                  type="number"
                  className="w-20 rounded border border-gray-300 px-2 py-1"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 100 })}
                />
              </label>
              <label className="flex items-center gap-2">
                Max products
                <input
                  type="number"
                  min={1}
                  max={6}
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                  value={form.maxProducts}
                  onChange={(e) => setForm({ ...form, maxProducts: Number(e.target.value) || 3 })}
                />
              </label>
            </div>
            <label className="block">
              <span className="font-medium text-gray-700">Trigger type</span>
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={form.triggerType}
                onChange={(e) =>
                  setForm({ ...form, triggerType: e.target.value as CartUpsellTriggerType })
                }
              >
                <option value="product_type">Product type</option>
                <option value="product_handle">Product handle</option>
                <option value="vendor">Vendor</option>
              </select>
            </label>
            {form.triggerType === 'product_type' ? (
              <ProductTypeTriggerPicker
                selected={linesToList(form.triggerValuesText)}
                onChange={(next) =>
                  setForm((f) => ({ ...f, triggerValuesText: next.join('\n') }))
                }
              />
            ) : (
              <label className="block">
                <span className="font-medium text-gray-700">
                  Trigger values (one per line)
                </span>
                <textarea
                  className="mt-1 h-24 w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs"
                  value={form.triggerValuesText}
                  onChange={(e) => setForm({ ...form, triggerValuesText: e.target.value })}
                  placeholder={
                    form.triggerType === 'vendor' ? 'Exclusively Equine' : 'product-handle'
                  }
                />
              </label>
            )}
            <label className="block">
              <span className="font-medium text-gray-700">
                Candidate product handles (one per line)
              </span>
              <textarea
                className="mt-1 h-32 w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs"
                value={form.candidateHandlesText}
                onChange={(e) => setForm({ ...form, candidateHandlesText: e.target.value })}
                placeholder="some-helmet-liner"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => void suggest()}
                disabled={suggesting}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {suggesting ? 'Suggesting…' : 'AI suggest candidates'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Offers ({offers.length})</h2>
          {offers.length === 0 ? (
            <p className="text-sm text-gray-500">No offers yet. Create one to start serving curated upsells.</p>
          ) : (
            <ul className="space-y-3">
              {offers.map((offer) => (
                <li
                  key={offer.id}
                  className="rounded-lg border border-gray-100 px-3 py-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {offer.name}{' '}
                        <span className="font-normal text-gray-500">
                          {offer.enabled ? '' : '(disabled)'} · p{offer.priority}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {offer.triggerType}: {offer.triggerValues.join(', ')} →{' '}
                        {offer.candidateHandles.length} candidates
                      </p>
                      <p className="text-xs text-gray-500">{offer.headline}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-action hover:underline"
                        onClick={() => startEdit(offer)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-rose-600 hover:underline"
                        onClick={() => void remove(offer.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}