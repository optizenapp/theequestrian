import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'oregon',
  title: 'Oregon',
  breadcrumb_label: 'Oregon',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Oregon' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'oregon-' },
  ],

  meta_title: 'Oregon Equestrian Gear - The Equestrian',
  meta_description:
    'Explore Oregon\'s premium equestrian products at The Equestrian. Discover high-quality reins, bridles, hats, and more for your riding needs in Australia.',
  h1_title: 'Discover Oregon Equestrian Products',

  quick_answer:
    'Oregon offers a diverse range of equestrian products known for their quality and durability. At The Equestrian, find Oregon\'s leather reins, stylish Stetson hats, and essential tack accessories, all designed to enhance your riding experience in Australia.',

  short_description: `Oregon is synonymous with quality equestrian products. From the durable <a href="/horse/tack/reins">running reins</a> to the stylish <a href="/clothing/accessories/hats">Stetson hats</a>, Oregon's range is designed to meet the needs of every rider. <!--read-more-trigger--> Explore our collection to find the perfect gear for your equestrian pursuits.`,

  long_description: `<h2>About Oregon</h2><p>Oregon is a trusted name in the equestrian world, offering a wide range of products that cater to both novice and experienced riders. Known for their quality and craftsmanship, Oregon products are a staple in many stables across Australia.</p><h3>Reins and Bridles</h3><ul><li><a href="/horse/tack/reins">Black Oregon Leather & Rope Running Reins</a></li><li>Bridle Oregon Barcoo</li><li>Bridle Oregon Barcoo Plait</li></ul><h3>Stetson Hats</h3><ul><li><a href="/clothing/accessories/hats">Hat Stetson Oregon Granite</a></li></ul><h3>Tack Accessories</h3><ul><li>Oregon 1"x56" Stirrup Leathers</li><li>Oregon Breastplate Silver Bling</li><li>Oregon Curb Chain Cover</li></ul><h3>Felt Pads</h3><ul><li>Oregon Felt Pad 32" x 30"</li><li>Oregon Sunflower Wool Felt Pad 30x30</li></ul>`,

  faq_items: [
    {
      question: 'What types of reins does Oregon offer?',
      answer:
        'Oregon offers a variety of reins including Black Leather & Rope Running Reins and Oregon Black Running Draw Leather Reins.',
    },
    {
      question: 'Are Oregon products available in Australia?',
      answer:
        'Yes, Oregon products are available at The Equestrian in Australia, offering a range of high-quality equestrian gear.',
    },
    {
      question: 'What is special about Oregon\'s Stetson hats?',
      answer:
        'Oregon\'s Stetson hats, like the Oregon Granite, are known for their stylish design and durability, making them a popular choice among riders.',
    },
    {
      question: 'Does Oregon offer any saddle accessories?',
      answer:
        'Yes, Oregon offers a variety of saddle accessories including stirrup leathers and curb chain covers.',
    },
    {
      question: 'What materials are used in Oregon\'s felt pads?',
      answer:
        'Oregon\'s felt pads are crafted from high-quality materials like wool, ensuring comfort and durability for your horse.',
    },
  ],
};

export default content;
