import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';

/**
 * GET /api/copiq/deals
 * Stub: This site may not have a deals/promotions table.
 * Returns empty list; implement when you have deal data.
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;

  if (!verifyCopiqApiKey(apiKey)) {
    return NextResponse.json(
      { success: false, code: 'UNAUTHORIZED', message: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: [],
    total: 0,
    deals_table:
      '| Rank | Deal | Provider | Voucher Code | Saving | Valid Until |\n|---|---|---|---|---|---|\n| - | No deals configured | - | - | - | - |',
  });
}
