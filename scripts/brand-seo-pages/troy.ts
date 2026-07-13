import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'troy',
  title: 'TROY',
  breadcrumb_label: 'TROY',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'TROY' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'troy-' },
  ],

  meta_title: 'TROY Horse Supplements & Care',
  meta_description:
    'Explore TROY\'s range of horse supplements and veterinary products at The Equestrian. Enhance your horse\'s health with quality injectables and sprays.',
  h1_title: 'TROY Horse Supplements and Veterinary Care',

  quick_answer:
    'TROY offers a comprehensive range of horse supplements and veterinary products available at The Equestrian in Australia. Their product line includes injectable vitamins and effective sprays, ensuring your horse receives the best care possible.',

  short_description: `<p>Discover TROY's premium range of horse care products at The Equestrian. From injectable vitamins to essential sprays, TROY provides the quality and reliability you need to keep your horse healthy. <!--read-more-trigger--> Whether you're looking for supplements or grooming solutions, TROY has you covered.</p>`,

  long_description: `<h2>About TROY</h2><p>TROY is a trusted name in equestrian care, offering a variety of products designed to meet the needs of horse owners across Australia. Their commitment to quality ensures that each product supports the health and wellbeing of your horse.</p><h3>Injectable Supplements</h3><ul><li><a href="/horse/supplements/injectable-b-complex-troy-100ml">Injectable B Complex Troy 100ml</a></li><li><a href="/horse/supplements/injectable-b12-troy-100ml">Injectable B12 Troy 100ml</a></li><li><a href="/horse/supplements/injectable-vitamin-c-troy-100ml">Injectable Vitamin C Troy 100ml</a></li></ul><p>These injectables are designed to provide essential nutrients directly, ensuring optimal absorption and effectiveness.</p><h3>Veterinary Sprays</h3><ul><li><a href="/horse/veterinary/troy-iodin-spray-500ml">Iodin Spray Troy 500ml</a></li></ul><p>Perfect for first aid and wound care, TROY's iodine sprays are a staple in any equestrian first aid kit.</p><h3>Grooming Solutions</h3><ul><li><a href="/horse/grooming/shampoo">Shampoo Hoss Gloss Troy 1litre</a></li></ul><p>Keep your horse's coat shiny and clean with TROY's Hoss Gloss shampoo, formulated for superior grooming results.</p>`,

  faq_items: [
    {
      question: 'What types of injectable supplements does TROY offer?',
      answer:
        'TROY offers a range of injectable supplements including B Complex, B12, and Vitamin C, designed to support your horse\'s health.',
    },
    {
      question: 'How can TROY\'s iodine spray be used?',
      answer:
        'TROY\'s iodine spray is used for wound care and first aid, helping to prevent infection and promote healing.',
    },
    {
      question: 'What is the benefit of using TROY\'s Hoss Gloss shampoo?',
      answer:
        'TROY\'s Hoss Gloss shampoo is formulated to enhance the shine and cleanliness of your horse\'s coat, making grooming easier and more effective.',
    },
    {
      question: 'Where can I buy TROY products in Australia?',
      answer:
        'You can purchase TROY products at The Equestrian, a trusted retailer for equestrian supplies in Australia.',
    },
    {
      question: 'Are TROY\'s products suitable for all horses?',
      answer:
        'Yes, TROY\'s products are designed to be suitable for a wide range of horses, providing essential care and nutrition.',
    },
  ],
};

export default content;
