import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'crooked-lane',
  title: 'Crooked Lane',
  breadcrumb_label: 'Crooked Lane',
  logo_url: '/brands/logos/crooked-lane.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Crooked Lane' },
    { column: 'HANDLE', relation: 'CONTAINS', condition: 'crooked-lane' },
    { column: 'TITLE', relation: 'CONTAINS', condition: 'crooked lane' },
  ],

  meta_title: 'Crooked Lane Horse Supplements Australia',
  meta_description:
    'Explore Crooked Lane\'s premium horse supplements at The Equestrian. Enhance your horse\'s health with natural ingredients available in Australia.',
  h1_title: 'Crooked Lane Horse Supplements',

  quick_answer:
    'Crooked Lane offers a wide range of horse supplements in Australia, focusing on natural ingredients to support equine health. Available at The Equestrian, their products include beetroot powder, brewers yeast, chamomile flowers, and more, ensuring your horse receives the best care.',

  short_description: `Discover the benefits of Crooked Lane horse supplements at The Equestrian. Our range includes natural ingredients like beetroot powder and chamomile flowers, designed to support your horse's health and wellbeing. <!--read-more-trigger--> Shop now for quality supplements in Australia.`,

  long_description: `<h2>About Crooked Lane</h2><p>Crooked Lane is renowned for its high-quality horse supplements, crafted with natural ingredients to promote optimal health and performance in horses. Available exclusively at The Equestrian, Crooked Lane products are trusted by horse owners across Australia.</p><h3>Beetroot Powder</h3><p>Crooked Lane Beetroot Powder is a rich source of antioxidants and nutrients, perfect for enhancing your horse's diet.</p><h3>Brewers Yeast</h3><p>Available in 1kg and 2kg options, Crooked Lane Brewers Yeast supports digestive health and overall vitality.</p><h3>Chamomile Flowers</h3><p>Chamomile Flowers from Crooked Lane offer calming properties, available in 500gm and 1kg packs.</p><h3>Garlic Granules</h3><p>Garlic Granules are known for their immune-boosting benefits, available in 1kg and 2kg sizes.</p><ul><li><a href="/horse/supplements">Explore all supplements</a></li><li><a href="/horse/supplements/crooked-lane-beetroot-powder-1kg">Beetroot Powder 1kg</a></li><li><a href="/horse/supplements/crooked-lane-brewers-yeast-1kg">Brewers Yeast 1kg</a></li></ul>`,

  faq_items: [
    {
      question: 'What are the benefits of Crooked Lane Beetroot Powder?',
      answer:
        'Crooked Lane Beetroot Powder is rich in antioxidants and nutrients, supporting overall health and performance in horses.',
    },
    {
      question: 'How does Brewers Yeast benefit my horse?',
      answer:
        'Brewers Yeast supports digestive health and enhances overall vitality, making it a great addition to your horse\'s diet.',
    },
    {
      question: 'Are Crooked Lane supplements natural?',
      answer:
        'Yes, Crooked Lane supplements are made with natural ingredients, ensuring safe and effective support for your horse\'s health.',
    },
    {
      question: 'Where can I buy Crooked Lane supplements?',
      answer:
        'You can purchase Crooked Lane supplements at The Equestrian, available for delivery across Australia.',
    },
    {
      question: 'What sizes are available for Crooked Lane Garlic Granules?',
      answer:
        'Crooked Lane Garlic Granules are available in 1kg and 2kg sizes.',
    },
  ],
};

export default content;
