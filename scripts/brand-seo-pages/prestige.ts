import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'prestige',
  title: 'Prestige',
  breadcrumb_label: 'Prestige',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Prestige' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'prestige-' },
  ],

  meta_title: 'Prestige Equestrian Gear Australia',
  meta_description:
    'Discover Prestige equestrian gear at The Equestrian. Shop saddles, stirrup leathers, girths, and pet accessories in Australia.',
  h1_title: 'Prestige Equestrian Gear',

  quick_answer:
    'Prestige offers a premium range of equestrian gear and pet accessories, available at The Equestrian in Australia. Known for their quality and craftsmanship, Prestige products include saddles, stirrup leathers, girths, and pet collars, ensuring comfort and style for both horse and rider.',

  short_description: `<p>Explore the world of Prestige, a brand synonymous with quality and style in the equestrian community. From <a href="/horse/saddles">saddles</a> to <a href="/horse/tack/stirrup-leathers">stirrup leathers</a>, and <a href="/horse/tack/girths">girths</a>, Prestige offers a comprehensive range of products designed for performance and comfort. <!--read-more-trigger--> Additionally, their pet accessories, including <a href="/pet/dog/collars-and-leads">dog collars</a> and <a href="/pet/cat/accessories">cat accessories</a>, ensure your pets are as stylish as you are.</p>`,

  long_description: `<h2>About Prestige</h2><p>Prestige is a renowned brand in the equestrian world, offering high-quality gear for both horse and rider. With a focus on durability and comfort, Prestige products are crafted to meet the needs of equestrian enthusiasts.</p><h3>Saddles</h3><p>Prestige saddles, such as the <a href="/horse/saddles/prestige-atena-evo-fender">Atena Evo Fender</a> and <a href="/horse/saddles/dressage">Brillante K Lux Dressage Saddle</a>, provide exceptional support and balance, enhancing the riding experience.</p><h3>Stirrup Leathers</h3><ul><li><a href="/horse/tack/stirrup-leathers">Prestige Stirrup Leathers</a> are designed for strength and flexibility, ensuring a secure fit and comfortable ride.</li></ul><h3>Girths</h3><p>Choose from a variety of <a href="/horse/tack/girths">Prestige girths</a>, including anatomic and dressage styles, to suit your horse's needs.</p><h3>Pet Accessories</h3><p>Prestige also offers a range of pet accessories, including <a href="/pet/dog/collars-and-leads">dog collars</a> and <a href="/pet/cat/accessories">cat collars and harnesses</a>, combining functionality with fashionable designs.</p>`,

  faq_items: [
    {
      question: 'What types of saddles does Prestige offer?',
      answer:
        'Prestige offers a variety of saddles including dressage and fender styles, such as the Atena Evo Fender and Brillante K Lux Dressage Saddle.',
    },
    {
      question: 'Are Prestige stirrup leathers durable?',
      answer:
        'Yes, Prestige stirrup leathers are designed for durability and flexibility, providing a secure fit for riders.',
    },
    {
      question: 'Can I find Prestige pet accessories at The Equestrian?',
      answer:
        'Yes, The Equestrian offers a range of Prestige pet accessories, including dog collars and cat harnesses.',
    },
    {
      question: 'What materials are used in Prestige girths?',
      answer:
        'Prestige girths are crafted from high-quality materials, including leather, to ensure comfort and durability for your horse.',
    },
    {
      question: 'Where can I buy Prestige equestrian gear in Australia?',
      answer:
        'Prestige equestrian gear is available at The Equestrian, a leading retailer in Australia.',
    },
  ],
};

export default content;
