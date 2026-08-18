import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'luxe-pet',
  title: 'Luxe Pet',
  breadcrumb_label: 'Luxe Pet',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Luxe Pet' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'luxe-pet-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'Luxe Pet' },
  ],
  meta_title: 'Luxe Pet Australia | Grooming & Pet Care | The Equestrian',
  meta_description:
    'Shop Luxe Pet grooming and pet care products in Australia at The Equestrian.',
  h1_title: 'Shop Luxe Pet Grooming & Care',
  quick_answer:
    'Luxe Pet offers spa-style pet shampoos, parfum and care products. Shop Luxe Pet at The Equestrian with Australian shipping.',
  short_description:
    '<p>Shop <strong>Luxe Pet</strong> shampoos, parfum and pet care products.</p>',
  long_description:
    '<h2>Luxe Pet</h2><p>Browse Luxe Pet in <a href="/pet/dog/grooming">dog grooming</a> and our wider <a href="/pet">pet range</a>.</p>',
  faq_items: [],
};

export default content;
