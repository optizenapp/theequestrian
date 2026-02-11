/**
 * Mega Menu Content Management
 * 
 * Reads content from PostgreSQL database to populate mega menu hero images and quick links
 * Falls back to CSV file if database is unavailable
 */

import { sql } from '@/lib/db/client';
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
let cacheTimestamp: number = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Load mega menu content from PostgreSQL database
 */
async function loadMegaMenuContentFromDB(): Promise<Map<string, MegaMenuContent>> {
  try {
    const result = await sql`
      SELECT 
        category,
        featured_image_url,
        featured_title,
        featured_subtitle,
        featured_link,
        quick_links,
        subcategory_cards
      FROM mega_menu_content
    `;
    
    const contentMap = new Map<string, MegaMenuContent>();
    const rows = (Array.isArray(result) ? result : []) as Array<{
      category: string;
      featured_image_url?: string;
      featured_title?: string;
      featured_subtitle?: string;
      featured_link?: string;
      quick_links?: any[];
      subcategory_cards?: any[];
    }>;
    
    for (const row of rows) {
      const content: MegaMenuContent = {
        category: row.category,
      };
      
      // Parse featured image
      if (row.featured_image_url) {
        content.featuredImage = {
          url: row.featured_image_url,
          title: row.featured_title || 'Featured Collection',
          subtitle: row.featured_subtitle || `Discover ${row.category}`,
          link: row.featured_link || `/${row.category}`,
        };
      }
      
      // Parse quick links (stored as JSONB)
      if (row.quick_links && Array.isArray(row.quick_links) && row.quick_links.length > 0) {
        content.quickLinks = row.quick_links;
      }
      
      // Parse subcategory cards (stored as JSONB)
      if (row.subcategory_cards && Array.isArray(row.subcategory_cards) && row.subcategory_cards.length > 0) {
        content.subcategoryCards = row.subcategory_cards;
      }
      
      contentMap.set(row.category, content);
    }
    
    console.log(`[MegaMenu] Loaded ${contentMap.size} categories from database`);
    return contentMap;
  } catch (error) {
    console.error('[MegaMenu] Error loading from database:', error);
    throw error;
  }
}

/**
 * Load mega menu content from CSV (fallback)
 */
function loadMegaMenuContentFromCSV(): Map<string, MegaMenuContent> {
  const csvPath = path.join(process.cwd(), 'exports', 'mega-menu-content.csv');
  
  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.log('[MegaMenu] CSV not found, using auto-generated content');
    return new Map();
  }
  
  console.log('[MegaMenu] Loading CSV from:', csvPath);
  
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
    
    console.log(`[MegaMenu] Loaded content for ${contentMap.size} categories:`, Array.from(contentMap.keys()));
    return contentMap;
    
  } catch (error) {
    console.error('[MegaMenu] Error loading CSV:', error);
    return new Map();
  }
}

/**
 * Load mega menu content with caching
 */
async function loadMegaMenuContent(): Promise<Map<string, MegaMenuContent>> {
  const now = Date.now();
  
  // Return cached content if still valid
  if (cachedContent && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedContent;
  }
  
  try {
    // Try loading from database first
    const content = await loadMegaMenuContentFromDB();
    cachedContent = content;
    cacheTimestamp = now;
    return content;
  } catch (error) {
    console.error('[MegaMenu] Database load failed, falling back to CSV');
    // Fallback to CSV
    const content = loadMegaMenuContentFromCSV();
    cachedContent = content;
    cacheTimestamp = now;
    return content;
  }
}

/**
 * Get mega menu content for a specific category
 */
export async function getMegaMenuContent(category: string): Promise<MegaMenuContent | null> {
  const contentMap = await loadMegaMenuContent();
  return contentMap.get(category) || null;
}

/**
 * Check if category has custom content
 */
export async function hasCustomContent(category: string): Promise<boolean> {
  const content = await getMegaMenuContent(category);
  return !!(content?.featuredImage || content?.quickLinks);
}

