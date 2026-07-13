import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'shanga',
  title: 'Shanga Equestrian Gear',
  breadcrumb_label: 'Shanga',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Shanga' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'shanga-' },
  ],

  meta_title: 'Shanga Equestrian Rugs & Gear',
  meta_description:
    'Discover Shanga\'s premium equestrian rugs and gear at The Equestrian. Shop durable combos and stylish show rugs in Australia.',
  h1_title: 'Shanga Equestrian Products',

  quick_answer:
    'Shanga offers a wide range of equestrian products at The Equestrian, including durable and stylish rugs designed for various needs. From the Shanga Airflow Combo to the Shanga Towel Rug, each product is crafted to ensure comfort and protection for your horse, making Shanga a trusted choice in Australia.',

  short_description: `Explore Shanga's collection of high-quality equestrian gear at The Equestrian. Our range includes the versatile <!--read-more-trigger-->Shanga Airflow Combo, the protective Shanga Bug Rug - Recovery Combo, and the durable Shanga Ripstop Combo. Find the perfect fit for your horse's needs with Shanga.`,

  long_description: `<h2>About Shanga</h2><p>Shanga is renowned for its high-quality equestrian products, offering a diverse range of rugs and accessories that cater to the needs of horse owners in Australia.</p><h3>Rugs</h3><ul><li><a href="/horse/rugs/shanga-airflow-combo">Shanga Airflow Combo</a> - Designed for breathability and comfort.</li><li><a href="/horse/rugs/shanga-bug-rug-recovery-combo">Shanga Bug Rug - Recovery Combo</a> - Offers protection and recovery benefits.</li><li><a href="/horse/rugs/shanga-econo-ripstop-combo">Shanga Econo Ripstop Combo</a> - Combines durability with affordability.</li><li><a href="/horse/rugs/shanga-lycra-skinny-hood-with-zip">Shanga Lycra Show Rug with Skinny Zip Hood</a> - Perfect for show events.</li><li><a href="/horse/rugs/mesh">Shanga Mesh Combo</a> - Lightweight and breathable for warm weather.</li></ul><h3>Accessories</h3><p>Shanga also offers a selection of bonnets and fly masks to ensure your horse is comfortable and protected.</p>`,

  faq_items: [
    {
      question: 'What types of rugs does Shanga offer?',
      answer:
        'Shanga offers a variety of rugs including airflow combos, bug recovery combos, ripstop combos, and show rugs.',
    },
    {
      question: 'Where can I buy Shanga products in Australia?',
      answer:
        'Shanga products are available at The Equestrian, a leading retailer of equestrian gear in Australia.',
    },
    {
      question: 'Are Shanga rugs suitable for all weather conditions?',
      answer:
        'Yes, Shanga offers a range of rugs designed for different weather conditions, including lightweight mesh combos for summer.',
    },
    {
      question: 'What is the Shanga Bug Rug - Recovery Combo?',
      answer:
        'The Shanga Bug Rug - Recovery Combo is designed to protect horses from insects while aiding in recovery with its unique fabric.',
    },
    {
      question: 'Does Shanga offer show-specific equestrian gear?',
      answer:
        'Yes, Shanga provides show-specific gear like the Lycra Show Rug with Skinny Zip Hood, ideal for competitions.',
    },
  ],
};

export default content;
