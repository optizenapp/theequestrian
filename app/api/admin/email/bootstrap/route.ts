import { NextResponse } from 'next/server';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';

export async function POST() {
  try {
    await ensureEmailPlatformSchema();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to bootstrap email platform schema:', error);
    return NextResponse.json({ error: 'Failed to bootstrap email platform schema' }, { status: 500 });
  }
}
