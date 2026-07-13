import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'kask',
  title: 'KASK',
  breadcrumb_label: 'KASK Helmets',
  logo_url: '/brands/logos/kask.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'KASK Helmets' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'kask-' },
  ],

  meta_title: 'KASK Equestrian Helmets Australia',
  meta_description:
    'Discover premium KASK equestrian helmets in Australia. Shop stylish and safe designs at The Equestrian.',
  h1_title: 'KASK Equestrian Helmets',

  quick_answer:
    'KASK is a renowned brand offering high-quality equestrian helmets known for their innovative design and safety features. Available in Australia at The Equestrian, KASK helmets provide riders with style and protection. Explore various models including the Star Lady and Dogma series, each crafted to meet the needs of discerning riders.',

  short_description: `<p>KASK helmets are a top choice for equestrians seeking a blend of safety and style. With models like the Star Lady and Dogma, these helmets offer advanced protection and elegant design. <!--read-more-trigger--> Shop the range at The Equestrian for quality helmets that cater to both competitive and leisure riders.</p>`,

  long_description: `<h2>About KASK Helmets</h2><p>KASK is synonymous with excellence in the equestrian world, offering helmets that combine cutting-edge technology with Italian craftsmanship. Each helmet is designed to provide maximum safety and comfort.</p><h3>Star Lady Collection</h3><p>The Star Lady helmets are designed for female riders, featuring a wider brim for sun protection and a sleek design.</p><ul><li><a href="/rider/helmets/kask-star-lady">KASK Star Lady</a></li><li><a href="/rider/helmets/kask-star-lady-jessica-springsteen-limited-edition">KASK Star Lady Jessica Springsteen Limited Edition</a></li></ul><h3>Dogma Series</h3><p>The Dogma series is known for its innovative design and superior safety features, making it a favorite among professional riders.</p><ul><li><a href="/rider/helmets/kask-dogma-hunter">KASK Dogma Hunter</a></li><li><a href="/rider/helmets/kask-dogma-chrome-everyrose-wg11">KASK Dogma Chrome Everyrose</a></li></ul>`,

  faq_items: [
    {
      question: 'What makes KASK helmets unique?',
      answer:
        'KASK helmets are unique for their blend of safety, comfort, and style, featuring advanced technologies and Italian design.',
    },
    {
      question: 'Are KASK helmets suitable for all types of riding?',
      answer:
        'Yes, KASK helmets are designed to cater to various equestrian disciplines, providing safety and comfort for both competitive and leisure riding.',
    },
    {
      question: 'How do I choose the right KASK helmet size?',
      answer:
        'To choose the right size, measure the circumference of your head and refer to the KASK sizing chart available at The Equestrian.',
    },
    {
      question: 'Can I replace the inner padding of my KASK helmet?',
      answer:
        'Yes, KASK helmets offer replaceable inner padding to ensure a perfect fit and maintain hygiene over time.',
    },
    {
      question: 'Where can I buy KASK helmets in Australia?',
      answer:
        'KASK helmets are available at The Equestrian, offering a wide range of models to suit different riding needs.',
    },
  ],
};

export default content;
