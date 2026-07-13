import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'wild-horse',
  title: 'Wild Horse',
  breadcrumb_label: 'Wild Horse',
  logo_url: '/brands/logos/wild-horse.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Wild Horse' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'wild-horse-' },
  ],

  meta_title: 'Wild Horse Equestrian Gear in Australia',
  meta_description:
    'Explore Wild Horse equestrian gear at The Equestrian. Discover quality horse rugs and bonnets designed for comfort and protection.',
  h1_title: 'Wild Horse Equestrian Products',

  quick_answer:
    'Wild Horse offers a premium range of equestrian products in Australia, known for their durability and innovative design. At The Equestrian, you can find a variety of Wild Horse items, including horse rugs and fly veils, crafted to ensure your horse\'s comfort and protection.',

  short_description: `Discover the Wild Horse collection at The Equestrian, featuring high-quality horse rugs and bonnets. Designed with the utmost care, Wild Horse products ensure your horse's comfort and protection. <!--read-more-trigger--> Explore our range today and find the perfect fit for your equestrian needs.`,

  long_description: `<h2>About Wild Horse</h2><p>Wild Horse is renowned for crafting high-quality equestrian products that provide both comfort and protection for horses. At The Equestrian, we offer a diverse selection of Wild Horse items, including horse rugs and bonnets.</p><h3>Horse Rugs</h3><p>Our collection of Wild Horse rugs includes:</p><ul><li><a href="/horse/rugs/wild-horse-ic-ripstop-combo">Wild Horse IC Ripstop Combo</a></li><li><a href="/horse/rugs/wild-horse-ic-duo-combo">IC Duo Combo Horse Rug</a></li><li><a href="/horse/rugs/wild-horse-ic-mesh-rug-hood">IC Mesh Rug & Hood</a></li></ul><h3>Bonnets</h3><p>Protect your horse from flies with our selection of Wild Horse bonnets:</p><ul><li><a href="/horse/bonnets/wild-horse-2-dart-fly-veil">2 Dart Fly Veil</a></li><li><a href="/horse/bonnets/wild-horse-3-dart-fly-veil">3 Dart Fly Veil</a></li><li><a href="/horse/bonnets/wild-horse-3-dart-fly-veil-ears-nose">3 Dart Fly Veil - Ears & Nose</a></li></ul>`,

  faq_items: [
    {
      question: 'What types of products does Wild Horse offer?',
      answer:
        'Wild Horse offers a range of equestrian products including horse rugs and bonnets designed for comfort and protection.',
    },
    {
      question: 'Where can I buy Wild Horse products in Australia?',
      answer:
        'Wild Horse products are available at The Equestrian, offering a variety of horse rugs and bonnets.',
    },
    {
      question: 'What is unique about Wild Horse rugs?',
      answer:
        'Wild Horse rugs are known for their durability and innovative designs that cater to the comfort and protection of horses.',
    },
    {
      question: 'Do Wild Horse bonnets offer UV protection?',
      answer:
        'Yes, many Wild Horse bonnets are designed to offer UV protection, ensuring your horse is shielded from harmful rays.',
    },
    {
      question: 'Are replacement parts available for Wild Horse rugs?',
      answer:
        'Yes, replacement parts such as leg straps for Wild Horse rugs are available to maintain the longevity of your equestrian gear.',
    },
  ],
};

export default content;
