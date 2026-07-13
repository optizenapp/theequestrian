import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'paw',
  title: 'PAW',
  breadcrumb_label: 'PAW',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'PAW' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'paw-' },
  ],

  meta_title: 'PAW Pet Care Products in Australia',
  meta_description:
    'Explore PAW\'s premium pet care range at The Equestrian. From grooming essentials to health supplements, find everything your pet needs.',
  h1_title: 'PAW Pet Care Products',

  quick_answer:
    'PAW offers a comprehensive range of pet care products available at The Equestrian in Australia. From grooming essentials like the PAW Nutriderm Shampoo to health supplements such as the PAW Complete Calm Chews, PAW ensures your pets receive the best care. Discover their innovative solutions for both dogs and cats, including wound care and calming chews.',

  short_description: `<p>PAW, a trusted name in pet care, provides a wide range of products to cater to the health and grooming needs of your pets. <!--read-more-trigger--> From the soothing PAW Manuka Wound Gel to the nourishing PAW Nutriderm Shampoo, each product is designed with your pet's well-being in mind.</p>`,

  long_description: `<h2>About PAW</h2><p>PAW is dedicated to delivering high-quality pet care solutions, ensuring the health and happiness of your furry friends. Their product range is diverse, catering to various needs from grooming to dietary supplements.</p><h3>Grooming Products</h3><ul><li><a href="/pet/dog/grooming">PAW Nutriderm Shampoo</a> - A gentle formula for healthy skin and coat.</li><li><a href="/pet/dog/grooming">PAW Mediderm Shampoo</a> - Ideal for sensitive skin, providing relief and nourishment.</li></ul><h3>Health Supplements</h3><ul><li><a href="/pet/dog/skin-care">PAW Complete Calm Chews</a> - Helps reduce anxiety in pets.</li><li><a href="/horse/veterinary">PAW Manuka Wound Gel</a> - Promotes healing of minor wounds.</li></ul>`,

  faq_items: [
    {
      question: 'What types of products does PAW offer?',
      answer:
        'PAW offers a variety of pet care products including shampoos, conditioners, wound care gels, and health supplements like calming chews.',
    },
    {
      question: 'Where can I buy PAW products in Australia?',
      answer:
        'PAW products are available at The Equestrian, a trusted retailer for pet and equestrian supplies in Australia.',
    },
    {
      question: 'Are PAW products suitable for all pets?',
      answer:
        'PAW products are designed for dogs and cats, with specific formulations to meet the unique needs of each pet.',
    },
    {
      question: 'Is PAW Manuka Wound Gel safe for pets?',
      answer:
        'Yes, PAW Manuka Wound Gel is formulated to be safe and effective for treating minor wounds in pets.',
    },
    {
      question: 'How do PAW Complete Calm Chews work?',
      answer:
        'PAW Complete Calm Chews contain ingredients that help to naturally reduce anxiety and promote relaxation in pets.',
    },
  ],
};

export default content;
