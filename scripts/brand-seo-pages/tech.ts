import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'tech',
  title: 'Tech Equestrian Gear',
  breadcrumb_label: 'Tech',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Tech' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'tech-' },
  ],

  meta_title: 'Tech Equestrian Gear in Australia',
  meta_description:
    'Discover premium Tech equestrian gear at The Equestrian. Explore our range of boots, stirrups, and apparel for optimal performance.',
  h1_title: 'Tech Equestrian Gear',

  quick_answer:
    'Tech offers a premium range of equestrian gear known for its innovative technology and design. At The Equestrian, you can find Tech\'s high-quality products, including riding boots, stirrups, and apparel, ideal for enhancing performance and comfort during your equestrian activities in Australia.',

  short_description: `Tech is renowned for its cutting-edge equestrian gear, offering a variety of products designed to enhance performance and comfort. Explore our selection of Tech riding boots, stirrups, and apparel at The Equestrian. <!--read-more-trigger--> With a focus on innovation, Tech products are perfect for riders seeking quality and durability.`,

  long_description: `<h2>About Tech Equestrian Gear</h2><p>Tech is a leader in the equestrian industry, offering a range of products designed with advanced technology to meet the needs of riders.</p><h3>Tech Riding Boots</h3><ul><li><a href="/horse/boots">Explore our collection of Tech riding boots</a> for superior support and style.</li><li>Options include tendon boots, travel boots, and overreach boots.</li></ul><h3>Tech Stirrups</h3><ul><li>Discover the safety and comfort of Tech stirrups, available in various designs.</li></ul><h3>Tech Apparel</h3><ul><li>Our selection includes Tech riding jackets and shirts, perfect for both men and women.</li><li>Find the ideal Tech apparel <a href="/clothing/womens">for women</a> and <a href="/clothing/mens">for men</a>.</li></ul>`,

  faq_items: [
    {
      question: 'What types of Tech riding boots are available?',
      answer:
        'Tech offers a variety of riding boots including tendon boots, travel boots, and overreach boots.',
    },
    {
      question: 'Are Tech stirrups safe for riding?',
      answer:
        'Yes, Tech stirrups are designed with safety in mind, providing comfort and stability for riders.',
    },
    {
      question: 'What Tech apparel is available for women?',
      answer:
        'Tech offers a range of women\'s apparel including riding jackets and shirts.',
    },
    {
      question: 'Where can I buy Tech equestrian gear in Australia?',
      answer:
        'You can purchase Tech equestrian gear at The Equestrian, a leading retailer in Australia.',
    },
    {
      question: 'Is Tech gear suitable for professional riders?',
      answer:
        'Yes, Tech gear is designed for both amateur and professional riders, offering high-quality performance and durability.',
    },
  ],
};

export default content;
