import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'showcraft',
  title: 'Showcraft Equestrian Gear in Australia',
  breadcrumb_label: 'Showcraft',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Showcraft' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'showcraft-' },
  ],

  meta_title: 'Showcraft Equestrian Gear | The Equestrian',
  meta_description:
    'Discover Showcraft\'s premium equestrian gear at The Equestrian. From bridles to helmets, find everything you need for horse and rider.',
  h1_title: 'Showcraft Equestrian Gear',

  quick_answer:
    'Showcraft offers a comprehensive range of equestrian gear, including bridles, bits, and helmets, designed for both horse and rider. Available at The Equestrian in Australia, Showcraft products are known for their quality and durability, making them a popular choice among equestrians.',

  short_description: `Showcraft provides a wide selection of equestrian products, from the Showcraft Crystal Hanovarian Bridle to the Showcraft Lite Dialup Helmet. <!--read-more-trigger--> Explore our collection to find the perfect gear for your riding needs.`,

  long_description: `<h2>About Showcraft</h2><p>Showcraft is renowned for its high-quality equestrian products, catering to both horse and rider. At The Equestrian, we offer a curated selection of Showcraft items designed to enhance your riding experience.</p><h3>Bridles</h3><p>Our collection includes the elegant <a href="/horse/tack/bridles">Showcraft Crystal Hanovarian Bridle</a>, perfect for competitions and everyday riding.</p><h3>Bits</h3><ul><li><a href="/horse/bits/showcraft-sweet-iron-mouth-bit-normal">Sweet Iron Mouth Bit - Normal</a></li><li><a href="/horse/bits/showcraft-loose-ring-training-snaffle">Loose Ring Training Snaffle</a></li><li><a href="/horse/bits/showcraft-ss-oval-link-training-bit-14mm">SS Oval Link Training Bit 14mm</a></li></ul><h3>Helmets</h3><p>Ensure safety with the <a href="/rider/helmets/showcraft-lite-dialup-helmet">Showcraft Lite Dialup Helmet</a>, offering comfort and protection for riders.</p><h3>Kids' Footwear</h3><p>For young riders, explore our <a href="/clothing/kids/footwear">Tackers Childs Brown</a> footwear, designed for durability and style.</p>`,

  faq_items: [
    {
      question: 'What types of bridles does Showcraft offer?',
      answer:
        'Showcraft offers a variety of bridles, including the Crystal Hanovarian Bridle, known for its elegance and quality.',
    },
    {
      question: 'Are Showcraft helmets adjustable?',
      answer:
        'Yes, the Showcraft Lite Dialup Helmet is adjustable, providing a comfortable fit for different head sizes.',
    },
    {
      question: 'What materials are used in Showcraft bits?',
      answer:
        'Showcraft bits, such as the Sweet Iron Mouth Bit, are crafted from durable materials designed for effective training and comfort.',
    },
    {
      question: 'Does Showcraft offer products for children?',
      answer:
        'Yes, Showcraft offers products for children, including the Tackers Childs Brown footwear, ideal for young equestrians.',
    },
    {
      question: 'Where can I buy Showcraft products in Australia?',
      answer:
        'Showcraft products are available at The Equestrian, where you can find a wide range of equestrian gear for both horse and rider.',
    },
  ],
};

export default content;
