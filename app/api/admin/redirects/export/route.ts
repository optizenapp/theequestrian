import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';

export async function GET() {
  try {
    const result = await sql`
      SELECT from_path, to_path, redirect_type, source, status
      FROM manual_redirects
      ORDER BY updated_at DESC
    `;

    // Create CSV content
    const headers = 'from,to,type,source,status\n';
    const rows = result.rows.map(row => 
      `${row.from_path},${row.to_path},${row.redirect_type},${row.source},${row.status}`
    ).join('\n');
    
    const csv = headers + rows;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="redirects.csv"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export redirects' }, { status: 500 });
  }
}
