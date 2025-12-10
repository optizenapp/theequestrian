
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const BRAND_MAPPING_PATH = path.join(process.cwd(), 'exports', 'brand-mapping.csv');

interface OldBrandMapping {
  title: string;
  handle: string;
  url: string;
  products_count: string;
  rules: string;
}

interface NewBrandMapping extends OldBrandMapping {
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  long_description: string;
  breadcrumb_label: string;
  faq_json: string;
}

function upgradeBrandMapping() {
  if (!fs.existsSync(BRAND_MAPPING_PATH)) {
    console.error('Brand mapping CSV not found at:', BRAND_MAPPING_PATH);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(BRAND_MAPPING_PATH, 'utf-8');
  const records: OldBrandMapping[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const newRecords: NewBrandMapping[] = records.map(record => {
    // Generate intelligent defaults
    const title = record.title.replace(/^Shop\s+/, '').replace(/^Shop\s+&?\s*Buy\s+/, '').trim();
    
    return {
      ...record,
      h1_title: title,
      meta_title: `${title} | The Equestrian`,
      meta_description: `Shop ${title} products at The Equestrian. Quality equestrian supplies and equipment.`,
      short_description: `Browse our range of ${title} products.`,
      long_description: '',
      breadcrumb_label: title,
      faq_json: '[]'
    };
  });

  const output = stringify(newRecords, {
    header: true,
    columns: [
      'title',
      'handle',
      'url',
      'products_count',
      'rules',
      'h1_title',
      'meta_title',
      'meta_description',
      'short_description',
      'long_description',
      'breadcrumb_label',
      'faq_json'
    ]
  });

  fs.writeFileSync(BRAND_MAPPING_PATH, output);
  console.log(`Updated brand mapping CSV with ${newRecords.length} records.`);
}

upgradeBrandMapping();

