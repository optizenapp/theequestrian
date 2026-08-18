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
  animo: [
    'https://www.animoitalia.com/wp-content/uploads/logo.jpeg',
    'http://animo.it/wp-content/uploads/2015/11/logo_web.png',
  ],
  equipe: [
    'https://shop.selleriaequipe.it/cdn/shop/files/Logo_Equipe_Marzo24-RGB_350x.jpg?v=1739973962',
  ],
  cavalor: [
    'https://marketing.cavalor.com/assets/images/dl_logos/RGB/LOGO-CAVALOR-RGB-big.png',
    'https://198.wpcdnnode.com/cavalor.com/wp-content/uploads/2021/05/cropped-logo-scaled-site.png',
  ],
  'cavalor-equicare': [
    'https://marketing.cavalor.com/assets/images/dl_logos/RGB/LOGO-CAVALOR-RGB-big.png',
  ],
  blackdog: [
    'https://www.blackdog.net.au/assets/website_logo.png',
  ],
  akubra: [
    'https://akubra.com.au/cdn/shop/files/AKUBRA_RGB_Logotype_Black.png?v=1741920874',
  ],
  kong: [
    'https://cdn11.bigcommerce.com/s-k3kxaf4rop/images/stencil/original/logo-resized_1761953642__90706.original.png',
  ],
  breyer: [
    'https://www.breyerhorses.com/cdn/shop/files/Breyer_Horse_Mobile_Logo_388x150.png?v=1613519829',
  ],
  stetson: [
    'https://cdn.shopify.com/s/files/1/0357/2432/9005/files/logo.png?v=1716994338',
  ],
  freejump: [
    'https://www.freejumpsystem.com/img/logo-1710772348.jpg',
  ],
  equiline: [
    'https://www.equiline.it/media/logo/default/logo-equiline.png',
  ],
  dyon: [
    'https://media.kentucky-horsewear.com/media/b1/d1/36/1758199507/dyon-menu-logo.png?ts=1758199507',
  ],
  'dyon-1': [
    'https://media.kentucky-horsewear.com/media/b1/d1/36/1758199507/dyon-menu-logo.png?ts=1758199507',
  ],
  anky: ['https://www.anky.com/images/logo-ankyvangrunsven.png'],
  'premier-equine': [
    'https://cdn.shopify.com/s/files/1/0420/2528/7847/t/488/assets/logo-no-circle.svg?v=64569426278781651731744279228',
    'https://cdn.shopify.com/s/files/1/0420/2528/7847/t/488/assets/logo.svg?v=49369906516997648141708447371',
  ],
  pei: [
    'https://cdn.shopify.com/s/files/1/0420/2528/7847/t/488/assets/logo-no-circle.svg?v=64569426278781651731744279228',
  ],
  aztec: ['https://aztecdiamond.com/cdn/shop/files/Name_logo_2023.jpg?v=1690475620'],
  cdm: ['https://www.carrdaymartin.com/wp-content/uploads/2023/04/logo-3.png'],
  hairy: [
    'https://www.hairypony.com.au/cdn/shop/files/Logo-Circle_Dark_copy.png?v=1778042583',
  ],
  'hairy-pony': [
    'https://www.hairypony.com.au/cdn/shop/files/Logo-Circle_Dark_copy.png?v=1778042583',
  ],
  hamag: ['https://hamag.com/cdn/shop/files/Hamag_Logo.jpg?v=1770119167'],
  'paddock-blade': [
    'https://cdn.shopify.com/s/files/1/2403/3947/files/PB-Logo-NoCountry.png?v=1740093369',
  ],
  likit: ['https://www.likit.co.uk/wp-content/themes/likit-wp/assets/img/logo.png'],
  coralpina: [
    'https://www.coralpina.com/wp-content/uploads/2025/11/logo_coralpina_head.png',
  ],
  equick: [
    'https://static.wixstatic.com/media/5d22d8_6545b20a43ef49a094e51315ade0dc55~mv2.png',
  ],
  doog: ['https://www.doog.com.au/cdn/shop/files/DOOG-logo.png?v=1749639295'],
  'ivory-coat': [
    'https://professional.rpfco.com/cdn/shop/files/IVORY_COAT_DOG_LOGO_2_2fdb4ae7-77af-4be1-af97-20f40993d7de.png?v=1644352434',
  ],
  tropiclean: [
    'https://tropiclean.com/cdn/shop/files/tropiclean_footer_logo.png?v=1782230753',
  ],
  petsafe: [
    'https://www.petsafe.com/static/petsafe-logo-v2-3fc2ead72232b2ae17cd539528bf0d7a.svg',
  ],
  greenies: [
    'https://www.greenies.com/sites/g/files/fnmzdf8461/files/Greenies_Logo_Green_LR_RGB_200.png',
  ],
  'nexgard-spectra': ['https://www.nexgard.com.au/sites/default/files/NGS-logo.png'],
  credelio: [
    'https://assets.elanco.com/8e0bf1c2-1ae4-001f-9257-f2be3c683fb1/220416a9-a148-4910-86f0-0a94eca95928/Logo%20Credelio.png',
  ],
  equinade: [
    'https://static.wixstatic.com/media/170f65_3762e8121c4b44508577a7fa4ec87d73~mv2.png',
  ],
  waudog: ['https://waudog.com/cdn/shop/files/Logo_WAUDOG.png?v=1624954899'],
  gutzbusta: [
    'https://gutzbusta.com.au/cdn/shop/files/GB-Logo-Colour_2x_0cf618f5-2e5e-43c4-bc02-67aecc7ba91e.png?v=1694385426',
  ],
  'eac-animal-care': [
    'https://cdn.shopify.com/s/files/1/0030/0597/2550/files/eacequine-colour-POS.png?v=1753327499',
    'https://cdn.shopify.com/s/files/1/0030/0597/2550/files/eacpet-colour-POS.png?v=1753660862',
  ],
  blackhawk: [
    'https://blackhawkpetcare.com.au/assets/images/blackhawk/blackhawk-logo-black.svg',
  ],
  'taste-of-the-wild': [
    'https://www.tasteofthewildpetfood.com/wp-content/uploads/2025/02/Taste-of-the-Wild-Home-Logo-Desktop.svg',
  ],
  'temptations-cat-snacks': [
    'https://www.temptations.com/wp-content/uploads/2018/04/header-logo2.png',
  ],
  rogz: ['https://rogz.com/wp-content/uploads/2023/11/rogz_web_logo-1.svg'],
  kazoo: [
    'https://www.kazoo.com.au/cdn/shop/files/Kazoo_Word_Logo.png',
    'https://www.kazoo.com.au/cdn/shop/files/Kazoo_Logo.png',
    'https://www.kazoo.com.au/cdn/shop/files/Kazoo_Word_Logo_White.png?v=1747877719',
  ],
  gidgee: [
    'https://gidgee-eyes.com/wp-content/uploads/2025/05/Gidgee-eyes-logo-black-web.webp',
    'https://gidgee-eyes.com/wp-content/uploads/2019/09/Gidgee-Eyes-Logo-Retina.jpg',
  ],
  advantage: [
    'https://www.advantagepetcare.com.au/sites/g/files/adhwdz531/files/logo.png',
    'https://assets.elanco.com/8e0bf1c2-1ae4-001f-9257-f2be3c683fb1/advantage-logo.png',
  ],
  advocate: [
    'https://www.advocatepetcare.com.au/sites/g/files/adhwdz531/files/logo.png',
  ],
  aristopet: [
    'https://www.aristopet.com.au/media/fvznj03v/aristopet-logo-white.png',
  ],
};

/** Homepages whose header logo is inline SVG (no standalone image file). */
const INLINE_SVG_PAGES: Record<string, string> = {
  bates: 'https://batessaddles.com.au/',
  wintec: 'https://wintec-saddles.com.au/',
};

async function tryInlineSvg(handle: string, pageUrl: string): Promise<boolean> {
  const dest = resolve(OUT, `${handle}.png`);
  if (!FORCE && existsSync(dest)) {
    console.log(`[skip] ${handle} (exists)`);
    return true;
  }
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      console.log(`[${handle}] svg page ${res.status}`);
      return false;
    }
    const html = await res.text();
    const named = html.match(/<svg[^>]*(?:logo|wintec|bates)[^>]*>[\s\S]*?<\/svg>/i);
    const anyHeader = html.match(/id="shopify-section-header"[\s\S]{0,25000}/i);
    const headerSvg = anyHeader?.[0].match(/<svg[\s\S]*?<\/svg>/);
    let svg = named?.[0] || headerSvg?.[0];
    if (!svg || svg.length < 400) {
      console.log(`[${handle}] no inline svg`);
      return false;
    }
    if (!svg.includes('xmlns=')) {
      svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }
    writeFileSync(dest, svg);
    console.log(`[ok] ${handle} <- inline svg (${svg.length}b)`);
    return true;
  } catch (e) {
    console.log(`[${handle}] svg err ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

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
      const head = buf.subarray(0, 64).toString('utf8').toLowerCase();
      if (head.includes('<!doctype') || head.includes('<html') || head.includes('<svg') === false && head.includes('png') === false) {
        const isImg =
          buf[0] === 0x89 ||
          buf[0] === 0xff ||
          buf.subarray(0, 4).toString() === 'RIFF' ||
          buf.subarray(0, 4).toString() === 'GIF8' ||
          head.includes('<svg') ||
          head.includes('<?xml');
        if (!isImg) {
          console.log(`[${handle}] not an image ${url}`);
          continue;
        }
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
  for (const [handle, pageUrl] of Object.entries(INLINE_SVG_PAGES)) {
    if (only && !only.has(handle)) continue;
    if (await tryInlineSvg(handle, pageUrl)) ok += 1;
    else fail += 1;
  }
  for (const [handle, urls] of Object.entries(URLS)) {
    if (only && !only.has(handle)) continue;
    if (await tryDownload(handle, urls)) ok += 1;
    else fail += 1;
  }
  console.log(`summary ok=${ok} fail=${fail}`);
  if (fail) process.exitCode = 1;
}

main();
