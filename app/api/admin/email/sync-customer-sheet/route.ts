import { NextResponse } from 'next/server';
import { backfillCustomerSheetFromContacts } from '@/lib/email-platform/contacts';

export async function POST() {
  try {
    const result = await backfillCustomerSheetFromContacts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Failed to backfill customer Google Sheet:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to backfill customer Google Sheet',
      },
      { status: 500 }
    );
  }
}
