import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'wahl',
  title: 'Wahl',
  breadcrumb_label: 'Wahl',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Wahl' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'wahl-' },
  ],

  meta_title: 'Wahl Horse Clippers & Blades Australia',
  meta_description:
    'Discover Wahl horse clippers and blades at The Equestrian. Shop our range of corded and cordless clippers, trimmers, and spare blades for optimal grooming.',
  h1_title: 'Wahl Horse Clippers and Accessories',

  quick_answer:
    'Wahl offers a comprehensive range of horse clippers and grooming accessories at The Equestrian. Known for their reliability and precision, Wahl clippers and blades ensure your horse looks its best. Whether you need a corded or cordless clipper, or specific spare blades, Wahl has the solution for every grooming need in Australia.',

  short_description: `Explore the extensive range of Wahl horse clippers and accessories available at The Equestrian. From corded to cordless options, Wahl provides high-quality grooming solutions for every need. <!--read-more-trigger--> Discover spare blades and trimmers designed to keep your horse looking show-ready.`,

  long_description: `<h2>About Wahl Horse Clippers</h2><p>Wahl is a trusted name in the equestrian community, offering a variety of clippers and grooming tools that cater to both professional and personal use. Their products are designed to deliver precision and ease of use.</p><h3>Wahl Clippers</h3><ul><li><a href="/horse/stable/clippers">Corded and Cordless Clippers</a>: Ideal for various grooming tasks.</li><li>Show Pro Kit: Perfect for show-ready grooming.</li><li>Smart Clip: Advanced features for precise clipping.</li></ul><h3>Wahl Blades</h3><ul><li>Spare Blades: Available in multiple sizes for different clippers.</li><li>Premium Blades: Medium width and fine options for detailed grooming.</li></ul><h3>Wahl Trimmers</h3><ul><li>Pocket Pro Trimmer: Compact and efficient for touch-ups.</li></ul>`,

  faq_items: [
    {
      question: 'What types of clippers does Wahl offer?',
      answer:
        'Wahl offers both corded and cordless clippers, suitable for various grooming needs. They also provide comprehensive kits like the Show Pro Kit.',
    },
    {
      question: 'Are there spare blades available for Wahl clippers?',
      answer:
        'Yes, Wahl offers a range of spare blades in different sizes, including standard and premium options for detailed grooming.',
    },
    {
      question: 'Can I use Wahl clippers for show grooming?',
      answer:
        'Absolutely, Wahl clippers such as the Show Pro Kit are designed to meet the high standards required for show grooming.',
    },
    {
      question: 'What is the difference between Wahl\'s corded and cordless clippers?',
      answer:
        'Corded clippers provide consistent power, while cordless clippers offer flexibility and ease of movement, making them ideal for hard-to-reach areas.',
    },
    {
      question: 'Where can I purchase Wahl clippers in Australia?',
      answer:
        'Wahl clippers and accessories are available at The Equestrian, offering a wide selection for all your grooming needs.',
    },
  ],
};

export default content;
