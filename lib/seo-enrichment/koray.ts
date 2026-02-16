export const KORAY_FRAMEWORK_REFERENCE = `
KorayTugberkGubur_SemanticSEO_Principles:
1) Single macro context per page with no contextual drift.
2) Use heading clusters that mirror real user questions and sub-intents.
3) Prefer extractive-answer style blocks after major headings.
4) Ensure complete Entity-Attribute-Value coverage for commercial entities.
5) Build topical authority with hub-spoke internal linking across related nodes.
6) Keep lexical semantics rich (hypernyms, hyponyms, related entities) without stuffing.
7) Prioritize factual, verifiable statements over generic marketing language.
8) Align document template to dominant SERP intent.
9) Improve information retrieval cost: concise structure, clear headings, schema-aligned sections.
10) Optimize both initial ranking and re-ranking satisfaction signals (completeness, clarity, usefulness).
`;

export function buildKoraySystemPrompt(baseRole: string, extraRules: string[] = []): string {
  const extras = extraRules.length ? `\nAdditionalRules:\n- ${extraRules.join('\n- ')}` : '';
  return `${baseRole}

You are trained in Koray Tugberk Gubur's Semantic SEO framework.
Apply this reference directly when creating output:
${KORAY_FRAMEWORK_REFERENCE}${extras}

Return JSON only. No markdown, no commentary.`;
}

export function buildKoraySystemPromptWithSelection(
  baseRole: string,
  selectedRuleBlock: string,
  extraRules: string[] = []
): string {
  const extras = extraRules.length ? `\nAdditionalRules:\n- ${extraRules.join('\n- ')}` : '';
  return `${baseRole}

You are trained in Koray Tugberk Gubur's Semantic SEO framework.
Use the selected rule set below as mandatory context:
${selectedRuleBlock}${extras}

Return JSON only. No markdown, no commentary.`;
}

