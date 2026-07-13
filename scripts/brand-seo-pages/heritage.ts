import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'heritage',
  title: 'Ariat Heritage Collection',
  breadcrumb_label: 'Ariat',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Ariat' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'heritage-' },
  ],

  meta_title: 'Ariat Heritage Boots & Apparel',
  meta_description:
    'Discover Ariat Heritage boots and apparel at The Equestrian. Shop our range of riding boots, paddock boots, and more for men, women, and kids.',
  h1_title: 'Ariat Heritage Collection',

  quick_answer:
    'Ariat Heritage offers a premium range of equestrian footwear and apparel, available at The Equestrian in Australia. Known for their durability and comfort, the collection includes riding boots, paddock boots, and more for all riders.',

  short_description: `<p>Explore the Ariat Heritage collection at The Equestrian, featuring a variety of footwear options for men, women, and kids. From the classic Heritage IV Zip to the robust Heritage Roper, find the perfect fit for your riding needs. <!--read-more-trigger--> With a focus on comfort and durability, Ariat Heritage products are designed to perform in any equestrian setting.</p>`,

  long_description: `<h2>About Ariat Heritage</h2><p>The Ariat Heritage collection is renowned for its blend of classic style and modern performance. Designed for equestrians who demand quality and comfort, this range includes a variety of footwear options.</p><h3>Riding Boots</h3><p>Our selection of Ariat Heritage riding boots offers superior support and durability, perfect for both casual riders and professionals. Key products include:</p><ul><li><a href="/clothing/footwear/ariat-mens-heritage-iv-zip-paddock">Ariat Men's Heritage IV Zip Paddock</a></li><li><a href="/clothing/footwear/ariat-womens-heritage-iv-zip-paddock-boot">Ariat Women's Heritage IV Zip Paddock Boot</a></li><li><a href="/clothing/footwear/ariat-field-boots-heritage-contour-black-mens">Ariat Field Boots Heritage Contour Black Mens</a></li></ul><h3>Paddock Boots</h3><p>Experience the perfect blend of style and function with Ariat paddock boots, ideal for stable work and riding.</p><ul><li><a href="/clothing/footwear/ariat-boots-heritage-zip-iv-paddock-black-ladies">Ariat Boots Heritage Zip IV Paddock Black Ladies</a></li><li><a href="/clothing/footwear/ariat-boots-heritage-zip-iv-paddock-brown-ladies">Ariat Boots Heritage Zip IV Paddock Brown Ladies</a></li></ul>`,

  faq_items: [
    {
      question: 'What makes Ariat Heritage boots special?',
      answer:
        'Ariat Heritage boots are known for their durability, comfort, and classic design, making them a top choice for equestrians.',
    },
    {
      question: 'Are Ariat Heritage boots suitable for all weather conditions?',
      answer:
        'Yes, many Ariat Heritage boots are designed to withstand various weather conditions, offering protection and comfort.',
    },
    {
      question: 'Do Ariat Heritage boots come in different sizes?',
      answer:
        'Yes, Ariat Heritage boots are available in a range of sizes for men, women, and children to ensure a perfect fit.',
    },
    {
      question: 'Can I use Ariat Heritage boots for both riding and casual wear?',
      answer:
        'Absolutely, Ariat Heritage boots are versatile enough for riding and can also be worn as stylish casual footwear.',
    },
    {
      question: 'Where can I buy Ariat Heritage boots in Australia?',
      answer:
        'You can purchase Ariat Heritage boots at The Equestrian, both online and in-store across Australia.',
    },
  ],
};

export default content;
