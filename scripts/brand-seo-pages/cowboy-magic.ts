import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'cowboy-magic',
  title: 'Cowboy Magic',
  breadcrumb_label: 'Cowboy Magic',
  logo_url: '/brands/logos/cowboy-magic.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Cowboy Magic' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'cowboy-magic-' },
  ],

  meta_title: 'Cowboy Magic Grooming Products',
  meta_description:
    'Discover Cowboy Magic grooming products at The Equestrian in Australia. Shop conditioners, shampoos, and detanglers for a polished equine look.',
  h1_title: 'Cowboy Magic Grooming Products',

  quick_answer:
    'Cowboy Magic offers a range of grooming products designed to give your horse a polished and shiny appearance. Available at The Equestrian in Australia, the collection includes conditioners, shampoos, and detanglers that ensure your horse looks its best for any occasion.',

  short_description: `<p>Explore the Cowboy Magic range at The Equestrian, featuring high-quality grooming products like <a href="/horse/grooming/cowboy-magic-conditioner-473ml">conditioners</a>, <a href="/horse/grooming/shampoo">shampoos</a>, and detanglers. <!--read-more-trigger--> Perfect for maintaining a clean and shiny coat, these products are trusted by equestrians across Australia.</p>`,

  long_description: `<h2>About Cowboy Magic</h2><p>Cowboy Magic is renowned for its effective grooming solutions that cater to the needs of horses and their owners. Known for delivering exceptional shine and detangling capabilities, Cowboy Magic products are a staple in many grooming kits.</p><h3>Conditioners</h3><p>Our selection includes the <a href="/horse/grooming/cowboy-magic-conditioner-473ml">Cowboy Magic Conditioner</a> and the <a href="/horse/grooming/cowboy-magic-rosewater-conditioner-473ml">Rosewater Conditioner</a>, both designed to nourish and enhance your horse's coat.</p><h3>Shampoos</h3><p>Choose from a variety of shampoos like the <a href="/horse/grooming/shampoo">Cowboy Magic Shine In Yellow Out Shampoo</a> to maintain a clean and vibrant coat.</p><h3>Detanglers and Shine</h3><ul><li>Cowboy Magic Detangle & Shine</li><li>Cowboy Magic Super Body Shine</li><li>Cowboy Magic Green Spot Remover</li></ul><p>These products ensure your horse's mane and tail are free from tangles and full of shine.</p>`,

  faq_items: [
    {
      question: 'What is Cowboy Magic known for?',
      answer:
        'Cowboy Magic is known for its high-quality grooming products that provide exceptional shine and detangling for horses.',
    },
    {
      question: 'Where can I buy Cowboy Magic products in Australia?',
      answer:
        'Cowboy Magic products are available at The Equestrian, a trusted retailer for equestrian supplies in Australia.',
    },
    {
      question: 'What types of products does Cowboy Magic offer?',
      answer:
        'Cowboy Magic offers a range of grooming products including conditioners, shampoos, detanglers, and shine enhancers.',
    },
    {
      question: 'Are Cowboy Magic products suitable for all horse breeds?',
      answer:
        'Yes, Cowboy Magic products are designed to be effective on all horse breeds, providing a polished and well-groomed appearance.',
    },
    {
      question: 'How do Cowboy Magic shampoos benefit my horse?',
      answer:
        'Cowboy Magic shampoos clean and enhance your horse\'s coat, removing dirt and stains while adding a brilliant shine.',
    },
  ],
};

export default content;
