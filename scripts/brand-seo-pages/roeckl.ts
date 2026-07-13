import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'roeckl',
  title: 'Roeckl Equestrian Gloves',
  breadcrumb_label: 'Roeckl',
  logo_url: '/brands/logos/roeckl.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Roeckl' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'roeckl-' },
  ],

  meta_title: 'Roeckl Equestrian Gloves in Australia',
  meta_description:
    'Discover Roeckl gloves at The Equestrian, perfect for riders seeking quality and style in Australia. Explore our selection for superior grip and comfort.',
  h1_title: 'Roeckl Equestrian Gloves',

  quick_answer:
    'Roeckl gloves are renowned for their exceptional quality and design, making them a top choice for equestrians in Australia. At The Equestrian, we offer a wide range of Roeckl gloves, including the popular Lisboa, Madrid, and Meura lines, ensuring riders find the perfect fit for superior grip and comfort.',

  short_description: `<p>Explore the premium selection of Roeckl gloves at The Equestrian. Known for their superior grip and comfort, these gloves are perfect for any riding enthusiast. <!--read-more-trigger--> Whether you're looking for Roeckl Lisboa, Madrid, or Meura, find your ideal pair today.</p>`,

  long_description: `<h2>About Roeckl Gloves</h2><p>Roeckl is a distinguished brand in the equestrian world, celebrated for crafting high-quality gloves that offer both style and functionality. At The Equestrian, we provide a diverse range of Roeckl gloves to suit various riding needs.</p><h3>Lisboa Gloves</h3><p>The Roeckl Lisboa gloves are designed for elegance and performance, available in navy and white. Perfect for competitive events or casual riding.</p><h3>Madrid Gloves</h3><p>For those seeking a blend of style and practicality, the Roeckl Madrid gloves in black & gold or white offer a sophisticated touch.</p><h3>Meura Gloves</h3><p>Available in black, chocolate, and dress blue, the Roeckl Meura gloves provide excellent grip and comfort for everyday use.</p><ul><li><a href="/rider/gloves">All Gloves</a></li><li><a href="/rider/gloves/roeckl-lisboa-gloves-navy">Lisboa Navy</a></li><li><a href="/rider/gloves/roeckl-madrid-gloves-black-gold">Madrid Black & Gold</a></li></ul>`,

  faq_items: [
    {
      question: 'What makes Roeckl gloves unique?',
      answer:
        'Roeckl gloves are known for their high-quality materials and exceptional craftsmanship, providing superior grip and comfort for riders.',
    },
    {
      question: 'Which Roeckl gloves are best for competitions?',
      answer:
        'The Roeckl Lisboa gloves are ideal for competitions due to their elegant design and excellent performance features.',
    },
    {
      question: 'Are Roeckl gloves suitable for all weather conditions?',
      answer:
        'Yes, Roeckl offers a variety of gloves, including options suitable for different weather conditions, ensuring comfort and grip year-round.',
    },
    {
      question: 'How do I choose the right size Roeckl gloves?',
      answer:
        'To find the right size, measure your hand\'s circumference and compare it to Roeckl\'s sizing chart available on The Equestrian\'s website.',
    },
    {
      question: 'Can I find Roeckl gloves for kids?',
      answer:
        'Yes, Roeckl offers a range of gloves for children, including the Roeckl Junior Grip Glove and Roeckl Koppl Kids Gloves.',
    },
  ],
};

export default content;
