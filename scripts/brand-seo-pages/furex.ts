import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'furex',
  title: 'FurEx',
  breadcrumb_label: 'FurEx',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'FurEx' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'furex-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'FurEx' },
  ],
  meta_title: 'FurEx De-Shedding Dog Care Australia | The Equestrian',
  meta_description:
    'Shop FurEx de-shedding and coat-care systems for dogs in Australia at The Equestrian.',
  h1_title: 'Shop FurEx Dog Coat Care',
  quick_answer:
    'FurEx offers de-shedding cleanse and coat-care systems for dogs. Shop FurEx at The Equestrian with Australian shipping.',
  short_description:
    '<p>Shop <strong>FurEx</strong> de-shedding and coat-care products for dogs.</p>',
  long_description:
    '<h2>FurEx</h2><p>Browse FurEx alongside <a href="/pet/dog/grooming">dog grooming supplies</a>.</p>',
  faq_items: [],
};

export default content;
