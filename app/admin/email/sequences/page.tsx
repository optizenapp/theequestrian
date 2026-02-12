'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

type SequenceRow = {
  id: string;
  name: string;
  status: string;
  triggerType: string;
};

type TemplateRow = {
  id: string;
  name: string;
  activeVersionId: string | null;
};

type BuilderStep = {
  id: string;
  stepType: 'wait' | 'send_email' | 'condition_gate';
  config: Record<string, unknown>;
};

function makeId() {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AdminEmailSequencesPage() {
  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('new_customer');
  const [steps, setSteps] = useState<BuilderStep[]>([
    { id: makeId(), stepType: 'wait', config: { waitHours: 24 } },
    { id: makeId(), stepType: 'send_email', config: {} },
  ]);
  const [error, setError] = useState('');

  async function loadData() {
    const [seqRes, templateRes] = await Promise.all([
      fetch('/api/admin/email/sequences'),
      fetch('/api/admin/email/templates'),
    ]);
    const [seqData, templateData] = await Promise.all([seqRes.json(), templateRes.json()]);
    if (!seqRes.ok) throw new Error(seqData?.error || 'Failed to load sequences');
    if (!templateRes.ok) throw new Error(templateData?.error || 'Failed to load templates');
    setSequences(Array.isArray(seqData.sequences) ? seqData.sequences : []);
    setTemplates(Array.isArray(templateData.templates) ? templateData.templates : []);
  }

  useEffect(() => {
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'));
  }, []);

  const sendTemplateOptions = templates.filter((template) => template.activeVersionId);

  return (
    <AdminLayout title="Email Sequences" subtitle="Visual linear automations with rules">
      <div className="mb-4">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">← Back to Email Platform</Link>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Create linear sequence</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sequence name"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="new_customer">New customer</option>
            <option value="first_order">First order</option>
            <option value="repeat_customer">Repeat customer</option>
            <option value="product_type_purchased">Product type purchased</option>
            <option value="ltv_threshold_crossed">LTV threshold crossed</option>
            <option value="winback_eligible">Winback eligible</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gray-600">Step {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (index === 0) return;
                      setSteps((current) => {
                        const copy = [...current];
                        const [moved] = copy.splice(index, 1);
                        copy.splice(index - 1, 0, moved);
                        return copy;
                      });
                    }}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (index === steps.length - 1) return;
                      setSteps((current) => {
                        const copy = [...current];
                        const [moved] = copy.splice(index, 1);
                        copy.splice(index + 1, 0, moved);
                        return copy;
                      });
                    }}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => setSteps((current) => current.filter((candidate) => candidate.id !== step.id))}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  value={step.stepType}
                  onChange={(e) =>
                    setSteps((current) =>
                      current.map((candidate) =>
                        candidate.id === step.id
                          ? {
                              ...candidate,
                              stepType: e.target.value as BuilderStep['stepType'],
                              config: {},
                            }
                          : candidate
                      )
                    )
                  }
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="wait">Wait</option>
                  <option value="send_email">Send Email</option>
                  <option value="condition_gate">Condition Gate</option>
                </select>

                {step.stepType === 'wait' ? (
                  <input
                    type="number"
                    value={Number(step.config.waitHours || 24)}
                    min={1}
                    onChange={(e) =>
                      setSteps((current) =>
                        current.map((candidate) =>
                          candidate.id === step.id
                            ? { ...candidate, config: { waitHours: Number(e.target.value || 24) } }
                            : candidate
                        )
                      )
                    }
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                ) : null}

                {step.stepType === 'send_email' ? (
                  <select
                    value={String(step.config.templateVersionId || '')}
                    onChange={(e) =>
                      setSteps((current) =>
                        current.map((candidate) =>
                          candidate.id === step.id
                            ? { ...candidate, config: { templateVersionId: e.target.value } }
                            : candidate
                        )
                      )
                    }
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option value="">Select template version</option>
                    {sendTemplateOptions.map((template) => (
                      <option key={template.id} value={template.activeVersionId || ''}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                ) : null}

                {step.stepType === 'condition_gate' ? (
                  <>
                    <select
                      value={String(step.config.metric || 'order_count')}
                      onChange={(e) =>
                        setSteps((current) =>
                          current.map((candidate) =>
                            candidate.id === step.id
                              ? {
                                  ...candidate,
                                  config: {
                                    ...candidate.config,
                                    metric: e.target.value,
                                    threshold: Number(candidate.config.threshold || 1),
                                  },
                                }
                              : candidate
                          )
                        )
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="order_count">Order count</option>
                      <option value="lifetime_value">Lifetime value</option>
                    </select>
                    <input
                      type="number"
                      value={Number(step.config.threshold || 1)}
                      onChange={(e) =>
                        setSteps((current) =>
                          current.map((candidate) =>
                            candidate.id === step.id
                              ? {
                                  ...candidate,
                                  config: {
                                    ...candidate.config,
                                    threshold: Number(e.target.value || 1),
                                  },
                                }
                              : candidate
                          )
                        )
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSteps((current) => [...current, { id: makeId(), stepType: 'wait', config: { waitHours: 24 } }])}
            className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            + Add Wait Step
          </button>
          <button
            type="button"
            onClick={() => setSteps((current) => [...current, { id: makeId(), stepType: 'send_email', config: {} }])}
            className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            + Add Send Step
          </button>
          <button
            type="button"
            className="rounded bg-action px-4 py-2 text-sm font-semibold text-white"
            onClick={async () => {
              const response = await fetch('/api/admin/email/sequences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name,
                  triggerType,
                  steps: steps.map((step) => ({ stepType: step.stepType, config: step.config })),
                }),
              });
              const data = await response.json();
              if (!response.ok) {
                setError(data?.error || 'Failed to create sequence');
                return;
              }
              setName('');
              setSteps([
                { id: makeId(), stepType: 'wait', config: { waitHours: 24 } },
                { id: makeId(), stepType: 'send_email', config: {} },
              ]);
              await loadData();
            }}
          >
            Create Sequence
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            onClick={async () => {
              const response = await fetch('/api/admin/email/sequences/run', { method: 'POST' });
              const data = await response.json();
              if (!response.ok) {
                setError(data?.error || 'Failed to run sequence engine');
                return;
              }
              alert(`Processed ${data.processed || 0} enrollments`);
            }}
          >
            Run Engine
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sequences.map((sequence) => (
          <div key={sequence.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900">{sequence.name}</h4>
            <p className="text-xs text-gray-500">
              Status: {sequence.status} | Trigger: {sequence.triggerType}
            </p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
