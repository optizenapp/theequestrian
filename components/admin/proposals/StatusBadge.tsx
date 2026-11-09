import type { ProposalStatus } from '@/lib/bot-proposals/types';

const STYLES: Record<ProposalStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  applying: 'bg-blue-100 text-blue-800',
  applied: 'bg-green-100 text-green-800',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-700',
  reverted: 'bg-purple-100 text-purple-700',
  superseded: 'bg-gray-100 text-gray-500',
};

export default function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STYLES[status] ?? STYLES.pending}`}>
      {status}
    </span>
  );
}
