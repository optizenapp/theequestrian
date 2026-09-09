'use client';

import { useEffect, useId, useState } from 'react';

type Props = {
  open: boolean;
  campaignId: string;
  campaignName: string;
  originalSubject: string;
  defaultTestEmail?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (subjectLine: string) => void;
};

export function ResendNonOpenersDialog({
  open,
  campaignId,
  campaignName,
  originalSubject,
  defaultTestEmail = '',
  isSubmitting,
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  const subjectId = useId();
  const testEmailId = useId();
  const [subjectLine, setSubjectLine] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [localError, setLocalError] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubjectLine('');
    setTestEmail(defaultTestEmail);
    setLocalError('');
    setTestStatus('');
    setIsSendingTest(false);
  }, [open, defaultTestEmail]);

  if (!open) return null;

  const busy = isSubmitting || isSendingTest;

  const submit = () => {
    const trimmed = subjectLine.trim();
    if (!trimmed) {
      setLocalError('Enter a subject line before sending.');
      return;
    }
    onConfirm(trimmed);
  };

  const sendTest = async () => {
    const trimmedSubject = subjectLine.trim();
    const trimmedTo = testEmail.trim();
    if (!trimmedSubject) {
      setLocalError('Enter a subject line before sending a test.');
      return;
    }
    if (!trimmedTo) {
      setLocalError('Enter a test email address.');
      return;
    }
    setLocalError('');
    setTestStatus('');
    setIsSendingTest(true);
    try {
      const response = await fetch(`/api/admin/email/campaigns/${campaignId}/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: trimmedTo, subjectLine: trimmedSubject }),
      });
      let data: { error?: string } = {};
      try {
        data = (await response.json()) as { error?: string };
      } catch {
        /* ignore */
      }
      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to send test email');
      }
      setTestStatus(`Test sent to ${trimmedTo}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel();
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
        <label htmlFor={subjectId} className="mt-4 block text-sm font-medium text-gray-800">
          New subject line
        </label>
        <input
          id={subjectId}
          type="text"
          value={subjectLine}
          maxLength={120}
          disabled={busy}
          autoFocus
          placeholder="Enter the subject for this resend"
          className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-300 disabled:opacity-60"
          onChange={(event) => {
            setSubjectLine(event.target.value);
            if (localError) setLocalError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !busy) onCancel();
          }}
        />
        <label htmlFor={testEmailId} className="mt-4 block text-sm font-medium text-gray-800">
          Send test first
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={testEmailId}
            type="email"
            value={testEmail}
            disabled={busy}
            placeholder="your@email.com"
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-300 disabled:opacity-60"
            onChange={(event) => {
              setTestEmail(event.target.value);
              if (localError) setLocalError('');
            }}
          />
          <button
            type="button"
            disabled={busy}
            className="shrink-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            onClick={() => void sendTest()}
          >
            {isSendingTest ? 'Sending…' : 'Send test'}
          </button>
        </div>
        {testStatus ? <p className="mt-2 text-xs text-emerald-600">{testStatus}</p> : null}
        {localError ? <p className="mt-2 text-xs text-red-600">{localError}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
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
