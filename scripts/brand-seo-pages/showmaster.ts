import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'showmaster',
  title: 'Showmaster',
  breadcrumb_label: 'Showmaster',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Showmaster' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'showmaster-' },
  ],

  meta_title: 'Showmaster Equestrian Gear at The Equestrian',
  meta_description:
    'Explore Showmaster\'s range of equestrian products at The Equestrian. From grooming brushes to clippers, find quality gear for your horse in Australia.',
  h1_title: 'Discover Showmaster Equestrian Products',

  quick_answer:
    'Showmaster offers a wide range of equestrian products, including grooming brushes, clippers, and bandages, available at The Equestrian in Australia. Known for quality and reliability, Showmaster products cater to all your horse care needs, ensuring your equine companion is well-groomed and comfortable.',

  short_description: `Showmaster is a trusted name in equestrian products, offering a variety of grooming tools, clippers, and accessories. <!--read-more-trigger--> Whether you're looking for a body brush or a set of support bandages, Showmaster provides high-quality solutions for horse care enthusiasts in Australia.`,

  long_description: `<h2>About Showmaster</h2> <p>Showmaster is renowned for its comprehensive range of equestrian products, designed to meet the needs of horse owners and riders. From grooming essentials to advanced clippers, Showmaster combines quality and functionality.</p> <h3>Grooming Brushes</h3> <p>Showmaster offers a variety of grooming brushes, including:</p> <ul> <li><a href="/horse/grooming/body-brush-showmaster-horsehair">Body Brush Showmaster Horsehair</a></li> <li><a href="/horse/grooming/dandy-brush-showmaster-large">Dandy Brush Showmaster Large</a></li> <li><a href="/horse/grooming/brush-mud-buster-showmaster">Brush Mud Buster Showmaster</a></li> </ul> <h3>Clippers</h3> <p>For precise grooming, explore Showmaster's clipper sets, such as the <a href="/horse/grooming">Clipper Set Showmaster Battery & USB Ergonomic Trimmer</a> and the <a href="/horse/grooming">Clipper Set Showmaster Cordless & Corded Animal Trimmer</a>.</p> <h3>Bandages and Accessories</h3> <p>Keep your horse protected with Showmaster's range of bandages, including the <a href="/horse/boots/bandages">4-Pack Showmaster Support Bandages</a> and <a href="/horse/boots/bandages">Bandage Pads Faux Sheepskin Trim</a>.</p>`,

  faq_items: [
    {
      question: 'What types of grooming brushes does Showmaster offer?',
      answer:
        'Showmaster offers a range of grooming brushes including body brushes, dandy brushes, and mud buster brushes.',
    },
    {
      question: 'Are Showmaster clippers suitable for large animals?',
      answer:
        'Yes, Showmaster provides clippers suitable for large animals, including both corded and cordless options.',
    },
    {
      question: 'Can I find Showmaster products in Australia?',
      answer:
        'Yes, Showmaster products are available at The Equestrian, catering to customers in Australia.',
    },
    {
      question: 'What are Showmaster bandages used for?',
      answer:
        'Showmaster bandages are used to provide support and protection to horses, particularly during training or recovery.',
    },
    {
      question: 'Does Showmaster offer any grooming kits?',
      answer:
        'While individual grooming tools are available, Showmaster also offers comprehensive grooming solutions through their range of products.',
    },
  ],
};

export default content;
