import { sql } from '@/lib/db/vercel-postgres';
import { COPY_FIELDS, type ContentFields, type FaqItem, type FieldValue } from './types';

type CopyTable = 'collection_content' | 'brand_content';

const TABLES: Record<'category' | 'brand', { table: CopyTable; keyColumn: string; faqColumn: string }> = {
  category: { table: 'collection_content', keyColumn: 'url_path', faqColumn: 'faq_items' },
  brand: { table: 'brand_content', keyColumn: 'handle', faqColumn: 'faq_json' },
};

function parseFaqs(value: unknown): FaqItem[] {
  try {
    const parsed: unknown = typeof value === 'string' ? JSON.parse(value || '[]') : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
      .map((f) => ({ question: String(f.question ?? ''), answer: String(f.answer ?? '') }));
  } catch {
    return [];
  }
}

/** Current values of the copy fields; null when the row does not exist. */
export async function readCopy(type: 'category' | 'brand', key: string): Promise<ContentFields | null> {
  const { table, keyColumn, faqColumn } = TABLES[type];
  const result = await sql.query(
    `SELECT h1_title, meta_title, meta_description, short_description, long_description,
       ${faqColumn} AS faqs FROM ${table} WHERE ${keyColumn} = $1 LIMIT 1`,
    [key],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const fields: ContentFields = {};
  for (const field of COPY_FIELDS) {
    fields[field] = field === 'faq_items' ? parseFaqs(row.faqs) : ((row[field] as string | null) ?? null);
  }
  return fields;
}

function toColumnValue(field: string, value: FieldValue): string | null {
  if (field !== 'faq_items') return typeof value === 'string' ? value : null;
  return JSON.stringify(Array.isArray(value) ? value : []);
}

/** Update only the given copy fields. Never creates a row: a missing page is an error. */
export async function writeCopy(type: 'category' | 'brand', key: string, fields: ContentFields): Promise<void> {
  const { table, keyColumn, faqColumn } = TABLES[type];
  const names = Object.keys(fields).filter((f): f is (typeof COPY_FIELDS)[number] =>
    (COPY_FIELDS as readonly string[]).includes(f),
  );
  if (names.length === 0) throw new Error('No editable fields to write');
  const sets = names.map((name, i) => {
    const column = name === 'faq_items' ? faqColumn : name;
    const cast = column === 'faq_items' ? '::jsonb' : '';
    return `${column} = $${i + 2}${cast}`;
  });
  const values = names.map((name) => toColumnValue(name, fields[name]));
  const result = await sql.query(
    `UPDATE ${table} SET ${sets.join(', ')}, updated_at = NOW() WHERE ${keyColumn} = $1 RETURNING ${keyColumn}`,
    [key, ...values],
  );
  if (result.rows.length === 0) throw new Error(`${table} row not found for ${key}`);
}
