import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'ps-of-sweden',
  title: 'PS Of Sweden',
  breadcrumb_label: 'PS Of Sweden',
  logo_url: '/brands/logos/ps-of-sweden.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'PS Of Sweden' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'ps-of-sweden-' },
  ],

  meta_title: 'PS Of Sweden Equestrian Gear in Australia',
  meta_description:
    'Discover premium PS Of Sweden equestrian gear at The Equestrian in Australia. Shop bridles, bonnets, saddle pads, and more for the discerning rider.',
  h1_title: 'PS Of Sweden Equestrian Products',

  quick_answer:
    'PS Of Sweden offers a premium selection of equestrian gear, including bridles, bonnets, and saddle pads, available at The Equestrian in Australia. Known for their innovative designs and high-quality materials, PS Of Sweden products are ideal for riders seeking performance and style.',

  short_description: `Explore the exquisite range of PS Of Sweden equestrian products at The Equestrian. Renowned for their innovative designs and superior craftsmanship, PS Of Sweden offers everything from stylish bonnets to high-performance saddle pads. <!--read-more-trigger--> Whether you're competing or training, PS Of Sweden ensures you and your horse look and perform at your best.`,

  long_description: `<h2>About PS Of Sweden</h2><p>PS Of Sweden is a leader in equestrian innovation, offering a wide range of products designed for both style and functionality. Their commitment to quality and design excellence makes them a top choice for riders worldwide.</p><h3>Bridles</h3><p>PS Of Sweden's bridles are crafted with precision and attention to detail, ensuring comfort and control. Explore our selection of <a href="/horse/tack/bridles">bridles</a> to find the perfect fit for your horse.</p><h3>Bonnets</h3><p>Keep your horse stylish and protected with PS Of Sweden's bonnets. Choose from options like the <a href="/horse/bonnets/ps-of-sweden-bow-fly-hat-thyme">Bow Fly Hat Thyme</a> and the <a href="/horse/bonnets/psos-bow-fly-hat-ombre-plum">Bow Fly Hat Ombre Plum</a>.</p><h3>Saddle Pads</h3><p>PS Of Sweden offers a variety of saddle pads designed for comfort and performance. Discover our range of <a href="/horse/pads/dressage">dressage pads</a> and jump pads to enhance your riding experience.</p><ul><li>Innovative designs for enhanced performance</li><li>High-quality materials for durability</li><li>Stylish options to suit every rider's taste</li></ul>`,

  faq_items: [
    {
      question: 'What makes PS Of Sweden products unique?',
      answer:
        'PS Of Sweden is known for its innovative designs, high-quality materials, and attention to detail, making their products a top choice for equestrians.',
    },
    {
      question: 'Where can I buy PS Of Sweden products in Australia?',
      answer:
        'You can purchase PS Of Sweden products at The Equestrian, a leading retailer of equestrian gear in Australia.',
    },
    {
      question: 'Do PS Of Sweden products cater to both dressage and jumping disciplines?',
      answer:
        'Yes, PS Of Sweden offers products suitable for both dressage and jumping, including specialized saddle pads and bridles.',
    },
    {
      question: 'Are PS Of Sweden bonnets available in different colors?',
      answer:
        'Yes, PS Of Sweden bonnets are available in various colors, such as thyme, wine, and ombre plum, to match your style.',
    },
    {
      question: 'How do I care for my PS Of Sweden saddle pad?',
      answer:
        'To care for your PS Of Sweden saddle pad, follow the washing instructions on the label, typically involving gentle machine washing and air drying.',
    },
  ],
};

export default content;
