import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { config } from '../config';

export interface SellerMapping {
  sellerId: string;
  vendorName: string;
}

export function loadSellerMapping(): Map<string, string> {
  const filePath = path.resolve(process.cwd(), config.sellerMappingCsv);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`[Warning] Seller mapping file not found: ${filePath}`);
    return new Map();
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Array<{
    seller_id: string;
    vendor_name: string;
  }>;

  const map = new Map<string, string>();
  for (const row of records) {
    const sellerId = row.seller_id?.trim();
    const vendorName = row.vendor_name?.trim();
    if (sellerId && vendorName) {
      map.set(sellerId, vendorName);
    }
  }
  
  return map;
}
