import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'noble-outfitters',
  title: 'Noble Outfitters',
  breadcrumb_label: 'Noble Outfitters',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Noble Outfitters' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'noble-outfitters-' },
  ],

  meta_title: 'Noble Outfitters Equestrian Apparel',
  meta_description:
    'Explore Noble Outfitters for premium equestrian clothing and accessories in Australia. Shop belts, bracelets, caps, and more at The Equestrian.',
  h1_title: 'Discover Noble Outfitters at The Equestrian',

  quick_answer:
    'Noble Outfitters offers a wide range of equestrian clothing and accessories, including belts, bracelets, caps, and breeches. Available in various styles and colours, these products are designed to meet the needs of riders in Australia. Shop Noble Outfitters at The Equestrian for quality and style.',

  short_description: `<p>Noble Outfitters is renowned for its stylish and functional equestrian apparel. From <a href="/clothing/accessories/belts">belts</a> to <a href="/rider/jewellery/bracelets">bracelets</a>, and <a href="/clothing/accessories/caps">caps</a>, each piece is crafted with attention to detail. <!--read-more-trigger--> Explore our collection to find the perfect fit for your riding needs.</p>`,

  long_description: `<h2>About Noble Outfitters</h2><p>Noble Outfitters is a trusted brand in the equestrian community, known for its high-quality apparel and accessories. With a focus on both style and functionality, Noble Outfitters products are designed to enhance the riding experience.</p><h3>Belts</h3><p>Our collection of <a href="/clothing/accessories/belts">Noble Belts</a> includes designs like the Aztec Wrap and Equus Charm, perfect for adding a touch of elegance to your riding outfit.</p><h3>Bracelets</h3><p>Explore the range of <a href="/rider/jewellery/bracelets">Noble Bracelets</a>, featuring unique designs such as the Birds of a Feather Brown and Floral Frenzy Bracelet Natural Tan.</p><h3>Caps</h3><p>Stay stylish with <a href="/clothing/accessories/caps">Noble Caps</a>, including the Cruiser Snap Back in Navy and Rhythm & Blues in four colours.</p><h3>Peddies</h3><ul><li>Noble Outfitters Peddies - Girls</li><li>Noble Outfitters Peddies - Womens</li><li>Noble Peddies Solid Light Blackberry</li></ul><h3>Women's Breeches</h3><p>Our <a href="/clothing/womens/breeches">Women's Breeches</a> include the Noble Tight - 5 Pocket, offering both comfort and style for riders.</p>`,

  faq_items: [
    {
      question: 'What types of products does Noble Outfitters offer?',
      answer:
        'Noble Outfitters offers a range of equestrian clothing and accessories, including belts, bracelets, caps, peddies, and breeches.',
    },
    {
      question: 'Where can I buy Noble Outfitters products in Australia?',
      answer:
        'You can purchase Noble Outfitters products at The Equestrian, an Australian retailer specializing in equestrian apparel.',
    },
    {
      question: 'Are Noble Outfitters products available in different colours?',
      answer:
        'Yes, Noble Outfitters products are available in a variety of colours, allowing you to choose the perfect match for your style.',
    },
    {
      question: 'What makes Noble Outfitters a preferred choice for riders?',
      answer:
        'Noble Outfitters is preferred for its combination of style, functionality, and quality, making it a popular choice among equestrians.',
    },
    {
      question: 'Do Noble Outfitters offer products for both men and women?',
      answer:
        'Yes, Noble Outfitters offers products suitable for both men and women, including a variety of unisex accessories.',
    },
  ],
};

export default content;
