import { NextResponse } from 'next/server';
import { importCsvRedirects, importCsvFromContent } from '@/lib/redirects/import';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }
      
      const csvContent = await file.text();
      const result = await importCsvFromContent(csvContent);
      return NextResponse.json(result);
    }
    
    const result = await importCsvRedirects();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Redirect import error:', error);
    return NextResponse.json({ error: 'Failed to import redirects' }, { status: 500 });
  }
}
