import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'effol',
  title: 'Effol',
  breadcrumb_label: 'Effol',
  logo_url: '/brands/logos/effol.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Effol' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'effol-' },
  ],

  meta_title: 'Effol Equestrian Products in Australia',
  meta_description:
    'Discover Effol\'s range of equestrian care products at The Equestrian. From hoof care to mouth butter, ensure your horse\'s well-being with Effol.',
  h1_title: 'Effol Equestrian Care Products',

  quick_answer:
    'Effol provides a comprehensive range of equestrian care products available in Australia at The Equestrian. Known for their quality and effectiveness, Effol products include hoof care ointments, mouth butters, and first aid essentials, ensuring optimal care for your horse.',

  short_description: `Effol offers a wide selection of equestrian care products designed to maintain and improve your horse's health and comfort. From <a href="/horse/bits/effol-mouth-butter-apple-flavoured-150ml">mouth butters</a> to <a href="/horse/stable/hoof-care">hoof care</a> solutions, Effol is dedicated to providing high-quality products. <!--read-more-trigger--> Explore our range to find the perfect care items for your equine companion.`,

  long_description: `<h2>About Effol</h2><p>Effol is a trusted brand in the equestrian community, offering a variety of products designed to enhance the well-being of horses. Their commitment to quality ensures that each product meets the highest standards.</p><h3>Effol Mouth Butter</h3><ul><li><a href="/horse/bits/effol-mouth-butter-apple-flavoured-150ml">Apple Flavoured</a></li><li><a href="/horse/bits/effol-mouth-butter-banana-flavoured-150ml">Banana Flavoured</a></li><li><a href="/horse/bits/effol-mouth-butter-mango-flavoured-150ml">Mango Flavoured</a></li></ul><p>Effol Mouth Butter helps to protect and care for your horse's mouth, ensuring comfort during rides.</p><h3>Effol Hoof Care</h3><ul><li><a href="/horse/stable/hoof-care">Hoof Care Soft Cream</a></li><li>Black Hoof Care Ointment</li><li>Green Hoof Care Ointment</li></ul><p>Effol's hoof care products are designed to maintain hoof health, offering protection and nourishment.</p><h3>Effol First Aid and Cooling</h3><ul><li>Effol First Aid Kit</li><li>Effol Med Cooling Gel Spray</li><li>Effol Med Cooling Wash</li></ul><p>Effol provides essential first aid and cooling solutions to ensure your horse's comfort and recovery.</p>`,

  faq_items: [
    {
      question: 'What is Effol Mouth Butter used for?',
      answer:
        'Effol Mouth Butter is used to protect and moisturize the horse\'s mouth, providing comfort during rides.',
    },
    {
      question: 'How does Effol Hoof Care benefit horses?',
      answer:
        'Effol Hoof Care products help maintain hoof health by providing nourishment and protection against environmental factors.',
    },
    {
      question: 'What products are included in the Effol First Aid Kit?',
      answer:
        'The Effol First Aid Kit includes essential items for treating minor injuries and ensuring quick recovery.',
    },
    {
      question: 'Can Effol products be used in all weather conditions?',
      answer:
        'Yes, Effol products are designed to be effective in various weather conditions, ensuring year-round care.',
    },
    {
      question: 'Where can I purchase Effol products in Australia?',
      answer:
        'Effol products can be purchased at The Equestrian, offering a wide range of equestrian care items.',
    },
  ],
};

export default content;
