'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  PRODUCT_FIELD_FLAGS,
  editableFields,
  type ContentFields,
  type ProposalDetail,
  type ProposalTarget,
} from '@/lib/bot-proposals/types';
import type { CurrentContent } from '@/lib/bot-proposals/current';
import FieldEditor from './FieldEditor';
import ProposalActions from './ProposalActions';
import ProposalHeader from './ProposalHeader';

type Detail = { proposal: ProposalDetail; target: ProposalTarget; current: CurrentContent };

function initialDraft(detail: Detail): ContentFields {
  const source = detail.proposal.appliedResult?.applied ?? detail.proposal.proposedContent ?? {};
  const allowed = editableFields(detail.target.type);
  return Object.fromEntries(Object.entries(source).filter(([name, v]) => v != null && allowed.includes(name)));
}

function cleaned(draft: ContentFields): ContentFields {
  const out: ContentFields = { ...draft };
  const bullets = out.bullet_points;
  if (Array.isArray(bullets)) {
    out.bullet_points = bullets.filter((b): b is string => typeof b === 'string' && b.trim() !== '');
  }
  return out;
}

export default function ProposalReview({ id }: { id: number }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [draft, setDraft] = useState<ContentFields>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/bot-proposals/${id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to load proposal (${response.status})`);
      const data = (await response.json()) as Detail;
      setDetail(data);
      setDraft(initialDraft(data));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !detail) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!detail) return <p className="text-sm text-gray-500">Loading…</p>;

  const { proposal, target, current } = detail;
  const editable = proposal.status === 'pending' || proposal.status === 'failed';
  const skipped = Object.entries(proposal.proposedContent ?? {})
    .filter(([f, v]) => v != null && !(f in draft))
    .map(([f]) => f);
  const flagFor = (name: string) =>
    current.flags && name in PRODUCT_FIELD_FLAGS
      ? current.flags[PRODUCT_FIELD_FLAGS[name as keyof typeof PRODUCT_FIELD_FLAGS]]
      : undefined;

  return (
    <div className="space-y-5">
      <Link href="/admin/seo-proposals" className="text-sm font-semibold text-action hover:underline">
        ← All proposals
      </Link>
      <ProposalHeader proposal={proposal} target={target} />

      {skipped.length > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Not applied automatically on a {target.type} page: {skipped.join(', ')}.
        </p>
      )}

      {Object.keys(draft).map((name) => (
        <FieldEditor
          key={name}
          name={name}
          current={current.fields?.[name] ?? null}
          value={draft[name]}
          disabled={!editable}
          currentLive={flagFor(name)}
          onChange={(next) => setDraft((d) => ({ ...d, [name]: next }))}
        />
      ))}

      <ProposalActions
        id={id}
        status={proposal.status}
        hasContent={Object.keys(draft).length > 0}
        getContent={() => cleaned(draft)}
        onDone={load}
      />
    </div>
  );
}
