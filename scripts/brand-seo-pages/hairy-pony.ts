import type { BrandSEOContent } from '../run-brand-seo-update';

/**
 * Canonical hub: /brands/hairy-pony
 * /brands/hairy 301s here (duplicate hub from HANDLE STARTS_WITH hairy-).
 */
const content: BrandSEOContent = {
  handle: 'hairy-pony',
  title: 'Hairy Pony',
  breadcrumb_label: 'Hairy Pony',
  logo_url: '/brands/logos/hairy-pony.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Hairy Pony' },
    { column: 'BRAND', relation: 'EQUALS', condition: 'Hairy' },
    { column: 'BRAND', relation: 'EQUALS', condition: 'Hairy Pony Grooming Products' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'hairy-' },
  ],

  meta_title: 'Hairy Pony Grooming | The Equestrian',
  meta_description:
    'Shop Hairy Pony horse grooming products in Australia at The Equestrian. Shampoo, coat care and stable essentials with Australian shipping.',
  h1_title: 'Shop Hairy Pony Grooming Products',

  quick_answer:
    'Hairy Pony is an Australian horse grooming brand. Shop Hairy Pony shampoo and coat-care products at The Equestrian, with Australian shipping.',

  short_description: `<p>Shop <strong>Hairy Pony</strong> grooming products for everyday coat care, bathing and stable use.</p>
<!--read-more-trigger-->
<p>Browse Hairy Pony alongside our wider <a href="/horse/grooming">horse grooming</a> range.</p>`,

  long_description: `<h2>About Hairy Pony</h2>
<p>
Hairy Pony (also listed historically as Hairy) makes horse grooming products used for bathing and coat care. The range sits with other stable and grooming essentials rather than riding apparel or tack.
</p>

<h2>Hairy Pony Grooming Range</h2>
<p>
Look for shampoos and coat-care products designed for regular stable use. Compare with other options in <a href="/horse/grooming">horse grooming</a> if you are building a wash-day kit.
</p>`,

  faq_items: [
    {
      question: 'Is Hairy the same as Hairy Pony?',
      answer:
        'Yes. Hairy and Hairy Pony refer to the same grooming brand. All products are listed on the Hairy Pony brand page.',
    },
    {
      question: 'Can I buy Hairy Pony in Australia?',
      answer: 'Yes. You can shop Hairy Pony grooming products at The Equestrian with Australian shipping.',
    },
  ],
};

export default content;
