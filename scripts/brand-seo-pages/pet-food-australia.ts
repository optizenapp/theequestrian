import type { BrandSEOContent } from '../run-brand-seo-update';

/** House brand for the Pet food Australia Collective vendor. Luxe Pet SKUs stay on /brands/luxe-pet. */
const content: BrandSEOContent = {
  handle: 'pet-food-australia',
  title: 'Pet Food Australia',
  breadcrumb_label: 'Pet Food Australia',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Pet Food Australia' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'pet-food-australia-' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'Pet Food Australia' },
  ],
  meta_title: 'Pet Food Australia | Dog & Cat Food | The Equestrian',
  meta_description:
    'Shop Pet Food Australia dog food, cat food, treats and pet care in Australia at The Equestrian. Australia-wide shipping.',
  h1_title: 'Shop Pet Food Australia',
  quick_answer:
    'Pet Food Australia is an Australian pet nutrition brand offering dog food, cat food, treats and everyday pet care. Shop Pet Food Australia at The Equestrian with Australian shipping.',
  short_description:
    '<p>Shop <strong>Pet Food Australia</strong> dog food, cat food, treats and everyday pet care products.</p>',
  long_description:
    '<h2>Pet Food Australia</h2><p>Browse Pet Food Australia in <a href="/pet/dog/food">dog food</a>, <a href="/pet/dog/treats">dog treats</a> and <a href="/pet/cat/food">cat food</a>.</p>',
  faq_items: [],
};

export default content;
