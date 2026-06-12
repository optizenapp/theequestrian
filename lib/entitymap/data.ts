import { getCanonicalSiteUrl } from '@/lib/seo/site-url';
import type { EntityMapDocument } from './types';

const PUBLISHER = 'The Equestrian';
const GENERATED = '2026-06-12T12:00:00Z';
const RETRIEVED = '2026-06-12T00:00:00Z';

const WIKIDATA = {
  onlineMarketplace: 'https://www.wikidata.org/wiki/Q3390477',
  brand: 'https://www.wikidata.org/wiki/Q431289',
  productReturn: 'https://www.wikidata.org/wiki/Q166778',
  clothingSizes: 'https://www.wikidata.org/wiki/Q1075138',
  freeShipping: 'https://www.wikidata.org/wiki/Q5500296',
  equestrianism: 'https://www.wikidata.org/wiki/Q179226',
} as const;

function chunk(
  id: string,
  text: string,
  path: string,
  pageTitle: string,
  contentType: EntityMapDocument['entities'][0]['hasChunks'][0]['contentType'] = 'evidence',
  relevanceScore = 0.9
) {
  const base = getCanonicalSiteUrl();
  return {
    chunkId: id,
    text,
    sourceUrl: `${base}${path}`,
    pageTitle,
    publisher: PUBLISHER,
    retrieved: RETRIEVED,
    relevanceScore,
    contentType,
  };
}

export function buildEntityMap(): EntityMapDocument {
  const base = getCanonicalSiteUrl();

  return {
    version: '1.0',
    schema: 'https://entitymap.org/spec/v1.0',
    publisher: {
      name: PUBLISHER,
      url: base,
      sameAs: WIKIDATA.onlineMarketplace,
    },
    generated: GENERATED,
    profile: 'core',
    verificationStatus: 'self-declared',
    entities: [
      {
        entityId: 'e_001',
        '@type': 'Organization',
        name: PUBLISHER,
        description:
          'The Equestrian is an Australian online equestrian marketplace operated by Equine Marketplace Pty Ltd, selling horse tack, rider apparel, stable supplies, and pet essentials with nationwide delivery.',
        alternateName: 'Equine Marketplace Pty Ltd',
        sameAs: WIKIDATA.equestrianism,
        maturityStatus: 'established',
        audienceType: 'general',
        relations: [
          { predicate: 'OFFERS', targetId: 'e_003', targetName: 'Free Shipping Sitewide' },
          { predicate: 'OFFERS', targetId: 'e_008', targetName: 'Equestrian Sizing Guides' },
          { predicate: 'RELATES_TO', targetId: 'e_010', targetName: 'Jono Farrington' },
        ],
        hasChunks: [
          chunk(
            'c_001',
            'The Equestrian is founded by individuals with experience across equestrian retail, wholesale, manufacturing, and e-commerce, serving the Australian equine community.',
            '/about',
            'About The Equestrian',
            'definition',
            0.95
          ),
          chunk(
            'c_002',
            'The Equestrian is based at 41B Luck St, Macclesfield, South Australia 5153. Customer support is available at support@theequestrian.com.au and +61 419 851 891.',
            '/contact',
            'Contact Us',
            'evidence',
            0.88
          ),
        ],
      },
      {
        entityId: 'e_002',
        '@type': 'Platform',
        name: 'Australian Equestrian Marketplace',
        description:
          'A multi-category online marketplace where Australian horse owners, riders, and equestrian professionals shop for tack, apparel, stable gear, and related products from multiple sellers and global brands.',
        sameAs: WIKIDATA.onlineMarketplace,
        maturityStatus: 'established',
        audienceType: 'general',
        relations: [
          { predicate: 'INCLUDES', targetId: 'e_004', targetName: 'Horse Tack and Supplies' },
          { predicate: 'INCLUDES', targetId: 'e_005', targetName: 'Rider Apparel and Equipment' },
          { predicate: 'INCLUDES', targetId: 'e_006', targetName: 'Equestrian Brand Directory' },
          { predicate: 'INCLUDES', targetId: 'e_007', targetName: 'Multi-Vendor Marketplace' },
          { predicate: 'DESCRIBED_BY', targetId: 'e_009', targetName: '30-Day Returns Policy' },
        ],
        hasChunks: [
          chunk(
            'c_003',
            'Shop 10,000+ horse and rider products with FREE SHIPPING sitewide. Discover global brands for horse, rider, and pet at The Equestrian.',
            '/',
            'Australian Equestrian Marketplace | Horse, Rider & Pet',
            'definition',
            0.95
          ),
          chunk(
            'c_004',
            'It was time that there was one place in Australia where you can buy and sell not only second hand gear, but give retailers and wholesalers the opportunity to list their products where everyone shops.',
            '/about',
            'About The Equestrian',
            'evidence',
            0.9
          ),
        ],
      },
      {
        entityId: 'e_003',
        '@type': 'Service',
        name: 'Free Shipping Sitewide',
        description:
          'Eligible orders on The Equestrian ship free across Australia. Express shipping options are available at checkout where applicable.',
        sameAs: WIKIDATA.freeShipping,
        maturityStatus: 'established',
        audienceType: 'general',
        relations: [{ predicate: 'ENABLES', targetId: 'e_002', targetName: 'Australian Equestrian Marketplace' }],
        hasChunks: [
          chunk(
            'c_005',
            'Yes, we offer free shipping sitewide on eligible items. Any exceptions are clearly shown at checkout.',
            '/faq',
            'FAQs | The Equestrian',
            'definition',
            0.95
          ),
          chunk(
            'c_006',
            'We use Australia Post for postage Australia wide. Express Shipping is available at checkout.',
            '/shipping-delivery',
            'Postage & Delivery | The Equestrian',
            'procedure',
            0.88
          ),
        ],
      },
      {
        entityId: 'e_004',
        '@type': 'Taxonomy',
        name: 'Horse Tack and Supplies',
        description:
          'The horse category at The Equestrian covers saddles, bridles, bits, rugs, boots, grooming, health products, and stable-related gear for horses.',
        maturityStatus: 'established',
        audienceType: 'general',
        relations: [{ predicate: 'RELATES_TO', targetId: 'e_005', targetName: 'Rider Apparel and Equipment' }],
        hasChunks: [
          chunk(
            'c_007',
            'Primary horse shopping sections include saddles, bridles, bits, saddlecloths, boots, rugs, grooming, and health products.',
            '/horse',
            'Horse | The Equestrian',
            'definition',
            0.92
          ),
        ],
      },
      {
        entityId: 'e_005',
        '@type': 'Taxonomy',
        name: 'Rider Apparel and Equipment',
        description:
          'The rider category includes footwear, breeches, helmets, gloves, safety equipment, and riding apparel for equestrian athletes and enthusiasts.',
        maturityStatus: 'established',
        audienceType: 'general',
        relations: [{ predicate: 'DEPENDS_ON', targetId: 'e_008', targetName: 'Equestrian Sizing Guides' }],
        hasChunks: [
          chunk(
            'c_008',
            'Rider shopping sections include footwear, breeches, helmets, apparel, gloves, and safety equipment.',
            '/rider',
            'Rider | The Equestrian',
            'definition',
            0.92
          ),
        ],
      },
      {
        entityId: 'e_006',
        '@type': 'Concept',
        name: 'Equestrian Brand Directory',
        description:
          'Curated brand landing pages on The Equestrian that group products by manufacturer or label, with brand-specific copy and product listings.',
        sameAs: WIKIDATA.brand,
        maturityStatus: 'established',
        audienceType: 'general',
        relations: [{ predicate: 'COVERS', targetId: 'e_004', targetName: 'Horse Tack and Supplies' }],
        hasChunks: [
          chunk(
            'c_009',
            'Brand pages are first-class landing pages and include curated copy plus product listings at /brands and /brands/{brand-handle}.',
            '/brands',
            'Brands | The Equestrian',
            'definition',
            0.9
          ),
        ],
      },
      {
        entityId: 'e_007',
        '@type': 'Concept',
        name: 'Multi-Vendor Marketplace',
        description:
          'The Equestrian connects customers with multiple sellers and warehouses across Australia, so a single order may ship in separate parcels from different locations.',
        sameAs: WIKIDATA.onlineMarketplace,
        maturityStatus: 'established',
        audienceType: 'general',
        relations: [{ predicate: 'PART_OF', targetId: 'e_002', targetName: 'Australian Equestrian Marketplace' }],
        hasChunks: [
          chunk(
            'c_010',
            'We connect you with over 10,000 sellers across Australia and global brands, so you can shop one destination for a huge range of equestrian products.',
            '/faq',
            'FAQs | The Equestrian',
            'evidence',
            0.9
          ),
          chunk(
            'c_011',
            'We ship from multiple warehouses around Australia, so items in the same order may be sent separately to get them to you faster.',
            '/faq',
            'FAQs | The Equestrian',
            'procedure',
            0.85
          ),
        ],
      },
      {
        entityId: 'e_008',
        '@type': 'Concept',
        name: 'Equestrian Sizing Guides',
        description:
          'Brand-specific sizing charts on The Equestrian help riders choose correct fit for boots, breeches, helmets, rugs, and other sized equestrian products.',
        sameAs: WIKIDATA.clothingSizes,
        maturityStatus: 'established',
        audienceType: 'general',
        relations: [{ predicate: 'ENABLES', targetId: 'e_005', targetName: 'Rider Apparel and Equipment' }],
        hasChunks: [
          chunk(
            'c_012',
            'Sizing charts are available at /sizing and /sizing/{brand} to help customers choose correct fit for helmets, boots, breeches, rugs, and other sized products.',
            '/sizing',
            'Sizing Charts | The Equestrian',
            'definition',
            0.88
          ),
        ],
      },
      {
        entityId: 'e_009',
        '@type': 'Concept',
        name: '30-Day Returns Policy',
        description:
          'The Equestrian accepts returns within 30 days of delivery for unused items in original packaging. Refunds cover the product value; postage is excluded unless faulty.',
        sameAs: WIKIDATA.productReturn,
        maturityStatus: 'established',
        audienceType: 'general',
        hasChunks: [
          chunk(
            'c_013',
            'Returns are accepted within 30 days of receiving your items, provided they are unused and in original packaging. Refunds are for the product only and exclude postage.',
            '/faq',
            'FAQs | The Equestrian',
            'definition',
            0.93
          ),
          chunk(
            'c_014',
            'Returns are accepted within 30 days. Refunds are for the product only and exclude postage unless the item is faulty.',
            '/returns-refunds',
            'Returns & Refunds | The Equestrian',
            'evidence',
            0.9
          ),
        ],
      },
      {
        entityId: 'e_010',
        '@type': 'Person',
        name: 'Jono Farrington',
        description:
          'Co-founder of The Equestrian with 20 years in digital marketing and e-commerce. Former competitive showjumper; leads technical, digital marketing, and strategy.',
        maturityStatus: 'established',
        audienceType: 'general',
        relations: [
          { predicate: 'AFFILIATED_WITH', targetId: 'e_001', targetName: PUBLISHER },
          { predicate: 'AFFILIATED_WITH', targetId: 'e_002', targetName: 'Australian Equestrian Marketplace' },
        ],
        hasChunks: [
          chunk(
            'c_015',
            'Jono Farrington has 20 years experience in digital and online marketing. He was a competitive showjumper up to World Cup level and takes care of technical, digital marketing and strategy at The Equestrian.',
            '/about',
            'About The Equestrian',
            'definition',
            0.95
          ),
        ],
      },
    ],
  };
}
