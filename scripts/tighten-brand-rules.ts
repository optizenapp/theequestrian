#!/usr/bin/tsx
/**
 * Rewrite brand SEO module rules to BRAND EQUALS + HANDLE STARTS_WITH only.
 * Avoids TITLE/HANDLE CONTAINS which cause heavy seq scans and Neon OOMs.
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const dir = resolve(process.cwd(), 'scripts', 'brand-seo-pages');
let changed = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
  const path = resolve(dir, file);
  const src = readFileSync(path, 'utf8');
  if (!src.includes('rules:')) continue;

  const handleMatch = src.match(/handle:\s*'([^']+)'/);
  const titleMatch = src.match(/title:\s*'([^']+)'/);
  if (!handleMatch || !titleMatch) continue;

  const handle = handleMatch[1];
  const crumb = src.match(/breadcrumb_label:\s*'([^']+)'/);
  const display = (crumb?.[1] || titleMatch[1]).replace(/^Shop\s+/i, '').trim();
  const esc = display.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const newRules = `  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: '${esc}' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: '${handle}-' },
  ],`;

  const next = src.replace(/  rules: \[[\s\S]*?\],\n/, `${newRules}\n`);
  if (next !== src) {
    writeFileSync(path, next);
    changed += 1;
    console.log('updated', handle);
  }
}

console.log(`changed=${changed}`);
