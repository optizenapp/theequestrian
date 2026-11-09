import { sql } from '@/lib/db/vercel-postgres';
import { PRODUCT_FIELD_FLAGS, type ContentFields, type FieldValue } from './types';

type ProductField = keyof typeof PRODUCT_FIELD_FLAGS;

export type ProductCopy = { exists: boolean; values: ContentFields; flags: Record<string, boolean> };

const FIELDS = Object.keys(PRODUCT_FIELD_FLAGS) as ProductField[];

const isProductField = (f: string): f is ProductField => f in PRODUCT_FIELD_FLAGS;

export async function readProductCopy(handle: string): Promise<ProductCopy> {
  const columns = [...FIELDS, ...Object.values(PRODUCT_FIELD_FLAGS)].join(', ');
  const result = await sql.query(
    `SELECT ${columns} FROM product_content_overrides WHERE product_handle = $1 LIMIT 1`,
    [handle],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  const values: ContentFields = {};
  const flags: Record<string, boolean> = {};
  for (const field of FIELDS) {
    const raw = row?.[field];
    values[field] = field === 'bullet_points'
      ? (Array.isArray(raw) ? raw.map(String) : [])
      : ((raw as string | null | undefined) ?? null);
    flags[PRODUCT_FIELD_FLAGS[field]] = Boolean(row?.[PRODUCT_FIELD_FLAGS[field]]);
  }
  return { exists: Boolean(row), values, flags };
}

function toColumnValue(field: ProductField, value: FieldValue): string | null {
  if (field === 'bullet_points') return JSON.stringify(Array.isArray(value) ? value : []);
  return typeof value === 'string' ? value : null;
}

/**
 * Upsert the given override fields and set each field's render flag.
 * `flags` overrides the flag values (used by undo to restore the previous state).
 */
export async function writeProductCopy(
  handle: string,
  fields: ContentFields,
  flags?: Record<string, boolean>,
): Promise<void> {
  const names = Object.keys(fields).filter(isProductField);
  if (names.length === 0) throw new Error('No editable fields to write');
  const columns: string[] = [];
  const params: Array<string | boolean | null> = [handle];
  for (const name of names) {
    params.push(toColumnValue(name, fields[name]));
    columns.push(name);
    const flag = PRODUCT_FIELD_FLAGS[name];
    params.push(flags ? Boolean(flags[flag]) : true);
    columns.push(flag);
  }
  const placeholders = columns.map((c, i) => `$${i + 2}${c === 'bullet_points' ? '::jsonb' : ''}`);
  const updates = columns.map((c) => `${c} = EXCLUDED.${c}`);
  await sql.query(
    `INSERT INTO product_content_overrides (product_id, product_handle, ${columns.join(', ')}, updated_at)
     VALUES ((SELECT id FROM products WHERE handle = $1 LIMIT 1), $1, ${placeholders.join(', ')}, NOW())
     ON CONFLICT (product_handle) DO UPDATE SET ${updates.join(', ')}, updated_at = NOW()`,
    params,
  );
}
