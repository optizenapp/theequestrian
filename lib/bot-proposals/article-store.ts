import { sql } from '@/lib/db/vercel-postgres';
import { ARTICLE_FIELDS, type ContentFields, type FieldValue } from './types';

type ArticleField = (typeof ARTICLE_FIELDS)[number];

const isArticleField = (f: string): f is ArticleField =>
  (ARTICLE_FIELDS as readonly string[]).includes(f);

/** Current meta values for a news article; null when the slug does not exist. */
export async function readArticleCopy(slug: string): Promise<ContentFields | null> {
  const result = await sql.query(
    `SELECT meta_title, meta_description FROM article WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const fields: ContentFields = {};
  for (const field of ARTICLE_FIELDS) {
    fields[field] = (row[field] as string | null | undefined) ?? null;
  }
  return fields;
}

function toColumnValue(value: FieldValue): string | null {
  return typeof value === 'string' ? value : null;
}

/** Update only the given article meta fields. Never creates a row. */
export async function writeArticleCopy(slug: string, fields: ContentFields): Promise<void> {
  const names = Object.keys(fields).filter(isArticleField);
  if (names.length === 0) throw new Error('No editable fields to write');
  const sets = names.map((name, i) => `${name} = $${i + 2}`);
  const values = names.map((name) => toColumnValue(fields[name]));
  const result = await sql.query(
    `UPDATE article SET ${sets.join(', ')}, updated_at = NOW() WHERE slug = $1 RETURNING slug`,
    [slug, ...values],
  );
  if (result.rows.length === 0) throw new Error(`article row not found for ${slug}`);
}
