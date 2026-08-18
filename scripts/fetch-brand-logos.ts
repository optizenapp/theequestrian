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
  metalab: ['https://www.metalab.fr/', 'https://metalab.horse/', 'https://www.metalab.com/'],
  mattes: ['https://www.mattes.de/', 'https://www.mattes-saddlepad.com/', 'https://www.steffenmattes.com/'],
  horze: ['https://www.horze.com.au/', 'https://www.horze.com/en-us/', 'https://www.horze.com/'],
  showmaster: ['https://www.kramer.co.uk/showmaster/', 'https://www.kramer.de/', 'https://www.kramer.co.uk/'],
  prestige: ['https://www.prestigeitalia.com/', 'https://www.prestigeitaly.com/'],
  'lami-cell': ['https://www.lamicell.com/en/', 'https://www.lamicell.com/', 'https://www.lami-cell.com/'],
  tucci: ['https://www.tucciridingboots.com/', 'https://www.tucci.com/', 'https://tuccisrl.com/'],
  trust: ['https://www.trust-equestrian.com/', 'https://www.trustequestrian.com/en/'],
  veredus: ['https://www.veredus.com/en/', 'https://www.veredus.com/'],
  vestrum: ['https://www.vestrum.com/en/', 'https://www.vestrum.com/'],
  waldhausen: ['https://www.waldhausen.com/en/', 'https://www.waldhausen.com/', 'https://www.waldhausen.de/'],
  sprenger: ['https://www.sprenger.de/en/', 'https://www.herm-sprenger.com/', 'https://www.sprenger.de/'],
  roeckl: ['https://www.roeckl.com/en/', 'https://www.roeckl.com/', 'https://www.roeckl.de/'],
  'ps-of-sweden': ['https://www.psofsweden.com/en-us/', 'https://www.psofsweden.com/'],
  tech: ['https://www.techstirrups.com/', 'https://techstirrups.com/en/'],
  woof: ['https://www.woofwear.com/', 'https://woofwear.com/en-gb/'],
  'the-equestrian': ['https://www.theequestrian.com.au/'],
  heritage: ['https://www.heritagegloves.com/', 'https://www.heritageequestrian.com/', 'https://heritageboots.com/'],
  oregon: ['https://www.stetson.com/', 'https://www.oregonhatco.com/'],
  paw: ['https://www.blackdog.com.au/', 'https://www.blackdog.com.au/collections/paw'],
  nrg: ['https://nrgadditives.com.au/', 'https://www.nrgteam.com.au/'],
  wahl: ['https://www.wahl.com/animal', 'https://www.wahlanimal.com/', 'https://www.wahl.com/'],
  virbac: ['https://au.virbac.com/', 'https://www.virbac.com/au/home'],
  'joseph-lyddy': ['https://www.josephlyddy.com.au/', 'https://josephlyddy.com.au/'],
  'kohnkes-own': ['https://www.kohnkesown.com.au/', 'https://www.kohnkesown.com/'],
  kelato: ['https://kelato.com.au/', 'https://www.kelato.com.au/'],
  zilco: ['https://www.zilco.net/', 'https://www.zilco.com.au/'],
  ranvet: ['https://www.ranvet.com.au/'],
  vetsense: ['https://www.vetsense.com.au/'],
  'stance-equitec': ['https://stanceequitec.com.au/', 'https://www.stanceequitec.com.au/'],
  leovet: ['https://www.leovet.de/en/', 'https://www.leovet.de/'],
  'kep-italia': ['https://www.kepitalia.com/en/', 'https://www.kepitalia.com/'],
  kask: ['https://www.kask.com/en/', 'https://www.kask.com/'],
  'noble-outfitters': ['https://www.nobleoutfitters.com/'],
  thorowgood: ['https://www.thorowgood.com/'],
  trolle: ['https://trollecompany.com/', 'https://www.trolle.com/'],
  huntington: ['https://www.huntington.com.au/', 'https://huntingtonfeed.com.au/'],
  magictails: ['https://www.magictails.com.au/', 'https://magictails.com.au/'],
  shanga: ['https://www.shanga.com.au/', 'https://shanga.com.au/'],
  'shear-magic': ['https://www.shearmagic.com.au/'],
  showcraft: ['https://www.showcraft.com.au/'],
  toptac: ['https://www.toptac.com.au/'],
  troy: ['https://www.troyboots.com.au/'],
  'wild-horse': ['https://www.wildhorse.com.au/'],
  animo: ['https://animoitalia.com/', 'http://animo.it/'],
  equipe: ['https://shop.selleriaequipe.it/', 'https://www.grupposelleriaequipe.it/'],
  cavalor: ['https://cavalor.com/en-us/', 'https://marketing.cavalor.com/logos'],
  akubra: ['https://www.akubra.com.au/', 'https://akubra.com.au/'],
  kong: ['https://www.kongcompany.com/'],
  breyer: ['https://www.breyerhorses.com/'],
  stetson: ['https://www.stetson.com/'],
  freejump: ['https://www.freejumpsystem.com/'],
  equiline: ['https://www.equiline.it/'],
  dyon: ['https://www.dyon.be/', 'https://www.kentucky-horsewear.com/'],
  anky: ['https://www.anky.com/'],
  'premier-equine': ['https://www.premierequine.co.uk/'],
  pei: ['https://www.premierequine.co.uk/'],
  aztec: ['https://aztecdiamond.com/'],
  cdm: ['https://www.carrdaymartin.com/'],
  hairy: ['https://www.hairypony.com.au/', 'https://www.hairypony.co.uk/'],
  hamag: ['https://hamag.com/', 'https://hamag.com.au/'],
  'paddock-blade': ['https://paddockblade.com.au/'],
  likit: ['https://www.likit.co.uk/'],
  coralpina: ['https://www.coralpina.com/'],
  equick: ['https://www.equick.it/'],
  elt: ['https://www.elt-riders.com/', 'https://www.elt-riders.de/'],
  doog: ['https://doog.com.au/', 'https://www.doog.com.au/'],
  aristopet: ['https://www.aristopet.com.au/'],
  'ivory-coat': ['https://ivorycoat.com.au/'],
  tropiclean: ['https://tropiclean.com/'],
  chuckit: ['https://www.chuckit.com/', 'https://www.petsafe.com/chuckit'],
  petsafe: ['https://www.petsafe.com/'],
  greenies: ['https://www.greenies.com/'],
  furminator: ['https://www.furminator.com/'],
  'nexgard-spectra': ['https://www.nexgard.com.au/'],
  credelio: ['https://www.credelio.com/'],
  equinade: ['https://www.equinade.com/'],
  aubenhausen: ['https://www.aubenhausen-collection.com/', 'https://www.aubenhausen.de/'],
  'anna-scarpati': ['https://www.annascarpati.com/', 'https://www.annascarpati.com/en/'],
  'bombers-bits': ['https://www.bombers.co.za/', 'https://www.bombers.eu/'],
  waudog: ['https://waudog.com/'],
  gutzbusta: ['https://gutzbusta.com.au/'],
  haas: ['https://www.haas-pferd.de/', 'https://www.haas-kammfabrik.com/'],
  'alto-lab': ['https://www.altolab.com.au/', 'https://www.altolab.com/'],
  aintree: ['https://aintreehorsewear.com.au/', 'https://www.aintree.com.au/'],
  'eac-animal-care': ['https://eacanimalcare.com/'],
  blackhawk: ['https://blackhawkpetcare.com.au/'],
  'taste-of-the-wild': ['https://www.tasteofthewildpetfood.com/'],
  'temptations-cat-snacks': ['https://www.temptations.com/'],
  vitapet: ['https://www.vitapet.com.au/'],
  rogz: ['https://rogz.com/'],
  wrangler: ['https://www.wrangler.com/', 'https://eu.wrangler.com/'],
  gidgee: ['https://gidgee-eyes.com/', 'https://gidgeeeyewear.com.au/'],
  grainge: ['https://www.graingeequestrian.com.au/', 'https://www.grainge.com.au/'],
  barmah: ['https://www.barmahats.com.au/', 'https://www.barmahats.com/'],
  'baxter': ['https://www.baxterboots.com.au/', 'https://baxterboots.com/'],
  eurohunter: ['https://www.eurohunter.com.au/'],
  'ezy-ride': ['https://www.ezyride.com.au/', 'https://ezyride.com.au/'],
  'fort-worth': ['https://fortworth.com.au/', 'https://www.fortworthhats.com/'],
  'mountain-creek': ['https://mountaincreek.com.au/', 'https://www.mountaincreek.com.au/'],
  'horseware-australia': ['https://www.horseware.com/en-au', 'https://www.horseware.com/en-eu', 'https://horseware.com/'],
  'myler-bits': ['https://www.mylerbitsusa.com/', 'https://www.mylerbits.com/'],
  pampeano: ['https://www.pampeano.co.uk/', 'https://www.pampeano.com/'],
  vestrum: ['https://www.vestrum.com/en/', 'https://www.vestrum.com/'],
  'champion-tails': ['https://www.championtails.com.au/', 'https://championtails.com/'],
  decron: ['https://decron.com.au/', 'https://www.decron.com.au/'],
  scream: ['https://screampet.com.au/', 'https://www.scream.com.au/'],
  'shear-magic': ['https://www.shearmagic.com.au/'],
  showcraft: ['https://www.showcraft.com.au/'],
  toptac: ['https://www.toptac.com.au/'],
  troy: ['https://www.troyboots.com.au/'],
  oregon: ['https://oregonhatco.com/'],
  paw: ['https://www.blackdog.com.au/'],
  'flyveils-by-design': ['https://flyveilsbydesign.com.au/', 'https://www.flyveils.com.au/'],
  'diamond-deluxe-horsewear': ['https://diamonddeluxehorsewear.com.au/', 'https://www.diamonddeluxe.com.au/'],
  'horse-queened': ['https://horsequeened.com.au/', 'https://www.horsequeened.com/'],
  ippico: ['https://ippico.com.au/', 'https://www.ippicoequestrian.com/'],
  'ippico-equestrian': ['https://ippico.com.au/', 'https://www.ippicoequestrian.com/'],
  'jeremy-lord': ['https://jeremylord.com.au/', 'https://www.jeremylord.com/'],
  'lara-tweedie': ['https://laratweedie.com.au/', 'https://www.laratweedie.com/'],
  'emcee-apparel': ['https://emceeapparel.com.au/', 'https://www.emcee.com.au/'],
  'jp-equestrian-fashion': ['https://jpequestrian.com.au/'],
  'fancy-stitch': ['https://fancystitch.com.au/'],
  'nungar': ['https://nungarknots.com.au/', 'https://www.nungar.com.au/'],
  'peter-williams': ['https://peterwilliams.com.au/'],
  'sterling-essentials': ['https://sterlingessentials.com.au/'],
  'the-trail-of-painted-ponies': ['https://www.trailofpaintedponies.com/'],
  inaba: ['https://inabafoods.com/', 'https://www.ciaochuru.com/'],
  drinkwell: ['https://www.petsafe.com/drinkwell', 'https://www.petsafe.net/'],
  'ruff-play': ['https://ruffplay.com.au/', 'https://www.ruffplay.com/'],
  zippy: ['https://zippypaws.com/', 'https://www.zippypaws.com.au/'],
  zeez: ['https://zeez.com.au/'],
  'trouble-trix': ['https://troubleandtrix.com.au/', 'https://www.troubleandtrix.com/'],
  betadine: ['https://www.betadine.com.au/', 'https://www.betadine.com/'],
  terramycin: ['https://www.zoetis.com.au/', 'https://www.zoetispetcare.com/'],
  'equimec': ['https://www.boehringer-ingelheim.com.au/'],
  advantage: ['https://www.advantagepetcare.com.au/'],
  advocate: ['https://www.advocatepetcare.com.au/'],
  coolmax: ['https://www.lycra.com/en/coolmax'],
  'cavalleria-toscana': [
    'https://cavalleriatoscana.com/en_en',
    'https://corporate.cavalleriatoscana.com/',
  ],
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

function scoreUrl(url: string, handle: string): number {
  const u = url.toLowerCase();
  const h = handle.toLowerCase().replace(/-/g, '');
  let score = 0;
  if (u.includes('logo')) score += 50;
  if (u.includes(handle) || u.includes(h)) score += 35;
  if (u.includes('brand')) score += 20;
  if (u.includes('header')) score += 10;
  if (u.endsWith('.svg')) score += 15;
  if (u.endsWith('.png')) score += 10;
  if (u.includes('favicon') || u.includes('icon') || u.includes('sprite') || u.includes('apple-touch')) score -= 40;
  if (u.includes('banner') || u.includes('hero') || u.includes('product') || u.includes('slider')) score -= 20;
  if (u.includes('facebook') || u.includes('instagram') || u.includes('youtube')) score -= 50;
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
  // srcset first candidate
  const srcset = /srcset=["']([^"']+)["']/gi;
  while ((m = srcset.exec(html))) {
    const first = m[1].split(',')[0]?.trim().split(/\s+/)[0];
    if (!first) continue;
    try {
      if (/\.(png|jpg|jpeg|webp|svg)/i.test(first)) urls.add(new URL(first, base).href);
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
      candidates.push({ url, score: scoreUrl(url, handle) });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const tried = new Set<string>();
  for (const c of candidates.slice(0, 25)) {
    if (c.score < 0 || tried.has(c.url)) continue;
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
