import { NextResponse } from 'next/server';
import { createManualRedirect, listManualRedirects } from '@/lib/redirects/manual';
import { markRollupStatus } from '@/lib/not-found/rollup-store';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get('source');
    const rows = await listManualRedirects(500, source || undefined);
    return NextResponse.json({ redirects: rows });
  } catch (error) {
    console.error('Redirect list error:', error);
    return NextResponse.json({ error: 'Failed to load redirects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const from = typeof body?.from === 'string' ? body.from : '';
    const to = typeof body?.to === 'string' ? body.to : '';
    const type = typeof body?.type === 'string' ? body.type : '301';
    const source = typeof body?.source === 'string' ? body.source : 'manual';

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from/to' }, { status: 400 });
    }

    const redirect = await createManualRedirect(from, to, type, source);
    await markRollupStatus(from, 'manual');
    return NextResponse.json({ redirect });
  } catch (error) {
    console.error('Redirect create error:', error);
    return NextResponse.json({ error: 'Failed to create redirect' }, { status: 500 });
  }
}
