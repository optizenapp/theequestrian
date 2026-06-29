function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 2)
  );
}

/** Extract "Attribute: value" pairs from plain text or HTML. */
export function extractAttributeValues(text: string): Array<{ attribute: string; value: string }> {
  const plain = stripHtml(text);
  const pairs: Array<{ attribute: string; value: string }> = [];
  const pattern = /([A-Za-z][A-Za-z0-9\s\/\-]{1,40}):\s*([^.;!\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(plain)) !== null) {
    const attribute = match[1].trim();
    const value = match[2].trim();
    if (attribute.length >= 2 && value.length >= 2) {
      pairs.push({ attribute, value });
    }
  }
  return pairs;
}

function valuePresentInSource(value: string, sourceTokens: Set<string>, sourceText: string): boolean {
  const normalisedValue = value.toLowerCase().trim();
  if (sourceText.toLowerCase().includes(normalisedValue)) return true;

  const valueTokens = [...tokenise(value)].filter((t) => t.length > 2);
  if (valueTokens.length === 0) return true;
  const matched = valueTokens.filter((t) => sourceTokens.has(t)).length;
  return matched / valueTokens.length >= 0.6;
}

export interface FactFidelityResult {
  passed: boolean;
  unsourcedClaims: string[];
  checkedPairs: number;
}

/**
 * Hard gate: every attribute value in augment HTML must be grounded in vendor source text.
 */
export function evaluateFactFidelity(augmentHtml: string, vendorDescription: string): FactFidelityResult {
  const sourceText = stripHtml(vendorDescription);
  const sourceTokens = tokenise(sourceText);
  const pairs = extractAttributeValues(augmentHtml);
  const unsourcedClaims: string[] = [];

  for (const pair of pairs) {
    if (!valuePresentInSource(pair.value, sourceTokens, sourceText)) {
      unsourcedClaims.push(`${pair.attribute}: ${pair.value}`);
    }
  }

  return {
    passed: unsourcedClaims.length === 0,
    unsourcedClaims,
    checkedPairs: pairs.length,
  };
}
