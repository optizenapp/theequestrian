/**
 * Product Bullet Points Utility
 * 
 * Loads and caches product-specific bullet points from CSV
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface BulletPointRow {
  product_id: string;
  handle: string;
  title: string;
  vendor: string;
  product_type: string;
  bullet_1: string;
  bullet_2: string;
  bullet_3: string;
  confidence_score: string;
  generated_date: string;
  needs_review: string;
  reasoning: string;
}

// In-memory cache
let bulletPointsCache: Map<string, string[]> | null = null;
let lastLoadTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Default fallback bullets
const DEFAULT_BULLETS = [
  'Premium quality materials for long-lasting durability and comfort',
  'Expertly designed for optimal performance in all conditions',
  'Trusted by professionals and enthusiasts worldwide',
];

/**
 * Find the most recent bullet points CSV file
 */
function findLatestCSV(): string | null {
  const exportsDir = path.join(process.cwd(), 'exports');
  
  if (!fs.existsSync(exportsDir)) {
    return null;
  }

  try {
    const files = fs.readdirSync(exportsDir)
      .filter(f => f.startsWith('product-bullet-points-') && f.endsWith('.csv'))
      .filter(f => !f.includes('progress'))
      .sort()
      .reverse();

    return files.length > 0 ? path.join(exportsDir, files[0]) : null;
  } catch (error) {
    console.error('[BulletPoints] Error finding CSV:', error);
    return null;
  }
}

/**
 * Load bullet points from CSV file
 */
function loadBulletPointsFromCSV(): Map<string, string[]> {
  const csvPath = findLatestCSV();
  
  // Check if file exists
  if (!csvPath || !fs.existsSync(csvPath)) {
    console.warn(`[BulletPoints] CSV file not found`);
    return new Map();
  }

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as BulletPointRow[];

    const bulletMap = new Map<string, string[]>();

    for (const row of records) {
      // Use product ID as primary key (more reliable than handle)
      const bullets = [
        row.bullet_1,
        row.bullet_2,
        row.bullet_3,
      ].filter(b => b && b.length > 0);

      if (bullets.length === 3) {
        bulletMap.set(row.product_id, bullets);
        // Also index by handle for convenience
        bulletMap.set(row.handle, bullets);
      }
    }

    console.log(`[BulletPoints] Loaded ${records.length} products from CSV`);
    return bulletMap;
  } catch (error) {
    console.error('[BulletPoints] Error loading CSV:', error);
    return new Map();
  }
}

/**
 * Get bullet points cache (with TTL)
 */
function getBulletPointsCache(): Map<string, string[]> {
  const now = Date.now();
  
  // Check if cache needs refresh
  if (!bulletPointsCache || (now - lastLoadTime) > CACHE_TTL) {
    bulletPointsCache = loadBulletPointsFromCSV();
    lastLoadTime = now;
  }

  return bulletPointsCache;
}

/**
 * Get bullet points for a product by ID or handle
 * 
 * @param productIdOrHandle - Shopify product ID (gid://shopify/Product/123) or handle
 * @returns Array of 3 bullet points, or default bullets if not found
 */
export function getProductBulletPoints(productIdOrHandle: string): string[] {
  const cache = getBulletPointsCache();
  
  // Try to find by ID or handle
  const bullets = cache.get(productIdOrHandle);
  
  if (bullets && bullets.length === 3) {
    return bullets;
  }

  // Fallback to default bullets
  return DEFAULT_BULLETS;
}

/**
 * Get bullet points for multiple products (batch)
 * 
 * @param productIds - Array of product IDs or handles
 * @returns Map of product ID/handle to bullet points
 */
export function getProductBulletPointsBatch(productIds: string[]): Map<string, string[]> {
  const cache = getBulletPointsCache();
  const results = new Map<string, string[]>();

  for (const id of productIds) {
    const bullets = cache.get(id) || DEFAULT_BULLETS;
    results.set(id, bullets);
  }

  return results;
}

/**
 * Check if product has custom bullet points
 * 
 * @param productIdOrHandle - Shopify product ID or handle
 * @returns true if custom bullets exist, false if using defaults
 */
export function hasCustomBulletPoints(productIdOrHandle: string): boolean {
  const cache = getBulletPointsCache();
  return cache.has(productIdOrHandle);
}

/**
 * Get statistics about loaded bullet points
 */
export function getBulletPointsStats(): {
  totalProducts: number;
  cacheAge: number;
  lastLoaded: Date;
} {
  const cache = getBulletPointsCache();
  
  return {
    totalProducts: cache.size / 2, // Divided by 2 because we index by both ID and handle
    cacheAge: Date.now() - lastLoadTime,
    lastLoaded: new Date(lastLoadTime),
  };
}

/**
 * Force reload of bullet points from CSV
 * (useful for development or after CSV updates)
 */
export function reloadBulletPoints(): void {
  bulletPointsCache = null;
  lastLoadTime = 0;
  console.log('[BulletPoints] Cache cleared, will reload on next request');
}
