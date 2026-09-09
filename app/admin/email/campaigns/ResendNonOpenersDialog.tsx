'use client';

import { useEffect, useId, useState } from 'react';

type Props = {
  open: boolean;
  campaignName: string;
  originalSubject: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (subjectLine: string) => void;
};

export function ResendNonOpenersDialog({
  open,
  campaignName,
  originalSubject,
  isSubmitting,
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  const inputId = useId();
  const [subjectLine, setSubjectLine] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSubjectLine('');
    setLocalError('');
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const trimmed = subjectLine.trim();
    if (!trimmed) {
      setLocalError('Enter a subject line before sending.');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={() => {
        if (!isSubmitting) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold text-gray-900">
          Resend to non-openers
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Creates a resend campaign for recipients who did not open{' '}
          <span className="font-medium text-gray-800">{campaignName}</span>, then sends in the
          background.
        </p>
        {originalSubject ? (
          <p className="mt-3 text-xs text-gray-500">
            Original subject: <span className="text-gray-700">{originalSubject}</span>
          </p>
        ) : null}
        <label htmlFor={inputId} className="mt-4 block text-sm font-medium text-gray-800">
          New subject line
        </label>
        <input
          id={inputId}
          type="text"
          value={subjectLine}
          maxLength={120}
          disabled={isSubmitting}
          autoFocus
          placeholder="Enter the subject for this resend"
          className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-300 disabled:opacity-60"
          onChange={(event) => {
            setSubjectLine(event.target.value);
            if (localError) setLocalError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
            if (event.key === 'Escape' && !isSubmitting) onCancel();
          }}
        />
        {localError ? <p className="mt-2 text-xs text-red-600">{localError}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            className="rounded-full border border-fuchsia-400 bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-900 hover:bg-fuchsia-100 disabled:opacity-60"
            onClick={submit}
          >
            {isSubmitting ? 'Resending…' : 'Send resend'}
          </button>
        </div>
      </div>
    </div>
  );
}
