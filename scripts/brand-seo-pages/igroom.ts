import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'igroom',
  title: 'iGroom',
  breadcrumb_label: 'iGroom',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'iGroom' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'igroom-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'iGroom' },
  ],
  meta_title: 'iGroom Dog Grooming Australia | The Equestrian',
  meta_description:
    'Shop iGroom dog grooming products in Australia at The Equestrian. Shampoo, conditioner, cologne and professional coat care with Australia-wide shipping.',
  h1_title: 'Shop iGroom Dog Grooming Products',
  quick_answer:
    'iGroom is a professional dog grooming brand known for shampoo, conditioner, cologne and coat-care formulas. Shop iGroom at The Equestrian with Australian shipping.',
  short_description:
    '<p>Shop <strong>iGroom</strong> professional dog grooming shampoo, conditioner and finishing products.</p>',
  long_description:
    '<h2>iGroom</h2><p>Browse iGroom grooming products alongside our <a href="/pet/dog/grooming">dog grooming range</a>.</p>',
  faq_items: [],
};

export default content;
