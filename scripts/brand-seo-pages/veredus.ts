import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'veredus',
  title: 'Veredus',
  breadcrumb_label: 'Veredus',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Veredus' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'veredus-' },
  ],

  meta_title: 'Veredus Horse Boots & Accessories',
  meta_description:
    'Explore Veredus horse boots and accessories in Australia at The Equestrian. Discover top-quality protection for your horse\'s legs.',
  h1_title: 'Veredus Horse Boots and Accessories',

  quick_answer:
    'Veredus is a leading brand in equestrian protection, offering a wide range of horse boots and accessories. Known for their innovative designs and high-quality materials, Veredus products are essential for ensuring the safety and performance of your horse. Shop Veredus at The Equestrian in Australia for top-notch leg protection.',

  short_description: `Veredus is synonymous with quality and innovation in the equestrian world. Their range of horse boots, including the popular Carbon Gel and Vento lines, provide unparalleled protection and comfort. <!--read-more-trigger--> Whether you're looking for tendon boots, fetlock boots, or dressage pads, Veredus has you covered. Discover their products at The Equestrian.`,

  long_description: `<h2>About Veredus</h2><p>Veredus is renowned for its commitment to quality and innovation in the equestrian industry. Their products are designed to provide superior protection and comfort for horses, ensuring optimal performance.</p><h3>Veredus Horse Boots</h3><ul><li><a href="/horse/boots">Horse Boots</a>: Offering a variety of styles including tendon and fetlock boots.</li><li><a href="/horse/boots/veredus-carbon-gel-grand-slam-boots-front-large-brown">Carbon Gel Grand Slam Boots</a>: Designed for maximum protection and style.</li><li><a href="/horse/boots/veredus-carbon-vento-front-boots-black">Carbon Vento Boots</a>: Known for their ventilation and comfort.</li></ul><h3>Veredus Dressage Pads</h3><ul><li><a href="/horse/pads/dressage">Dressage Pads</a>: Enhance your horse's comfort and performance.</li></ul>`,

  faq_items: [
    {
      question: 'What makes Veredus horse boots unique?',
      answer:
        'Veredus horse boots are unique due to their innovative design and use of high-quality materials that provide excellent protection and comfort for horses.',
    },
    {
      question: 'Where can I buy Veredus products in Australia?',
      answer:
        'You can purchase Veredus products at The Equestrian, a trusted retailer in Australia.',
    },
    {
      question: 'What types of horse boots does Veredus offer?',
      answer:
        'Veredus offers a range of horse boots including tendon boots, fetlock boots, and specialized options like the Carbon Gel and Vento lines.',
    },
    {
      question: 'Are Veredus boots suitable for all equestrian disciplines?',
      answer:
        'Yes, Veredus boots are designed to cater to various equestrian disciplines, providing protection and support for different activities.',
    },
    {
      question: 'Do Veredus boots come in different sizes?',
      answer:
        'Yes, Veredus boots are available in various sizes to fit different horse breeds and ensure a perfect fit.',
    },
  ],
};

export default content;
