'use client';

import type { FaqItem, FieldValue } from '@/lib/bot-proposals/types';
import FaqEditor from './FaqEditor';

type Props = {
  name: string;
  current: FieldValue;
  value: FieldValue;
  onChange: (next: FieldValue) => void;
  disabled: boolean;
  /** Product only: whether the current override is what renders on the PDP today. */
  currentLive?: boolean;
};

const words = (text: string) => text.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

function display(value: FieldValue): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value.map((v) => (typeof v === 'string' ? v : `Q: ${v.question}\nA: ${v.answer}`)).join('\n\n');
}

function stats(value: FieldValue): string {
  const text = display(value);
  return `${text.length} chars · ${words(text)} words`;
}

export default function FieldEditor({ name, current, value, onChange, disabled, currentLive }: Props) {
  const id = `field-${name}`;
  const label = name.replace(/_/g, ' ');
  const isFaq = name === 'faq_items';
  const isBullets = name === 'bullet_points';
  const text = display(value);

  return (
    <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:grid-cols-2">
      <div>
        <h3 className="mb-1 text-sm font-semibold capitalize text-gray-900">Current {label}</h3>
        {currentLive === false && (
          <p className="mb-1 text-xs text-amber-700">Not live today: the page shows the supplier version.</p>
        )}
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
          {display(current) || '(empty)'}
        </pre>
        <p className="mt-1 text-xs text-gray-500">{stats(current)}</p>
      </div>
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-semibold capitalize text-gray-900">
          Proposed {label}
        </label>
        {isFaq ? (
          <FaqEditor id={id} value={(value as FaqItem[]) ?? []} onChange={onChange} disabled={disabled} />
        ) : (
          <textarea
            id={id}
            value={text}
            disabled={disabled}
            rows={Math.min(24, Math.max(2, Math.ceil(text.length / 70)))}
            onChange={(e) => onChange(isBullets ? e.target.value.split('\n') : e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 font-mono text-xs"
          />
        )}
        <p className="mt-1 text-xs text-gray-500">
          {stats(value)}
          {isBullets && ' · one bullet per line'}
        </p>
      </div>
    </section>
  );
}
