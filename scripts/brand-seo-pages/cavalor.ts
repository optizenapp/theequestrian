import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'cavalor',
  title: 'Cavalor',
  breadcrumb_label: 'Cavalor',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Cavalor' },
    { column: 'BRAND', relation: 'EQUALS', condition: 'Cavalor Equicare' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'cavalor-' },
  ],

  meta_title: 'Cavalor | The Equestrian',
  meta_description: 'Shop Cavalor at The Equestrian.',
  h1_title: 'Cavalor',

  quick_answer: 'Shop Cavalor products at The Equestrian in Australia.',

  short_description: "Browse Cavalor products.",

  long_description: "<h2>Cavalor</h2><p>Shop Cavalor at The Equestrian.</p>",

  faq_items: [],
};

export default content;
