type BrandRule = { column?: string; relation?: string; condition?: string };

/**
 * Append a BRAND EQUALS rule when missing (rules are OR'd on brand PLPs).
 */
export function ensureBrandRuleInRulesJson(rulesJson: string | null | undefined, brandName: string): string {
  const want = brandName.trim();
  if (!want) return rulesJson?.trim() ? String(rulesJson) : '[]';

  let rules: BrandRule[] = [];
  if (rulesJson?.trim()) {
    try {
      const parsed = JSON.parse(rulesJson) as unknown;
      if (Array.isArray(parsed)) rules = parsed as BrandRule[];
    } catch {
      rules = [];
    }
  }
  const ln = want.toLowerCase();
  const has = rules.some(
    (r) =>
      String(r.column || '').toUpperCase() === 'BRAND' &&
      String(r.condition || '').trim().toLowerCase() === ln
  );
  if (has) return JSON.stringify(rules);
  return JSON.stringify([...rules, { column: 'BRAND', relation: 'EQUALS', condition: want }]);
}
