import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'zilco',
  title: 'Zilco',
  breadcrumb_label: 'Zilco',
  logo_url: '/brands/logos/zilco.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Zilco' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'zilco-' },
  ],

  meta_title: 'Zilco Equestrian Gear in Australia',
  meta_description:
    'Discover Zilco\'s range of equestrian gear at The Equestrian. Shop helmets, saddles, bridles, and more for quality and performance.',
  h1_title: 'Zilco Equestrian Gear',

  quick_answer:
    'Zilco offers a comprehensive range of equestrian gear available at The Equestrian in Australia. Known for their quality and durability, Zilco products include helmets, saddles, bridles, and various horse accessories. Whether you\'re looking for a new helmet or a durable bridle, Zilco has you covered.',

  short_description: `Explore the world of Zilco, a leading brand in equestrian gear, available at The Equestrian. From helmets to saddles, Zilco offers a wide range of products designed for both riders and horses. <!--read-more-trigger--> Known for their durability and quality, Zilco products are a top choice for equestrians across Australia.`,

  long_description: `<h2>About Zilco</h2><p>Zilco is renowned for its innovative and durable equestrian products, catering to both horse and rider needs. With a focus on quality, Zilco products are designed to enhance performance and comfort.</p><h3>Helmets</h3><p>Protective and stylish, Zilco helmets are a must-have for any rider. Check out the <a href="/rider/helmets/13985-zilco-helmet">13985 Zilco Helmet</a> for superior safety.</p><h3>Saddles</h3><p>Explore our selection of <a href="/horse/saddles/all-purpose">all-purpose saddles</a> for versatile riding experiences.</p><h3>Bridles</h3><p>Our <a href="/horse/tack/bridles">bridles</a> range includes the durable Barcoo PVC options in black and brown.</p><ul><li>Bridle Barcoo PVC Zilco Black</li><li>Bridle Barcoo PVC Zilco Brown Full</li></ul><h3>Horse Rugs</h3><p>Keep your horse comfortable with Zilco's <a href="/horse/rugs">rugs</a>, including the Defender Cotton Show Rug and Garrison 1200d No Fill Combo.</p>`,

  faq_items: [
    {
      question: 'What types of helmets does Zilco offer?',
      answer:
        'Zilco offers a range of helmets designed for safety and comfort, including the popular 13985 Zilco Helmet.',
    },
    {
      question: 'Are Zilco bridles available in different colors?',
      answer:
        'Yes, Zilco offers bridles in various colors, including black and brown, with options like the Barcoo PVC bridle.',
    },
    {
      question: 'What materials are used in Zilco horse rugs?',
      answer:
        'Zilco horse rugs are made from durable materials like cotton and 1200d fabric, providing protection and comfort.',
    },
    {
      question: 'Can I find Zilco saddles for different riding styles?',
      answer:
        'Yes, Zilco offers a variety of saddles suitable for different riding styles, including all-purpose options.',
    },
    {
      question: 'Does Zilco offer products for horse training?',
      answer:
        'Yes, Zilco provides various training products, including lungeing equipment and elastic neck stretchers.',
    },
  ],
};

export default content;
