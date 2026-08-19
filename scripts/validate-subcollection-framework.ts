#!/usr/bin/env tsx
/**
 * Mechanical QC for a subcollection-framework content module.
 *
 *   npx tsx scripts/validate-subcollection-framework.ts --page horse-boots
 */
import { resolve } from 'path';
import type { PageSEOContent } from './run-page-seo-update';
import type { SubcollectionFrameworkNotes } from './lib/subcollection-framework';

const BANNED = [
  'elevate', 'unleash', 'ultimate', 'curated', 'embrace', 'dive into', 'must-have',
  'showstopper', 'jaw-dropping', 'look no further', "you're in the right place",
  'effortlessly', 'comfort meets style', 'turn heads', 'game-changer', 'discover',
];

function getSlug(): string {
  const idx = process.argv.indexOf('--page');
  if (idx === -1 || !process.argv[idx + 1]) {
    throw new Error('Usage: npx tsx scripts/validate-subcollection-framework.ts --page horse-boots');
  }
  return process.argv[idx + 1];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/<!--.*?-->/gs, ' ').replace(/\s+/g, ' ').trim();
}

function wordCount(html: string): number {
  const text = stripHtml(html);
  return text ? text.split(' ').length : 0;
}

function internalHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /<a\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const attrs = match[1];
    if (/\btarget\s*=\s*["']_blank["']/i.test(attrs)) {
      throw new Error(`Internal link uses target="_blank": ${attrs}`);
    }
    const href = attrs.match(/\bhref\s*=\s*["'](\/[^"'#?]*)["']/i);
    if (href?.[1] && !href[1].startsWith('//')) out.push(href[1]);
  }
  return out;
}

function fail(errors: string[]): void {
  if (!errors.length) return;
  throw new Error(['Subcollection framework validation failed:', ...errors.map((e) => ` - ${e}`)].join('\n'));
}

async function main() {
  const slug = getSlug();
  const mod = await import(resolve(process.cwd(), 'scripts', 'seo-pages', `${slug}.ts`));
  const content = (mod.default || mod) as PageSEOContent;
  const notes = mod.frameworkNotes as SubcollectionFrameworkNotes | undefined;
  const errors: string[] = [];

  if (!content?.h1_title?.trim()) errors.push('H1 is missing.');
  if (content.h1_title === content.meta_title) errors.push('H1 must differ from meta_title.');
  if ((content.meta_title || '').length > 65) {
    errors.push(`meta_title is ${content.meta_title.length} chars (max 65).`);
  }
  const descLen = (content.meta_description || '').length;
  if (descLen < 120 || descLen > 155) {
    errors.push(`meta_description is ${descLen} chars (need 120-155).`);
  }

  const introWords = wordCount(content.short_description || '');
  if (introWords < 80 || introWords > 120) {
    errors.push(`short_description is ${introWords} words (need 80-120).`);
  }
  if (!/<!--\s*read-more-trigger\s*-->/i.test(content.short_description || '')) {
    errors.push('short_description needs <!--read-more-trigger-->.');
  }

  const long = content.long_description || '';
  if (/<h[3-6]\b/i.test(long)) errors.push('long_description must not contain H3-H6.');
  if (/faq/i.test(long)) errors.push('FAQs must not appear in long_description.');
  const afterH2 = [...long.matchAll(/<\/h2>\s*(<\w+)/gi)];
  if (!afterH2.length) errors.push('No H2 headings found.');
  for (const m of afterH2) {
    if (m[1].toLowerCase() !== '<p') errors.push(`H2 must be followed by <p>, found ${m[1]}.`);
  }

  const combined = `${content.short_description}\n${long}`;
  const dashSource = `${content.meta_title}\n${content.meta_description}\n${combined}`.replace(
    /<!--[\s\S]*?-->/g,
    ' '
  );
  if (/[\u2013\u2014]|--/.test(dashSource)) {
    errors.push('Em dashes, en dashes or -- are not allowed.');
  }
  const lower = stripHtml(combined).toLowerCase();
  for (const phrase of BANNED) {
    if (lower.includes(phrase)) errors.push(`Banned phrase: "${phrase}".`);
  }

  const hrefs = internalHrefs(combined);
  const dup = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
  if (dup.length) errors.push(`Duplicate hrefs: ${[...new Set(dup)].join(', ')}`);
  const uniqueHrefCount = new Set(hrefs).size;
  if (uniqueHrefCount < 12 || uniqueHrefCount > 20) {
    errors.push(`Need 12-20 unique internal links, found ${uniqueHrefCount}.`);
  }
  if (!/<ul\b/i.test(long)) errors.push('long_description needs a <ul>.');

  const faqs = content.faq_items || [];
  if (faqs.length < 3 || faqs.length > 5) errors.push(`Need 3-5 FAQs, found ${faqs.length}.`);
  for (const faq of faqs) {
    if (/<a\b/i.test(faq.answer)) errors.push(`FAQ answer contains a link: ${faq.question}`);
    const words = wordCount(faq.answer);
    if (words < 40 || words > 70) errors.push(`FAQ "${faq.question}" is ${words} words (need 40-70).`);
  }

  if (!notes) errors.push('Missing frameworkNotes export.');
  else {
    if (notes.informationGain.length < 6 || notes.informationGain.length > 8) {
      errors.push(`Need 6-8 information-gain facts, found ${notes.informationGain.length}.`);
    }
    if (!notes.verifyBeforePublishing.length) errors.push('verifyBeforePublishing is empty.');
    const noteHrefs = notes.anchors.map((a) => a.href).sort().join('|');
    const liveHrefs = [...new Set(hrefs)].sort().join('|');
    if (noteHrefs !== liveHrefs) errors.push('frameworkNotes.anchors do not match HTML hrefs.');
  }

  fail(errors);
  console.log(`OK ${content.url_path}`);
  console.log(`  H1: ${content.h1_title}`);
  console.log(`  title ${content.meta_title.length}c / desc ${descLen}c / intro ${introWords}w / links ${hrefs.length}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
