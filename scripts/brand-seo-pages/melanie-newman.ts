import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'melanie-newman',
  title: 'Melanie Newman',
  breadcrumb_label: 'Melanie Newman',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Melanie Newman' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'melanie-newman-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'Melanie Newman' },
  ],
  meta_title: 'Melanie Newman Dog Grooming Australia | The Equestrian',
  meta_description:
    'Shop Melanie Newman dog shampoo, conditioner, cologne and coat sprays in Australia at The Equestrian. Everyday, Puppy, Relax, Refresh and more.',
  h1_title: 'Shop Melanie Newman Dog Grooming Products',
  quick_answer:
    'Melanie Newman is an Australian dog grooming brand known for shampoo, conditioner, cologne and coat sprays. Shop Melanie Newman at The Equestrian with Australian shipping.',
  short_description:
    '<p>Shop <strong>Melanie Newman</strong> dog shampoo, conditioner, cologne and coat-conditioning sprays.</p>',
  long_description:
    '<h2>Melanie Newman</h2><p>Browse Melanie Newman grooming products in our <a href="/pet/dog/grooming">dog grooming collection</a>.</p>',
  faq_items: [],
};

export default content;
