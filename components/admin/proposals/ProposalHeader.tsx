import type { ProposalDetail, ProposalTarget } from '@/lib/bot-proposals/types';
import StatusBadge from './StatusBadge';

const SITE = 'https://www.theequestrian.com.au';

function evidenceRows(evidence: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(evidence)
    .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
    .map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').toLowerCase(), String(v)]);
}

type Props = { proposal: ProposalDetail; target: ProposalTarget };

export default function ProposalHeader({ proposal, target }: Props) {
  const applied = proposal.appliedResult;
  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{proposal.title}</h2>
          <p className="text-sm text-gray-600">
            <a href={`${SITE}${proposal.pagePath}`} target="_blank" rel="noopener noreferrer" className="text-action underline">
              {proposal.pagePath}
            </a>{' '}
            · {target.type === 'none' ? 'no editable copy' : `${target.type} page`} · “{proposal.targetQuery}” ·{' '}
            {proposal.kind.replace(/_/g, ' ')} · {proposal.reportDate}
          </p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      <div className="space-y-2 text-sm text-gray-800">
        <p><span className="font-semibold">What to change: </span>{proposal.recommendation}</p>
        <p><span className="font-semibold">Why: </span>{proposal.rationale}</p>
        {proposal.korayRules.length > 0 && (
          <p className="text-gray-600">Rules: {proposal.korayRules.join(', ')}</p>
        )}
      </div>

      {evidenceRows(proposal.evidence).length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          {evidenceRows(proposal.evidence).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-gray-100 py-1">
              <dt className="capitalize text-gray-500">{k}</dt>
              <dd className="font-medium text-gray-900">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {applied?.note && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{applied.note}</p>}
      {applied?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{applied.error}</p>}
    </section>
  );
}
