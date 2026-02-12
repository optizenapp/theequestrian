import { NextRequest, NextResponse } from 'next/server';
import { getContactsPage, upsertEmailContact } from '@/lib/email-platform/contacts';
import { recomputeCustomerAffinities, recomputeCustomerAggregates } from '@/lib/email-platform/orders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') || 50), 1), 200);
    const payload = await getContactsPage({
      page,
      pageSize,
      search: searchParams.get('search') || '',
      email: searchParams.get('email') || '',
      name: searchParams.get('name') || '',
      subscriptionStatus: searchParams.get('subscriptionStatus') || '',
      minOrders: searchParams.get('minOrders') ? Number(searchParams.get('minOrders')) : undefined,
      maxOrders: searchParams.get('maxOrders') ? Number(searchParams.get('maxOrders')) : undefined,
      minLtv: searchParams.get('minLtv') ? Number(searchParams.get('minLtv')) : undefined,
      maxLtv: searchParams.get('maxLtv') ? Number(searchParams.get('maxLtv')) : undefined,
    });
    return NextResponse.json({
      contacts: payload.rows,
      page: payload.page,
      pageSize: payload.pageSize,
      total: payload.total,
      totalPages: payload.totalPages,
    });
  } catch (error) {
    console.error('Failed to load contacts:', error);
    return NextResponse.json({ error: 'Failed to load contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contactsInput = Array.isArray(body?.contacts) ? body.contacts : [];
    if (contactsInput.length === 0) {
      return NextResponse.json({ error: 'contacts[] is required' }, { status: 400 });
    }

    let imported = 0;
    for (const item of contactsInput) {
      const email = typeof item?.email === 'string' ? item.email.trim() : '';
      if (!email) {
        continue;
      }
      await upsertEmailContact({
        email,
        firstName: typeof item?.firstName === 'string' ? item.firstName : null,
        lastName: typeof item?.lastName === 'string' ? item.lastName : null,
        acceptsMarketing: item?.acceptsMarketing !== false,
        source: 'manual_import',
        metadata: typeof item?.metadata === 'object' && item.metadata ? item.metadata : {},
      });
      imported += 1;
    }

    await recomputeCustomerAggregates();
    await recomputeCustomerAffinities();

    return NextResponse.json({ ok: true, imported });
  } catch (error) {
    console.error('Failed to import contacts:', error);
    return NextResponse.json({ error: 'Failed to import contacts' }, { status: 500 });
  }
}
