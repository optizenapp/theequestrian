import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'thorowgood',
  title: 'Thorowgood',
  breadcrumb_label: 'Thorowgood',
  logo_url: '/brands/logos/thorowgood.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Thorowgood' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'thorowgood-' },
  ],

  meta_title: 'Thorowgood Saddles at The Equestrian',
  meta_description:
    'Discover Thorowgood saddles in Australia. Shop all-purpose, dressage, and more at The Equestrian.',
  h1_title: 'Explore Thorowgood Saddles',

  quick_answer:
    'Thorowgood offers a range of high-quality saddles designed for various equestrian needs. Available in Australia at The Equestrian, their collection includes all-purpose, dressage, and compact saddles, catering to different horse conformations and rider preferences.',

  short_description: `Thorowgood is renowned for its innovative and comfortable saddles, designed to suit a variety of equestrian disciplines. <!--read-more-trigger--> Explore our selection of Thorowgood saddles, including the versatile T4 and T8 models, available in various fits and styles to accommodate different horse types and rider needs.`,

  long_description: `<h2>About Thorowgood Saddles</h2><p>Thorowgood is a trusted name in the equestrian world, known for crafting saddles that combine comfort, style, and functionality. At The Equestrian, we offer a diverse range of Thorowgood saddles to suit every rider's needs.</p><h3>All-Purpose Saddles</h3><p>The Thorowgood T4 and T8 all-purpose saddles are perfect for riders who enjoy a variety of disciplines. These saddles are available in compact designs and various wither fits, including high, standard, and low.</p><h3>Dressage Saddles</h3><p>For dressage enthusiasts, Thorowgood offers the T4 and T8 dressage saddles, designed to provide optimal support and balance. These saddles are available in high, standard, and low wither options to ensure a perfect fit for your horse.</p><h3>Accessories</h3><ul><li><a href="/horse/saddles/accessories">Saddle Accessories</a></li><li><a href="/horse/tack/stirrup-irons">Stirrup Irons</a></li></ul><p>Enhance your riding experience with Thorowgood's range of saddle accessories, including gullet plates and stirrup irons, available at The Equestrian.</p>`,

  faq_items: [
    {
      question: 'What types of saddles does Thorowgood offer?',
      answer:
        'Thorowgood offers all-purpose, dressage, and compact saddles, designed to fit various horse conformations and rider preferences.',
    },
    {
      question: 'Are Thorowgood saddles available in different wither fits?',
      answer:
        'Yes, Thorowgood saddles are available in high, standard, and low wither fits to accommodate different horse shapes.',
    },
    {
      question: 'Can I find pre-loved Thorowgood saddles?',
      answer:
        'Yes, pre-loved Thorowgood saddles, such as the T8 GP 17", are available at The Equestrian.',
    },
    {
      question: 'What materials are Thorowgood saddles made from?',
      answer:
        'Thorowgood saddles are made from high-quality synthetic materials that offer durability and easy maintenance.',
    },
    {
      question: 'Where can I purchase Thorowgood saddles in Australia?',
      answer:
        'You can purchase Thorowgood saddles at The Equestrian, available both online and in-store.',
    },
  ],
};

export default content;
