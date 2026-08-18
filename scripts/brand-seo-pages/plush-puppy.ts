import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'plush-puppy',
  title: 'Plush Puppy',
  breadcrumb_label: 'Plush Puppy',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Plush Puppy' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'plush-puppy-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'Plush Puppy' },
  ],
  meta_title: 'Plush Puppy Dog Grooming Australia | The Equestrian',
  meta_description:
    'Shop Plush Puppy dog grooming shampoo, conditioner, brushes and show-coat products in Australia at The Equestrian. Australia-wide shipping.',
  h1_title: 'Shop Plush Puppy Dog Grooming Products',
  quick_answer:
    'Plush Puppy is an Australian dog grooming brand known for shampoo, conditioner, brushes and show-coat finishing products. Shop Plush Puppy at The Equestrian with Australian shipping.',
  short_description:
    '<p>Shop <strong>Plush Puppy</strong> professional dog grooming shampoo, conditioner, brushes and coat-finishing products.</p>',
  long_description:
    '<h2>Plush Puppy</h2><p>Browse Plush Puppy grooming products alongside our <a href="/pet/dog/grooming">dog grooming range</a>.</p>',
  faq_items: [],
};

export default content;
