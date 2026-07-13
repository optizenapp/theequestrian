import type { BrandSEOContent } from '../run-brand-seo-update';

const content: BrandSEOContent = {
  handle: 'joseph-lyddy',
  title: 'Joseph Lyddy',
  breadcrumb_label: 'Joseph Lyddy',
  logo_url: '/brands/logos/joseph-lyddy.png',
  rules: [
    { column: 'BRAND', relation: 'EQUALS', condition: 'Joseph Lyddy' },
    { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'joseph-lyddy-' },
  ],

  meta_title: 'Joseph Lyddy Equestrian Products Australia',
  meta_description:
    'Explore Joseph Lyddy\'s range of equestrian care products at The Equestrian. From leather care to hoof polish, find quality solutions for your horse\'s needs.',
  h1_title: 'Joseph Lyddy Equestrian Care Products',

  quick_answer:
    'Joseph Lyddy offers a comprehensive range of equestrian care products available at The Equestrian in Australia. Known for their quality and reliability, the collection includes leather care items like saddle soaps and dubbin, as well as hoof care solutions such as Blac-It polish. Ideal for both professional and everyday equestrian needs.',

  short_description: `<p>Discover the trusted range of Joseph Lyddy equestrian products at The Equestrian. From <a href="/horse/stable/leather-care">leather care</a> essentials like saddle soaps and dubbin to <a href="/horse/stable/hoof-care">hoof care</a> solutions such as Blac-It polish, Joseph Lyddy offers quality and reliability for all your horse care needs. <!--read-more-trigger--> Perfect for both professional and everyday use, these products ensure your equestrian equipment and your horse are well-maintained.</p>`,

  long_description: `<h2>About Joseph Lyddy</h2><p>Joseph Lyddy is a renowned name in the equestrian industry, offering a wide range of products designed to meet the needs of horse owners and riders. With a focus on quality and effectiveness, Joseph Lyddy products are trusted by equestrians across Australia.</p><h3>Leather Care</h3><p>Maintain your leather gear with Joseph Lyddy's leather care products, including:</p><ul><li><a href="/horse/stable/leather-care">Saddle Soaps</a> - Available in glycerine and traditional formulas to clean and condition leather.</li><li>Dubbin - Protects and waterproofs leather items.</li><li>Leathaphane - Provides a deep clean and shine for all leather surfaces.</li></ul><h3>Hoof Care</h3><p>Joseph Lyddy offers solutions to keep your horse's hooves in top condition:</p><ul><li>Blac-It - A popular hoof polish that enhances appearance and protects hooves.</li></ul><h3>Veterinary and Grooming</h3><p>Ensure your horse's health and presentation with:</p><ul><li>Crib Stop Spray - Discourages unwanted chewing behavior.</li><li>Tru Blue Medicated Spray - Supports minor wound care and healing.</li></ul>`,

  faq_items: [
    {
      question: 'What types of leather care products does Joseph Lyddy offer?',
      answer:
        'Joseph Lyddy offers a variety of leather care products including saddle soaps, dubbin, and Leathaphane for cleaning, conditioning, and protecting leather goods.',
    },
    {
      question: 'Can Joseph Lyddy products be used for hoof care?',
      answer:
        'Yes, Joseph Lyddy provides hoof care products such as Blac-It hoof polish, which protects and enhances the appearance of your horse\'s hooves.',
    },
    {
      question: 'Where can I purchase Joseph Lyddy products in Australia?',
      answer:
        'Joseph Lyddy products are available at The Equestrian, a leading retailer for equestrian supplies in Australia.',
    },
    {
      question: 'Are there grooming products available from Joseph Lyddy?',
      answer:
        'Yes, Joseph Lyddy offers grooming products like Crib Stop Spray to help manage behavioral issues and Tru Blue Medicated Spray for minor wound care.',
    },
    {
      question: 'What is the purpose of Joseph Lyddy\'s Crib Stop Spray?',
      answer:
        'Joseph Lyddy\'s Crib Stop Spray is designed to deter horses from chewing on wood and other surfaces, helping to prevent damage and maintain stable environments.',
    },
  ],
};

export default content;
