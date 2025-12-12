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
 
export interface HomeFaqItem {
  question: string;
  answer: string;
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
 
  // Section-specific payloads
  most_wanted_items?: HomeMostWantedItem[];
  faqs?: HomeFaqItem[];
  seen_in?: string[];
}
 
interface CsvRow {
  key: string;
  type: string;
  enabled?: string;
  sort_order?: string;
 
  eyebrow?: string;
  title_html?: string;
  subtitle_html?: string;
  body_html?: string;
 
  cta_text?: string;
  cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
 
  most_wanted_items_json?: string;
  faqs_json?: string;
  seen_in_json?: string;
}
 
let cachedSections: HomeSection[] | null = null;
let lastModified: number | null = null;
 
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
 
function toBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  const v = value.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'y') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'n') return false;
  return defaultValue;
}
 
function toInt(value: string | undefined, defaultValue: number): number {
  if (value == null) return defaultValue;
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
 
function loadHomeSections(): HomeSection[] {
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
    };
 
    if (type === 'most_wanted_carousel' || type === 'most_wanted_grid') {
      const items = safeJsonParse<HomeMostWantedItem[]>(row.most_wanted_items_json, []);
      section.most_wanted_items = Array.isArray(items) ? items : [];
    }
 
    if (type === 'faqs') {
      const faqs = safeJsonParse<HomeFaqItem[]>(row.faqs_json, []);
      section.faqs = Array.isArray(faqs) ? faqs : [];
    }
 
    if (type === 'seen_in') {
      const seen = safeJsonParse<string[]>(row.seen_in_json, []);
      section.seen_in = Array.isArray(seen) ? seen : [];
    }
 
    sections.push(section);
  }
 
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
 
export function getHomeSections(): HomeSection[] {
  return loadHomeSections();
}
 
