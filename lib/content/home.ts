/**
 * Home Page Content Management
 *
 * Reads homepage section configuration from `exports/home-sections.csv`.
 * - In development: reloads on every request (or when file changes)
 * - In production: caches and only reloads when CSV mtime changes (per instance)
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { sql } from '@/lib/db/client';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
 
export type HomeSectionType =
  | 'hero'
  | 'trust_signals'
  | 'most_wanted_carousel'
  | 'most_wanted_grid'
  | 'best_deals_slider'
  | 'signup'
  | 'recent_articles'
  | 'faqs'
  | 'seen_in';
 
export interface HomeMostWantedItem {
  title: string;
  price: string;
  rating: string;
  tag: string;
  image: string;
}

// New: Just store product handles, fetch real data from Shopify
export type ProductHandle = string;
 
export interface HomeFaqItem {
  question: string;
  answer: string;
}

export interface HomeSliderItem {
  label: string;
  image: string;
  title: string;
  price: string;
  saving: string;
  detail: string;
}

export interface HomeSection {
  key: string;
  type: HomeSectionType;
  enabled: boolean;
  sort_order: number;
 
  eyebrow?: string;
  title_html?: string;
  subtitle_html?: string;
  body_html?: string;
 
  cta_text?: string;
  cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
 
  // Optional media (section-level image)
  image_url?: string;
  image_alt?: string;
  image_link?: string;
 
  // Section-specific payloads
  most_wanted_items?: HomeMostWantedItem[];
  product_handles?: ProductHandle[]; // New: Array of product handles to fetch from Shopify
  faqs?: HomeFaqItem[];
  seen_in?: string[];
  items?: HomeSliderItem[];
}
 
interface CsvRow {
  key: string;
  type: string;
  enabled?: string | boolean; // Can be string from CSV or boolean from DB
  sort_order?: string | number; // Can be string from CSV or number from DB
 
  eyebrow?: string;
  title_html?: string;
  subtitle_html?: string;
  body_html?: string;
 
  cta_text?: string;
  cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
 
  image_url?: string;
  image_alt?: string;
  image_link?: string;
 
  most_wanted_items_json?: string;
  product_handles?: string; // New: Comma-separated product handles
  faqs_json?: string;
  seen_in_json?: string;
  items_json?: string;
}
 
let cachedSections: HomeSection[] | null = null;
let lastModified: number | null = null;
let lastDbRead: number | null = null;
 
function safeJsonParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}
 
function toBool(value: string | boolean | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  // Handle boolean values from database
  if (typeof value === 'boolean') return value;
  // Handle string values from CSV
  const v = value.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'y') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'n') return false;
  return defaultValue;
}
 
function toInt(value: string | number | undefined, defaultValue: number): number {
  if (value == null) return defaultValue;
  // Handle number values from database
  if (typeof value === 'number') return Number.isFinite(value) ? value : defaultValue;
  // Handle string values from CSV
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : defaultValue;
}
 
function normalizeSectionType(type: string): HomeSectionType | null {
  const t = type.trim() as HomeSectionType;
  switch (t) {
    case 'hero':
    case 'trust_signals':
    case 'most_wanted_carousel':
    case 'most_wanted_grid':
    case 'best_deals_slider':
    case 'signup':
    case 'recent_articles':
    case 'faqs':
    case 'seen_in':
      return t;
    default:
      return null;
  }
}
 
async function ensureHomeSectionsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS home_sections (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      eyebrow TEXT,
      title_html TEXT,
      subtitle_html TEXT,
      body_html TEXT,
      cta_text TEXT,
      cta_link TEXT,
      secondary_cta_text TEXT,
      secondary_cta_link TEXT,
      image_url TEXT,
      image_alt TEXT,
      image_link TEXT,
      most_wanted_items_json JSONB,
      product_handles TEXT,
      faqs_json JSONB,
      seen_in_json JSONB,
      items_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

function parseRows(records: CsvRow[]): HomeSection[] {
  const sections: HomeSection[] = [];

  for (const row of records) {
    const key = (row.key || '').trim();
    const type = normalizeSectionType(row.type || '');
    if (!key || !type) continue;

    const enabled = toBool(row.enabled, true);
    const sort_order = toInt(row.sort_order, 0);

    const section: HomeSection = {
      key,
      type,
      enabled,
      sort_order,
      eyebrow: row.eyebrow?.trim() || undefined,
      title_html: row.title_html?.trim() || undefined,
      subtitle_html: row.subtitle_html?.trim() || undefined,
      body_html: row.body_html?.trim() || undefined,
      cta_text: row.cta_text?.trim() || undefined,
      cta_link: row.cta_link?.trim() || undefined,
      secondary_cta_text: row.secondary_cta_text?.trim() || undefined,
      secondary_cta_link: row.secondary_cta_link?.trim() || undefined,
      image_url: row.image_url?.trim() || undefined,
      image_alt: row.image_alt?.trim() || undefined,
      image_link: row.image_link?.trim() || undefined,
    };

    if (type === 'most_wanted_carousel' || type === 'most_wanted_grid' || type === 'best_deals_slider') {
      if (row.product_handles) {
        const handles = row.product_handles
          .split(',')
          .map(h => h.trim())
          .filter(h => h.length > 0);
        section.product_handles = handles;
      } else if (row.most_wanted_items_json) {
        const items = safeJsonParse<HomeMostWantedItem[]>(row.most_wanted_items_json, []);
        section.most_wanted_items = Array.isArray(items) ? items : [];
      }
    }

    if (type === 'faqs') {
      const faqs = safeJsonParse<HomeFaqItem[]>(row.faqs_json, []);
      section.faqs = Array.isArray(faqs) ? faqs : [];
    }

    if (type === 'seen_in') {
      const seen = safeJsonParse<string[]>(row.seen_in_json, []);
      section.seen_in = Array.isArray(seen) ? seen : [];
    }

    if (type === 'best_deals_slider') {
      const items = safeJsonParse<HomeSliderItem[]>(row.items_json, []);
      section.items = Array.isArray(items) ? items : [];
    }

    sections.push(section);
  }

  return sections;
}

function loadHomeSectionsFromCsv(): HomeSection[] {
  const csvPath = path.join(process.cwd(), 'exports', 'home-sections.csv');
 
  if (!fs.existsSync(csvPath)) {
    // No CSV → no custom sections (page can fallback to defaults)
    return [];
  }
 
  const stats = fs.statSync(csvPath);
  const currentModified = stats.mtimeMs;
  const isDevelopment = process.env.NODE_ENV === 'development';
 
  if (!isDevelopment && cachedSections && lastModified === currentModified) {
    return cachedSections;
  }
 
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];
 
  const sections = parseRows(records);
 
  const normalized = sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.sort_order - b.sort_order);
 
  cachedSections = normalized;
  lastModified = currentModified;
 
  if (!isDevelopment && process.env.NODE_ENV === 'production') {
    console.log(`[Home Content] Loaded ${normalized.length} enabled sections from CSV`);
  }
 
  return normalized;
}
 
export async function getHomeSections(): Promise<HomeSection[]> {
  const now = Date.now();
  if (cachedSections && lastDbRead && now - lastDbRead < CACHE_TTL_MS) {
    return cachedSections;
  }

  try {
    await ensureHomeSectionsTable();
    const result = await sql`
      SELECT
        key,
        type,
        enabled,
        sort_order,
        eyebrow,
        title_html,
        subtitle_html,
        body_html,
        cta_text,
        cta_link,
        secondary_cta_text,
        secondary_cta_link,
        image_url,
        image_alt,
        image_link,
        most_wanted_items_json,
        product_handles,
        faqs_json,
        seen_in_json,
        items_json
      FROM home_sections
      ORDER BY sort_order ASC
    `;

    if (result.length > 0) {
      const sections = parseRows(result as unknown as CsvRow[]);
      const normalized = sections
        .filter((s) => s.enabled)
        .sort((a, b) => a.sort_order - b.sort_order);
      cachedSections = normalized;
      lastDbRead = now;
      return normalized;
    }
  } catch (error) {
    console.error('[Home Sections] DB load error, falling back to CSV:', error);
  }

  const fallback = loadHomeSectionsFromCsv();
  cachedSections = fallback;
  lastDbRead = now;
  return fallback;
}
 
