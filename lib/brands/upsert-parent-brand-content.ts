import { sql } from '@/lib/db/client';
import { ensureBrandRuleInRulesJson } from '@/lib/brands/merge-brand-rules';
import type { ParentBrandResolution } from '@/lib/brands/resolve-parent-brand-hub';

/**
 * Ensures `brand_content` has a row at the resolved hub handle with a BRAND rule
 * for `parent` (OR'd with existing rules). New rows get safe SEO defaults.
 */
export async function upsertBrandContentForParentResolution(
  parent: string,
  res: ParentBrandResolution,
  dryRun: boolean
): Promise<'insert' | 'update' | 'noop'> {
  const hub = res.hubHandle;
  const existing = (await sql`
    SELECT handle, rules FROM brand_content WHERE handle = ${hub} LIMIT 1
  `) as unknown as Array<{ handle: string; rules: string | null }>;

  if (existing.length > 0) {
    const merged = ensureBrandRuleInRulesJson(existing[0].rules, parent);
    const prev = (existing[0].rules ?? '').trim();
    if (merged === prev) return 'noop';
    if (!dryRun) {
      await sql`
        UPDATE brand_content SET rules = ${merged}, updated_at = NOW() WHERE handle = ${hub}
      `;
    }
    return 'update';
  }

  const metaTitle = `${parent} | The Equestrian`;
  const metaDescription = `Shop ${parent} at The Equestrian.`;
  const shortDescription = `Browse ${parent} products.`;
  const longDescription = `<h2>${parent}</h2><p>Shop ${parent} at The Equestrian.</p>`;
  const rules = JSON.stringify([{ column: 'BRAND', relation: 'EQUALS', condition: parent }]);

  if (dryRun) return 'insert';

  await sql`
    INSERT INTO brand_content (
      handle, title, products_count, rules, h1_title, meta_title, meta_description,
      short_description, long_description, breadcrumb_label, faq_json, status, created_at, updated_at
    ) VALUES (
      ${hub}, ${parent}, 0, ${rules}, ${parent}, ${metaTitle}, ${metaDescription},
      ${shortDescription}, ${longDescription}, ${parent}, '[]', 'published', NOW(), NOW()
    )
  `;
  return 'insert';
}

export async function upsertAllParentBrandContent(
  parentToResolution: Map<string, ParentBrandResolution>,
  dryRun: boolean
): Promise<{ inserts: number; updates: number; noops: number }> {
  let inserts = 0;
  let updates = 0;
  let noops = 0;
  for (const [parent, res] of parentToResolution) {
    const r = await upsertBrandContentForParentResolution(parent, res, dryRun);
    if (r === 'insert') inserts++;
    else if (r === 'update') updates++;
    else noops++;
  }
  return { inserts, updates, noops };
}
