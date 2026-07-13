#!/usr/bin/tsx
/**
 * Manual logo URL overrides for brands the scraper missed or mis-picked.
 * Prefer official brand/press assets only — skip retailer / wrong-brand marks.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const OUT = resolve(process.cwd(), 'public', 'brands', 'logos');
mkdirSync(OUT, { recursive: true });

const FORCE = process.argv.includes('--force');

const URLS: Record<string, string[]> = {
  ariat: [
    'https://www.ariat.com/on/demandware.static/Sites-Ariat-Site/-/default/dw9e7faaec/images/ariat-logo.png',
    'https://www.ariat.com/on/demandware.static/Sites-Ariat-Site/-/default/dw0ac88d72/images/logotypes/ariat-complex-black.svg',
  ],
  ego7: ['https://www.ego7.it/wp-content/uploads/2022/07/cropped-logo_ego7.png'],
  'charles-owen': [
    'https://www.charlesowen.com/cdn/shop/files/charles-owen-top-logo-transparent.png',
  ],
  'bare-equestrian': [
    'https://cdn.shopify.com/s/files/1/2333/6869/files/BARE_Equestrian_logo.jpg',
  ],
  'thinline-global-australia': [
    'https://thinlineglobal.com/wp-content/uploads/2023/10/thinlineglobal-logo-blac-opt.png',
    'https://www.thinlineglobal.com/wp-content/uploads/2020/02/thinline-global-logo-alt.png',
  ],
  'natural-animal-solutions': [
    'https://www.naturalanimalsolutions.com.au/cdn/shop/files/NAS_Logo_Name_7484c.png',
  ],
  betavet: ['https://cdn.shopify.com/s/files/1/0004/4571/0397/files/betavet-logo-1.png'],
  nrg: [
    'https://nrgteam.com.au/wp-content/uploads/2020/06/NRG-Team-Logo.png',
    'https://nrgteam.com.au/wp-content/uploads/2020/06/NRG-Team-Logo-Sticky-Menu.png',
  ],
  'wild-horse': [
    'https://wildhorseaustralia.com.au/wp-content/uploads/2018/10/logo-268x300.jpg',
    'https://wildhorseaustralia.com.au/wp-content/themes/whildhorse/images/logo.svg',
  ],
  vestrum: [
    'https://media.fundis.net/media/image/c7/07/34/Vestrum_Logo.jpg',
    'https://www.vestrum.com/media/logo/default/logo.png',
  ],
  metalab: [
    'https://media.fundis.net/media/image/c7/07/34/Metalab_Logo.jpg',
    'https://metalab.fr/themes/metalab/assets/img/logo.png',
    'https://metalab.info/wp-content/uploads/2021/01/metalab-logo.png',
  ],
  showmaster: [
    'https://media.fundis.net/media/image/c7/07/34/Showmaster_Logo.jpg',
  ],
  'ps-of-sweden': [
    'https://psofsweden.com/cdn/shop/files/ps-logo.png',
    'https://media.fundis.net/media/image/c7/07/34/PS_of_Sweden_Logo.jpg',
  ],
  oregon: [
    'https://oregonhatco.com/cdn/shop/files/oregon-hat-co-logo.png',
    'https://cdn.shopify.com/s/files/1/0265/4649/files/oregon-logo.png',
  ],
  showcraft: [
    'https://www.showcraft.com.au/cdn/shop/files/showcraft-logo.png',
    'https://cdn.shopify.com/s/files/1/0278/9113/files/showcraft-logo.png',
  ],
  'shear-magic': [
    'https://www.shearmagic.com.au/image/catalog/logo.png',
    'https://shearmagic.com.au/image/catalog/logo.png',
  ],
  toptac: [
    'https://www.toptac.com.au/image/catalog/logo.png',
    'https://toptac.com.au/image/catalog/logo.png',
  ],
  troy: [
    'https://www.troyboots.com.au/cdn/shop/files/troy-logo.png',
    'https://cdn.shopify.com/s/files/1/0533/2089/files/troy.png',
  ],
  paw: [
    'https://www.blackdog.com.au/cdn/shop/files/PAW_logo.png',
    'https://cdn.shopify.com/s/files/1/0533/2089/files/paw.png',
  ],
  blackdog: [
    'https://www.blackdog.com.au/cdn/shop/files/blackdog-logo.png',
    'https://cdn.shopify.com/s/files/1/0533/2089/files/blackdog.png',
  ],
  barmah: [
    'https://www.barmahats.com.au/cdn/shop/files/barmah-logo.png',
    'https://barmahats.com/cdn/shop/files/logo.png',
  ],
  eurohunter: [
    'https://www.eurohunter.com.au/cdn/shop/files/eurohunter-logo.png',
    'https://eurohunter.com.au/cdn/shop/files/logo.png',
  ],
  cavallo: [
    'https://cavallo-horseandrider.com/cdn/shop/files/cavallo-logo.png',
    'https://www.cavallo-boots.com/cdn/shop/files/logo.png',
  ],
  'ezy-ride': [
    'https://www.ezyride.com.au/cdn/shop/files/ezyride-logo.png',
    'https://ezyride.com.au/cdn/shop/files/logo.png',
  ],
  'fort-worth': [
    'https://fortworth.com.au/cdn/shop/files/fort-worth-logo.png',
    'https://www.fortworthhats.com/cdn/shop/files/logo.png',
  ],
  'mountain-creek': [
    'https://mountaincreek.com.au/cdn/shop/files/mountain-creek-logo.png',
    'https://www.mountaincreek.com.au/cdn/shop/files/logo.png',
  ],
  'kelly-herd': [
    'https://kellyherd.com/cdn/shop/files/kelly-herd-logo.png',
    'https://cdn.shopify.com/s/files/1/0275/4255/files/kelly_herd_logo.png',
  ],
  credelio: [
    'https://www.credelio.com/sites/g/files/adhwdz221/files/credelio-logo.png',
    'https://www.credelio.com.au/themes/custom/credelio/logo.svg',
  ],
  'advantage-pet': [
    'https://www.advantagepetcare.com.au/sites/g/files/adhwdz531/files/logo.png',
    'https://assets.elanco.com/8e0bf1c2-1ae4-001f-9257-f2be3c683fb1/advantage-logo.png',
  ],
  'advocate-pet': [
    'https://www.advocatepetcare.com.au/sites/g/files/adhwdz531/files/logo.png',
  ],
  equimec: [
    'https://www.boehringer-ingelheim.com/sites/default/files/equimec-logo.png',
  ],
};

async function tryDownload(handle: string, urls: string[]): Promise<boolean> {
  const dest = resolve(OUT, `${handle}.png`);
  if (!FORCE && existsSync(dest)) {
    console.log(`[skip] ${handle} (exists)`);
    return true;
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        console.log(`[${handle}] ${res.status} ${url}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 600) {
        console.log(`[${handle}] too small ${buf.byteLength} ${url}`);
        continue;
      }
      // Reject known wrong retailer/car-rental marks
      const lower = url.toLowerCase();
      if (
        /fundis-logo|logo-kraemer|img_logo_ups|advantage-car-rental|amazon_logo/i.test(lower)
      ) {
        console.log(`[${handle}] rejected wrong mark ${url}`);
        continue;
      }
      writeFileSync(dest, buf);
      console.log(`[ok] ${handle} <- ${url} (${buf.byteLength}b)`);
      return true;
    } catch (e) {
      console.log(`[${handle}] err ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`[fail] ${handle}`);
  return false;
}

async function main() {
  const onlyIdx = process.argv.indexOf('--handles');
  const only =
    onlyIdx !== -1 && process.argv[onlyIdx + 1]
      ? new Set(process.argv[onlyIdx + 1].split(',').map((s) => s.trim()))
      : null;

  let ok = 0;
  let fail = 0;
  for (const [handle, urls] of Object.entries(URLS)) {
    if (only && !only.has(handle)) continue;
    if (await tryDownload(handle, urls)) ok += 1;
    else fail += 1;
  }
  console.log(`summary ok=${ok} fail=${fail}`);
  if (fail) process.exitCode = 1;
}

main();
