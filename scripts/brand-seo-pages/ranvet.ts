import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'ranvet',
  title: 'Ranvet',
  breadcrumb_label: 'Ranvet',
  logo_url: '/brands/logos/ranvet.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Ranvet' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'ranvet-' },
  ],

  meta_title: 'Ranvet Horse Supplements & Care Products',
  meta_description:
    'Discover Ranvet\'s range of horse supplements and care products at The Equestrian, your trusted Australian equestrian retailer.',
  h1_title: 'Ranvet Horse Supplements and Care',

  quick_answer:
    'Ranvet offers a comprehensive range of horse supplements and care products at The Equestrian, designed to support the health and performance of your equine companion. From amino acid pastes to essential bandage wraps, Ranvet products are trusted by equestrians across Australia.',

  short_description: `Ranvet is a leading name in equine health, offering a wide range of products to support your horse's wellbeing. From <a href="/horse/supplements">supplements</a> to <a href="/horse/boots/bandages">bandages</a>, discover the best for your horse at The Equestrian. <!--read-more-trigger--> Explore our selection of Ranvet products to find the perfect solution for your horse's needs.`,

  long_description: `<h2>About Ranvet</h2><p>Ranvet is renowned for its dedication to equine health, providing high-quality supplements and care products that cater to the diverse needs of horses. Trusted by professionals, Ranvet ensures your horse receives the best in nutrition and care.</p><h3>Supplements</h3><ul><li><a href="/horse/supplements/ranvet-aminovite-plus-3kg">Aminovite Plus 3kg</a> - A comprehensive vitamin and mineral supplement.</li><li><a href="/horse/supplements/ranvet-bc5-amino-acid-paste-55gm">BC5 Amino Acid Paste 55gm</a> - Supports muscle recovery and performance.</li><li><a href="/horse/supplements/ranvet-calm-paste-30gm">Calm Paste 30gm</a> - Helps manage stress and anxiety.</li><li><a href="/horse/supplements/ranvet-folactin-blue-5kg">Folactin Blue 5kg</a> - Enhances coat and hoof condition.</li><li><a href="/horse/supplements/ranvet-iron-plus-5lit">Iron Plus 5lit</a> - Boosts energy and vitality.</li></ul><h3>Care Products</h3><ul><li>Bandage Wrap Essential - Available in various sizes for optimal support.</li><li>Fungazol Cream - Effective against fungal infections.</li></ul>`,

  faq_items: [
    {
      question: 'What types of products does Ranvet offer?',
      answer:
        'Ranvet offers a variety of horse supplements and care products, including amino acid pastes, vitamin supplements, bandage wraps, and creams.',
    },
    {
      question: 'Where can I buy Ranvet products in Australia?',
      answer:
        'You can purchase Ranvet products at The Equestrian, a trusted Australian equestrian retailer.',
    },
    {
      question: 'Are Ranvet supplements suitable for all horses?',
      answer:
        'Ranvet supplements are formulated to meet the needs of various horses, but it\'s always best to consult with a veterinarian for specific dietary requirements.',
    },
    {
      question: 'How do Ranvet products support horse health?',
      answer:
        'Ranvet products are designed to enhance performance, support recovery, and maintain overall health through high-quality nutrition and care solutions.',
    },
    {
      question: 'Can Ranvet products help with horse anxiety?',
      answer:
        'Yes, Ranvet offers products like Calm Paste, which is specifically formulated to help manage stress and anxiety in horses.',
    },
  ],
};

export default content;
