import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'effax',
  title: 'Effax',
  breadcrumb_label: 'Effax',
  logo_url: '/brands/logos/effax.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Effax' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'effax-' },
  ],

  meta_title: 'Effax Leather Care Products in Australia',
  meta_description:
    'Discover premium Effax leather care products at The Equestrian. Explore balsam, creams, and more for superior leather maintenance.',
  h1_title: 'Effax Leather Care Products',

  quick_answer:
    'Effax offers a superior range of leather care products designed to maintain and enhance the quality of your equestrian gear. Available at The Equestrian in Australia, Effax products include leather balsam, creams, and grip sticks, ensuring your leather items remain in top condition.',

  short_description: `Effax is renowned for its exceptional leather care products, perfect for maintaining your equestrian gear. <!--read-more-trigger--> From leather balsams to grip sticks, Effax ensures your leather items are always in pristine condition.`,

  long_description: `<h2>About Effax</h2><p>Effax is a trusted name in leather care, offering a range of products that ensure your equestrian gear remains in excellent condition. Whether you need to clean, condition, or enhance grip, Effax has you covered.</p><h3>Effax Leather Balsam</h3><p>Effax Leather Balsam is perfect for conditioning and preserving leather. It's ideal for keeping your saddles and bridles supple.</p><h3>Effax Leather Combi</h3><p>Effax Leather Combi cleans and conditions in one easy step, making it a convenient choice for busy riders.</p><h3>Effax Leather Cream</h3><p>Effax Leather Cream provides deep conditioning, perfect for restoring dry or cracked leather.</p><h3>Effax Leather Grip Stick</h3><p>Effax Leather Grip Stick enhances grip, ensuring a secure ride.</p><ul><li>Effax Leather Balsam</li><li>Effax Leather Combi</li><li>Effax Leather Cream</li><li>Effax Leather Grip Stick</li></ul>`,

  faq_items: [
    {
      question: 'What is Effax Leather Balsam used for?',
      answer:
        'Effax Leather Balsam is used for conditioning and preserving leather, keeping it supple and protected.',
    },
    {
      question: 'How does Effax Leather Combi work?',
      answer:
        'Effax Leather Combi cleans and conditions leather in one step, making it a convenient choice for maintenance.',
    },
    {
      question: 'Can Effax Leather Cream restore dry leather?',
      answer:
        'Yes, Effax Leather Cream is designed to deeply condition and restore dry or cracked leather.',
    },
    {
      question: 'What is the purpose of the Effax Leather Grip Stick?',
      answer:
        'The Effax Leather Grip Stick enhances grip on leather surfaces, providing a more secure ride.',
    },
    {
      question: 'Where can I buy Effax products in Australia?',
      answer:
        'Effax products are available at The Equestrian, your trusted Australian retailer for equestrian supplies.',
    },
  ],
};

export default content;
