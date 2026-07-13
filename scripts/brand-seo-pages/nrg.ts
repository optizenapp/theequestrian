import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'nrg',
  title: 'NRG',
  breadcrumb_label: 'NRG',
  logo_url: '/brands/logos/nrg.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'NRG' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'nrg-' },
  ],

  meta_title: 'NRG Horse Grooming & Supplements Australia',
  meta_description:
    'Explore NRG\'s premium horse grooming and supplement products at The Equestrian. Discover top-quality solutions for coat care, joint health, and more.',
  h1_title: 'NRG Equestrian Products in Australia',

  quick_answer:
    'NRG offers a range of high-quality equestrian products in Australia, including grooming essentials and supplements. Popular items include the NRG Apple Cider Vinegar for joint health and the NRG Bright White Powder for coat care. Shop these and more at The Equestrian.',

  short_description: `<p>NRG is renowned for its exceptional equestrian products, offering a variety of grooming and supplement solutions. From the popular <a href="/horse/supplements/nrg-apple-cider-vinegar">NRG Apple Cider Vinegar</a> to <a href="/horse/grooming/nrg-bright-white-powder-300gm">NRG Bright White Powder</a>, their products are designed to enhance the health and appearance of your horse. <!--read-more-trigger--> Explore our selection at The Equestrian for top-notch care.</p>`,

  long_description: `<h2>About NRG</h2><p>NRG is a trusted name in the equestrian industry, known for its innovative and effective products that cater to both horse and rider needs.</p><h3>Grooming Products</h3><p>NRG offers a comprehensive range of grooming products, including the <a href="/horse/grooming/products">Detangler No Detangler Nots Spray</a> and <a href="/horse/grooming/coat-care">NRG Bright White Powder</a>, designed to maintain your horse's coat in pristine condition.</p><h3>Supplements</h3><p>The <a href="/horse/supplements/nrg-apple-cider-vinegar">NRG Apple Cider Vinegar</a> is a popular choice for joint health, available in various sizes to suit your needs.</p><ul><li>NRG Apple Cider Vinegar - 1L</li><li>NRG Apple Cider Vinegar - 5L</li><li>NRG Apple Cider Vinegar - 20L</li></ul><h3>Specialty Products</h3><p>NRG also offers unique items like the <a href="/accessories/gifts/nrg-gift-pack">NRG Gift Pack</a>, perfect for equestrian enthusiasts.</p>`,

  faq_items: [
    {
      question: 'What is NRG Apple Cider Vinegar used for?',
      answer:
        'NRG Apple Cider Vinegar is used as a joint supplement for horses, promoting joint health and overall well-being.',
    },
    {
      question: 'How do I use NRG Bright White Powder?',
      answer:
        'NRG Bright White Powder is applied to your horse\'s coat to enhance its brightness and remove stains.',
    },
    {
      question: 'Can I purchase NRG products in Australia?',
      answer:
        'Yes, NRG products are available for purchase in Australia at The Equestrian.',
    },
    {
      question: 'What sizes are available for NRG Detangler Spray?',
      answer:
        'NRG Detangler Spray is available in 1 litre, 500ml, and 5 litre sizes.',
    },
    {
      question: 'Is there a gift option available for NRG products?',
      answer:
        'Yes, the NRG Gift Pack is available, offering a selection of popular NRG products.',
    },
  ],
};

export default content;
