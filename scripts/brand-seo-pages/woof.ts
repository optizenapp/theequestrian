import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'woof',
  title: 'Woof Equestrian Gear',
  breadcrumb_label: 'Woof',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Woof' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'woof-' },
  ],

  meta_title: 'Woof Equestrian Gear - Shop in Australia',
  meta_description:
    'Discover premium Woof equestrian gear at The Equestrian. Shop brushing boots, bell boots, and more for top performance in Australia.',
  h1_title: 'Explore Woof Equestrian Gear',

  quick_answer:
    'Woof offers a diverse range of equestrian gear including brushing boots, bell boots, and polo bandages, available at The Equestrian in Australia. Renowned for quality and durability, Woof products ensure your horse\'s comfort and protection during every ride.',

  short_description: `Woof is a leading brand in equestrian gear, providing high-quality products such as brushing boots, bell boots, and polo bandages. <!--read-more-trigger--> Available at The Equestrian, Woof products are designed to offer superior protection and comfort for your horse.`,

  long_description: `<h2>About Woof</h2><p>Woof is a trusted name in the equestrian world, known for its innovative and durable horse gear. At The Equestrian, we offer a wide selection of Woof products to meet the needs of riders and their horses.</p><h3>Brushing Boots</h3><p>Woof's brushing boots, including the <a href="/horse/boots/woof-double-velcro-brushing-boots-black">Double Velcro Brushing Boots</a> and <a href="/horse/boots/woof-club-brushing-boots-neoprene-black">Neoprene Club Brushing Boots</a>, provide excellent leg protection and are available in a variety of colors.</p><h3>Bell Boots</h3><p>Our range of <a href="/horse/boots/bell-boots">bell boots</a> includes the Black & Orange Woof Medium Bell Boot and the Black Woof Overreach Pro Bell Boot, designed to prevent overreach injuries.</p><h3>Polo Bandages</h3><p>The Bandage Polo Vision Set, available in colors like Champagne and Navy, ensures your horse's legs are well-supported and stylish.</p><ul><li>Durable materials</li><li>Variety of colors</li><li>Trusted brand</li></ul>`,

  faq_items: [
    {
      question: 'What types of products does Woof offer?',
      answer:
        'Woof offers a variety of equestrian products including brushing boots, bell boots, and polo bandages.',
    },
    {
      question: 'Where can I buy Woof products in Australia?',
      answer:
        'You can purchase Woof products at The Equestrian, a leading retailer in Australia.',
    },
    {
      question: 'Are Woof brushing boots available in different colors?',
      answer:
        'Yes, Woof brushing boots are available in multiple colors including black, white, and ultra violet.',
    },
    {
      question: 'What are the benefits of Woof bell boots?',
      answer:
        'Woof bell boots are designed to prevent overreach injuries, providing protection and durability.',
    },
    {
      question: 'Can I find Woof polo bandages at The Equestrian?',
      answer:
        'Yes, The Equestrian offers a range of Woof polo bandages in various colors.',
    },
  ],
};

export default content;
