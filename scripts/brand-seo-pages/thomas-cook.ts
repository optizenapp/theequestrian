import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'thomas-cook',
  title: 'Thomas Cook',
  breadcrumb_label: 'Thomas Cook',
  logo_url: '/brands/logos/thomas-cook.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Thomas Cook' },
    { column: 'HANDLE', relation: 'CONTAINS', condition: 'thomas-cook' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'thomas cook' },
  ],

  meta_title: 'Thomas Cook Equestrian Apparel Australia',
  meta_description:
    'Discover Thomas Cook\'s premium equestrian apparel and accessories at The Equestrian. Shop belts, hats, jeans, and more for men, women, and kids.',
  h1_title: 'Thomas Cook Equestrian Apparel',

  quick_answer:
    'Thomas Cook offers a wide range of equestrian apparel and accessories available at The Equestrian in Australia. From stylish belts and hats to comfortable jeans and footwear, Thomas Cook products are designed for durability and style, catering to both men and women, as well as kids.',

  short_description: `<p>Explore the extensive range of Thomas Cook equestrian apparel at The Equestrian. With a variety of products including belts, hats, jeans, and footwear, Thomas Cook combines style and functionality for all equestrian enthusiasts. <!--read-more-trigger--> Whether you're looking for casual wear or something more rugged, Thomas Cook has you covered.</p>`,

  long_description: `<h2>About Thomas Cook</h2><p>Thomas Cook is renowned for its high-quality equestrian apparel and accessories, offering a perfect blend of style, comfort, and durability. Available at The Equestrian in Australia, their collection caters to men, women, and kids.</p><h3>Belts</h3><p>Thomas Cook belts, such as the <a href="/clothing/accessories/belts">Black Twin Keeper Belt</a> and the Chocolate Twin Keeper Belt, are crafted for both style and practicality.</p><h3>Hats</h3><p>The <a href="/clothing/accessories/hats">Crushable Dark Brown Hat</a> and the Drover Sand Hat are perfect for sun protection and style.</p><h3>Jeans</h3><p>Thomas Cook offers a variety of jeans, including the <a href="/clothing/mens/jeans">Moleskins Straight Leg Sand Mens</a> and the Ada Skinny Morning Sky Ladies Jeans, known for their comfort and fit.</p><ul><li>Durable materials</li><li>Stylish designs</li><li>Wide range of sizes</li></ul><h3>Footwear</h3><p>The <a href="/clothing/footwear/casual">Gumboots Deloraine Long</a> and Wynyard Short are ideal for wet conditions, offering both protection and comfort.</p>`,

  faq_items: [
    {
      question: 'What types of products does Thomas Cook offer?',
      answer:
        'Thomas Cook offers a range of equestrian apparel and accessories, including belts, hats, jeans, and footwear for men, women, and kids.',
    },
    {
      question: 'Where can I buy Thomas Cook products in Australia?',
      answer:
        'You can purchase Thomas Cook products at The Equestrian, a retailer offering a wide selection of equestrian apparel and accessories.',
    },
    {
      question: 'Are Thomas Cook products suitable for kids?',
      answer:
        'Yes, Thomas Cook offers a selection of products designed specifically for kids, including the Kids Horse Snuggle Hoodie and other apparel.',
    },
    {
      question: 'What materials are used in Thomas Cook clothing?',
      answer:
        'Thomas Cook clothing is made from high-quality, durable materials designed to withstand the demands of equestrian activities while providing comfort and style.',
    },
    {
      question: 'Does Thomas Cook offer casual wear?',
      answer:
        'Yes, Thomas Cook offers casual wear such as the Bill Rugby Top Red Mens and various styles of jeans and tops suitable for everyday use.',
    },
  ],
};

export default content;
