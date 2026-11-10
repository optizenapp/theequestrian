import { NextRequest, NextResponse } from 'next/server';
import { getRecentPostings, resolvePosting } from '@/lib/rewards/credit-postings';
import { syncCustomerStoreCredit } from '@/lib/rewards/credit-sync';
import { getMissingStoreCreditScopes } from '@/lib/rewards/store-credit-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [scopes, postings] = await Promise.all([
      getMissingStoreCreditScopes()
        .then((missing) => ({ missing, error: null as string | null }))
        .catch((error: unknown) => ({ missing: [] as string[], error: error instanceof Error ? error.message : 'Scope check failed' })),
      getRecentPostings(50),
    ]);
    return NextResponse.json({ missingScopes: scopes.missing, scopeError: scopes.error, postings });
  } catch (error) {
    console.error('[admin/rewards/store-credit] Failed to load:', error);
    return NextResponse.json({ error: 'Failed to load store credit status' }, { status: 500 });
  }
}

type PostBody = { action?: unknown; customerId?: unknown; postingId?: unknown; outcome?: unknown };

/** 'sync' runs even while issuance is off, so one customer can be tested before switching on for everyone. */
export async function POST(request: NextRequest) {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (body.action === 'sync') {
      const raw = typeof body.customerId === 'string' ? body.customerId.trim() : '';
      const numeric = raw.replace(/^gid:\/\/shopify\/Customer\//, '');
      if (!/^\d+$/.test(numeric)) {
        return NextResponse.json({ error: 'customerId must be a Shopify customer ID' }, { status: 400 });
      }
      const outcome = await syncCustomerStoreCredit(`gid://shopify/Customer/${numeric}`);
      return NextResponse.json({ outcome });
    }
    if (body.action === 'resolve') {
      const postingId = typeof body.postingId === 'number' ? body.postingId : NaN;
      if (!Number.isSafeInteger(postingId) || (body.outcome !== 'posted' && body.outcome !== 'failed')) {
        return NextResponse.json({ error: 'postingId and outcome (posted|failed) are required' }, { status: 400 });
      }
      const resolved = await resolvePosting(postingId, body.outcome);
      return NextResponse.json({ resolved });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[admin/rewards/store-credit] Action failed:', error);
    return NextResponse.json({ error: 'Store credit action failed' }, { status: 500 });
  }
}
