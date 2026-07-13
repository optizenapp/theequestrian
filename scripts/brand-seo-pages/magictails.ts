import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'magictails',
  title: 'Magictails',
  breadcrumb_label: 'Magictails',
  logo_url: '/brands/logos/magictails.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Magictails' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'magictails-' },
  ],

  meta_title: 'Magictails Horse Grooming Products',
  meta_description:
    'Discover premium horse grooming products by Magictails at The Equestrian. Enhance your horse\'s coat with shampoos, conditioners, and more.',
  h1_title: 'Explore Magictails Grooming Products',

  quick_answer:
    'Magictails offers a range of premium horse grooming products available in Australia at The Equestrian. From shampoos to conditioners, each product is designed to enhance your horse\'s coat, ensuring a show-ready shine and healthy appearance. Explore the collection to find the perfect grooming solution for your equine companion.',

  short_description: `Magictails provides a comprehensive range of grooming products designed to keep your horse looking its best. From the <a href="/horse/grooming/shampoo">Magictails White Magic Shampoo</a> to the <a href="/horse/grooming/coat-care">Magictails Shine Serum</a>, each product is crafted to deliver exceptional results. <!--read-more-trigger--> Discover the full range of Magictails products at The Equestrian.`,

  long_description: `<h2>About Magictails</h2><p>Magictails is renowned for its exceptional horse grooming products, available in Australia at The Equestrian. Each product is formulated to enhance the natural beauty of your horse's coat.</p><h3>Shampoos</h3><ul><li><a href="/horse/grooming/shampoo">Magictails White Magic Shampoo</a> - Perfect for brightening and enhancing white coats.</li><li><a href="/horse/grooming/shampoo">Shampoo Magictails Magic Wash 1litre</a> - A versatile option for all coat colours.</li></ul><h3>Conditioners</h3><ul><li><a href="/horse/grooming/products">Conditioner Magictails Creme 1litre</a> - Provides deep conditioning for a soft, manageable mane and tail.</li></ul><h3>Colour & Shade</h3><ul><li><a href="/horse/grooming/show-prep">Magictails Colour & Shade Make Up</a> - Available in Black and White, ideal for show prep.</li></ul><h3>Shine Products</h3><ul><li><a href="/horse/grooming/coat-care">Magictails Shine Serum 120ml</a> - Adds a brilliant shine to your horse's coat.</li></ul>`,

  faq_items: [
    {
      question: 'What is the best shampoo for white horses?',
      answer:
        'Magictails White Magic Shampoo is ideal for enhancing and brightening the coats of white horses.',
    },
    {
      question: 'How can I add shine to my horse\'s coat?',
      answer:
        'Magictails Shine Serum is perfect for adding a brilliant shine to your horse\'s coat.',
    },
    {
      question: 'Are Magictails products suitable for show preparation?',
      answer:
        'Yes, Magictails offers a range of products like Colour & Shade Make Up, ideal for show preparation.',
    },
    {
      question: 'Where can I buy Magictails products in Australia?',
      answer:
        'Magictails products are available at The Equestrian, a leading retailer in Australia.',
    },
    {
      question: 'What size options are available for Magictails conditioners?',
      answer:
        'Magictails conditioners are available in sizes such as 1 litre and 250 ml.',
    },
  ],
};

export default content;
