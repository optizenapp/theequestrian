import { NextResponse } from 'next/server';
import { importCsvRedirects } from '@/lib/redirects/import';

export async function POST() {
  try {
    const result = await importCsvRedirects();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Redirect import error:', error);
    return NextResponse.json({ error: 'Failed to import redirects' }, { status: 500 });
  }
}
