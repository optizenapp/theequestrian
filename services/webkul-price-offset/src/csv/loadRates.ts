import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { config } from '../config';

export interface VendorRate {
  vendor: string;
  shippingCost: number;
  tagOverrides?: Map<string, number>; // Tag-specific rates for this vendor
  weightBased?: { min: number; max: number; cost: number }[]; // Weight-based rates
}

export interface TagRate {
  tag: string;
  shippingCost: number;
}

export function loadVendorRates(): Map<string, VendorRate> {
  const filePath = path.resolve(process.cwd(), config.vendorRatesCsv);
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Array<any>;

  const map = new Map<string, VendorRate>();
  
  for (const row of records) {
    const vendorRaw = row.Vendor || row.vendor || row.vendor_name || '';
    const vendor = typeof vendorRaw === 'string' ? vendorRaw.trim() : String(vendorRaw).trim();
    
    if (!vendor || vendor === '') continue;
    
    // Get or create vendor entry
    let vendorRate = map.get(vendor);
    if (!vendorRate) {
      vendorRate = { 
        vendor, 
        shippingCost: 0,
        tagOverrides: new Map()
      };
      map.set(vendor, vendorRate);
    }
    
    const tag = row.Tag?.trim() || '';
    const shippingRaw = row.Shipping || row.shipping_cost || '';
    
    // Check for weight-based rates
    const weight1 = row['0-5kg']?.trim();
    const weight2 = row['5.01-10kg']?.trim();
    const weight3 = row['10.01-20kg']?.trim();
    
    if (weight1 || weight2 || weight3) {
      // Weight-based shipping
      if (!vendorRate.weightBased) vendorRate.weightBased = [];
      if (weight1) vendorRate.weightBased.push({ min: 0, max: 5, cost: Number(weight1) });
      if (weight2) vendorRate.weightBased.push({ min: 5.01, max: 10, cost: Number(weight2) });
      if (weight3) vendorRate.weightBased.push({ min: 10.01, max: 20, cost: Number(weight3) });
    } else if (tag && tag !== '') {
      // Tag-based override
      const tagCost = Number(shippingRaw);
      if (!isNaN(tagCost)) {
        vendorRate.tagOverrides!.set(tag, tagCost);
      }
    } else if (shippingRaw && shippingRaw !== '') {
      // Base shipping rate
      const baseCost = Number(shippingRaw);
      if (!isNaN(baseCost)) {
        vendorRate.shippingCost = baseCost;
      }
    }
  }
  
  return map;
}

export function loadTagRates(): Map<string, TagRate> {
  // Tags are now in vendor-shipping.csv, extract from Tag column
  const filePath = path.resolve(process.cwd(), config.vendorRatesCsv);
  if (!fs.existsSync(filePath)) {
    return new Map();
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Array<any>;

  const map = new Map<string, TagRate>();
  
  for (const row of records) {
    const tagRaw = row.Tag || row.tag || '';
    const tag = typeof tagRaw === 'string' ? tagRaw.trim() : String(tagRaw).trim();
    
    if (!tag || tag === '') continue;
    
    const shippingRaw = row.Shipping || row.shipping_cost || '';
    const shippingCost = Number(shippingRaw);
    
    if (isNaN(shippingCost)) continue;
    
    // Remove # prefix if present and store both versions
    const cleanTag = tag.replace(/^#/, '');
    map.set(cleanTag, { tag: cleanTag, shippingCost });
    if (tag.startsWith('#')) {
      map.set(tag, { tag, shippingCost }); // Also store with # prefix
    }
  }
  
  return map;
}
