import { NextResponse } from 'next/server';
import { auditManualRedirects } from '@/lib/redirects/audit';

export async function GET() {
  try {
    const conflicts = await auditManualRedirects();
    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Cron redirect audit error:', error);
    return NextResponse.json({ error: 'Failed to audit redirects' }, { status: 500 });
  }
}
