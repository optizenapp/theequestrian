import { revalidatePath } from 'next/cache';
import { invalidateCache } from '@/lib/content/collections';
import { invalidateBrandContentCache } from '@/lib/content/brand-content';
import { invalidateProductOverrideCache } from '@/lib/content/product-overrides';
import { claimProposal, finishProposal, getProposal } from './db';
import { readCopy, writeCopy } from './copy-store';
import { readProductCopy, writeProductCopy } from './product-store';
import { resolveTarget } from './target';
import { cleanFields } from './validate';
import type { AppliedResult, ContentFields, ProposalTarget } from './types';

export type ActionResult = { ok: true; status: string } | { ok: false; status: number; error: string };

function refresh(target: ProposalTarget, pagePath: string) {
  if (target.type === 'category') invalidateCache();
  if (target.type === 'brand') invalidateBrandContentCache();
  if (target.type === 'product') invalidateProductOverrideCache();
  revalidatePath(pagePath);
}

function pick(source: ContentFields, names: string[]): ContentFields {
  return Object.fromEntries(names.map((n) => [n, source[n] ?? null]));
}

async function write(target: ProposalTarget, fields: ContentFields, flags?: Record<string, boolean>) {
  if (!target.key) throw new Error('Page has no editable content row');
  if (target.type === 'product') return writeProductCopy(target.key, fields, flags);
  if (target.type === 'category' || target.type === 'brand') return writeCopy(target.type, target.key, fields);
  throw new Error('Page has no editable content row');
}

export async function approveProposal(id: number, edited?: unknown): Promise<ActionResult> {
  const proposal = await getProposal(id);
  if (!proposal) return { ok: false, status: 404, error: 'Proposal not found' };
  const from = proposal.status;
  if (from !== 'pending' && from !== 'failed') {
    return { ok: false, status: 409, error: `Proposal is ${from}` };
  }
  const target = await resolveTarget(proposal.pagePath);
  const { fields, problems } = cleanFields(edited ?? proposal.proposedContent, target.type);
  if (problems.length > 0 && edited !== undefined) return { ok: false, status: 400, error: problems.join('; ') };

  if (proposal.changeType !== 'content' || Object.keys(fields).length === 0) {
    if (!(await claimProposal(id, from, 'approved'))) return { ok: false, status: 409, error: 'Already handled' };
    const note = 'Approved for manual action: nothing on this page is applied automatically.';
    await finishProposal(id, 'approved', { target, applied: {}, previous: {}, note });
    return { ok: true, status: 'approved' };
  }

  if (!(await claimProposal(id, from, 'applying'))) return { ok: false, status: 409, error: 'Already handled' };
  const names = Object.keys(fields);
  const result: AppliedResult = { target, applied: fields, previous: {} };
  try {
    if (target.type === 'product' && target.key) {
      const current = await readProductCopy(target.key);
      result.previous = pick(current.values, names);
      result.previousFlags = current.flags;
      result.rowExisted = current.exists;
    } else if ((target.type === 'category' || target.type === 'brand') && target.key) {
      const current = await readCopy(target.type, target.key);
      if (!current) throw new Error(`No ${target.type} content row for ${target.key}`);
      result.previous = pick(current, names);
    }
    if (problems.length > 0) result.note = `Skipped: ${problems.join('; ')}`;
    await write(target, fields);
    await finishProposal(id, 'applied', result);
    refresh(target, proposal.pagePath);
    return { ok: true, status: 'applied' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[bot-proposals] apply ${id} failed:`, message);
    await finishProposal(id, 'failed', { ...result, error: message });
    return { ok: false, status: 500, error: `Apply failed: ${message}` };
  }
}

export async function rejectProposal(id: number): Promise<ActionResult> {
  if (await claimProposal(id, 'pending', 'rejected')) return { ok: true, status: 'rejected' };
  if (await claimProposal(id, 'failed', 'rejected')) return { ok: true, status: 'rejected' };
  return { ok: false, status: 409, error: 'Only pending or failed proposals can be rejected' };
}

/** Restore the values captured at apply time. Overwrites any edits made to those fields since. */
export async function undoProposal(id: number): Promise<ActionResult> {
  const proposal = await getProposal(id);
  const applied = proposal?.appliedResult;
  if (!proposal || !applied) return { ok: false, status: 404, error: 'Nothing to undo' };
  if (!(await claimProposal(id, 'applied', 'applying'))) return { ok: false, status: 409, error: 'Not applied' };
  try {
    await write(applied.target, applied.previous, applied.target.type === 'product' ? applied.previousFlags ?? {} : undefined);
    await finishProposal(id, 'reverted', { ...applied, revertedAt: new Date().toISOString() });
    refresh(applied.target, proposal.pagePath);
    return { ok: true, status: 'reverted' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[bot-proposals] undo ${id} failed:`, message);
    await finishProposal(id, 'applied', { ...applied, error: `Undo failed: ${message}` });
    return { ok: false, status: 500, error: `Undo failed: ${message}` };
  }
}
