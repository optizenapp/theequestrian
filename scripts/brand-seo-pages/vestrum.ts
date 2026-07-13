import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'vestrum',
  title: 'Vestrum',
  breadcrumb_label: 'Vestrum',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Vestrum' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'vestrum-' },
  ],

  meta_title: 'Vestrum Equestrian Apparel in Australia',
  meta_description:
    'Discover premium Vestrum equestrian clothing at The Equestrian. Shop jackets, shirts, breeches, and more for the ultimate riding experience.',
  h1_title: 'Vestrum Equestrian Clothing',

  quick_answer:
    'Vestrum offers a sophisticated range of equestrian apparel, including jackets, shirts, and breeches, designed for both style and performance. Available at The Equestrian in Australia, Vestrum\'s collection ensures riders have access to high-quality, functional, and stylish clothing for all equestrian activities.',

  short_description: `<p>Explore the elegant and functional world of Vestrum equestrian apparel. Known for their exquisite design and quality, Vestrum offers a wide range of clothing options for riders, including jackets, shirts, and breeches. <!--read-more-trigger--> Whether you're competing or training, Vestrum ensures you do so in style and comfort.</p>`,

  long_description: `<h2>About Vestrum</h2><p>Vestrum is a renowned brand in the equestrian world, offering a blend of Italian craftsmanship and innovative design. Their collection is tailored to meet the needs of riders who seek both performance and elegance.</p><h3>Jackets</h3><p>Vestrum jackets, such as the <a href="/clothing/outerwear/show-jackets">Vestrum Canberra Competition Jacket</a> and <a href="/clothing/womens/vestrum-berna-padded-down-jacket">Vestrum Berna Padded Down Jacket</a>, provide warmth and style for various equestrian activities.</p><h3>Shirts</h3><p>Choose from a selection of <a href="/clothing/tops/show-shirts">show shirts</a> like the Vestrum Halstatt Competition Shirt, designed for comfort and breathability.</p><h3>Breeches</h3><p>Vestrum breeches, including the <a href="/clothing/womens/breeches">Women's Vestrum Roma V Grip Breeches</a>, offer superior grip and fit for optimal riding performance.</p><h3>Accessories</h3><ul><li><a href="/clothing/accessories/socks">Vestrum Socks</a> - Essential for comfort and support during rides.</li></ul>`,

  faq_items: [
    {
      question: 'What types of clothing does Vestrum offer?',
      answer:
        'Vestrum offers a variety of equestrian clothing including jackets, shirts, breeches, and accessories like socks.',
    },
    {
      question: 'Where can I buy Vestrum clothing in Australia?',
      answer:
        'Vestrum clothing is available at The Equestrian, a leading retailer of equestrian apparel in Australia.',
    },
    {
      question: 'Are Vestrum breeches suitable for competition?',
      answer:
        'Yes, Vestrum breeches are designed for competition, offering excellent grip and a comfortable fit.',
    },
    {
      question: 'What makes Vestrum jackets unique?',
      answer:
        'Vestrum jackets combine Italian craftsmanship with modern design, providing warmth, style, and functionality.',
    },
    {
      question: 'Do Vestrum shirts offer breathability?',
      answer:
        'Yes, Vestrum shirts are designed for breathability and comfort, making them ideal for both training and competition.',
    },
  ],
};

export default content;
