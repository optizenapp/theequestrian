import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mappingPath = path.join(process.cwd(), 'exports', 'mapping-template-draft2.csv');
    
    if (!fs.existsSync(mappingPath)) {
      return NextResponse.json({ error: 'Mapping file not found' }, { status: 404 });
    }

    const csvContent = fs.readFileSync(mappingPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<{ action?: string; product_type?: string }>;

    const productTypes = new Set<string>();
    for (const row of records) {
      if (row.action !== 'exclude' && row.product_type && row.product_type.trim()) {
        productTypes.add(row.product_type.trim());
      }
    }

    const sortedTypes = Array.from(productTypes).sort();

    return NextResponse.json({ 
      types: sortedTypes,
      count: sortedTypes.length 
    });
  } catch (error) {
    console.error('Error loading product types:', error);
    return NextResponse.json({ error: 'Failed to load product types' }, { status: 500 });
  }
}
