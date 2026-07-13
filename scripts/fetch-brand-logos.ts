#!/usr/bin/tsx
/**
 * Fetch brand logos from curated official sites into public/brands/logos/{handle}.png
 * Usage: npx tsx scripts/fetch-brand-logos.ts [--handles a,b] [--brands-file path]
 */
import { config } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const OUT = resolve(process.cwd(), 'public', 'brands', 'logos');

/** Official homepage(s) to scrape for logo assets. */
const OFFICIAL_SITES: Record<string, string[]> = {
  heritage: ['https://www.heritageequestrian.com/', 'https://heritageboots.com/'],
  horze: ['https://www.horze.com.au/', 'https://www.horze.com/'],
  huntington: ['https://huntingtonfeed.com.au/', 'https://www.huntington.com.au/'],
  'joseph-lyddy': ['https://www.josephlyddy.com.au/'],
  kask: ['https://www.kask.com/', 'https://www.kask.com/en/'],
  kelato: ['https://kelato.com.au/', 'https://www.kelatoanimalhealth.com.au/'],
  'kep-italia': ['https://www.kepitalia.com/', 'https://www.kep-italia.com/'],
  'kohnkes-own': ['https://www.kohnkesown.com/'],
  'lami-cell': ['https://www.lamicell.com/', 'https://www.lami-cell.com/'],
  leovet: ['https://www.leovet.de/', 'https://www.leovet.com/'],
  magictails: ['https://magictails.com.au/', 'https://www.magictails.com/'],
  mattes: ['https://www.mattes-saddlepad.com/', 'https://www.steffenmattes.com/'],
  metalab: ['https://www.metalab.com/', 'https://metalab.horse/'],
  'noble-outfitters': ['https://www.nobleoutfitters.com/'],
  nrg: ['https://www.nrgteam.com.au/', 'https://nrgadditives.com.au/'],
  oregon: ['https://www.oregonhatco.com/', 'https://oregonhatcompany.com/'],
  paw: ['https://www.blackdog.com.au/collections/paw', 'https://www.pawbypet.com.au/'],
  prestige: ['https://www.prestigeitaly.com/', 'https://prestige-italia.com/'],
  'ps-of-sweden': ['https://www.psofsweden.com/'],
  ranvet: ['https://www.ranvet.com.au/'],
  roeckl: ['https://www.roeckl.com/', 'https://www.roeckl.de/'],
  shanga: ['https://shanga.com.au/', 'https://www.shanga.com/'],
  'shear-magic': ['https://www.shearmagic.com.au/', 'https://shearmagic.com/'],
  showcraft: ['https://www.showcraft.com.au/', 'https://showcraft.com/'],
  showmaster: ['https://www.kramer.de/', 'https://www.kramer.co.uk/'],
  sprenger: ['https://www.sprenger.de/', 'https://www.herm-sprenger.com/'],
  'stance-equitec': ['https://stanceequitec.com.au/', 'https://www.stanceglobal.com/'],
  tech: ['https://www.techstirrups.com/', 'https://techstirrups.com/'],
  'the-equestrian': ['https://www.theequestrian.com.au/'],
  thorowgood: ['https://www.thorowgood.com/'],
  toptac: ['https://www.toptac.com.au/', 'https://toptac.com/'],
  trolle: ['https://www.trolle.com/', 'https://trollecompany.com/'],
  troy: ['https://www.troyboots.com.au/', 'https://troy.com.au/'],
  trust: ['https://www.trust-equestrian.com/', 'https://www.trustequestrian.com/'],
  tucci: ['https://www.tucci.com/', 'https://tuccisrl.com/'],
  veredus: ['https://www.veredus.com/', 'https://veredusworld.com/'],
  vestrum: ['https://www.vestrum.com/'],
  vetsense: ['https://www.vetsense.com.au/'],
  virbac: ['https://au.virbac.com/', 'https://www.virbac.com.au/'],
  wahl: ['https://www.wahl.com/', 'https://www.wahlanimal.com/'],
  waldhausen: ['https://www.waldhausen.com/', 'https://www.waldhausen.de/'],
  'wild-horse': ['https://www.wildhorse.com.au/', 'https://wildhorseaustralia.com/'],
  woof: ['https://www.woofwear.com/', 'https://woofwear.com/'],
  zilco: ['https://www.zilco.com.au/', 'https://www.zilco.net/'],
};

function parseHandles(argv: string[]): string[] {
  const idx = argv.indexOf('--handles');
  if (idx !== -1 && argv[idx + 1]) {
    return argv[idx + 1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  const fileIdx = argv.indexOf('--brands-file');
  if (fileIdx !== -1 && argv[fileIdx + 1]) {
    return readFileSync(resolve(process.cwd(), argv[fileIdx + 1]), 'utf8')
      .split(/\r?\n/)
      .map((l) => l.split('\t')[0].trim())
      .filter((l) => l && !l.startsWith('#'));
  }
  return Object.keys(OFFICIAL_SITES);
}

function scoreUrl(url: string): number {
  const u = url.toLowerCase();
  let score = 0;
  if (u.includes('logo')) score += 50;
  if (u.includes('brand')) score += 20;
  if (u.includes('header')) score += 10;
  if (u.endsWith('.svg')) score += 15;
  if (u.endsWith('.png')) score += 10;
  if (u.includes('favicon') || u.includes('icon') || u.includes('sprite')) score -= 40;
  if (u.includes('banner') || u.includes('hero') || u.includes('product')) score -= 20;
  if (u.includes('facebook') || u.includes('instagram')) score -= 50;
  return score;
}

function extractImageUrls(html: string, base: string): string[] {
  const urls = new Set<string>();
  const re = /(?:src|href|content)=["']([^"']+\.(?:png|jpg|jpeg|webp|svg)[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      urls.add(new URL(m[1], base).href);
    } catch {
      /* ignore */
    }
  }
  const css = /url\((['"]?)([^)'"]+\.(?:png|jpg|jpeg|webp|svg)[^)'"]*)\1\)/gi;
  while ((m = css.exec(html))) {
    try {
      urls.add(new URL(m[2], base).href);
    } catch {
      /* ignore */
    }
  }
  return [...urls];
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheEquestrianLogoBot/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchBinary(url: string): Promise<{ buf: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheEquestrianLogoBot/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength < 400) return null;
    return { buf: Buffer.from(ab), contentType: res.headers.get('content-type') || '' };
  } catch {
    return null;
  }
}

function extFor(url: string, contentType: string): string {
  if (contentType.includes('svg') || url.includes('.svg')) return 'svg';
  if (contentType.includes('webp') || url.includes('.webp')) return 'webp';
  if (contentType.includes('jpeg') || contentType.includes('jpg') || url.includes('.jpg')) return 'jpg';
  return 'png';
}

async function findLogoForHandle(handle: string): Promise<string | null> {
  const sites = OFFICIAL_SITES[handle] || [];
  const candidates: Array<{ url: string; score: number }> = [];
  for (const site of sites) {
    const html = await fetchText(site);
    if (!html) continue;
    for (const url of extractImageUrls(html, site)) {
      candidates.push({ url, score: scoreUrl(url) });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const tried = new Set<string>();
  for (const c of candidates.slice(0, 25)) {
    if (c.score < 5 || tried.has(c.url)) continue;
    tried.add(c.url);
    const bin = await fetchBinary(c.url);
    if (!bin) continue;
    const ext = extFor(c.url, bin.contentType);
    // Always store as .png path for BrandLogo conventions; keep real bytes.
    const outPath = resolve(OUT, `${handle}.png`);
    writeFileSync(outPath, bin.buf);
    // If SVG/webp/jpg, still fine for next/image in most cases; rename if not png
    if (ext !== 'png') {
      const typed = resolve(OUT, `${handle}.${ext === 'jpg' ? 'png' : ext}`);
      if (typed !== outPath) {
        writeFileSync(typed === outPath ? outPath : outPath, bin.buf);
      }
    }
    console.log(`[ok] ${handle} <- ${c.url} (${bin.buf.length}b, score=${c.score})`);
    return outPath;
  }
  return null;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const handles = parseHandles(process.argv.slice(2));
  const force = process.argv.includes('--force');
  const failed: string[] = [];
  const skipped: string[] = [];
  const ok: string[] = [];

  for (const handle of handles) {
    const existing = resolve(OUT, `${handle}.png`);
    if (existsSync(existing) && !force) {
      console.log(`[skip] ${handle} logo already on disk`);
      skipped.push(handle);
      continue;
    }
    if (!OFFICIAL_SITES[handle]) {
      console.log(`[miss] ${handle} — no official site mapping`);
      failed.push(handle);
      continue;
    }
    const path = await findLogoForHandle(handle);
    if (path) ok.push(handle);
    else {
      console.log(`[fail] ${handle} — no logo found`);
      failed.push(handle);
    }
  }

  console.log('\n=== Logo fetch summary ===');
  console.log(`ok=${ok.length} skipped=${skipped.length} failed=${failed.length}`);
  if (failed.length) console.log('failed:', failed.join(', '));
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
