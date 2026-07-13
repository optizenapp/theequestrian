import type { NeonQueryFunction } from '@neondatabase/serverless';
import type { BrandInventory, BrandRule } from './types';

function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function buildRuleClause(rule: BrandRule): string | null {
  const column = rule.column.trim().toUpperCase();
  const relation = (rule.relation || 'EQUALS').trim().toUpperCase();
  const condition = rule.condition.trim();
  if (!condition) return null;
  const escaped = escapeLiteral(condition.toLowerCase());

  if (column === 'BRAND') {
    return `LOWER(TRIM(COALESCE(p.brand, ''))) = '${escaped}'`;
  }
  if (column === 'TITLE') {
    return relation === 'EQUALS'
      ? `LOWER(COALESCE(p.title, '')) = '${escaped}'`
      : `LOWER(COALESCE(p.title, '')) LIKE '%${escaped}%'`;
  }
  if (column === 'HANDLE') {
    if (relation === 'STARTS_WITH') return `LOWER(COALESCE(p.handle, '')) LIKE '${escaped}%'`;
    return relation === 'EQUALS'
      ? `LOWER(COALESCE(p.handle, '')) = '${escaped}'`
      : `LOWER(COALESCE(p.handle, '')) LIKE '%${escaped}%'`;
  }
  return null;
}

/** Default allocation rules — BRAND + HANDLE prefix only (index-friendly, avoids OOM). */
export function proposeRules(inventory: BrandInventory): BrandRule[] {
  return [
    { column: 'BRAND', relation: 'EQUALS', condition: inventory.displayName },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: `${inventory.handle}-` },
  ];
}

/** Count products matching proposed rules (OR semantics, mirrors brand PLP). */
export async function countRuleMatches(
  sql: NeonQueryFunction<false, false>,
  rules: BrandRule[]
): Promise<number> {
  const clauses = rules.map(buildRuleClause).filter(Boolean) as string[];
  if (clauses.length === 0) return 0;
  const where = clauses.map((c) => `(${c})`).join(' OR ');
  const rows = (await sql.query(
    `SELECT COUNT(*)::int AS cnt FROM products p WHERE ${where}`
  )) as Array<{ cnt: number }>;
  return Number(rows[0]?.cnt ?? 0);
}
