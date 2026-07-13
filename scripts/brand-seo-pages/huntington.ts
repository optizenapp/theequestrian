import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'huntington',
  title: 'Huntington',
  breadcrumb_label: 'Huntington',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Huntington' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'huntington-' },
  ],

  meta_title: 'Huntington Equestrian Gear in Australia',
  meta_description:
    'Discover premium Huntington equestrian apparel and grooming tools at The Equestrian. Shop quality riding jackets, breeches, and brushes in Australia.',
  h1_title: 'Explore Huntington Equestrian Products',

  quick_answer:
    'Huntington offers a wide range of high-quality equestrian products including apparel and grooming tools. Available at The Equestrian, Huntington\'s collection features stylish riding jackets, comfortable breeches, and effective grooming brushes, all designed to meet the needs of riders and their horses in Australia.',

  short_description: `<p>Huntington is renowned for delivering premium equestrian products that combine style and functionality. From elegant riding jackets to comfortable breeches and efficient grooming brushes, Huntington caters to the needs of both riders and their horses.<!--read-more-trigger--> Explore the full range of Huntington products available at The Equestrian in Australia.</p>`,

  long_description: `<h2>About Huntington</h2><p>Huntington is a trusted name in the equestrian world, known for its high-quality products that cater to both riders and horses. Whether you're looking for stylish apparel or effective grooming tools, Huntington has you covered.</p><h3>Riding Apparel</h3><ul><li><a href="/clothing/kids/breeches">Breeches</a> - Comfortable and stylish options for young riders.</li><li><a href="/rider/gloves">Gloves</a> - Premier show gloves for a perfect grip.</li><li><a href="/clothing/accessories/belts">Belts</a> - Add a touch of elegance to any outfit.</li><li><a href="/clothing/kids">Jackets</a> - Durable and fashionable riding jackets for all weather conditions.</li></ul><h3>Grooming Tools</h3><ul><li><a href="/horse/grooming">Brushes</a> - Including body, face, and dandy brushes for effective grooming.</li></ul>`,

  faq_items: [
    {
      question: 'What types of riding apparel does Huntington offer?',
      answer:
        'Huntington offers a range of riding apparel including jackets, breeches, gloves, and belts, designed for both style and functionality.',
    },
    {
      question: 'Are Huntington grooming tools available?',
      answer:
        'Yes, Huntington provides a variety of grooming brushes suitable for different needs, including body, face, and dandy brushes.',
    },
    {
      question: 'Can I find Huntington products for kids?',
      answer:
        'Absolutely, Huntington offers a selection of kids\' breeches and jackets that are both comfortable and stylish.',
    },
    {
      question: 'Where can I purchase Huntington products in Australia?',
      answer:
        'Huntington products are available at The Equestrian, a leading retailer for equestrian gear in Australia.',
    },
    {
      question: 'What makes Huntington riding jackets special?',
      answer:
        'Huntington riding jackets are known for their durability, style, and comfort, making them a popular choice among riders.',
    },
  ],
};

export default content;
