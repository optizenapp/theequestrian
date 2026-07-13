#!/usr/bin/tsx
/**
 * Set logo_url on brand SEO modules when public/brands/logos/{handle}.png exists.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const logosDir = resolve(process.cwd(), 'public', 'brands', 'logos');
const modulesDir = resolve(process.cwd(), 'scripts', 'brand-seo-pages');
let changed = 0;

for (const file of readdirSync(modulesDir).filter((f) => f.endsWith('.ts'))) {
  const handle = file.replace(/\.ts$/, '');
  const logoPath = resolve(logosDir, `${handle}.png`);
  if (!existsSync(logoPath)) continue;

  const modulePath = resolve(modulesDir, file);
  let src = readFileSync(modulePath, 'utf8');
  const logoUrl = `/brands/logos/${handle}.png`;

  if (src.includes(`logo_url: '${logoUrl}'`) || src.includes(`logo_url: "${logoUrl}"`)) {
    continue;
  }

  if (/logo_url:\s*'[^']*'/.test(src)) {
    src = src.replace(/logo_url:\s*'[^']*'/, `logo_url: '${logoUrl}'`);
  } else if (/breadcrumb_label:\s*'[^']*',/.test(src)) {
    src = src.replace(
      /(breadcrumb_label:\s*'[^']*',)/,
      `$1\n  logo_url: '${logoUrl}',`
    );
  } else if (/title:\s*'[^']*',/.test(src)) {
    src = src.replace(/(title:\s*'[^']*',)/, `$1\n  logo_url: '${logoUrl}',`);
  } else {
    console.log(`[skip] ${handle} — no insert point`);
    continue;
  }

  writeFileSync(modulePath, src);
  changed += 1;
  console.log(`[ok] ${handle}`);
}

console.log(`changed=${changed}`);
