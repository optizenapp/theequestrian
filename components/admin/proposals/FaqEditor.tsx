'use client';

import type { FaqItem } from '@/lib/bot-proposals/types';

type Props = { id: string; value: FaqItem[]; onChange: (next: FaqItem[]) => void; disabled: boolean };

export default function FaqEditor({ id, value, onChange, disabled }: Props) {
  const update = (index: number, key: keyof FaqItem, text: string) =>
    onChange(value.map((f, i) => (i === index ? { ...f, [key]: text } : f)));

  return (
    <div className="space-y-3">
      {value.map((faq, i) => (
        <fieldset key={i} className="space-y-2 rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-xs font-semibold text-gray-500">FAQ {i + 1}</legend>
          <label className="block text-xs text-gray-600" htmlFor={`${id}-q-${i}`}>Question</label>
          <input
            id={`${id}-q-${i}`}
            value={faq.question}
            disabled={disabled}
            onChange={(e) => update(i, 'question', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <label className="block text-xs text-gray-600" htmlFor={`${id}-a-${i}`}>Answer</label>
          <textarea
            id={`${id}-a-${i}`}
            value={faq.answer}
            disabled={disabled}
            rows={3}
            onChange={(e) => update(i, 'answer', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Remove FAQ
            </button>
          )}
        </fieldset>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...value, { question: '', answer: '' }])}
          className="text-sm font-semibold text-action hover:underline"
        >
          + Add FAQ
        </button>
      )}
    </div>
  );
}
