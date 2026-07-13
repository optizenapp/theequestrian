import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'vetsense',
  title: 'Vetsense',
  breadcrumb_label: 'Vetsense',
  logo_url: '/brands/logos/vetsense.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Vetsense' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'vetsense-' },
  ],

  meta_title: 'Vetsense Supplements & Care Products',
  meta_description:
    'Discover Vetsense products at The Equestrian for top-quality equine supplements and care solutions in Australia.',
  h1_title: 'Vetsense Equine Supplements and Care',

  quick_answer:
    'Vetsense offers a comprehensive range of equine supplements and care products available at The Equestrian in Australia. From hoof health to digestive support, Vetsense ensures your horse receives the best care with products like Biotin Hoof Powder and Brewers Yeast.',

  short_description: `Explore the range of Vetsense products at The Equestrian, including supplements like <!--read-more-trigger-->Biotin Hoof Powder and Calcium Carbonate. Ensure your horse's optimal health with our trusted selection.`,

  long_description: `<h2>About Vetsense</h2><p>Vetsense is a trusted brand offering a wide range of equine supplements and care products. Known for their quality and effectiveness, Vetsense products are designed to support the health and well-being of horses across Australia.</p><h3>Supplements</h3><ul><li><a href="/horse/supplements/vetsense-biotin-hoof-powder-1-5kg">Biotin Hoof Powder</a>: Supports hoof health and strength.</li><li><a href="/horse/supplements/vetsense-brewers-yeast-1kg">Brewers Yeast</a>: Aids in digestion and overall health.</li><li><a href="/horse/supplements/vetsense-calcium-carbonate-5kg">Calcium Carbonate</a>: Essential for bone health.</li><li><a href="/horse/supplements/vetsense-epsom-salts-5kg">Epsom Salts</a>: For muscle relaxation and recovery.</li></ul><h3>Veterinary and First Aid</h3><ul><li><a href="/horse/veterinary/first-aid">First Aid Solutions</a>: Essential for treating minor injuries and ensuring quick recovery.</li></ul><h3>Stable Care</h3><ul><li><a href="/horse/stable/insect-repellent">Insect Repellent Flygon Gold</a>: Protects horses from flies and other pests.</li></ul>`,

  faq_items: [
    {
      question: 'What are the benefits of using Vetsense Biotin Hoof Powder?',
      answer:
        'Vetsense Biotin Hoof Powder helps improve hoof strength and integrity, promoting healthy growth and preventing issues like cracking.',
    },
    {
      question: 'How can Vetsense Brewers Yeast benefit my horse?',
      answer:
        'Brewers Yeast is beneficial for digestion and overall health, providing essential nutrients and supporting a balanced gut flora.',
    },
    {
      question: 'Why is Calcium Carbonate important for horses?',
      answer:
        'Calcium Carbonate is crucial for maintaining strong bones and teeth in horses, supporting their overall skeletal health.',
    },
    {
      question: 'How do I use Vetsense Epsom Salts for my horse?',
      answer:
        'Epsom Salts can be used in baths to help relax muscles and aid in recovery, especially after strenuous activity.',
    },
    {
      question: 'What makes Vetsense Flygon Gold effective?',
      answer:
        'Vetsense Flygon Gold is an effective insect repellent that protects horses from flies and other pests, ensuring their comfort and well-being.',
    },
  ],
};

export default content;
