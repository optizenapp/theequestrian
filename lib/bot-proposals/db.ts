import { sql } from '@/lib/db/vercel-postgres';
import type { AppliedResult, ContentFields, ProposalDetail, ProposalStatus, ProposalSummary } from './types';

type Row = Record<string, unknown>;

const iso = (value: unknown): string | null =>
  value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : null;

function toSummary(row: Row): ProposalSummary {
  return {
    id: Number(row.id),
    reportDate: (iso(row.report_date) ?? '').slice(0, 10),
    bot: String(row.bot),
    kind: String(row.kind),
    pagePath: String(row.page_path),
    targetQuery: String(row.target_query ?? ''),
    changeType: String(row.change_type),
    title: String(row.title),
    priorityScore: row.priority_score == null ? null : Number(row.priority_score),
    status: String(row.status) as ProposalStatus,
    createdAt: iso(row.created_at) ?? '',
  };
}

export async function listProposals(status: string, bot: string): Promise<ProposalSummary[]> {
  const result = await sql`
    SELECT id, report_date, bot, kind, page_path, target_query, change_type, title,
      priority_score, status, created_at
    FROM bot_proposals
    WHERE bot = ${bot} AND (${status} = 'all' OR status = ${status})
    ORDER BY report_date DESC, priority_score DESC NULLS LAST, id
    LIMIT 200
  `;
  return result.rows.map(toSummary);
}

export async function getProposal(id: number): Promise<ProposalDetail | null> {
  const result = await sql`SELECT * FROM bot_proposals WHERE id = ${id} LIMIT 1`;
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...toSummary(row),
    recommendation: String(row.recommendation ?? ''),
    rationale: String(row.rationale ?? ''),
    korayRules: Array.isArray(row.koray_rules) ? row.koray_rules.map(String) : [],
    evidence: (row.evidence as Record<string, unknown>) ?? {},
    proposedContent: (row.proposed_content as ContentFields | null) ?? null,
    appliedResult: (row.applied_result as AppliedResult | null) ?? null,
    approvedAt: iso(row.approved_at),
    appliedAt: iso(row.applied_at),
  };
}

/** Atomically move a proposal between statuses; false when someone else got there first. */
export async function claimProposal(id: number, from: ProposalStatus, to: ProposalStatus): Promise<boolean> {
  const result = await sql`
    UPDATE bot_proposals SET status = ${to} WHERE id = ${id} AND status = ${from} RETURNING id
  `;
  return result.rows.length > 0;
}

export async function finishProposal(id: number, status: ProposalStatus, applied: AppliedResult | null) {
  await sql`
    UPDATE bot_proposals
    SET status = ${status},
      applied_result = ${applied ? JSON.stringify(applied) : null},
      approved_at = CASE WHEN ${status} IN ('applied', 'approved') THEN NOW() ELSE approved_at END,
      applied_at = CASE WHEN ${status} = 'applied' THEN NOW() ELSE applied_at END
    WHERE id = ${id}
  `;
}
