import { MetadataRoute } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com';

interface MappingRow {
  top_level: string;
  parent_category: string;
  subcategory_handle: string;
  product_type: string;
  action: 'include' | 'exclude' | 'merge';
}

/**
 * Collections Sitemap
 * 
 * Contains ALL collection/category pages that exist in the headless frontend
 * Based on mapping-template-draft2.csv (not all Shopify collections)
 * 
 * Includes:
 * - Top-level categories (e.g., /horse, /rider, /clothing, /pet)
 * - Parent categories (e.g., /horse/boots, /rider/helmets)
 * - Subcategories (e.g., /horse/boots/jumping, /rider/helmets/safety)
 * - Sub-subcategories (e.g., /horse/rugs/turnout/winter)
 * 
 * All levels from the mapping CSV, regardless of whether they appear in the menu
 */
export async function GET() {
  // Load the mapping CSV to get actual frontend collections
  const mappingPath = path.join(process.cwd(), 'exports', 'mapping-template-draft2.csv');
  
  if (!fs.existsSync(mappingPath)) {
    console.warn(`Mapping file not found: ${mappingPath}`);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }

  const csvContent = fs.readFileSync(mappingPath, 'utf-8');
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as MappingRow[];

  // Build unique collection paths from the mapping
  const collectionPaths = new Set<string>();
  
  for (const row of records) {
    // Skip excluded items
    if (row.action === 'exclude') {
      continue;
    }

    // Build collection paths at all levels
    const pathParts: string[] = [];
    
    if (row.top_level && row.top_level.trim()) {
      pathParts.push(row.top_level.trim());
      // Add top-level path
      collectionPaths.add(pathParts.join('/'));
    }
    
    if (row.parent_category && row.parent_category.trim()) {
      pathParts.push(row.parent_category.trim());
      // Add parent category path
      collectionPaths.add(pathParts.join('/'));
    }
    
    if (row.subcategory_handle && row.subcategory_handle.trim()) {
      pathParts.push(row.subcategory_handle.trim());
      // Add full subcategory path
      collectionPaths.add(pathParts.join('/'));
    }
  }

  // Convert to array and sort
  const collections = Array.from(collectionPaths).sort();

  const sitemap: MetadataRoute.Sitemap = collections.map((collectionPath) => ({
    url: `${SITE_URL}/${collectionPath}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap
  .map(
    (item) => {
      const lastMod = item.lastModified instanceof Date 
        ? item.lastModified.toISOString() 
        : item.lastModified 
          ? new Date(item.lastModified).toISOString() 
          : new Date().toISOString();
      
      return `  <url>
    <loc>${item.url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${item.changeFrequency}</changefreq>
    <priority>${item.priority}</priority>
  </url>`;
    }
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
