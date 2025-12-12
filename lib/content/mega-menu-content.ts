/**
 * Mega Menu Content Management
 * 
 * Reads content from CSV file to populate mega menu hero images and quick links
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export interface MegaMenuContent {
  category: string;
  featuredImage?: {
    url: string;
    title: string;
    subtitle: string;
    link: string;
  };
  quickLinks?: Array<{
    title: string;
    imageUrl: string;
    link: string;
  }>;
  subcategoryCards?: Array<{
    title: string;
    imageUrl: string;
    link: string;
  }>;
}

let cachedContent: Map<string, MegaMenuContent> | null = null;
let lastModified: number = 0;

/**
 * Load mega menu content from CSV
 */
function loadMegaMenuContent(): Map<string, MegaMenuContent> {
  const csvPath = path.join(process.cwd(), 'exports', 'mega-menu-content.csv');
  
  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.log('[MegaMenu] CSV not found, using auto-generated content');
    return new Map();
  }
  
  // Check if file has been modified
  const stats = fs.statSync(csvPath);
  const currentModified = stats.mtimeMs;
  
  // In development, always reload to see changes immediately
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Return cached content if file hasn't changed (skip cache in dev)
  if (!isDevelopment && cachedContent && lastModified === currentModified) {
    return cachedContent;
  }
  
  if (isDevelopment) {
    console.log('[MegaMenu] Development mode: Reloading CSV from:', csvPath);
  }
  
  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;
    
    console.log(`[MegaMenu] Parsed ${records.length} rows from CSV`);
    
    const contentMap = new Map<string, MegaMenuContent>();
    
    for (const row of records) {
      const content: MegaMenuContent = {
        category: row.category,
      };
      
      // Parse featured image
      if (row.featured_image_url && row.featured_image_url.trim()) {
        content.featuredImage = {
          url: row.featured_image_url.trim(),
          title: row.featured_title?.trim() || 'Featured Collection',
          subtitle: row.featured_subtitle?.trim() || `Discover ${row.category}`,
          link: row.featured_link?.trim() || `/${row.category}`,
        };
      }
      
      // Parse quick links
      const quickLinks: Array<{ title: string; imageUrl: string; link: string }> = [];
      
      // Quick link 1
      if (row.quick_link_1_title && row.quick_link_1_image_url && row.quick_link_1_link) {
        quickLinks.push({
          title: row.quick_link_1_title.trim(),
          imageUrl: row.quick_link_1_image_url.trim(),
          link: row.quick_link_1_link.trim(),
        });
      }
      
      // Quick link 2
      if (row.quick_link_2_title && row.quick_link_2_image_url && row.quick_link_2_link) {
        quickLinks.push({
          title: row.quick_link_2_title.trim(),
          imageUrl: row.quick_link_2_image_url.trim(),
          link: row.quick_link_2_link.trim(),
        });
      }
      
      if (quickLinks.length > 0) {
        content.quickLinks = quickLinks;
      }
      
      // Parse subcategory cards (6 cards on the right)
      const subcategoryCards: Array<{ title: string; imageUrl: string; link: string }> = [];
      
      for (let i = 1; i <= 6; i++) {
        const titleKey = `card_${i}_title`;
        const imageKey = `card_${i}_image_url`;
        const linkKey = `card_${i}_link`;
        
        if (row[titleKey] && row[imageKey] && row[linkKey]) {
          subcategoryCards.push({
            title: row[titleKey].trim(),
            imageUrl: row[imageKey].trim(),
            link: row[linkKey].trim(),
          });
        }
      }
      
      if (subcategoryCards.length > 0) {
        content.subcategoryCards = subcategoryCards;
      }
      
      contentMap.set(row.category, content);
      console.log(`[MegaMenu] Loaded category "${row.category}":`, {
        hasFeaturedImage: !!content.featuredImage,
        quickLinksCount: content.quickLinks?.length || 0,
        cardsCount: content.subcategoryCards?.length || 0
      });
    }
    
    // Update cache
    cachedContent = contentMap;
    lastModified = currentModified;
    
    console.log(`[MegaMenu] Loaded content for ${contentMap.size} categories:`, Array.from(contentMap.keys()));
    return contentMap;
    
  } catch (error) {
    console.error('[MegaMenu] Error loading CSV:', error);
    return new Map();
  }
}

/**
 * Get mega menu content for a specific category
 */
export function getMegaMenuContent(category: string): MegaMenuContent | null {
  const contentMap = loadMegaMenuContent();
  return contentMap.get(category) || null;
}

/**
 * Check if category has custom content
 */
export function hasCustomContent(category: string): boolean {
  const content = getMegaMenuContent(category);
  return !!(content?.featuredImage || content?.quickLinks);
}

