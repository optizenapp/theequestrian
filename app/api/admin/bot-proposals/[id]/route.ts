import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { approveProposal, rejectProposal, undoProposal } from '@/lib/bot-proposals/apply';
import { loadCurrent } from '@/lib/bot-proposals/current';
import { getProposal } from '@/lib/bot-proposals/db';
import { resolveTarget } from '@/lib/bot-proposals/target';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params['params']): Promise<number | null> {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = await parseId(params);
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const proposal = await getProposal(id);
    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    const target = await resolveTarget(proposal.pagePath);
    const current = await loadCurrent(target);
    return NextResponse.json({ proposal, target, current });
  } catch (error) {
    console.error(`[bot-proposals] load ${id} failed:`, error);
    return NextResponse.json({ error: 'Failed to load proposal' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = await parseId(params);
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  let body: { action?: unknown; content?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; content?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  try {
    const result =
      body.action === 'approve' ? await approveProposal(id, body.content)
      : body.action === 'reject' ? await rejectProposal(id)
      : body.action === 'undo' ? await undoProposal(id)
      : null;
    if (!result) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ status: result.status });
  } catch (error) {
    console.error(`[bot-proposals] ${String(body.action)} ${id} failed:`, error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
