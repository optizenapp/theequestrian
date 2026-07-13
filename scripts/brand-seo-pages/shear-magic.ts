import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'shear-magic',
  title: 'Shear Magic',
  breadcrumb_label: 'Shear Magic',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Shear Magic' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'shear-magic-' },
  ],

  meta_title: 'Shear Magic Grooming Products',
  meta_description:
    'Discover Shear Magic grooming products at The Equestrian, Australia\'s trusted retailer for high-quality pet and horse care essentials.',
  h1_title: 'Shear Magic Grooming Products',

  quick_answer:
    'Shear Magic offers a comprehensive range of grooming products for pets and horses, available at The Equestrian in Australia. From brushes and combs to clippers and rakes, Shear Magic ensures quality and ease in maintaining your pet\'s coat.',

  short_description: `Shear Magic provides an extensive selection of grooming tools designed to make pet care easy and effective. Whether you're looking for a <a href="/pet/dog/grooming">brush</a>, <a href="/horse/stable/clippers">clipper</a>, or <a href="/pet/dog/grooming">comb</a>, Shear Magic has you covered. <!--read-more-trigger--> Explore our range to find the perfect grooming solution.`,

  long_description: `<h2>About Shear Magic</h2><p>Shear Magic is renowned for its high-quality grooming products, catering to both pets and horses. At The Equestrian, you'll find a wide array of Shear Magic tools designed to make grooming a breeze.</p><h3>Brushes</h3><ul><li><a href="/pet/dog/grooming">Shear Magic Brush Double Medium</a></li><li><a href="/pet/dog/grooming">Shear Magic Moult Brush Large</a></li><li><a href="/pet/dog/grooming">Shear Magic Slicker Puppy</a></li></ul><h3>Clippers</h3><ul><li><a href="/horse/stable/clippers">Shear Magic Nail Clipper Guillotine</a></li><li><a href="/horse/stable/clippers">Shear Magic Nail Clipper Medium/large</a></li></ul><h3>Combs and Rakes</h3><ul><li><a href="/pet/dog/grooming">Shear Magic Dematting Comb</a></li><li><a href="/pet/dog/grooming">Shear Magic Shedding Rake Large</a></li></ul>`,

  faq_items: [
    {
      question: 'What types of brushes does Shear Magic offer?',
      answer:
        'Shear Magic offers a variety of brushes including double-sided brushes, moult brushes, and slicker brushes suitable for different coat types.',
    },
    {
      question: 'Are Shear Magic clippers suitable for all pets?',
      answer:
        'Yes, Shear Magic clippers are designed to be versatile and can be used on a range of pets, including dogs and horses.',
    },
    {
      question: 'How do I maintain Shear Magic grooming tools?',
      answer:
        'Regular cleaning and proper storage of Shear Magic grooming tools will ensure their longevity and performance. Follow the care instructions provided with each tool.',
    },
    {
      question: 'Can I find Shear Magic products in Australia?',
      answer:
        'Yes, Shear Magic products are available in Australia and can be purchased at The Equestrian.',
    },
    {
      question: 'What is the best way to use a Shear Magic dematting comb?',
      answer:
        'To use a Shear Magic dematting comb, gently work through tangles starting at the ends of the hair and moving towards the roots, being careful not to pull or tug.',
    },
  ],
};

export default content;
