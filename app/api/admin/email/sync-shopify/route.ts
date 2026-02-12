import { NextRequest, NextResponse } from 'next/server';
import { syncShopifyCustomersAndOrders } from '@/lib/email-platform/shopify-sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const maxCustomerPages = Math.min(Math.max(Number(body?.maxCustomerPages || 5), 1), 50);
    const maxOrderPages = Math.min(Math.max(Number(body?.maxOrderPages || 5), 1), 50);

    const result = await syncShopifyCustomersAndOrders({ maxCustomerPages, maxOrderPages });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Failed to sync Shopify contacts/orders:', error);
    return NextResponse.json({ error: 'Failed to sync Shopify contacts/orders' }, { status: 500 });
  }
}
