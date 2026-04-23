import { sql } from '@/lib/db/client';

type RollupUpdateRow = { handle: string; parentBrand: string; hubHandle: string };

const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function applyMappedBrandRows(rows: RollupUpdateRow[]): Promise<Set<string>> {
  const matched = new Set<string>();
  for (const group of chunk(rows, CHUNK_SIZE)) {
    const payload = JSON.stringify(group);
    const updated = (await sql`
      WITH data AS (
        SELECT *
        FROM json_to_recordset(${payload}::json)
          AS t(handle text, "parentBrand" text, "hubHandle" text)
      )
      UPDATE products p
      SET brand = d."parentBrand",
          brand_hub_handle = d."hubHandle",
          updated_at = NOW()
      FROM data d
      WHERE p.handle = d.handle
      RETURNING p.handle
    `) as unknown as Array<{ handle: string }>;
    for (const r of updated) matched.add(r.handle);
  }
  return matched;
}

export async function clearBrandRows(handles: string[]): Promise<Set<string>> {
  const matched = new Set<string>();
  for (const group of chunk(handles, CHUNK_SIZE)) {
    const cleared = (await sql`
      UPDATE products
      SET brand = NULL,
          brand_hub_handle = NULL,
          updated_at = NOW()
      WHERE handle = ANY(${group})
      RETURNING handle
    `) as unknown as Array<{ handle: string }>;
    for (const r of cleared) matched.add(r.handle);
  }
  return matched;
}
