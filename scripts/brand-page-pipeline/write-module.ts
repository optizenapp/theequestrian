import { writeFileSync } from 'fs';
import { resolve } from 'path';
import type { BrandSEOContent } from './types';

function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function formatFaqs(items: NonNullable<BrandSEOContent['faq_items']>): string {
  if (!items.length) return '  faq_items: [],\n';
  const body = items
    .map(
      (f) => `    {
      question: '${esc(f.question).replace(/'/g, "\\'")}',
      answer:
        '${esc(f.answer).replace(/'/g, "\\'")}',
    }`
    )
    .join(',\n');
  return `  faq_items: [\n${body},\n  ],\n`;
}

function formatRules(rules: NonNullable<BrandSEOContent['rules']>): string {
  const body = rules
    .map(
      (r) =>
        `    { column: '${r.column}', relation: '${r.relation || 'EQUALS'}', condition: '${esc(r.condition).replace(/'/g, "\\'")}' }`
    )
    .join(',\n');
  return `  rules: [\n${body},\n  ],\n`;
}

/** Write scripts/brand-seo-pages/<handle>.ts from BrandSEOContent. */
export function writeBrandModule(content: BrandSEOContent): string {
  const outPath = resolve(process.cwd(), 'scripts', 'brand-seo-pages', `${content.handle}.ts`);
  const logoLine = content.logo_url ? `  logo_url: '${esc(content.logo_url)}',\n` : '';

  const source = `import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: '${content.handle}',
  title: '${esc(content.title).replace(/'/g, "\\'")}',
  breadcrumb_label: '${esc(content.breadcrumb_label || content.title).replace(/'/g, "\\'")}',
${logoLine}${formatRules(content.rules || [])}
  meta_title: '${esc(content.meta_title).replace(/'/g, "\\'")}',
  meta_description:
    '${esc(content.meta_description).replace(/'/g, "\\'")}',
  h1_title: '${esc(content.h1_title).replace(/'/g, "\\'")}',

  quick_answer:
    '${esc(content.quick_answer || '').replace(/'/g, "\\'")}',

  short_description: \`${esc(content.short_description)}\`,

  long_description: \`${esc(content.long_description)}\`,

${formatFaqs(content.faq_items || [])}};

export default content;
`;

  writeFileSync(outPath, source, 'utf8');
  return outPath;
}
