import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'lami-cell',
  title: 'Lami-Cell',
  breadcrumb_label: 'Lami-Cell',
  logo_url: '/brands/logos/lami-cell.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Lami-Cell' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'lami-cell-' },
  ],

  meta_title: 'Lami-Cell Equestrian Gear Australia',
  meta_description:
    'Discover premium Lami-Cell equestrian gear in Australia, including grooming bags, bonnets, and boots. Shop quality horse products at The Equestrian.',
  h1_title: 'Explore Lami-Cell Equestrian Products',

  quick_answer:
    'Lami-Cell offers a wide range of high-quality equestrian products available at The Equestrian in Australia. From grooming essentials to protective boots and stylish bonnets, Lami-Cell ensures both horse and rider are equipped with the best gear for performance and comfort.',

  short_description: `Lami-Cell is renowned for its innovative equestrian products, designed to enhance the performance and comfort of both horse and rider. Explore our selection of grooming bags, bonnets, and protective boots. <!--read-more-trigger--> Discover the perfect blend of style and functionality with Lami-Cell at The Equestrian.`,

  long_description: `<h2>About Lami-Cell</h2><p>Lami-Cell is a trusted brand in the equestrian world, known for its dedication to quality and innovation. Their products are designed to meet the needs of both amateur and professional riders.</p><h3>Grooming Products</h3><p>Keep your horse looking its best with the <a href="/horse/grooming/lami-cell-shine-scrubber-5-pack">Lami-Cell Shine Scrubber</a> and stylish grooming bags like the <a href="/horse/grooming">Lami Cell Venus Grooming Bag</a>.</p><h3>Bonnets</h3><p>Protect your horse's ears with the elegant <a href="/horse/bonnets/lami-cell-titanium-ear-bonnet">Lami-Cell Titanium Ear Bonnet</a>, perfect for competitions and everyday use.</p><h3>Boots</h3><ul><li><a href="/horse/boots/fetlock">Fetlock Boots</a></li><li><a href="/horse/boots/eventing">Eventing Boots</a></li></ul><p>Ensure your horse's legs are well-protected with Lami-Cell's range of boots, including the V22 Deep Fetlock Boots and V22 Front Eventing Boots.</p>`,

  faq_items: [
    {
      question: 'What types of products does Lami-Cell offer?',
      answer:
        'Lami-Cell offers a variety of equestrian products including grooming bags, bonnets, protective boots, and more.',
    },
    {
      question: 'Where can I buy Lami-Cell products in Australia?',
      answer:
        'You can purchase Lami-Cell products at The Equestrian, a leading retailer of equestrian gear in Australia.',
    },
    {
      question: 'Are Lami-Cell products suitable for competitive riding?',
      answer:
        'Yes, Lami-Cell products are designed for both amateur and professional riders, making them suitable for competitive riding.',
    },
    {
      question: 'What is the Lami-Cell Shine Scrubber used for?',
      answer:
        'The Lami-Cell Shine Scrubber is used for grooming horses, helping to keep their coats clean and shiny.',
    },
    {
      question: 'Do Lami-Cell boots offer protection for horse legs?',
      answer:
        'Yes, Lami-Cell boots, such as the V22 Deep Fetlock Boots, provide excellent protection for horse legs during riding.',
    },
  ],
};

export default content;
