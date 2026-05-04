import { sql } from '@vercel/postgres';
import type {
  AutoCampaignEnabledTypes,
  AutoCampaignResendConfig,
  AutoCampaignRotation,
  AutoCampaignSelections,
  AutoCampaignSlot,
  AutoCampaignTemplatesByType,
} from './types';
import { DEFAULT_AUTO_CAMPAIGN_SLOTS, DEFAULT_CATEGORY_POOL } from './constants';

const KEY_SLOTS = 'auto_campaigns_slots';
const KEY_CATEGORY_POOL = 'auto_campaigns_category_pool';
const KEY_ROTATION = 'auto_campaigns_rotation';
const KEY_RESEND = 'auto_campaigns_resend';
const KEY_TEMPLATES_BY_TYPE = 'auto_campaigns_templates_by_type';
const KEY_ENABLED_TYPES = 'auto_campaigns_enabled_types';
const KEY_SELECTIONS = 'auto_campaigns_selections';
const ON_SALE_COLLECTION_HANDLE = 'on-sale';

async function getJson(key: string): Promise<Record<string, unknown> | null> {
  const result = await sql`
    SELECT value FROM email_platform_config WHERE key = ${key} LIMIT 1
  `;
  const row = result.rows[0];
  return (row?.value as Record<string, unknown>) ?? null;
}

async function setJson(key: string, value: Record<string, unknown>): Promise<void> {
  const valueStr = JSON.stringify(value);
  await sql`
    INSERT INTO email_platform_config (key, value, updated_at)
    VALUES (${key}, ${valueStr}::jsonb, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = ${valueStr}::jsonb, updated_at = NOW()
  `;
}

function parseSlots(raw: unknown): AutoCampaignSlot[] {
  if (!Array.isArray(raw)) return [...DEFAULT_AUTO_CAMPAIGN_SLOTS];
  const out: AutoCampaignSlot[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const type = o.type;
    const weekday = Number(o.weekday);
    const hour = Number(o.hour);
    const minuteRaw = o.minute;
    const minute = minuteRaw === 30 ? 30 : 0;
    if ((type === 'brand' || type === 'on_sale' || type === 'category') && weekday >= 0 && weekday <= 6 && hour >= 0 && hour <= 23) {
      out.push({ type, weekday, hour, minute });
    }
  }
  return out.length > 0 ? out : [...DEFAULT_AUTO_CAMPAIGN_SLOTS];
}

export async function getAutoCampaignSlots(): Promise<AutoCampaignSlot[]> {
  const row = await getJson(KEY_SLOTS);
  return parseSlots(row?.slots);
}

export async function setAutoCampaignSlots(slots: AutoCampaignSlot[]): Promise<void> {
  await setJson(KEY_SLOTS, { slots });
}

export async function getAutoCampaignCategoryPool(): Promise<string[]> {
  const row = await getJson(KEY_CATEGORY_POOL);
  const paths = row?.paths;
  if (!Array.isArray(paths)) return [...DEFAULT_CATEGORY_POOL];
  const list = sanitizeCategoryHandles(paths);
  return list.length > 0 ? list : [...DEFAULT_CATEGORY_POOL];
}

export async function setAutoCampaignCategoryPool(paths: string[]): Promise<void> {
  await setJson(KEY_CATEGORY_POOL, { paths: sanitizeCategoryHandles(paths) });
}

export function sanitizeCategoryHandles(paths: unknown[]): string[] {
  return paths
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .map((p) => p.trim())
    .filter((p) => p !== ON_SALE_COLLECTION_HANDLE);
}

export async function getAutoCampaignRotation(): Promise<AutoCampaignRotation> {
  const row = await getJson(KEY_ROTATION);
  return {
    brandIndex: Math.max(0, Number(row?.brandIndex ?? 0) || 0),
    categoryIndex: Math.max(0, Number(row?.categoryIndex ?? 0) || 0),
  };
}

export async function setAutoCampaignRotation(rotation: AutoCampaignRotation): Promise<void> {
  await setJson(KEY_ROTATION, {
    brandIndex: rotation.brandIndex,
    categoryIndex: rotation.categoryIndex,
  });
}

export async function getAutoCampaignResendConfig(): Promise<AutoCampaignResendConfig> {
  const row = await getJson(KEY_RESEND);
  return {
    enabled: row?.enabled !== false,
    delayHours: Math.min(168, Math.max(1, Number(row?.delayHours ?? 24) || 24)),
    maxWaves: Math.min(3, Math.max(1, Number(row?.maxWaves ?? 1) || 1)),
  };
}

export async function setAutoCampaignResendConfig(input: AutoCampaignResendConfig): Promise<void> {
  await setJson(KEY_RESEND, {
    enabled: input.enabled,
    delayHours: input.delayHours,
    maxWaves: input.maxWaves,
  });
}

export async function getAutoCampaignTemplatesByType(): Promise<AutoCampaignTemplatesByType> {
  const row = await getJson(KEY_TEMPLATES_BY_TYPE);
  const pick = (k: string) => {
    const v = row?.[k];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  return {
    brand: pick('brand'),
    on_sale: pick('on_sale'),
    category: pick('category'),
  };
}

export async function setAutoCampaignTemplatesByType(input: AutoCampaignTemplatesByType): Promise<void> {
  await setJson(KEY_TEMPLATES_BY_TYPE, {
    brand: input.brand ?? '',
    on_sale: input.on_sale ?? '',
    category: input.category ?? '',
  });
}

export async function getAutoCampaignEnabledTypes(): Promise<AutoCampaignEnabledTypes> {
  const row = await getJson(KEY_ENABLED_TYPES);
  return {
    brand: row?.brand !== false,
    on_sale: row?.on_sale !== false,
    category: row?.category !== false,
  };
}

export async function setAutoCampaignEnabledTypes(input: AutoCampaignEnabledTypes): Promise<void> {
  await setJson(KEY_ENABLED_TYPES, {
    brand: input.brand,
    on_sale: input.on_sale,
    category: input.category,
  });
}

export async function getAutoCampaignSelections(): Promise<AutoCampaignSelections> {
  const row = await getJson(KEY_SELECTIONS);
  const brandHandle = typeof row?.brandHandle === 'string' && row.brandHandle.trim()
    ? row.brandHandle.trim()
    : null;
  const categoryCollectionHandle =
    typeof row?.categoryCollectionHandle === 'string' && row.categoryCollectionHandle.trim()
      ? row.categoryCollectionHandle.trim()
      : null;
  return {
    brandHandle,
    categoryCollectionHandle: categoryCollectionHandle === ON_SALE_COLLECTION_HANDLE ? null : categoryCollectionHandle,
  };
}

export async function setAutoCampaignSelections(input: AutoCampaignSelections): Promise<void> {
  await setJson(KEY_SELECTIONS, {
    brandHandle: input.brandHandle ?? '',
    categoryCollectionHandle: input.categoryCollectionHandle ?? '',
  });
}
