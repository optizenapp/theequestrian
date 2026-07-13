import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'toptac',
  title: 'Toptac',
  breadcrumb_label: 'Toptac',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Toptac' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'toptac-' },
  ],

  meta_title: 'Toptac Equestrian Gear in Australia',
  meta_description:
    'Discover premium Toptac equestrian gear at The Equestrian. Shop tendon boots, accessories, and more for all your riding needs.',
  h1_title: 'Explore Toptac Equestrian Gear',

  quick_answer:
    'Toptac offers a wide range of equestrian products including tendon boots, overreach boots, and accessories. Available at The Equestrian, Toptac products are designed to provide comfort and protection for both horse and rider. Shop in Australia for quality gear that meets your riding needs.',

  short_description: `<p>Discover the Toptac range at The Equestrian, featuring high-quality equestrian products such as tendon boots, overreach boots, and stylish accessories. <!--read-more-trigger--> Perfect for both casual riders and competitive equestrians, Toptac offers durability and style.</p>`,

  long_description: `<h2>About Toptac</h2><p>Toptac is renowned for its innovative and durable equestrian products. At The Equestrian, we offer a selection of Toptac gear designed to enhance your riding experience.</p><h3>Tendon Boots</h3><p>Our <a href="/horse/boots/tendon-boots">Toptac Tendon Boots</a> provide superior protection and comfort for your horse, available in classic black and white fleece options.</p><h3>Accessories</h3><p>Explore our <a href="/clothing/accessories">Toptac Accessories</a>, including English Hat Boxes, perfect for keeping your gear organized and protected.</p><h3>Feeding Solutions</h3><p>The <a href="/horse/stable/feeding">Toptac Ground Feeder</a> is designed for stability and ease of use, ensuring your horse's feeding needs are met efficiently.</p><ul><li>Durable construction</li><li>Stylish designs</li><li>Available in various colors</li></ul>`,

  faq_items: [
    {
      question: 'What types of boots does Toptac offer?',
      answer:
        'Toptac offers tendon boots and overreach boots, designed to provide protection and comfort for your horse.',
    },
    {
      question: 'Where can I buy Toptac products in Australia?',
      answer:
        'Toptac products are available at The Equestrian, both online and in-store across Australia.',
    },
    {
      question: 'Are Toptac products suitable for competitive riding?',
      answer:
        'Yes, Toptac products are designed for both casual and competitive equestrians, offering durability and performance.',
    },
    {
      question: 'What accessories does Toptac provide?',
      answer:
        'Toptac offers a range of accessories including English Hat Boxes and other equestrian gear organizers.',
    },
    {
      question: 'Do Toptac boots come in different colors?',
      answer:
        'Yes, Toptac boots are available in various colors, including classic black and white options.',
    },
  ],
};

export default content;
