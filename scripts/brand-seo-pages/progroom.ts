import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'progroom',
  title: 'ProGroom',
  breadcrumb_label: 'ProGroom',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'ProGroom' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'progroom-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'ProGroom' },
  ],
  meta_title: 'ProGroom Dog Grooming Australia | The Equestrian',
  meta_description:
    'Shop ProGroom dog grooming combs, conditioners and styling products in Australia at The Equestrian.',
  h1_title: 'Shop ProGroom Dog Grooming Products',
  quick_answer:
    'ProGroom supplies professional dog grooming tools and coat-care products. Shop ProGroom at The Equestrian with Australian shipping.',
  short_description:
    '<p>Shop <strong>ProGroom</strong> grooming combs, conditioners and styling products for dogs.</p>',
  long_description:
    '<h2>ProGroom</h2><p>Browse ProGroom in our <a href="/pet/dog/grooming">dog grooming collection</a>.</p>',
  faq_items: [],
};

export default content;
