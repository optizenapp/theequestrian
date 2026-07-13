import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'tommy-hilfiger',
  title: 'Tommy Hilfiger',
  breadcrumb_label: 'Tommy Hilfiger',
  logo_url: '/brands/logos/tommy-hilfiger.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Tommy Hilfiger' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'tommy-hilfiger-' },
  ],

  meta_title: 'Tommy Hilfiger Equestrian Gear Australia',
  meta_description:
    'Explore premium Tommy Hilfiger equestrian clothing and accessories at The Equestrian. Discover stylish baselayers, bonnets, and more.',
  h1_title: 'Tommy Hilfiger Equestrian Collection',

  quick_answer:
    'Tommy Hilfiger offers a range of stylish equestrian clothing and accessories available at The Equestrian in Australia. From baselayers to bonnets, each product combines elegance with functionality, perfect for any equestrian enthusiast.',

  short_description: `Discover the elegance and style of Tommy Hilfiger equestrian gear. Our collection includes a variety of products designed for comfort and performance. <!--read-more-trigger--> Whether you're looking for a chic baselayer or a functional bonnet, Tommy Hilfiger has you covered.`,

  long_description: `<h2>About Tommy Hilfiger Equestrian</h2><p>Tommy Hilfiger brings its iconic style to the equestrian world with a range of high-quality products. Known for their attention to detail and premium materials, these products are designed to enhance both performance and style.</p><h3>Women's Clothing</h3><ul><li><a href="/clothing/womens/baselayer-tommy-hilfiger-ava-long-sleeve-desert-sky-ladies">Baselayer Tommy Hilfiger Ava Long Sleeve</a></li><li>Breeches Tommy Hilfiger Highland Hybrid Full Grip</li></ul><h3>Accessories</h3><ul><li><a href="/clothing/accessories/belts">Belt Tommy Hilfiger Cambria Stretch</a></li><li>Gloves Tommy Hilfiger Duke</li></ul><h3>Horse Bonnets</h3><ul><li><a href="/horse/bonnets/bonnet-tommy-hilfiger-princeton-desert-sky">Bonnet Tommy Hilfiger Princeton</a></li><li><a href="/horse/bonnets/bonnett-tommy-hilfiger-cambridge-desert-sky">Bonnett Tommy Hilfiger Cambridge</a></li></ul>`,

  faq_items: [
    {
      question: 'What types of equestrian clothing does Tommy Hilfiger offer?',
      answer:
        'Tommy Hilfiger offers a range of equestrian clothing including baselayers, breeches, and hoodies.',
    },
    {
      question: 'Are Tommy Hilfiger equestrian products available in Australia?',
      answer:
        'Yes, Tommy Hilfiger equestrian products are available at The Equestrian in Australia.',
    },
    {
      question: 'What materials are used in Tommy Hilfiger equestrian gear?',
      answer:
        'Tommy Hilfiger equestrian gear is made from high-quality materials designed for comfort and durability.',
    },
    {
      question: 'Can I find Tommy Hilfiger horse bonnets at The Equestrian?',
      answer:
        'Yes, you can find a variety of Tommy Hilfiger horse bonnets at The Equestrian.',
    },
    {
      question: 'Does Tommy Hilfiger offer equestrian accessories?',
      answer:
        'Yes, Tommy Hilfiger offers a range of equestrian accessories including belts and gloves.',
    },
  ],
};

export default content;
