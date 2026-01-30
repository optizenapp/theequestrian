import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { config } from '../config.js';

export function loadSellerMapping(): Map<string, string> {
  const csvPath = path.resolve(process.cwd(), config.csv.sellerMapping);
  
  if (!fs.existsSync(csvPath)) {
    console.warn(`[Warning] Seller mapping file not found: ${csvPath}`);
    return new Map();
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;

  const map = new Map<string, string>();
  for (const row of records) {
    const sellerId = String(row.seller_id || row.id || '').trim();
    const vendorName = String(row.vendor_name || row.vendor || '').trim();
    if (sellerId && vendorName) {
      map.set(sellerId, vendorName);
    }
  }

  return map;
}
